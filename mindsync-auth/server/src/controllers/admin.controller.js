// server/src/controllers/admin.controller.js
const User = require("../models/User");

exports.assignClinicianToPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { clinicianId } = req.body;

    const patient = await User.findById(patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const clinician = await User.findById(clinicianId);
    if (!clinician) return res.status(404).json({ message: "Clinician not found" });
    if (clinician.role !== "clinician" && clinician.role !== "admin")
      return res.status(400).json({ message: "Selected user is not a clinician" });

    if (patient.role !== "user")
      return res.status(400).json({ message: "Only users/patients can be assigned" });

    const exists = patient.assignedClinicians?.some((id) => String(id) === String(clinicianId));
    if (!exists) patient.assignedClinicians.push(clinicianId);

    await patient.save();

    return res.json({ message: "Clinician assigned", patientId, clinicianId });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

exports.unassignClinicianFromPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { clinicianId } = req.body;

    const patient = await User.findById(patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    patient.assignedClinicians = (patient.assignedClinicians || []).filter(
      (id) => String(id) !== String(clinicianId)
    );
    await patient.save();

    return res.json({ message: "Clinician unassigned", patientId, clinicianId });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};