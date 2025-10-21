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

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://your-frontend.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ✅ Main routes
app.use("/auth", routes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/reports", reportRoutes);

// ✅ Root test route
app.get("/", (req, res) => {
  res.send("✅ Backend is live & running on Vercel!");
});

// ✅ Connect database
dbConnected()
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ DB connection failed:", err));
// ✅ Connect database
 

module.exports = app;

 
