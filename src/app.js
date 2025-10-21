// Load environment variables
require("dotenv").config();

// Import dependencies
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const serverless = require("serverless-http");

// Import database and routes
const { dbConnected } = require("./config/dataBase");
const { routes } = require("./routes/auth");
const doctorRoutes = require("./routes/doctorRoutes");
const familyRoutes = require("./routes/familyRoutes");
const reportRoutes = require("./routes/reportRoutes");

// Initialize Express app
const app = express();

// Middleware setup
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://your-frontend.vercel.app"], // 👈 apna frontend URL lagao
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Routes setup
app.use("/auth", routes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/reports", reportRoutes);

// Default route (test)
app.get("/", (req, res) => {
  res.send("✅ Backend is live and running on Vercel!");
});

// Database connection
dbConnected()
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ Database connection failed:", err));

// Local development mode (optional)
if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT || 7000;
  app.listen(port, () => console.log(`🚀 Server running locally on port ${port}`));
}

// Export for Vercel serverless function
module.exports = app;
module.exports.handler = serverless(app);
