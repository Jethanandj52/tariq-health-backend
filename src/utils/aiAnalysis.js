const axios = require("axios");
const Tesseract = require("tesseract.js");
const PDFParser = require("pdf2json");
const fs = require("fs");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/* ==========================
   🔍 Extract Text from PDF
========================== */
async function extractTextFromPDF(pdfUrl) {
  try {
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
   🧠 Extract Text from Image
========================== */
async function extractTextFromImage(imageUrl) {
  try {
    const {
      data: { text },
    } = await Tesseract.recognize(imageUrl, "eng");
    return text.trim();
  } catch (err) {
    console.error("❌ Image OCR Failed:", err.message);
    return "";
  }
}

/* ==========================
   🤖 Generate AI Feedback (Gemini)
========================== */
async function generateAIAnalysis(extractedText) {
  try {
    if (!extractedText || extractedText.length < 20) {
      return { feedback: "⚠ No readable text found in report." };
    }

    const prompt = `
You are an AI medical assistant. Analyze this lab report and respond with:
1. Summary of findings
2. Possible health implications
3. Recommendations
4. Whether the report appears normal or abnormal

Keep your response simple and clear, under 250 words.

Report:
${extractedText.slice(0, 8000)}
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { "Content-Type": "application/json" } }
    );

    const aiText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠ Gemini returned no output.";

    return { feedback: aiText };
  } catch (err) {
    console.error("AI Analysis error:", err.message);
    return { feedback: "⚠ AI analysis failed. Try again later." };
  }
}

module.exports = { extractTextFromPDF, extractTextFromImage, generateAIAnalysis };
