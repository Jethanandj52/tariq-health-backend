// src/config/dataBase.js
const mongoose = require("mongoose");

async function dbConnected() {
  const dbUrl = process.env.DB_URL;
  if (!dbUrl) throw new Error("DB_URL is missing in environment variables");
  await mongoose.connect(dbUrl);
}

module.exports = { dbConnected };
