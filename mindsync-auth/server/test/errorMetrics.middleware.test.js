const test = require("node:test");
const assert = require("node:assert/strict");

const SystemMetricEvent = require("../src/models/SystemMetricEvent");
const {
  METRIC_EVENT_TYPES,
} = require("../src/metrics/metricDefinitions");
const {
  createSystemErrorMetricsLogger,
} = require("../src/middleware/errorMetrics.middleware");

const ORIGINAL_CREATE = SystemMetricEvent.create;

function createMockResponse(statusCode) {
  const listeners = {};
  return {
    statusCode,
    on(event, handler) {
      listeners[event] = handler;
    },
    emitFinish() {
      if (listeners.finish) listeners.finish();
    },
  };
}

test("system error is logged as metric event for 5xx response", async () => {
  let captured = null;
  SystemMetricEvent.create = async (payload) => {
    captured = payload;
    return payload;
  };

  const middleware = createSystemErrorMetricsLogger();
  const req = { path: "/api/admin/metrics" };
  const res = createMockResponse(500);

  middleware(req, res, () => {});
  res.emitFinish();

  await new Promise((resolve) => setImmediate(resolve));

  assert.ok(captured);
  assert.equal(captured.eventType, METRIC_EVENT_TYPES.SYSTEM_ERROR);
  assert.equal(captured.category, "api.admin.http_500");
});

test.after(() => {
  SystemMetricEvent.create = ORIGINAL_CREATE;
});
