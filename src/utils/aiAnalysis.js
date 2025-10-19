const pdf = require("pdf-parse");
const axios = require("axios");
const Tesseract = require("tesseract.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ✅ Gemini AI Client Config
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ==========================
   🔍 Extract Text from PDF
========================== */
async function extractTextFromPDF(pdfUrl) {
  const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
  const data = await pdf(response.data);
  return data.text;
}

/* ==========================
   🔍 Extract Text from Image (OCR)
========================== */
async function extractTextFromImage(imageUrl) {
  const { data: { text } } = await Tesseract.recognize(imageUrl, "eng");
  return text;
}

/* ==========================
   🤖 Generate AI Feedback using Gemini
========================== */
async function generateAIAnalysis(text) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      You are a medical analysis assistant.
      Analyze the following lab report text and generate:
      1. Summary of findings
      2. Possible health implications
      3. Simple advice in 2–3 lines.

      Report text:
      ${text}
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("AI Analysis error:", err);
    return "⚠️ AI analysis failed. Please try again later.";
  }
}

module.exports = {
  extractTextFromPDF,
  extractTextFromImage,
  generateAIAnalysis,
};
