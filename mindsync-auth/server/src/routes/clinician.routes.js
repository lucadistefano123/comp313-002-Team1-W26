// server/src/routes/clinician.routes.js
const router = require("express").Router();

const authModule = require("../middleware/auth.middleware");
const requireAuth =
  typeof authModule === "function"
    ? authModule
    : authModule.requireAuth || authModule.auth;

if (typeof requireAuth !== "function") {
  throw new Error(
    "auth.middleware.js must export a middleware function or { requireAuth: fn } / { auth: fn }"
  );
}

// allow clinician OR admin
function requireClinicianOrAdmin(req, res, next) {
  const role = req.user?.role;
  if (role === "clinician" || role === "admin") return next();
  return res.status(403).json({ message: "Forbidden" });
}

const clinicianController = require("../controllers/clinician.controller");

// ==============================
// ✅ NEW: list ALL users (patients pool)
// GET /api/clinician/users/all
// ==============================
router.get(
  "/users/all",
  requireAuth,
  requireClinicianOrAdmin,
  clinicianController.listAllUsers
);

// ==============================
// ✅ NEW: clinician self-assign patient
// POST /api/clinician/users/:patientId/assign-me
// ==============================
router.post(
  "/users/:patientId/assign-me",
  requireAuth,
  requireClinicianOrAdmin,
  clinicianController.assignMeToPatient
);

// ==============================
// Existing: clinician’s assigned patients
// GET /api/clinician/patients
// ==============================
router.get(
  "/patients",
  requireAuth,
  requireClinicianOrAdmin,
  clinicianController.listMyPatients
);

// ==============================
// Patient data (only if assigned)
// ==============================
router.get(
  "/:patientId/moods",
  requireAuth,
  requireClinicianOrAdmin,
  clinicianController.getPatientMoods
);

router.get(
  "/:patientId/notes",
  requireAuth,
  requireClinicianOrAdmin,
  clinicianController.getPatientNotes
);

router.post(
  "/:patientId/notes",
  requireAuth,
  requireClinicianOrAdmin,
  clinicianController.addPatientNote
);

router.get(
  "/:patientId/export",
  requireAuth,
  requireClinicianOrAdmin,
  clinicianController.exportPatientData
);

// ✅ NEW: clinician self-drop patient
// DELETE /api/clinician/patients/:patientId/drop-me
router.delete(
  "/patients/:patientId/drop-me",
  requireAuth,
  requireClinicianOrAdmin,
  clinicianController.unassignMeFromPatient
);

module.exports = router;