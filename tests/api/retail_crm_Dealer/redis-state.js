// Shared Redis-state detection used by the live suite (dealer_api.spec.js) and the
// throwaway down-path simulation (redis-down-simulation.spec.js). Keeping this in one
// place ensures the simulation exercises the SAME logic the real tests run.

/** True when /internal/stats served a graceful-degradation body (Redis is off). */
function isAnalyticsUnavailable(body) {
  return !!body && (body.error === 'analytics unavailable' || body.detail === 'analytics unavailable');
}

/**
 * Classify the Redis feature/server state from a probe of /internal/stats.
 * @param {number} status - HTTP status of the probe
 * @param {object} body   - parsed JSON body ({} if unparseable)
 * @returns {'not-deployed'|'down'|'up'}
 */
function classifyRedisState(status, body) {
  if (status === 404) return 'not-deployed';
  return isAnalyticsUnavailable(body) ? 'down' : 'up';
}

/** Prominent stdout banner for a non-'up' state, or null when Redis is up. */
function redisBanner(state) {
  if (state === 'down') {
    return '\n================ REDIS STATE: DOWN ================\n' +
      '/internal/stats reachable but analytics unavailable — Redis is OFF.\n' +
      'Analytics/cache assertions run in graceful-degradation mode.\n' +
      '===================================================\n';
  }
  if (state === 'not-deployed') {
    return '\n============ REDIS-BRANCH: NOT DEPLOYED ============\n' +
      '/internal/stats returned 404 — redis-branch features absent on this backend.\n' +
      'All TC_157-170 will be skipped.\n' +
      '===================================================\n';
  }
  return null;
}

/** Report-visible annotation object for the Redis-down path (push onto testInfo.annotations). */
const REDIS_DOWN_ANNOTATION = {
  type: 'redis-status',
  description: 'REDIS DOWN — /internal/stats returned "analytics unavailable" (graceful degradation)',
};

module.exports = { isAnalyticsUnavailable, classifyRedisState, redisBanner, REDIS_DOWN_ANNOTATION };
