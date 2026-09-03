const fs = require('fs');
const path = require('path');
const { URL } = require('url');

/**
 * Shared client-side rate pacer for every RetailCrm suite.
 *
 * WHAT THIS FIXES, AND WHAT IT CANNOT
 * -----------------------------------
 * retail_crm_chatbot_api.json documents a global 429 limiter (ENABLE_RATE_LIMIT / DEFAULT_RATE_LIMIT) and a
 * separate per-phone 403 OTP throttle. Measuring on dev showed a THIRD behaviour the spec does not
 * mention: with the global budget respected at 50/60s, the general endpoints stopped returning 429
 * entirely, but /api/auth/verify-otp kept returning it. So that endpoint has its own, much tighter
 * limiter — and one global bucket cannot express that.
 *
 *   429 on general endpoints  -> GLOBAL bucket, 50/60s      -> fixed
 *   429 on the OTP endpoints  -> OTP bucket, far smaller     -> paced separately, below
 *   403 per-phone OTP throttle, multi-hour window            -> NOT fixable client-side
 *
 * The 403 is a per-phone counter. No pacing avoids it; only fewer OTP calls or more test numbers do.
 * Do not expect this module to help there, and do not widen the OTP budget hoping it will.
 *
 * Evidence for the global numbers: sfa_know_about_product_test.js went from 4 raw 429s to 0 at 50/60s
 * on this same server. Evidence for the split: two back-to-back api_test runs, where the NEG-* block
 * stopped 429ing the moment the global bucket was introduced while verify-otp did not.
 */

const WINDOW_MS = Number(process.env.RETAIL_CRM_RATE_WINDOW_MS || 60_000);

// ONE window per bucket, shared by every suite, because these limiters are server-side and do not care
// which file the request came from. A per-suite window under-counts: a boundary run followed by an
// api_test run would each think it had a full budget.
//
// The windows MUST live on disk, not just in this process. Playwright discards the worker after every
// failed test and starts a fresh one, so an in-memory list is reset dozens of times during a red run —
// exactly when pacing matters most. With workers:1 there is only ever one writer, so a plain
// read-modify-write needs no locking.
const RESULTS_DIR = path.join(process.cwd(), 'test-results');

/** Creates an independent sliding-window budget backed by its own file. */
function makeBucket({ name, file, budget, windowMs = WINDOW_MS }) {
  const windowPath = path.join(RESULTS_DIR, file);
  let queue = Promise.resolve(); // serialises the GATE, not the requests themselves

  const load = () => {
    try {
      const arr = JSON.parse(fs.readFileSync(windowPath, 'utf8'));
      return Array.isArray(arr) ? arr.filter((n) => typeof n === 'number') : [];
    } catch {
      return []; // absent or corrupt — start a fresh window rather than failing the suite
    }
  };

  const save = (arr) => {
    try {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
      fs.writeFileSync(windowPath, JSON.stringify(arr));
    } catch {
      // A window we cannot persist degrades to per-worker pacing, still better than none.
    }
  };

  const live = () => {
    const now = Date.now();
    return load().filter((t) => now - t <= windowMs);
  };

  /** Claim a slot without waiting. For deliberate bursts, which must still spend budget. */
  const record = () => {
    const win = live();
    win.push(Date.now());
    save(win);
  };

  /**
   * Waits until one more request fits the budget, then claims the slot. Callers queue behind one
   * another so two concurrent callers cannot both take the last slot — but the queue covers only the
   * *waiting*, so genuine concurrency is preserved.
   */
  const gate = (label = name) => {
    const turn = queue.then(async () => {
      for (;;) {
        const win = live();
        if (win.length < budget) {
          win.push(Date.now()); // claim inside the gate, so the reservation is atomic
          save(win);
          return;
        }
        const waitMs = windowMs - (Date.now() - win[0]) + 100;
        console.log(
          `[${label}][${name}] ${win.length}/${budget} used in the last ` +
            `${Math.round(windowMs / 1000)}s — holding ${Math.ceil(waitMs / 1_000)}s to stay under the ` +
            `server limit.`
        );
        await new Promise((r) => setTimeout(r, waitMs));
      }
    });
    queue = turn.catch(() => {});
    return turn;
  };

  return { name, windowPath, budget, gate, record, usage: () => live().length };
}

