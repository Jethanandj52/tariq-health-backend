// src/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const { routes } = require("./routes/auth");
const doctorRoutes = require("./routes/doctorRoutes");
const familyRoutes = require("./routes/familyRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

// ✅ Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://your-frontend.vercel.app", // apna frontend domain daalna
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ✅ Lazy MongoDB connection (Vercel friendly)
let isConnected = false;
async function connectDB() {
  if (isConnected) return; // reuse connection (important for serverless)
  try {
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 8000, // prevent long timeout
    });
    isConnected = true;
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
}

// ✅ Connect before any route
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// ✅ Main routes
app.use("/auth", routes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/reports", reportRoutes);

// ✅ Root test route
app.get("/", (req, res) => {
  res.send("✅ Backend is live & running on Vercel!");
});

// ✅ Export the app (no app.listen())
module.exports = app;
