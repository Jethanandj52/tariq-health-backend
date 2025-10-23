const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const Report = require("../models/Report");
const {
  extractTextFromPDF,
  extractTextFromImage,
  generateAIAnalysis,
  translateTextGemini,
} = require("../utils/aiAnalysis");

const router = express.Router();

/* ☁ CLOUDINARY CONFIG */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "healthapp/reports",
    resource_type: file.mimetype === "application/pdf" ? "raw" : "image",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
    public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
  }),
});
const upload = multer({ storage });

/* 🧾 Upload + AI */
router.post("/add", upload.array("files", 5), async (req, res) => {
  try {
    const { familyMember, language } = req.body;

    const files = req.files.map((f) => ({
      fileUrl: f.path || f.secure_url,
      fileType: f.mimetype.includes("pdf") ? "pdf" : "image",
    }));

    const report = await Report.create({ ...req.body, files, familyMember });
    const first = files[0];
    let extracted = "";

    if (first) {
      extracted =
        first.fileType === "pdf"
          ? await extractTextFromPDF(first.fileUrl)
          : await extractTextFromImage(first.fileUrl);
    }

    const ai = await generateAIAnalysis(extracted, language);
    report.aiAnalysis = ai;
    await report.save();

    res.status(201).json({ success: true, report });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* 🌍 Translation */
router.post("/translate", async (req, res) => {
  try {
    const { text, lang } = req.body;
    const translated = await translateTextGemini(text, lang);
    res.json({ success: true, translated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* 📄 Get by member */
router.get("/member/:familyMemberId", async (req, res) => {
  try {
    const reports = await Report.find({
      familyMember: req.params.familyMemberId,
    }).sort({ createdAt: -1 });

    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* 📄 Get single */
router.get("/:id", async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate("familyMember");
    if (!report) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
