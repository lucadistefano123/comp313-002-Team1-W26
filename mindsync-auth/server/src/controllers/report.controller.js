const PDFDocument = require("pdfkit");
const MoodEntry = require("../models/MoodEntry");
const ReportSchedule = require("../models/ReportSchedule");

const AGGREGATION_ANONYMITY_THRESHOLD = 3;

function safeDate(value) {
  return value ? new Date(value) : null;
}

function normalizeDateInput(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

async function buildSummaryData(start, end) {
  const from = normalizeDateInput(start);
  const to = normalizeDateInput(end);

  const lastDay = to || new Date();
  const firstDay = from || new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() - 29);

  const agg = await MoodEntry.aggregate([
    {
      $match: {
        entryDate: { $gte: firstDay, $lte: lastDay },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$entryDate" } },
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const bucket = {};
  let suppressedDays = 0;
  agg.forEach((r) => {
    if (r.count < AGGREGATION_ANONYMITY_THRESHOLD) {
      bucket[r._id] = { avgRating: null, count: r.count, suppressed: true };
      suppressedDays += 1;
      return;
    }
    bucket[r._id] = { avgRating: Math.round(r.avgRating * 10) / 10, count: r.count, suppressed: false };
  });

  const days = [];
  const totalCount = agg.reduce((sum, r) => sum + r.count, 0);
  let totalRatingSum = 0;
  agg.forEach((r) => { totalRatingSum += (r.avgRating * r.count); });

  const rangeDays = Math.floor((lastDay - firstDay) / (1000 * 60 * 60 * 24)) + 1;
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(firstDay);
    d.setDate(firstDay.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      date: key,
      avg: bucket[key]?.avgRating ?? null,
      count: bucket[key]?.count ?? 0,
      suppressed: Boolean(bucket[key]?.suppressed),
    });
  }

  const overallAvg = totalCount ? Math.round((totalRatingSum / totalCount) * 10) / 10 : null;

  return {
    start: firstDay.toISOString().slice(0, 10),
    end: lastDay.toISOString().slice(0, 10),
    totalEntries: totalCount,
    overallAvg,
    daily: days,
    suppressedDays,
    anonymityThreshold: AGGREGATION_ANONYMITY_THRESHOLD,
  };
}

exports.getReportSummary = async (req, res) => {
  try {
    const { start, end } = req.query;
    const summary = await buildSummaryData(start, end);

    if (summary.totalEntries === 0) {
      return res.status(404).json({ message: "No mood entries found for selected period." });
    }

    return res.json(summary);
  } catch (err) {
    console.error("Report summary error", err);
    return res.status(500).json({ message: "Server error generating report summary." });
  }
};

exports.getReportPdf = async (req, res) => {
  try {
    const { start, end } = req.query;
    const summary = await buildSummaryData(start, end);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="mindsync-org-report-${summary.start}-${summary.end}.pdf"`
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(20).text("MindSync Organization Wellness Report", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Generated: ${new Date().toLocaleString()}`);
    doc.fontSize(11).text(`Reporting window: ${summary.start} to ${summary.end}`);
    doc.moveDown();

    doc.fontSize(14).text("Summary", { underline: true });
    doc.moveDown(0.4);

    doc.fontSize(11).text(`Total entries: ${summary.totalEntries}`);
    doc.fontSize(11).text(`Average rating: ${summary.overallAvg ?? "N/A"}/10`);
    if (summary.totalEntries === 0) {
      doc.fontSize(11).text("Notice: No data available for this reporting window.");
    }
    if (summary.suppressedDays > 0) {
      doc
        .fontSize(11)
        .text(`Notice: ${summary.suppressedDays} day(s) were suppressed to enforce anonymity threshold (${summary.anonymityThreshold}).`);
    }
    doc.moveDown(0.6);

    doc.fontSize(11).text("Daily trend (average mood):");
    doc.moveDown(0.3);

    summary.daily.forEach((d) => {
      const value = d.suppressed ? "suppressed for anonymity" : d.avg !== null ? d.avg : "no data";
      doc.fontSize(10).text(`${d.date}: ${value} (count ${d.count})`);
    });

    doc.end();
  } catch (err) {
    console.error("Report PDF error", err);
    res.status(500).json({ message: "Server error generating report PDF." });
  }
};

exports.getSchedules = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const schedules = await ReportSchedule.find({ adminId }).sort({ createdAt: -1 }).lean();
    res.json({ schedules });
  } catch (err) {
    console.error("Get schedules error", err);
    res.status(500).json({ message: "Server error retrieving schedules." });
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const { frequency, startDate, endDate } = req.body;

    if (!["daily", "weekly", "monthly", "quarterly"].includes(frequency)) {
      return res.status(400).json({ message: "frequency must be daily, weekly, monthly, or quarterly." });
    }

    const start = normalizeDateInput(startDate);
    const end = normalizeDateInput(endDate);

    if (!start || !end || end < start) {
      return res.status(400).json({ message: "Invalid date range." });
    }

    const schedule = await ReportSchedule.create({ adminId, frequency, startDate: start, endDate: end });
    res.status(201).json({ schedule });
  } catch (err) {
    console.error("Create schedule error", err);
    res.status(500).json({ message: "Server error creating schedule." });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const { id } = req.params;

    const schedule = await ReportSchedule.findOne({ _id: id, adminId });
    if (!schedule) return res.status(404).json({ message: "Schedule not found." });

    await schedule.deleteOne();
    res.json({ message: "Schedule deleted." });
  } catch (err) {
    console.error("Delete schedule error", err);
    res.status(500).json({ message: "Server error deleting schedule." });
  }
};

