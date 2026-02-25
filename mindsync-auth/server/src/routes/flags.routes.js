const router = require("express").Router();
const { getFlags, updateFlag } = require("../controllers/flags.controller");

// ✅ keep these EXACT (based on your project)
const { requireAuth } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/requireAdmin");

// GET flags (logged-in users)
router.get("/", requireAuth, getFlags);

// UPDATE flag (admin only)
router.patch("/:key", requireAuth, requireAdmin, updateFlag);

module.exports = router;