const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const clinicianRoutes = require("./routes/clinician.routes");
const authRoutes = require("./routes/auth.routes");
const moodRoutes = require("./routes/mood.routes");
const exportRoutes = require("./routes/export.routes");

function createApp() {
  const app = express();

  // =============================
  // CORE MIDDLEWARE
  // =============================
  app.use(express.json());
  app.use(cookieParser());

  app.use(
    cors({
      origin: process.env.CLIENT_URL || true,
      credentials: true,
    })
  );

  // =============================
  // SECURITY
  // =============================
  app.use(helmet());

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
    })
  );

  const exportLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
  });

  // =============================
  // API ROUTES (MUST BE FIRST)
  // =============================
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/moods", moodRoutes);
  app.use("/api/export", exportLimiter, exportRoutes);
  app.use("/api/clinician", clinicianRoutes);

  // =============================
  // REACT STATIC BUILD
  // =============================
  const clientDistPath = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDistPath));

  // =============================
  // REACT ROUTER FALLBACK
  // IMPORTANT: DO NOT CATCH /api
  // =============================
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });

  return app;
}

module.exports = createApp;