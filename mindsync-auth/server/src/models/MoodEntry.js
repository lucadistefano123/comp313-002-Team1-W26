const mongoose = require("mongoose");

const moodEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // 1–10 rating
    rating: { type: Number, required: true, min: 1, max: 10 },

    // predefined tags (we’ll validate against allowed list in the route)
    tags: { type: [String], default: [] },

    // optional short note (not the full journal story yet)
    note: { type: String, default: "", trim: true, maxlength: 280 },

    // store the “day” so you can do per-day charts later
    entryDate: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MoodEntry", moodEntrySchema);
