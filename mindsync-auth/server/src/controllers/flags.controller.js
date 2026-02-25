const FeatureFlag = require("../models/FeatureFlag");

async function getFlags(_req, res) {
  const flags = await FeatureFlag.find({}).sort({ key: 1 }).lean();
  res.json(flags);
}

async function updateFlag(req, res) {
  const { key } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== "boolean") {
    return res.status(400).json({ message: "enabled must be boolean" });
  }

  const updated = await FeatureFlag.findOneAndUpdate(
    { key },
    { $set: { enabled } },
    { new: true }
  ).lean();

  if (!updated) {
    return res.status(404).json({ message: "Flag not found" });
  }

  res.json(updated);
}

module.exports = { getFlags, updateFlag };