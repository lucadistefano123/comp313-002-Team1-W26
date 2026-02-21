const express = require("express");
const { body, query } = require("express-validator");
const { requireAuth } = require("../middleware/auth.middleware");
const { validationResult } = require("express-validator");
const MoodEntry = require("../models/MoodEntry");

const router = express.Router();

// Allowed tags (same list you’ll show in UI)
const ALLOWED_TAGS = [
  "stressed", "anxious", "calm", "happy", "sad", "tired", "motivated",
  "angry", "overwhelmed", "focused", "lonely", "confident"
];

// helper: normalize date to start-of-day (local)
function startOfTodayLocal(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// POST /api/moods  (create mood entry)
router.post(
  "/",
  requireAuth,
  [
    body("rating").isInt({ min: 1, max: 10 }).withMessage("Rating must be an integer 1–10."),
    body("tags").optional().isArray().withMessage("Tags must be an array."),
    body("tags.*").optional().isString().trim(),
    body("note").optional().isString().trim().isLength({ max: 280 }).withMessage("Note max is 280 chars."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { rating, tags = [], note = "" } = req.body;

    // validate tags against allow-list
    const cleanTags = tags
      .map((t) => String(t).toLowerCase().trim())
      .filter(Boolean);

    const invalid = cleanTags.filter((t) => !ALLOWED_TAGS.includes(t));
    if (invalid.length) {
      return res.status(400).json({ message: `Invalid tags: ${invalid.join(", ")}` });
    }

    // Option: one entry per day (overwrite/update). For now we’ll allow multiple.
    const entry = await MoodEntry.create({
      userId: req.user.id,
      rating,
      tags: Array.from(new Set(cleanTags)),
      note,
      entryDate: startOfTodayLocal(),
    });

    return res.status(201).json({ entry });
  }
);

// GET /api/moods?days=7  (quick history for testing)
router.get(
  "/",
  requireAuth,
  [
    query("days").optional().isInt({ min: 1, max: 365 }).withMessage("days must be 1–365"),
  ],
  async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days, 10) : 7;

    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const fromStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());

    const entries = await MoodEntry.find({
      userId: req.user.id,
      entryDate: { $gte: fromStart },
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ entries });
  }
);

// GET /api/moods/history?days=7|30  (aggregated daily averages for chart)
router.get(
  "/history",
  requireAuth,
  [
    query("days").optional().isInt({ min: 1, max: 365 }).withMessage("days must be 1–365"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const days = req.query.days ? parseInt(req.query.days, 10) : 7;

    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const fromStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());

    // Group by calendar day, compute average rating per day
    const agg = await MoodEntry.aggregate([
      {
        $match: {
          userId: req.user.id,
          entryDate: { $gte: fromStart },
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

    // Build full date range so missing days appear as null (not skipped)
    const map = {};
    agg.forEach((d) => { map[d._id] = Math.round(d.avg * 10) / 10; });

    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(fromStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, avg: map[key] ?? null });
    }

    res.json({ history: result });
  }
);

module.exports = router;
