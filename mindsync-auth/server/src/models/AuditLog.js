const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema({
  action: { type: String, required: true, trim: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AuditLog", auditSchema);