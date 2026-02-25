const mongoose = require("mongoose");

const FeatureFlagSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FeatureFlag", FeatureFlagSchema);