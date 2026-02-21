const express = require("express");
const router = express.Router();

const { exportUserData } = require("../controllers/export.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.get("/", requireAuth, exportUserData);

module.exports = router;