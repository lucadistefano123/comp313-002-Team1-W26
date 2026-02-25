const FeatureFlag = require("../models/FeatureFlag");

const DEFAULT_FLAGS = [
  {
    key: "moodCheckInEnabled",
    description: "Allow users to submit mood check-ins",
    enabled: true,
  },
  {
    key: "journalEnabled",
    description: "Allow users to write journal entries",
    enabled: true,
  },
  {
    key: "moodHistoryEnabled",
    description: "Allow users to view mood history charts",
    enabled: true,
  },
  {
    key: "exportEnabled",
    description: "Allow exporting data (CSV/PDF)",
    enabled: true,
  },
];

async function seedFeatureFlags() {
  for (const flag of DEFAULT_FLAGS) {
    await FeatureFlag.updateOne(
      { key: flag.key },
      { $setOnInsert: flag },
      { upsert: true }
    );
  }
}

module.exports = { seedFeatureFlags };