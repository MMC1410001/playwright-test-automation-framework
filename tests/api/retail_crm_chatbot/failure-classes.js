const { test } = require('@playwright/test');

/**
 * Failure taxonomy — the replacement for test.skip() across the RetailCrm chatbot suites.
 *
 * A skipped test is worse than a red one: it looks deliberate, so nobody investigates, and the
 * requirement it covers silently stops being tested. The rule in these files is therefore:
 *
 *   a test that could not execute is RED, and its message says which of four things went wrong
 *   so the reader knows who owns the fix without opening the test file.
 *
 * Every message also states that nothing was asserted, because a red that means "we never got to
 * run this" must never be read as a proven product defect.
 *
 * Extracted from sfa_know_about_product_test.js, where this taxonomy was proven over 88 cases.
 * That file keeps its own inline copy on purpose — it also appends an SFA-specific rootCause()
 * attribution, and it is a verified suite that gains nothing from being rewired here.
 */

const FAILURE_CLASSES = {
  // Our side. A precondition the harness needs was missing: no credential, no seeded data,
  // no second test account. QA or dev-ops owns it, not the product.
  SETUP: 'SETUP GAP',
  // Their side. The server refused or is not configured, so the behaviour under test is
  // unreachable. Dev owns it.
  SERVER: 'BLOCKED BY SERVER',
  // Neither. We were throttled before the assertion ran. Re-run after the cooldown.
  RATE_LIMITED: 'NOT EXECUTED (RATE LIMITED)',
  // The test itself broke — a bad fixture, a timeout in our own code, a bug in the harness.
  HARNESS: 'HARNESS ERROR',
};

/**
 * Fails the current test with a classified, self-explaining error.
 *
 * @param {string} testId    e.g. 'CB-IDOR-02'
 * @param {string} klass     one of FAILURE_CLASSES
 * @param {string} headline  one line: what could not be done
 * @param {string} [detail]  what the reader should do about it, ideally naming the exact fix
 */
function failNotExecuted(testId, klass, headline, detail = '') {
  try {
    test.info().annotations.push({ type: 'failure-class', description: `${klass} — ${headline}` });
  } catch {
    // test.info() is unavailable outside a running test (e.g. in beforeAll). Never let the
    // annotation bookkeeping mask the error we are actually trying to report.
  }
  throw new Error(
    `[${testId}] ${klass} — ${headline}\n` +
      (detail ? `${detail}\n` : '') +
      `NOTHING WAS ASSERTED in this test, so the requirement it covers is UNVERIFIED — ` +
      `this red is not itself a proven product defect.`
  );
}

/**
 * Rate-limit guard. Call immediately after any request whose 429 would invalidate the assertion.
 * Replaces the old failIf429(), which skipped — and so quietly retired whole groups of tests
 * whenever the shared 60/60s bucket was busy.
 */
function failOn429(status, testId, detail = '') {
  if (status !== 429) return;
  failNotExecuted(
    testId,
    FAILURE_CLASSES.RATE_LIMITED,
    'server returned 429 Too Many Requests before the assertion could run',
    detail ||
      'The dev rate limit is ~60 requests / 60s and is shared across this whole suite. ' +
        'Wait for the window to clear and re-run, or run this file with --workers=1 only.'
  );
}

/**
 * Throttle guard for the OTP endpoints, which return 403 for a phone in cooldown.
 * Replaces failIf403(), which also skipped.
 */
function failOn403Throttle(status, testId, detail = '') {
  if (status !== 403) return;
  failNotExecuted(
    testId,
    FAILURE_CLASSES.SETUP,
    'server returned 403 Forbidden — the test phone number is in OTP cooldown',
    detail ||
      'request-otp throttles per phone. Wait for the cooldown to expire, or set TEST_PHONE to ' +
        'another number configured in AUTH_TEST_OTP_CODES.'
  );
}

module.exports = { FAILURE_CLASSES, failNotExecuted, failOn429, failOn403Throttle };