// The general limiter. 50 leaves headroom below the observed 60.
const globalBucket = makeBucket({
  name: 'global',
  file: '.retail_crm-rate-window.json',
  budget: Number(process.env.RETAIL_CRM_RATE_BUDGET || 50),
});

// The OTP limiter, which is far tighter and is NOT the global one — see the header note.
//
// 2, not 4, and that is a MEASURED value rather than a guess. At 4 the suite lost about two OTP cases
// per run to throttling — the casualties rotated (FUNC-004 + EDGE-011 one run, FUNC-033 + NEG-029 the
// next), which is the signature of a budget slightly too generous rather than of a product defect. At 2
// three consecutive back-to-back runs held at 104 pass / 1 fail, the one failure being the genuine
// SEC-014. Cost: ~5 min -> ~10 min per run.
//
// Being wrong in the conservative direction only makes a run slower; being wrong the other way makes it
// unreproducible, which is the failure mode this whole module exists to remove. Do not raise this to
// speed a run up without re-measuring.
const otpBucket = makeBucket({
  name: 'otp',
  file: '.retail_crm-otp-window.json',
  budget: Number(process.env.RETAIL_CRM_OTP_RATE_BUDGET || 2),
});

const OTP_PATHS = ['/api/auth/request-otp', '/api/auth/verify-otp'];

function isOtpPath(target) {
  const s = String(target);
  return OTP_PATHS.some((p) => s.includes(p));
}

const REQUEST_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'fetch']);

/** True when `target` addresses `host`. A relative or unparseable URL is treated as same-host. */
function targetsHost(target, host) {
  if (!host) return true;
  try {
    return new URL(String(target)).host === host;
  } catch {
    return true; // relative URL resolved against baseURL — assume the paced host
  }
}

/** Passes whichever gates apply to this URL. Exported for callers that bypass Playwright (raw https). */
async function paceGate(label = 'pace', target = '') {
  await globalBucket.gate(label);
  if (isOtpPath(target)) await otpBucket.gate(label);
}

/**
 * Wraps an APIRequestContext so every request passes the gates first.
 *
 * Applied by overriding Playwright's built-in `request` fixture, which is why ~150 existing call sites
 * needed no edits — and, more importantly, why none of them could be missed. A partially-paced suite
 * is worse than an unpaced one: slow enough to hurt, not consistent enough to help.
 *
 * `host` scopes the pacing. Only requests to that host spend budget: CB-BYP-05 targets UAT and several
 * VAPT cases target the frontend, both behind different limiters. Pacing those would burn dev budget on
 * requests that never reach dev.
 */
function pacedContext(ctx, { host, label = 'pace' } = {}) {
  return new Proxy(ctx, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;
      if (!REQUEST_METHODS.has(String(prop))) return value.bind(target);
      return async (...args) => {
        if (targetsHost(args[0], host)) await paceGate(label, args[0]);
        return value.apply(target, args);
      };
    },
  });
}

module.exports = {
  WINDOW_MS,
  globalBucket,
  otpBucket,
  paceGate,
  /**
   * Deliberate bursts spend budget WITHOUT waiting, so the pacer stays honest for whatever runs next.
   *
   * Pass the URL. An OTP burst must debit the OTP bucket too, otherwise the pacer believes those slots
   * are still free and the next OTP-dependent test walks straight into a 429 — which is exactly what
   * NEG-029's six unpaced attempts did to EDGE-011.
   */
  recordSend: (target = '') => {
    globalBucket.record();
    if (isOtpPath(target)) otpBucket.record();
  },
  windowUsage: () => globalBucket.usage(),
  otpUsage: () => otpBucket.usage(),
  pacedContext,
  targetsHost,
  isOtpPath,
};
