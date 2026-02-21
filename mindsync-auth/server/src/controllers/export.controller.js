const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");
const MoodEntry = require("../models/MoodEntry");

function buildDateRangeFilter(startDate, endDate) {
  const filter = {};
  if (startDate) filter.$gte = new Date(startDate);
  if (endDate) filter.$lte = new Date(endDate);
  return Object.keys(filter).length ? filter : null;
}

exports.exportUserData = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authenticated." });

    const format = String(req.query.format || "csv").toLowerCase(); // csv | pdf
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const entryDateFilter = buildDateRangeFilter(startDate, endDate);

    const query = { userId };
    if (entryDateFilter) query.entryDate = entryDateFilter;

    const moods = await MoodEntry.find(query).sort({ entryDate: -1 }).lean();

    if (!moods || moods.length === 0) {
      return res.status(404).json({
        message: "No mood entries found for the selected time range.",
      });
    }

    const rows = moods.map((m) => ({
      recordType: "mood",
      entryDate: m.entryDate ? new Date(m.entryDate).toISOString().slice(0, 10) : "",
      rating: m.rating ?? "",
      tags: Array.isArray(m.tags) ? m.tags.join(", ") : "",
      note: m.note || "",
      createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : "",
      updatedAt: m.updatedAt ? new Date(m.updatedAt).toISOString() : "",
    }));

    const filenameBase = `mindsync-export-${new Date().toISOString().slice(0, 10)}`;

    // =========================
    // CSV
    // =========================
    if (format === "csv") {
      const fields = ["recordType", "entryDate", "rating", "tags", "note", "createdAt", "updatedAt"];
      const parser = new Parser({ fields });
      const csv = parser.parse(rows);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.csv"`);
      return res.status(200).send(csv);
    }

    // =========================
    // PDF
    // =========================
    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.pdf"`);

      const doc = new PDFDocument({ margin: 40 });
      doc.pipe(res);

      doc.fontSize(18).text("MindSync Mood Export", { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`);
      if (startDate || endDate) {
        doc.text(`Range (entryDate): ${startDate || "Any"} → ${endDate || "Any"}`);
      }
      doc.moveDown();

      // Summary
      const avg =
        rows.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / rows.length;

      doc.fontSize(12).text("Summary", { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).text(`Total entries: ${rows.length}`);
      doc.fontSize(10).text(`Average rating: ${avg.toFixed(2)}/10`);
      doc.moveDown();

      // Entries
      doc.fontSize(12).text("Entries", { underline: true });
      doc.moveDown(0.5);

      rows.forEach((r, i) => {
        doc.fontSize(10).text(`${i + 1}. ${r.entryDate} — Rating: ${r.rating}/10`);
        if (r.tags) doc.text(`Tags: ${r.tags}`);
        if (r.note) doc.text(`Note: ${r.note}`);
        doc.text(`Created: ${r.createdAt}`);
        doc.moveDown();
      });

      doc.end();
      return;
    }

    return res.status(400).json({ message: "Invalid format. Use csv or pdf." });
  } catch (err) {
    console.error("Export error:", err);
    return res.status(500).json({ message: "Server error exporting data." });
  }
};