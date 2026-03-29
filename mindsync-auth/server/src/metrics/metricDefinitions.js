// Canonical, privacy-safe list of admin system metrics.
// Do not include user identifiers in any metric payload.

const METRIC_TIME_GRAIN = Object.freeze({
  DAILY: "daily",
});

const METRIC_KEYS = Object.freeze({
  LOGIN_FREQUENCY: "login_frequency",
  FEATURE_USAGE: "feature_usage",
  ERROR_COUNT: "error_count",
});

const METRIC_EVENT_TYPES = Object.freeze({
  AUTH_LOGIN_SUCCESS: "auth.login.success",
  FEATURE_USED: "feature.used",
  SYSTEM_ERROR: "system.error",
});

const SYSTEM_METRIC_DEFINITIONS = Object.freeze({
  [METRIC_KEYS.LOGIN_FREQUENCY]: Object.freeze({
    key: METRIC_KEYS.LOGIN_FREQUENCY,
    label: "Login Frequency",
    description: "Count of successful logins grouped by day.",
    eventType: METRIC_EVENT_TYPES.AUTH_LOGIN_SUCCESS,
    timeGrain: METRIC_TIME_GRAIN.DAILY,
    fields: ["date", "count"],
    piiSafe: true,
  }),
  [METRIC_KEYS.FEATURE_USAGE]: Object.freeze({
    key: METRIC_KEYS.FEATURE_USAGE,
    label: "Feature Usage",
    description: "Count of feature interactions grouped by day and feature key.",
    eventType: METRIC_EVENT_TYPES.FEATURE_USED,
    timeGrain: METRIC_TIME_GRAIN.DAILY,
    fields: ["date", "featureKey", "count"],
    piiSafe: true,
  }),
  [METRIC_KEYS.ERROR_COUNT]: Object.freeze({
    key: METRIC_KEYS.ERROR_COUNT,
    label: "System Error Count",
    description: "Count of server-side errors grouped by day and error category.",
    eventType: METRIC_EVENT_TYPES.SYSTEM_ERROR,
    timeGrain: METRIC_TIME_GRAIN.DAILY,
    fields: ["date", "category", "count"],
    piiSafe: true,
  }),
});

const METRICS_PRIVACY_RULES = Object.freeze([
  "Never persist email, fullName, IP, raw user agent, auth token, or request body.",
  "Never expose userId/adminId in metric API responses.",
  "Aggregate counts by day and category only.",
]);

module.exports = {
  METRIC_TIME_GRAIN,
  METRIC_KEYS,
  METRIC_EVENT_TYPES,
  SYSTEM_METRIC_DEFINITIONS,
  METRICS_PRIVACY_RULES,
};
