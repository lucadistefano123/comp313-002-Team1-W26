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

async function trackSystemError(category = "unknown") {
  await trackEvent({
    eventType: METRIC_EVENT_TYPES.SYSTEM_ERROR,
    category,
  });
}

function normalizeDateInput(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatDayUTC(date) {
  return date.toISOString().slice(0, 10);
}

function buildDateSeries(startDay, endDay, countsByDate) {
  const output = [];
  const days = Math.floor((endDay - startDay) / (1000 * 60 * 60 * 24)) + 1;

  for (let i = 0; i < days; i++) {
    const d = new Date(startDay);
    d.setUTCDate(d.getUTCDate() + i);
    const key = formatDayUTC(d);
    output.push({ date: key, count: countsByDate[key] || 0 });
  }

  return output;
}

function sumSeries(series) {
  return series.reduce((sum, item) => sum + item.count, 0);
}

async function getSystemMetricsSummary(start, end) {
  const endDay = normalizeDateInput(end) || startOfDayUTC();
  const startDay = normalizeDateInput(start) || new Date(endDay.getTime() - (29 * 24 * 60 * 60 * 1000));

  const matchBase = { occurredOn: { $gte: startDay, $lte: endDay } };

  const [loginDailyAgg, featureDailyAgg, errorDailyAgg, featureByKeyAgg, errorByCategoryAgg] =
    await Promise.all([
      SystemMetricEvent.aggregate([
        { $match: { ...matchBase, eventType: METRIC_EVENT_TYPES.AUTH_LOGIN_SUCCESS } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$occurredOn" } }, count: { $sum: 1 } } },
      ]),
      SystemMetricEvent.aggregate([
        { $match: { ...matchBase, eventType: METRIC_EVENT_TYPES.FEATURE_USED } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$occurredOn" } }, count: { $sum: 1 } } },
      ]),
      SystemMetricEvent.aggregate([
        { $match: { ...matchBase, eventType: METRIC_EVENT_TYPES.SYSTEM_ERROR } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$occurredOn" } }, count: { $sum: 1 } } },
      ]),
      SystemMetricEvent.aggregate([
        { $match: { ...matchBase, eventType: METRIC_EVENT_TYPES.FEATURE_USED } },
        { $group: { _id: { $ifNull: ["$featureKey", "unknown"] }, count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
      SystemMetricEvent.aggregate([
        { $match: { ...matchBase, eventType: METRIC_EVENT_TYPES.SYSTEM_ERROR } },
        { $group: { _id: { $ifNull: ["$category", "unknown"] }, count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
    ]);

  const mapAgg = (rows) => {
    const out = {};
    rows.forEach((row) => {
      out[row._id] = row.count;
    });
    return out;
  };

  const logins = buildDateSeries(startDay, endDay, mapAgg(loginDailyAgg));
  const features = buildDateSeries(startDay, endDay, mapAgg(featureDailyAgg));
  const errors = buildDateSeries(startDay, endDay, mapAgg(errorDailyAgg));

  const featureUsageByKey = featureByKeyAgg.map((row) => ({
    featureKey: row._id,
    count: row.count,
  }));

  const errorCountByCategory = errorByCategoryAgg.map((row) => ({
    category: row._id,
    count: row.count,
  }));

  return {
    range: {
      start: formatDayUTC(startDay),
      end: formatDayUTC(endDay),
    },
    totals: {
      loginFrequency: sumSeries(logins),
      featureUsage: sumSeries(features),
      errorCount: sumSeries(errors),
    },
    daily: {
      loginFrequency: logins,
      featureUsage: features,
      errorCount: errors,
    },
    featureUsageByKey,
    errorCountByCategory,
  };
}

module.exports = {
  trackEvent,
  trackLoginSuccess,
  trackFeatureUsage,
  trackSystemError,
  normalizeDateInput,
  getSystemMetricsSummary,
};
