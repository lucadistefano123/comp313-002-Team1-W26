const SystemMetricEvent = require("../models/SystemMetricEvent");
const {
  METRIC_EVENT_TYPES,
} = require("../metrics/metricDefinitions");

function startOfDayUTC(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function trackEvent({ eventType, featureKey = null, category = null }) {
  if (!eventType) return;

  await SystemMetricEvent.create({
    eventType,
    featureKey,
    category,
    occurredOn: startOfDayUTC(),
  });
}

async function trackLoginSuccess() {
  await trackEvent({ eventType: METRIC_EVENT_TYPES.AUTH_LOGIN_SUCCESS });
}

async function trackFeatureUsage(featureKey) {
  if (!featureKey) return;
  await trackEvent({
    eventType: METRIC_EVENT_TYPES.FEATURE_USED,
    featureKey,
  });
}

module.exports = {
  trackEvent,
  trackLoginSuccess,
  trackFeatureUsage,
};
