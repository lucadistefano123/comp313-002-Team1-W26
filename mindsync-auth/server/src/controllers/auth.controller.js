const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User");

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd, // true only in https prod
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function normalizeRole(role) {
  const r = String(role || "user").toLowerCase().trim();
  const allowed = ["user", "clinician", "admin"];
  return allowed.includes(r) ? r : "user";
}

function isTrue(v) {
  return String(v || "").toLowerCase() === "true";
}

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { fullName, email, password, role } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ message: "Email already in use." });

  // ✅ role support (with safe gating)
  let finalRole = normalizeRole(role);

  // By default, block public creation of admin/clinician accounts.
  // Enable via env vars for testing if you want.
  if (finalRole === "admin" && !isTrue(process.env.ALLOW_PUBLIC_ADMIN)) {
    finalRole = "user";
  }
  if (finalRole === "clinician" && !isTrue(process.env.ALLOW_PUBLIC_CLINICIAN)) {
    finalRole = "user";
  }

  const user = new User({
    fullName,
    email: email.toLowerCase(),
    role: finalRole,
  });

  user.password = password; // triggers hashing in the User model pre-save
  await user.save();

  const token = signToken(user);
  setAuthCookie(res, token);

  return res.status(201).json({
    user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
  });
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ message: "Invalid email or password." });
  if (!user.isActive) return res.status(403).json({ message: "Account is disabled." });

  const ok = await user.comparePassword(password);
  if (!ok) return res.status(401).json({ message: "Invalid email or password." });

  const token = signToken(user);
  setAuthCookie(res, token);

  return res.json({
    user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
  });
};

exports.logout = async (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
};