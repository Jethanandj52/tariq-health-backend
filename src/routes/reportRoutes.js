// routes/report.js
const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const Report = require("../models/Report");
const {
  extractTextFromPDF,
  extractTextFromImage,
  generateAIAnalysis,
} = require("../utils/aiAnalysis");

const router = express.Router();

/* ==============================
   ☁ CLOUDINARY CONFIG
============================== */
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
    const files = req.files.map((f) => ({
      fileUrl: f.path || f.secure_url,
      fileType: f.mimetype.includes("pdf") ? "pdf" : "image",
    }));

    const report = await Report.create({ ...req.body, files });
    const first = files[0];
    let extracted = "";

    if (first) {
      extracted =
        first.fileType === "pdf"
          ? await extractTextFromPDF(first.fileUrl)
          : await extractTextFromImage(first.fileUrl);
    }

    const ai = await generateAIAnalysis(extracted);
    report.aiAnalysis = ai.feedback;
    await report.save();

    res.status(201).json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* 🌍 Translation Endpoint */
router.post("/translate", async (req, res) => {
  try {
    const { text, lang } = req.body;
    const translated = await translateTextGemini(text, lang);
    res.json({ success: true, translated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ==============================
   📄 GET Reports by Member
============================== */
router.get("/member/:familyMemberId", async (req, res) => {
  try {
    const reports = await Report.find({
      familyMember: req.params.familyMemberId,
    }).sort({ createdAt: -1 });

    res.json({ success: true, reports });
  } catch (error) {
    console.error("❌ Fetch reports error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==============================
   📄 GET single report
============================== */
router.get("/:id", async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate("familyMember");
    if (!report) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, report });
  } catch (error) {
    console.error("❌ Fetch single report error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==============================
   ✏ UPDATE report (optional AI re-run)
============================== */
router.put("/:id", upload.array("files", 5), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: "Not found" });

    let updatedFiles = report.files || [];
    if (req.files?.length > 0) {
      const newFiles = req.files.map((file) => ({
        fileUrl: file.path || file.secure_url,
        fileType: file.mimetype.includes("pdf") ? "pdf" : "image",
      }));
      updatedFiles = [...updatedFiles, ...newFiles];
    }

    report.set({ ...req.body, files: updatedFiles });

    if (req.body.rerunAI === "true" && updatedFiles.length > 0) {
      const firstFile = updatedFiles[0];
      const text =
        firstFile.fileType === "pdf"
          ? await extractTextFromPDF(firstFile.fileUrl)
          : await extractTextFromImage(firstFile.fileUrl);
      const ai = await generateAIAnalysis(text);
      report.aiAnalysis = ai.feedback;
    }

    await report.save();
    res.json({ success: true, message: "Updated ✅", report });
  } catch (error) {
    console.error("❌ Update error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/* ==============================
   ❌ DELETE report
============================== */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Report.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted 🗑" });
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
