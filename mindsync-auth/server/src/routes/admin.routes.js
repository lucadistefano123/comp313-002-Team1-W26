const router = require("express").Router();

// ✅ auth middleware can be exported as fn OR { requireAuth: fn } OR { auth: fn }
const authModule = require("../middleware/auth.middleware");
const requireAuth =
  typeof authModule === "function"
    ? authModule
    : authModule.requireAuth || authModule.auth;

// ✅ requireAdmin can be exported as fn OR { requireAdmin: fn }
const adminModule = require("../middleware/requireAdmin");
const requireAdmin =
  typeof adminModule === "function" ? adminModule : adminModule.requireAdmin;

const adminController = require("../controllers/admin.controller");

const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const reportController = require("../controllers/report.controller");

if (typeof requireAuth !== "function") {
  throw new Error("requireAuth is not a function. Check auth.middleware.js exports.");
}
if (typeof requireAdmin !== "function") {
  throw new Error("requireAdmin is not a function. Check requireAdmin.js exports.");
}

// ==============================
// Org-wide mood trends (admin)
// ==============================
router.get("/mood-trends", requireAuth, requireAdmin, async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ message: "start and end are required (YYYY-MM-DD)." });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return res.status(400).json({ message: "Invalid dates." });
  }

  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  if (endDay < startDay) {
    return res.status(400).json({ message: "end must be same or after start." });
  }

  const delta = Math.floor((endDay - startDay) / (1000 * 60 * 60 * 24)) + 1;
  if (delta > 365) {
    return res.status(400).json({ message: "max range 365 days." });
  }

  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (endDay > todayDay) {
    return res.status(400).json({ message: "end cannot be in the future." });
  }

  const MoodEntry = require("../models/MoodEntry");

  const agg = await MoodEntry.aggregate([
    {
      $match: {
        entryDate: { $gte: startDay, $lte: endDay },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$entryDate" } },
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = {};
  agg.forEach((r) => {
    map[r._id] = Math.round(r.avg * 10) / 10;
  });

  const history = [];
  for (let i = 0; i < delta; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    history.push({ date: key, avg: map[key] ?? null });
  }

  res.json({ history });
});

// ==============================
// GET all users (admin)
// ==============================
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const users = await User.find()
    .select("_id fullName email role isActive assignedClinicians createdAt updatedAt")
    .sort({ createdAt: -1 });

  res.json({ users });
});

// ==============================
// Organization report endpoints
// ==============================
router.get("/reports/summary", requireAuth, requireAdmin, reportController.getReportSummary);
router.get("/reports/pdf", requireAuth, requireAdmin, reportController.getReportPdf);

router.get("/reports/schedules", requireAuth, requireAdmin, reportController.getSchedules);
router.post("/reports/schedules", requireAuth, requireAdmin, reportController.createSchedule);
router.delete("/reports/schedules/:id", requireAuth, requireAdmin, reportController.deleteSchedule);

// ==============================
// Toggle enable/disable user
// ==============================
router.patch("/users/:id/toggle", requireAuth, requireAdmin, async (req, res) => {
  const targetId = req.params.id;

  // prevent self-disable
  if (String(req.user.id || req.user._id) === String(targetId)) {
    return res.status(400).json({ message: "You cannot disable your own account." });
  }

  const user = await User.findById(targetId);
  if (!user) return res.status(404).json({ message: "User not found." });

  user.isActive = !user.isActive;
  await user.save();

  await AuditLog.create({
    action: user.isActive ? "ENABLE_USER" : "DISABLE_USER",
    adminId: req.user.id || req.user._id,
    targetUserId: user._id,
    meta: { email: user.email },
  });

  res.json({
    message: user.isActive ? "User enabled." : "User disabled.",
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
});

// ==============================
// Change role (user <-> admin <-> clinician)
// ==============================
router.patch("/users/:id/role", requireAuth, requireAdmin, async (req, res) => {
  const { role } = req.body;

  // ✅ allow clinician too
  if (!["user", "admin", "clinician"].includes(role)) {
    return res.status(400).json({ message: "Invalid role." });
  }

  const targetId = req.params.id;

  const user = await User.findById(targetId);
  if (!user) return res.status(404).json({ message: "User not found." });

  user.role = role;
  await user.save();

  await AuditLog.create({
    action: "CHANGE_ROLE",
    adminId: req.user.id || req.user._id,
    targetUserId: user._id,
    meta: { newRole: role },
  });

  res.json({
    message: "Role updated.",
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
});

// ==============================
// Assign clinician to patient
// ==============================
router.post(
  "/users/:patientId/assign-clinician",
  requireAuth,
  requireAdmin,
  adminController.assignClinicianToPatient
);

router.post(
  "/users/:patientId/unassign-clinician",
  requireAuth,
  requireAdmin,
  adminController.unassignClinicianFromPatient
);

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

// ==============================
// Download a user's audit data (JSON)
// ==============================
router.get("/users/:id/audit-export", requireAuth, requireAdmin, async (req, res) => {
  const userId = req.params.id;

  const user = await User.findById(userId).select(
    "_id fullName email role isActive createdAt updatedAt"
  );
  if (!user) return res.status(404).json({ message: "User not found." });

  const targetLogs = await AuditLog.find({ targetUserId: userId })
    .sort({ createdAt: -1 })
    .populate("adminId", "fullName email");

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

module.exports = router;