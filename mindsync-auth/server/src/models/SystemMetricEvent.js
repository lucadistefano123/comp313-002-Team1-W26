const mongoose = require("mongoose");

const systemMetricEventSchema = new mongoose.Schema(
  {
    eventType: { type: String, required: true, trim: true, index: true },
    featureKey: { type: String, default: null, trim: true, index: true },
    category: { type: String, default: null, trim: true, index: true },
    occurredOn: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemMetricEvent", systemMetricEventSchema);
