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
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ==============================
   🧩 MULTER STORAGE CONFIG
============================== */
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPDF = file.mimetype === "application/pdf";
    return {
      folder: "healthapp/reports",
      resource_type: isPDF ? "raw" : "image",
      allowed_formats: ["jpg", "jpeg", "png", "pdf"],
      type: "upload",  // ensures public delivery
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    };
  },
});


const upload = multer({ storage });

/* ==============================
   🧾 ADD REPORT (UPLOAD + AI)
============================== */
router.post("/add", upload.array("files", 5), async (req, res) => {
  try {
    const body = req.body;

    // Step 1: File details
    const files = (req.files || []).map((file) => ({
      fileUrl: file.path || file.secure_url,
      fileType: file.mimetype.includes("pdf") ? "pdf" : "image",
    }));

    // Step 2: Save initial report
    const report = await Report.create({
      ...body,
      files,
    });

    // Step 3: Extract text from first file
    let extractedText = "";
    if (files.length > 0) {
      const firstFile = files[0];
      try {
        console.log("🧠 Extracting from:", firstFile.fileUrl);
        extractedText =
          firstFile.fileType === "pdf"
            ? await extractTextFromPDF(firstFile.fileUrl)
            : await extractTextFromImage(firstFile.fileUrl);
      } catch (err) {
        console.error("❌ Text extraction failed:", err.message);
      }
    }

    // Step 4: Generate AI analysis
    if (extractedText && extractedText.length > 30) {
      report.aiAnalysis = await generateAIAnalysis(extractedText);
    } else {
      report.aiAnalysis = { feedback: "⚠ No readable text found for AI analysis." };
    }

    await report.save();

    res.status(201).json({
      success: true,
      message: "Report uploaded & analyzed successfully ✅",
      report,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading report or running AI analysis",
      error: error.message,
    });
  }
});

/* ==============================
   📄 GET all reports for a member
============================== */
router.get("/member/:familyMemberId", async (req, res) => {
  try {
    const reports = await Report.find({
      familyMember: req.params.familyMemberId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      reports,
    });
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
    if (!report)
      return res.status(404).json({ success: false, message: "Report not found" });

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
    if (!report)
      return res.status(404).json({ success: false, message: "Report not found" });

    // Merge old + new files
    let updatedFiles = report.files || [];
    if (req.files?.length > 0) {
      const newFiles = req.files.map((file) => ({
        fileUrl: file.path || file.secure_url,
        fileType: file.mimetype.includes("pdf") ? "pdf" : "image",
      }));
      updatedFiles = [...updatedFiles, ...newFiles];
    }

    report.set({ ...req.body, files: updatedFiles });

    // Optional AI re-run
    if (req.body.rerunAI === "true" && updatedFiles.length > 0) {
      const firstFile = updatedFiles[0];
      try {
        const text =
          firstFile.fileType === "pdf"
            ? await extractTextFromPDF(firstFile.fileUrl)
            : await extractTextFromImage(firstFile.fileUrl);
        report.aiAnalysis = await generateAIAnalysis(text);
      } catch (err) {
        console.warn("⚠ AI re-analysis failed:", err.message);
      }
    }

    await report.save();

    res.json({
      success: true,
      message: "Report updated successfully ✅",
      report,
    });
  } catch (error) {
    console.error("❌ Update report error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/* ==============================
   ❌ DELETE report
============================== */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Report.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ success: false, message: "Report not found" });

    res.json({ success: true, message: "Report deleted successfully 🗑" });
  } catch (error) {
    console.error("❌ Delete report error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
