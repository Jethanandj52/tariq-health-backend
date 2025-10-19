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
      resource_type: isPDF ? "raw" : "image", // ✅ PDF ke liye 'raw'
      allowed_formats: ["jpg", "jpeg", "png", "pdf"],
      access_mode: "public",
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`, // ✅ fix: proper string template
    };
  },
});

const upload = multer({ storage });

/* ==============================
   🧾 ADD REPORT (UPLOAD + AI)
============================== */
router.post("/add", upload.array("files", 5), async (req, res) => {
  try {
    const {
      familyMember,
      title,
      testName,
      hospitalOrLab,
      doctorName,
      date,
      price,
      additionalNotes,
      bpSystolic,
      bpDiastolic,
      temperature,
      fastingSugar,
      height,
      weight,
    } = req.body;

    // ✅ STEP 1: Uploaded files info
    const files = (req.files || []).map((file) => ({
      fileUrl: file.path || file.secure_url,
      fileType: file.mimetype.includes("pdf") ? "pdf" : "image",
    }));

    // ✅ STEP 2: Save initial report
    const report = await Report.create({
      familyMember,
      title,
      testName,
      files,
      hospitalOrLab,
      doctorName,
      date,
      price,
      additionalNotes,
      bpSystolic,
      bpDiastolic,
      temperature,
      fastingSugar,
      height,
      weight,
    });

    // ✅ STEP 3: Extract text
    let extractedText = "";
    if (files.length > 0) {
      const firstFile = files[0];
      try {
        console.log("🧠 Extracting from:", firstFile.fileUrl);
        if (firstFile.fileType === "pdf") {
          extractedText = await extractTextFromPDF(firstFile.fileUrl);
        } else {
          extractedText = await extractTextFromImage(firstFile.fileUrl);
        }
      } catch (err) {
        console.error("❌ Text extraction failed:", err.message);
      }
    }

    // ✅ STEP 4: AI Analysis
    if (extractedText && extractedText.length > 30) {
      const aiAnalysis = await generateAIAnalysis(extractedText);
      report.aiAnalysis = aiAnalysis;
    } else {
      report.aiAnalysis = "⚠ No readable text found in file for AI analysis.";
    }

    await report.save();

    res.status(201).json({
      success: true,
      message: "Report uploaded & AI analysis completed ✅",
      report,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Error while uploading report or running AI analysis",
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

    res.status(200).json({
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
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error("❌ Fetch single report error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==============================
   ✏ UPDATE report (Re-run AI optional)
============================== */
router.put("/:id", upload.array("files", 5), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report)
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });

    // ✅ Add new uploaded files
    let updatedFiles = report.files || [];
    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map((file) => ({
        fileUrl: file.path || file.secure_url,
        fileType: file.mimetype.includes("pdf") ? "pdf" : "image",
      }));
      updatedFiles = [...updatedFiles, ...newFiles];
    }

    const {
      title,
      testName,
      hospitalOrLab,
      doctorName,
      date,
      price,
      additionalNotes,
      bpSystolic,
      bpDiastolic,
      temperature,
      fastingSugar,
      height,
      weight,
      rerunAI,
    } = req.body;

    report.set({
      title,
      testName,
      hospitalOrLab,
      doctorName,
      date,
      price,
      additionalNotes,
      bpSystolic,
      bpDiastolic,
      temperature,
      fastingSugar,
      height,
      weight,
      files: updatedFiles,
    });

    // ✅ Optional AI re-run
    if (rerunAI === "true" && updatedFiles.length > 0) {
      try {
        const firstFile = updatedFiles[0];
        let extractedText = "";
        if (firstFile.fileType === "pdf") {
          extractedText = await extractTextFromPDF(firstFile.fileUrl);
        } else {
          extractedText = await extractTextFromImage(firstFile.fileUrl);
        }
        const aiAnalysis = await generateAIAnalysis(
          extractedText || "No extracted text found"
        );
        report.aiAnalysis = aiAnalysis;
      } catch (err) {
        console.warn("⚠ AI re-analysis failed:", err);
      }
    }

    const updatedReport = await report.save();
    res.status(200).json({
      success: true,
      message: "Report updated successfully ✅",
      updatedReport,
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
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });

    res.status(200).json({
      success: true,
      message: "Report deleted successfully 🗑",
    });
  } catch (error) {
    console.error("❌ Delete report error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
