const axios = require("axios");
const Tesseract = require("tesseract.js");
const PDFParser = require("pdf2json");
const fs = require("fs");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/* ==========================
   🔍 Extract Text from PDF (pdf2json - Works on Vercel)
========================== */
async function extractTextFromPDF(pdfUrl) {
  try {
    const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    const tempPath = `/tmp/temp_${Date.now()}.pdf`;
    fs.writeFileSync(tempPath, Buffer.from(response.data));

    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();

      pdfParser.on("pdfParser_dataError", (errData) =>
        reject(errData.parserError)
      );

      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        try {
          let text = "";
          pdfData.Pages.forEach((page) => {
            page.Texts.forEach((t) => {
              text += decodeURIComponent(t.R[0].T) + " ";
            });
          });
          resolve(text.trim());
        } catch (err) {
          reject(err);
        }
      });

      pdfParser.loadPDF(tempPath);
    });
  } catch (error) {
    console.error("❌ PDF Extraction Failed:", error.message);
    return "";
  }
}

/* ==========================
   🧠 Extract Text from Image (OCR)
========================== */
async function extractTextFromImage(imageUrl) {
  try {
    const {
      data: { text },
    } = await Tesseract.recognize(imageUrl, "eng");
    return text;
  } catch (err) {
    console.error("❌ Image OCR Failed:", err.message);
    return "";
  }
}

/* ==========================
   🤖 Generate AI Feedback (Gemini API)
========================== */
async function generateAIAnalysis(extractedText) {
  try {
    if (!extractedText || extractedText.trim().length < 20) {
      return { feedback: "⚠ No readable text found in report." };
    }

    const prompt = `
You are an AI medical assistant. Analyze the following lab report and respond with:
1️⃣ Summary of findings
2️⃣ Possible health implications
3️⃣ Recommendations
4️⃣ Whether the report appears normal or abnormal

Keep it simple, clear, and under 250 words.

Report Text:
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
    return { error: "⚠ AI analysis failed. Please try again later." };
  }
}

module.exports = {
  extractTextFromPDF,
  extractTextFromImage,
  generateAIAnalysis,
};
