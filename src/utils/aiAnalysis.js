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

    const text = res.data?.ParsedResults?.[0]?.ParsedText || "";
    return text.trim();
  } catch (err) {
    console.error("❌ Image OCR Failed:", err.message);
    return "";
  }
}

/* ==========================
   ⚡ Generate AI Feedback (Gemini 2.5)
========================== */
async function generateAIAnalysis(extractedText) {
  try {
    if (!GEMINI_API_KEY) throw new Error("❌ Gemini API key missing!");

    if (!extractedText || extractedText.length < 30) {
      return { feedback: "⚠ No readable text found in the report." };
    }

    const limitedText = extractedText.slice(0, 10000);

    const prompt = `
You are an advanced AI medical assistant.
Analyze the following lab report text and respond clearly with:

1. 🩺 Summary of Findings  
2. ⚠️ Possible Health Implications  
3. 💡 Recommendations  
4. 🧠 Overall Assessment (Normal/Abnormal)  

Keep the answer short, medically sound, and human-readable.

Report:
${limitedText}
`;

    console.log("⚙️ Sending request to Gemini 2.5 API...");

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await axios.post(
      apiUrl,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 20000,
      }
    );

    // Debug log to inspect full Gemini response
    console.log("🧩 Gemini raw response:", JSON.stringify(response.data, null, 2));

    const aiText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "⚠ Gemini returned no output.";

    console.log("✅ AI Analysis Completed");
    return { feedback: aiText };
  } catch (err) {
    console.error("❌ AI Analysis Error:", err.message);
    return { feedback: "⚠ AI analysis failed. Please try again later." };
  }
}

module.exports = { extractTextFromPDF, extractTextFromImage, generateAIAnalysis };
