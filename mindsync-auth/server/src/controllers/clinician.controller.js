// server/src/controllers/clinician.controller.js
const mongoose = require("mongoose");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");
const User = require("../models/User");
const MoodEntry = require("../models/MoodEntry");
const ClinicianNote = require("../models/ClinicianNote");

const PATIENT_ACCESS_DENIED_MESSAGE = "You are not allowed to view this patient.";

function isAdmin(user) {
  return user?.role === "admin";
}

function getAuthUserId(req) {
  return String(req.user?._id || req.user?.id || "");
}

async function ensureAccess(req, patientId) {
  if (isAdmin(req.user)) return true;

  const myId = getAuthUserId(req);
  if (!myId) return false;

  // patient must have this clinician in assignedClinicians
  const patient = await User.findById(patientId).select("assignedClinicians");
  if (!patient) return false;

  return (patient.assignedClinicians || []).some((id) => String(id) === myId);
}

exports.listMyPatients = async (req, res) => {
  try {
    if (isAdmin(req.user)) {
      const users = await User.find({ role: "user" }).select(
        "fullName email role isActive"
      );
      return res.json({ users });
    }

    const myId = getAuthUserId(req);

    const users = await User.find({
      role: "user",
      assignedClinicians: myId,
    }).select("fullName email role isActive");

    return res.json({ users });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

exports.getPatientMoods = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!mongoose.isValidObjectId(patientId))
      return res.status(400).json({ message: "Invalid patientId" });

    const ok = await ensureAccess(req, patientId);
    if (!ok) {
      return res.status(403).json({ message: PATIENT_ACCESS_DENIED_MESSAGE });
    }

    const moods = await MoodEntry.find({ userId: patientId }).sort({
      createdAt: -1,
    });
    return res.json({ moods });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

exports.getPatientNotes = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!mongoose.isValidObjectId(patientId))
      return res.status(400).json({ message: "Invalid patientId" });

    const ok = await ensureAccess(req, patientId);
    if (!ok) {
      return res.status(403).json({ message: PATIENT_ACCESS_DENIED_MESSAGE });
    }

    const notes = await ClinicianNote.find({ patientId })
      .populate("clinicianId", "fullName email")
      .sort({ createdAt: -1 });

    return res.json({ notes });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

exports.addPatientNote = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { note } = req.body;

    if (!mongoose.isValidObjectId(patientId))
      return res.status(400).json({ message: "Invalid patientId" });

    if (!note || !note.trim())
      return res.status(400).json({ message: "Note is required" });

    const ok = await ensureAccess(req, patientId);
    if (!ok) {
      return res.status(403).json({ message: PATIENT_ACCESS_DENIED_MESSAGE });
    }

    // ✅ FIX: support both _id and id from auth middleware
    const clinicianId = req.user?._id || req.user?.id;
    if (!clinicianId) {
      return res.status(401).json({ message: "Missing authenticated user id." });
    }

    const created = await ClinicianNote.create({
      patientId,
      clinicianId,
      note: note.trim(),
    });

    return res.status(201).json({ message: "Note added", note: created });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// export patient data as PDF or CSV
