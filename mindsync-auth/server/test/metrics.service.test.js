const test = require("node:test");
const assert = require("node:assert/strict");

const SystemMetricEvent = require("../src/models/SystemMetricEvent");
const {
  getSystemMetricsSummary,
} = require("../src/services/metrics.service");

const ORIGINAL_AGGREGATE = SystemMetricEvent.aggregate;

function setAggregateSequence(sequence) {
  let i = 0;
  SystemMetricEvent.aggregate = async () => {
    const value = sequence[i] || [];
    i += 1;
    return value;
  };
}

test("active usage metrics update totals and daily data", async () => {
  setAggregateSequence([
    [{ _id: "2026-03-01", count: 2 }],
    [
      { _id: "2026-03-01", count: 3 },
      { _id: "2026-03-02", count: 1 },
    ],
    [],
    [
      { _id: "admin", count: 2 },
      { _id: "moods", count: 2 },
    ],
    [],
  ]);

  const summary = await getSystemMetricsSummary("2026-03-01", "2026-03-03");

  assert.equal(summary.totals.loginFrequency, 2);
  assert.equal(summary.totals.featureUsage, 4);
  assert.equal(summary.totals.errorCount, 0);

  assert.deepEqual(summary.daily.loginFrequency, [
    { date: "2026-03-01", count: 2 },
    { date: "2026-03-02", count: 0 },
    { date: "2026-03-03", count: 0 },
  ]);

  assert.deepEqual(summary.featureUsageByKey, [
    { featureKey: "admin", count: 2 },
    { featureKey: "moods", count: 2 },
  ]);
});

test("no usage returns zero values for all metrics", async () => {
  setAggregateSequence([[], [], [], [], []]);

  const summary = await getSystemMetricsSummary("2026-03-10", "2026-03-12");

  assert.equal(summary.totals.loginFrequency, 0);
  assert.equal(summary.totals.featureUsage, 0);
  assert.equal(summary.totals.errorCount, 0);

  assert.deepEqual(summary.daily.featureUsage, [
    { date: "2026-03-10", count: 0 },
    { date: "2026-03-11", count: 0 },
    { date: "2026-03-12", count: 0 },
  ]);

  assert.deepEqual(summary.featureUsageByKey, []);
  assert.deepEqual(summary.errorCountByCategory, []);
});

test.after(() => {
  SystemMetricEvent.aggregate = ORIGINAL_AGGREGATE;
});
