const axios = require("axios");
const PDFParser = require("pdf2json");
const fs = require("fs");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY;

/* ==========================
   🔍 Extract Text from PDF
========================== */
async function extractTextFromPDF(pdfUrl) {
  try {
    console.log("📄 Downloading PDF from:", pdfUrl);
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });

    const tempPath = `/tmp/pdf_${Date.now()}.pdf`;
    fs.writeFileSync(tempPath, Buffer.from(response.data));

    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();

      pdfParser.on("pdfParser_dataError", (err) => reject(err.parserError));
      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        try {
          const text = pdfData.Pages.map((page) =>
            page.Texts.map((t) => decodeURIComponent(t.R[0].T)).join(" ")
          ).join(" ");
          fs.unlinkSync(tempPath);
          resolve(text.trim());
        } catch (err) {
          reject(err);
        }
      });

      pdfParser.loadPDF(tempPath);
    });
  } catch (err) {
    console.error("❌ PDF Extraction Failed:", err.message);
    return "";
  }
}

/* ==========================
   🧠 Extract Text from Image (OCR.space)
========================== */
async function extractTextFromImage(imageUrl) {
  try {
    console.log("🖼️ Extracting text using OCR.space:", imageUrl);

    const formData = new URLSearchParams();
    formData.append("url", imageUrl);
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");

    const res = await axios.post("https://api.ocr.space/parse/image", formData, {
      headers: {
        apikey: OCR_SPACE_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 20000,
    });

    const text = res.data.ParsedResults?.[0]?.ParsedText || "";
    return text.trim();
  } catch (err) {
    console.error("❌ Image OCR Failed:", err.message);
    return "";
  }
}

/* ==========================
   ⚡ Generate AI Feedback (Gemini 1.5 Flash Lite)
========================== */
async function generateAIAnalysis(extractedText) {
  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key missing.");

    if (!extractedText || extractedText.length < 30) {
      return { feedback: "⚠ No readable text found in the report." };
    }

    const limitedText = extractedText.slice(0, 3000);

    const prompt = `
You are an AI medical assistant. Analyze the following lab report and provide:
1. Summary of findings
2. Possible health implications
3. Recommendations
4. Overall assessment (Normal / Abnormal)
Keep the explanation clear, short, and under 200 words.

Report:
${limitedText}
`;

    console.log("⚙️ Sending request to Gemini 1.5 Flash Lite...");

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const response = await axios.post(
      apiUrl,
      { contents: [{ parts: [{ text: prompt }] }] },
      {
        timeout: 20000, // ⏳ Increased timeout for safety
        headers: { "Content-Type": "application/json" },
      }
    );

    const aiText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "⚠ Gemini returned no response.";

    console.log("✅ AI Analysis Completed Successfully");
    return { feedback: aiText };
  } catch (err) {
    console.error("❌ AI Analysis Error:", err.message);
    return {
      feedback: "⚠ AI analysis failed or took too long. Please try again.",
    };
  }
}

module.exports = {
  extractTextFromPDF,
  extractTextFromImage,
  generateAIAnalysis,
};
