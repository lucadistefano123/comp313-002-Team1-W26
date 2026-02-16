require("dotenv").config();

const createApp = require("./app");
const connectDB = require("./config/db");

async function start() {
  await connectDB(process.env.MONGO_URI);

  const app = createApp();
  const port = process.env.PORT || 5000;

  app.listen(port, () => {
    console.log(`✅ Server running on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error("❌ Server failed:", err);
  process.exit(1);
});
