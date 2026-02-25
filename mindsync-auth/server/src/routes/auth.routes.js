const express = require("express");
const { body } = require("express-validator");
const auth = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = require("express").Router();
const User = require("../models/User");

// ✅ REGISTER
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "fullName, email and password are required." });
    }

    // ✅ prevent duplicate email
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    // ✅ allow role ONLY if it's admin or user
    const safeRole = role === "admin" ? "admin" : "user";

    // ✅ create user (your model hashes via virtual password)
    const user = new User({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      role: safeRole,
    });

    user.password = password; // triggers hashing in User.js pre("validate")
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
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required."),
    body("password").isLength({ min: 1 }).withMessage("Password is required.")
  ],
  auth.login
);

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});


router.post("/logout", auth.logout);

module.exports = router;
