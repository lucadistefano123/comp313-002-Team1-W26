const express = require("express");
const { body, query } = require("express-validator");
const { requireAuth } = require("../middleware/auth.middleware");
const { validationResult } = require("express-validator");
const MoodEntry = require("../models/MoodEntry");

const router = express.Router();
const INSIGHTS_DISCLAIMER = "These insights are descriptive only and are not medical advice.";
const MIN_ENTRIES_FOR_INSIGHTS = 3;

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

// GET /api/moods/history/range?start=YYYY-MM-DD&end=YYYY-MM-DD (comparisons across arbitrary ranges)
router.get(
  "/history/range",
  requireAuth,
  [
    query("start").isISO8601().withMessage("start date must be YYYY-MM-DD"),
    query("end").isISO8601().withMessage("end date must be YYYY-MM-DD"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const startDate = new Date(req.query.start);
    const endDate = new Date(req.query.end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ message: "Invalid date values provided." });
    }

    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    if (endDay < startDay) {
      return res.status(400).json({ message: "End date must be the same or after start date." });
    }

    const maxRangeDays = 365;
    const periodDays = Math.floor((endDay - startDay) / (1000 * 60 * 60 * 24)) + 1;
    if (periodDays > maxRangeDays) {
      return res.status(400).json({ message: "Date range must be 1-365 days." });
    }

    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (startDay > todayLocal || endDay > todayLocal) {
      return res.status(400).json({ message: "Date range cannot include future days." });
    }

    const agg = await MoodEntry.aggregate([
      {
        $match: {
          userId: req.user.id,
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
    agg.forEach((d) => { map[d._id] = Math.round(d.avg * 10) / 10; });

    const result = [];
    for (let i = 0; i < periodDays; i++) {
      const d = new Date(startDay);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, avg: map[key] ?? null });
    }

    res.json({ history: result });
  }
);

// GET /api/moods/insights?days=7  (AI-powered mood insights)
router.get(
  "/insights",
  requireAuth,
  [
    query("days").optional().isInt({ min: 1, max: 365 }).withMessage("days must be 1–365"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const days = req.query.days ? parseInt(req.query.days, 10) : 7;
      
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));
      const fromStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());

      const entries = await MoodEntry.find({
        userId: req.user.id,
        entryDate: { $gte: fromStart },
      }).sort({ createdAt: -1 }).lean();

      if (entries.length === 0) {
        return res.json({ 
          insights: "No mood entries yet. Start logging your mood to get personalized insights!",
          summary: {
            period: `Last ${days} days`,
          },
          disclaimer: INSIGHTS_DISCLAIMER,
        });
      }

      if (entries.length < MIN_ENTRIES_FOR_INSIGHTS) {
        return res.json({
          insights: `Not enough data yet for a reliable pattern summary. Add at least ${MIN_ENTRIES_FOR_INSIGHTS} entries to improve insight quality.`,
          summary: {
            totalEntries: entries.length,
            period: `Last ${days} days`,
          },
          disclaimer: INSIGHTS_DISCLAIMER,
        });
      }

      // Analyze patterns
      const ratings = entries.map(e => e.rating);
      const allTags = entries.flatMap(e => e.tags);
      const tagCounts = {};
      
      allTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      const avgRating = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
      const maxRating = Math.max(...ratings);
      const minRating = Math.min(...ratings);
      const trend = ratings[0] > ratings[ratings.length - 1] ? "declining" : ratings[0] < ratings[ratings.length - 1] ? "improving" : "stable";
      
      const topEmotions = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag, count]) => ({ tag, count }));

      // Check for significant changes (alerts)
      const recentAvg = ratings.slice(0, Math.ceil(ratings.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(ratings.length / 2);
      const olderAvg = ratings.slice(Math.ceil(ratings.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(ratings.length / 2);
      const moodChangeAlert = Math.abs(recentAvg - olderAvg) > 2.5 ? `Your mood has ${recentAvg > olderAvg ? "significantly improved" : "declined"} recently.` : null;

      // Find correlations between tags and ratings
      const tagRatings = {};
      entries.forEach(entry => {
        entry.tags.forEach(tag => {
          if (!tagRatings[tag]) tagRatings[tag] = [];
          tagRatings[tag].push(entry.rating);
        });
      });

      const tagCorrelations = Object.entries(tagRatings)
        .map(([tag, ratings]) => ({
          tag,
          avgRating: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        }))
        .sort((a, b) => a.avgRating - b.avgRating);

      const summary = {
        totalEntries: entries.length,
        avgRating,
        maxRating,
        minRating,
        trend,
        topEmotions,
        moodChangeAlert,
        tagCorrelations: tagCorrelations.slice(0, 5),
        period: `Last ${days} days`
      };

      const hasMixedMoodSignals = ratings.some((r) => r <= 4) && ratings.some((r) => r >= 7);

      // Generate AI insights using OpenAI
      const OpenAI = require("openai").default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const entriesDescription = entries
        .map(e => `- ${new Date(e.createdAt).toLocaleDateString()}: Mood ${e.rating}/10 with feelings of ${e.tags.join(", ") || "unspecified"}${e.note ? `. Note: ${e.note}` : ""}`)
        .join("\n");

      const prompt = `You are a compassionate wellness insights assistant. Analyze this person's mood data from the last ${days} days and provide non-clinical, descriptive insights only.

MOOD DATA:
${entriesDescription}

KEY PATTERNS:
- Average mood: ${avgRating}/10
- Mood trend: ${trend}
- Most common feelings: ${topEmotions.map(e => e.tag).join(", ") || "none logged"}
- Mood range: ${minRating}-${maxRating}
${moodChangeAlert ? `- Alert: ${moodChangeAlert}` : ""}
${hasMixedMoodSignals ? "- Mixed mood pattern observed: includes both lower and higher mood periods" : ""}

Please provide:
1. A brief summary of their mood pattern (1-2 sentences)
2. Two specific observations about their emotional state
3. One personalized coping suggestion or positive action they could take
4. An encouraging note
5. A final line that explicitly says: "These insights are descriptive only and are not medical advice."

Keep the tone warm, empathetic, and supportive. Be specific to their data.`;

      const message = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const insights = message.choices[0].message.content;

      res.json({ insights, summary, disclaimer: INSIGHTS_DISCLAIMER });

    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ message: "Failed to generate insights", error: error.message });
    }
  }
);

module.exports = router;
