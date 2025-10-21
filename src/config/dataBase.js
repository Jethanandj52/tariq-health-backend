const mongoose = require("mongoose");

async function dbConnected() {
  const dbUrl = process.env.DB_URL;

  if (!dbUrl) {
    console.error("❌ DB_URL missing in environment variables");
    return;
  }

  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 sec timeout
    });
    console.log("✅ MongoDB connected successfully!");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
}

module.exports = { dbConnected };
