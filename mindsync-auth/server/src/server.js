require("dotenv").config();

const createApp = require("./app");
const connectDB = require("./config/db");

const adminRoutes = require("./routes/admin.routes");
const flagsRoutes = require("./routes/flags.routes");

const { seedFeatureFlags } = require("./utils/seedFeatureFlags");
const { runScheduledReports } = require("./controllers/report.controller");

async function start() {
  await connectDB(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  await seedFeatureFlags();
  console.log("✅ Feature flags seeded");

  const app = createApp();

  app.use("/api/admin", adminRoutes);
  app.use("/api/flags", flagsRoutes);

  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`✅ Server running on http://localhost:${port}`);
  });

  // Start a light scheduler to execute pending report jobs
  setInterval(() => {
    runScheduledReports().catch((err) => {
      console.error("Scheduled reports background error", err);
    });
  }, 60 * 1000);
}

start().catch((err) => {
  console.error("❌ Server failed:", err);
  process.exit(1);
});