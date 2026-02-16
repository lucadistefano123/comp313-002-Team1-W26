const express = require("express");
const { body } = require("express-validator");
const auth = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post(
  "/register",
  [
    body("fullName").trim().isLength({ min: 2 }).withMessage("Full name is required."),
    body("email").isEmail().withMessage("Valid email is required."),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
  ],
  auth.register
);

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
