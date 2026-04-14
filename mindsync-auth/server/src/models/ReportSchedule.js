const mongoose = require("mongoose");

const ReportScheduleSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "quarterly"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    lastRun: {
      type: Date,
      default: null,
    },
    lastReportStatus: {
      type: String,
      enum: ["ready", "empty", "failed"],
      default: null,
    },
    lastReportNotice: {
      type: String,
      default: "",
    },
    lastReportTotalEntries: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ReportSchedule", ReportScheduleSchema);