exports.getSchedulePdf = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const { id } = req.params;

    const schedule = await ReportSchedule.findOne({ _id: id, adminId }).lean();
    if (!schedule) return res.status(404).json({ message: "Schedule not found." });

    const summary = await buildSummaryData(schedule.startDate, schedule.endDate);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="mindsync-schedule-${schedule._id}-${summary.start}-${summary.end}.pdf"`
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text("MindSync Scheduled Wellness Report", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Schedule: ${schedule.frequency}`);
    doc.fontSize(10).text(`Window: ${summary.start} to ${summary.end}`);
    doc.fontSize(10).text(`Total entries: ${summary.totalEntries}`);
    doc.fontSize(10).text(`Average rating: ${summary.overallAvg ?? "N/A"}/10`);
    if (summary.totalEntries === 0) {
      doc.fontSize(10).text("Notice: No data available for this reporting window.");
    }
    if (summary.suppressedDays > 0) {
      doc
        .fontSize(10)
        .text(`Notice: ${summary.suppressedDays} day(s) suppressed for anonymity threshold (${summary.anonymityThreshold}).`);
    }
    doc.moveDown(0.5);

    summary.daily.forEach((d) => {
      const value = d.suppressed ? "suppressed for anonymity" : d.avg !== null ? d.avg : "no data";
      doc.fontSize(9).text(`${d.date}: ${value} (count ${d.count})`);
    });

    doc.end();
  } catch (err) {
    console.error("Schedule PDF error", err);
    res.status(500).json({ message: "Server error generating schedule PDF." });
  }
};

function addDays(date, numDays) {
  const d = new Date(date);
  d.setDate(d.getDate() + numDays);
  return d;
}

function shouldRun(schedule) {
  const nextRun = schedule.lastRun ? new Date(schedule.lastRun) : null;
  const now = new Date();

  if (!nextRun) return true;

  if (schedule.frequency === "daily") {
    return now >= addDays(nextRun, 1);
  }
  if (schedule.frequency === "weekly") {
    return now >= addDays(nextRun, 7);
  }
  if (schedule.frequency === "monthly") {
    const m = new Date(nextRun);
    m.setMonth(m.getMonth() + 1);
    return now >= m;
  }
  if (schedule.frequency === "quarterly") {
    const q = new Date(nextRun);
    q.setMonth(q.getMonth() + 3);
    return now >= q;
  }
  return false;
}

exports.runScheduledReports = async () => {
  try {
    const schedules = await ReportSchedule.find({ active: true });
    if (!schedules.length) return;

    for (const schedule of schedules) {
      if (!shouldRun(schedule)) continue;

      try {
        const summary = await buildSummaryData(schedule.startDate, schedule.endDate);
        console.log("Scheduled report generated", {
          scheduleId: schedule._id,
          period: `${summary.start} - ${summary.end}`,
          totalEntries: summary.totalEntries,
          avg: summary.overallAvg,
        });

        schedule.lastRun = new Date();
        schedule.lastReportTotalEntries = summary.totalEntries;
        schedule.lastReportStatus = summary.totalEntries > 0 ? "ready" : "empty";
        schedule.lastReportNotice = summary.totalEntries > 0
          ? summary.suppressedDays > 0
            ? `Generated with ${summary.suppressedDays} suppressed day(s) to enforce anonymity threshold.`
            : "Generated successfully."
          : "Generated with no data for the reporting window.";
        await schedule.save();
      } catch (e) {
        console.error("Failed to execute scheduled report", schedule._id, e);
        schedule.lastRun = new Date();
        schedule.lastReportStatus = "failed";
        schedule.lastReportNotice = "Scheduled generation failed. Check server logs.";
        await schedule.save();
      }
    }
  } catch (err) {
    console.error("Scheduled report runner error", err);
  }
};