exports.exportPatientData = async (req, res) => {
  try {
    const { patientId } = req.params;
    const format = String(req.query.format || "pdf").toLowerCase();

    if (!mongoose.isValidObjectId(patientId)) {
      return res.status(400).json({ message: "Invalid patientId" });
    }

    const ok = await ensureAccess(req, patientId);
    if (!ok) {
      return res.status(403).json({ message: PATIENT_ACCESS_DENIED_MESSAGE });
    }

    const patient = await User.findById(patientId).select(
      "fullName email createdAt"
    );

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const moods = await MoodEntry.find({ userId: patientId }).sort({
      createdAt: -1,
    });

    const notes = await ClinicianNote.find({ patientId })
      .populate("clinicianId", "fullName email")
      .sort({ createdAt: -1 });

    const filenameBase = `patient-export-${patientId}-${new Date()
      .toISOString()
      .slice(0, 10)}`;

    const rows = [];

    moods.forEach((mood) => {
      rows.push({
        recordType: "mood",
        patientName: patient.fullName || "",
        patientEmail: patient.email || "",
        createdAt: mood.createdAt ? new Date(mood.createdAt).toISOString() : "",
        moodScore:
          mood.moodScore !== undefined
            ? mood.moodScore
            : mood.rating !== undefined
            ? mood.rating
            : mood.score !== undefined
            ? mood.score
            : "",
        mood: mood.mood || "",
        emotionTags: Array.isArray(mood.emotionTags)
          ? mood.emotionTags.join(", ")
          : Array.isArray(mood.tags)
          ? mood.tags.join(", ")
          : "",
        note: mood.note || "",
        clinician: "",
      });
    });

    notes.forEach((entry) => {
      rows.push({
        recordType: "clinician_note",
        patientName: patient.fullName || "",
        patientEmail: patient.email || "",
        createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : "",
        moodScore: "",
        mood: "",
        emotionTags: "",
        note: entry.note || "",
        clinician:
          entry.clinicianId?.fullName ||
          entry.clinicianId?.email ||
          "Unknown",
      });
    });

    if (format === "csv") {
      const fields = [
        "recordType",
        "patientName",
        "patientEmail",
        "createdAt",
        "moodScore",
        "mood",
        "emotionTags",
        "note",
        "clinician",
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(rows);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filenameBase}.csv"`
      );

      return res.status(200).send(csv);
    }

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 50 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filenameBase}.pdf"`
      );

      doc.pipe(res);
      doc.fontSize(20).text("MindSync Patient Export", { underline: true });
      doc.moveDown();

      doc.fontSize(14).text(`Patient: ${patient.fullName || "N/A"}`);
      doc.text(`Email: ${patient.email || "N/A"}`);
      doc.text(
        `Account Created: ${
          patient.createdAt
            ? new Date(patient.createdAt).toLocaleString()
            : "N/A"
        }`
      );
      doc.text(`Exported At: ${new Date().toLocaleString()}`);
      doc.moveDown();

      doc.fontSize(16).text("Mood Entries");
      doc.moveDown(0.5);

      if (!moods.length) {
        doc.fontSize(12).text("No mood entries found.");
      } else {
        moods.forEach((mood, index) => {
          doc
            .fontSize(12)
            .text(
              `${index + 1}. Date: ${
                mood.createdAt
                  ? new Date(mood.createdAt).toLocaleString()
                  : "N/A"
              }`
            );

          if (mood.moodScore !== undefined) {
            doc.text(`   Mood Score: ${mood.moodScore}`);
          } else if (mood.rating !== undefined) {
            doc.text(`   Mood Score: ${mood.rating}`);
          } else if (mood.score !== undefined) {
            doc.text(`   Mood Score: ${mood.score}`);
          }

          if (mood.mood !== undefined) {
            doc.text(`   Mood: ${mood.mood}`);
          }

          if (mood.emotionTags?.length) {
            doc.text(`   Emotion Tags: ${mood.emotionTags.join(", ")}`);
          } else if (mood.tags?.length) {
            doc.text(`   Emotion Tags: ${mood.tags.join(", ")}`);
          }

          if (mood.note) {
            doc.text(`   Note: ${mood.note}`);
          }

          doc.moveDown(0.5);
        });
      }

      doc.moveDown();
      doc.fontSize(16).text("Clinician Notes");
      doc.moveDown(0.5);

      if (!notes.length) {
        doc.fontSize(12).text("No clinician notes found.");
      } else {
        notes.forEach((entry, index) => {
          doc
            .fontSize(12)
            .text(
              `${index + 1}. Date: ${
                entry.createdAt
                  ? new Date(entry.createdAt).toLocaleString()
                  : "N/A"
              }`
            );

          doc.text(
            `   Clinician: ${
              entry.clinicianId?.fullName ||
              entry.clinicianId?.email ||
              "Unknown"
            }`
          );

          doc.text(`   Note: ${entry.note || "No content"}`);
          doc.moveDown(0.5);
        });
      }

      doc.end();
      return;
    }

    return res.status(400).json({ message: "Invalid format. Use csv or pdf." });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

exports.listAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: "user",
      isActive: true,
      // exclude obvious admin accounts by name/email
      fullName: { $not: /admin/i },
      email: { $not: /admin/i },
    })
      .select("_id fullName email role isActive createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ users });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ✅ clinician self-assign a patient (adds clinicianId to patient's assignedClinicians)
exports.assignMeToPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await User.findById(patientId);
    if (!patient) return res.status(404).json({ message: "User not found." });

    if (patient.role !== "user") {
      return res.status(400).json({ message: "Only users can be patients." });
    }

    const already = (patient.assignedClinicians || []).some(
      (id) => String(id) === String(req.user._id || req.user.id)
    );

    if (!already) {
      patient.assignedClinicians = patient.assignedClinicians || [];
      patient.assignedClinicians.push(req.user._id || req.user.id);
      await patient.save();
    }

    res.json({ message: "Patient added." });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ✅ clinician self-drop a patient (removes clinicianId from patient's assignedClinicians)
exports.unassignMeFromPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!mongoose.isValidObjectId(patientId))
      return res.status(400).json({ message: "Invalid patientId" });

    const patient = await User.findById(patientId);
    if (!patient) return res.status(404).json({ message: "User not found." });

    if (patient.role !== "user") {
      return res.status(400).json({ message: "Only users can be patients." });
    }

    const myId = String(req.user?._id || req.user?.id || "");
    if (!myId) return res.status(401).json({ message: "Missing authenticated user id." });

    patient.assignedClinicians = (patient.assignedClinicians || []).filter(
      (id) => String(id) !== myId
    );

    await patient.save();

    return res.json({ message: "Patient dropped." });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};