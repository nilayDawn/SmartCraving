import { check } from 'k6';

/**
 * Validates HTTP response status code.
 *
 * @param {object} res - k6 HTTP response object
 * @param {number} expectedStatus - Expected HTTP status code (e.g. 200, 201, 204)
 * @param {string} [label] - Optional descriptive label
 * @returns {boolean} Whether all checks passed
 */
export function checkStatus(res, expectedStatus = 200, label) {
  const name = label ? `${label} status is ${expectedStatus}` : `status is ${expectedStatus}`;
  return check(res, {
    [name]: (r) => r.status === expectedStatus,
  });
}

/**
 * Validates successful API response with standard JSON payload { success: true }.
 *
 * @param {object} res - k6 HTTP response object
 * @param {number} [expectedStatus=200] - Expected status code
 * @param {string} [label] - Optional descriptive label
 * @returns {boolean}
 */
export function checkSuccess(res, expectedStatus = 200, label = 'request') {
  return check(res, {
    [`${label} status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${label} has success true`]: (r) => {
      try {
        const body = r.json();
        return body && body.success === true;
      } catch (_) {
        return false;
      }
    },
  });
}

/**
 * Validates authentication responses (login / signup) which return a token and user data.
 *
 * @param {object} res - k6 HTTP response object
 * @param {string} [label='auth'] - Operation label (e.g. 'login', 'signup')
 * @returns {boolean}
 */
export function checkAuthResponse(res, label = 'auth') {
  return check(res, {
    [`${label} status is 200`]: (r) => r.status === 200,
    [`${label} returned JWT token`]: (r) => {
      try {
        const body = r.json();
        return !!(body && body.token && typeof body.token === 'string' && body.token.length > 20);
      } catch (_) {
        return false;
      }
    },
    [`${label} contains user object`]: (r) => {
      try {
        const body = r.json();
        return !!(body && body.data && body.data.user && body.data.user._id);
      } catch (_) {
        return false;
      }
    },
  });
}

/**
 * Validates expected error responses (e.g. 400, 401, 403, 404, 429).
 *
 * @param {object} res - k6 HTTP response object
 * @param {number} expectedStatus - Expected HTTP error status
 * @param {string} [messageSubstring] - Substring expected in error message
 * @param {string} [label='error'] - Label for the check
 * @returns {boolean}
 */
export function checkError(res, expectedStatus, messageSubstring, label = 'error') {
  const checks = {
    [`${label} status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
  };

  if (messageSubstring) {
    checks[`${label} message includes "${messageSubstring}"`] = (r) => {
      try {
        const body = r.json();
        const msg = (body && (body.message || body.errMessage)) || '';
        return msg.toLowerCase().includes(messageSubstring.toLowerCase());
      } catch (_) {
        return false;
      }
    };
  }

  return check(res, checks);
}

/**
 * Validates that response duration does not exceed a threshold.
 *
 * @param {object} res - k6 HTTP response object
 * @param {number} maxDurationMs - Max allowable latency in milliseconds
 * @returns {boolean}
 */
export function checkDuration(res, maxDurationMs = 500) {
  return check(res, {
    [`duration < ${maxDurationMs}ms`]: (r) => r.timings && r.timings.duration < maxDurationMs,
  });
}
