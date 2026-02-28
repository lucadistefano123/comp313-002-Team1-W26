const { body } = require("express-validator");
const router = require("express").Router();

const auth = require("../controllers/auth.controller");
const User = require("../models/User");
const authModule = require("../middleware/auth.middleware");

// ✅ supports both exports: function or { requireAuth }
const requireAuth =
  typeof authModule === "function"
    ? authModule
    : authModule.requireAuth || authModule.auth;

// ✅ REGISTER (simple + correct)
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "fullName, email and password are required." });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    // ✅ allow roles (adjust if you want to block public admin/clinician)
    const safeRole = ["user", "admin", "clinician"].includes(role) ? role : "user";

    const user = new User({
      fullName,
      email: email.toLowerCase().trim(),
      role: safeRole,
    });

    // ✅ this MUST happen before save (your User model hashes into passwordHash)
    user.password = password;
    await user.save();

    return res.status(201).json({
      message: "Registered successfully.",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error." });
  }
});

// ✅ LOGIN (use controller)
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required."),
    body("password").isLength({ min: 1 }).withMessage("Password is required."),
  ],
  auth.login
);

// ✅ ME
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ✅ LOGOUT
router.post("/logout", auth.logout);

module.exports = router;