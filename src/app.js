// src/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { dbConnected } = require("./config/dataBase");
const { routes } = require("./routes/auth");
const doctorRoutes = require("./routes/doctorRoutes");
const familyRoutes = require("./routes/familyRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://your-frontend.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Routes
app.use("/auth", routes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/reports", reportRoutes);

// Root Route
app.get("/", (req, res) => {
  res.send("✅ Backend is live & running on Vercel!");
});

// ✅ Safe DB connection (wrapped inside async)
(async () => {
  try {
    await dbConnected();
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ DB connection failed:", err);
  }
})();

// ❌ app.listen() mat likho
// ✅ Export the app for Vercel
module.exports = app;
