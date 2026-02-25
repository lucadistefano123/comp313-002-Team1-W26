const router = require("express").Router();
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");

const { requireAuth } = require("../middleware/auth.middleware"); // <-- your file that exports requireAuth
const { requireAdmin } = require("../middleware/requireAdmin");

// ==============================
// GET all users (admin)
// ==============================
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const users = await User.find()
    .select("_id fullName email role isActive createdAt updatedAt")
    .sort({ createdAt: -1 });

  res.json({ users });
});

// ==============================
// Toggle enable/disable user
// ==============================
router.patch("/users/:id/toggle", requireAuth, requireAdmin, async (req, res) => {
  const targetId = req.params.id;

  // prevent self-disable
  if (String(req.user.id) === String(targetId)) {
    return res.status(400).json({ message: "You cannot disable your own account." });
  }

  const user = await User.findById(targetId);
  if (!user) return res.status(404).json({ message: "User not found." });

  user.isActive = !user.isActive;
  await user.save();

  await AuditLog.create({
    action: user.isActive ? "ENABLE_USER" : "DISABLE_USER",
    adminId: req.user.id,
    targetUserId: user._id,
    meta: { email: user.email }
  });

  res.json({
    message: user.isActive ? "User enabled." : "User disabled.",
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    }
  });
});

// ==============================
// Change role (user <-> admin)
// ==============================
router.patch("/users/:id/role", requireAuth, requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role." });
  }

  const targetId = req.params.id;

  const user = await User.findById(targetId);
  if (!user) return res.status(404).json({ message: "User not found." });

  user.role = role;
  await user.save();

  await AuditLog.create({
    action: "CHANGE_ROLE",
    adminId: req.user.id,
    targetUserId: user._id,
    meta: { newRole: role }
  });

  res.json({
    message: "Role updated.",
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    }
  });
});

// ==============================
// Audit logs
// ==============================
router.get("/logs", requireAuth, requireAdmin, async (req, res) => {
  const logs = await AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("adminId", "fullName email")
    .populate("targetUserId", "fullName email");

  res.json({ logs });
});

module.exports = router;

// ==============================
// Download a user's audit data (JSON)
// ==============================
router.get("/users/:id/audit-export", requireAuth, requireAdmin, async (req, res) => {
  const userId = req.params.id;

  const user = await User.findById(userId).select("_id fullName email role isActive createdAt updatedAt");
  if (!user) return res.status(404).json({ message: "User not found." });

  // logs where they were the TARGET
  const targetLogs = await AuditLog.find({ targetUserId: userId })
    .sort({ createdAt: -1 })
    .populate("adminId", "fullName email");

  // logs where they were the ADMIN (if they are admin)
  const adminLogs = await AuditLog.find({ adminId: userId })
    .sort({ createdAt: -1 })
    .populate("targetUserId", "fullName email");

  const payload = {
    exportedAt: new Date().toISOString(),
    user,
    logs: {
      asTarget: targetLogs,
      asAdmin: adminLogs,
    },
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="audit-${user.email}.json"`);
  return res.status(200).send(JSON.stringify(payload, null, 2));
});