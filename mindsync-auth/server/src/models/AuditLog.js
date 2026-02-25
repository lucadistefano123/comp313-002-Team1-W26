const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema({
  action: String,
  adminId: String,
  targetUserId: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AuditLog", auditSchema);