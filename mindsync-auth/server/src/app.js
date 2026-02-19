const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const moodRoutes = require("./routes/mood.routes");

function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  app.use(
    cors({
      origin: process.env.CLIENT_URL || true,
      credentials: true
    })
  );

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/moods", moodRoutes);

  // Serve React build
  const clientDistPath = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDistPath));

  // Express 5-safe React Router fallback
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });

  return app;
}

module.exports = createApp;
