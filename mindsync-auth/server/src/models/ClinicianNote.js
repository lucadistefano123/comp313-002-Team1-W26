// server/src/models/ClinicianNote.js
const mongoose = require("mongoose");

const ClinicianNoteSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    note: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClinicianNote", ClinicianNoteSchema);