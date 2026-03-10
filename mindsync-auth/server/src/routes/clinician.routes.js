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

function requireClinicianOrAdmin(req, res, next) {
  const role = req.user?.role;
  if (role === "clinician" || role === "admin") return next();
  return res.status(403).json({ message: "Forbidden" });
}

const clinicianController = require("../controllers/clinician.controller");


router.get(
  "/users/all",
  requireAuth,
  requireClinicianOrAdmin,
  clinicianController.listAllUsers
);


router.post(
  "/users/:patientId/assign-me",
  requireAuth,
  requireClinicianOrAdmin,
  clinicianController.assignMeToPatient
);


router.get(
  "/patients",
  requireAuth,
  requireClinicianOrAdmin,
  clinicianController.listMyPatients
);


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

router.delete(
  "/patients/:patientId/drop-me",
  requireAuth,
  requireClinicianOrAdmin,
  clinicianController.unassignMeFromPatient
);

module.exports = router;