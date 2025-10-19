const pdf = require("pdf-parse");
const axios = require("axios");
const Tesseract = require("tesseract.js");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
  const {
    data: { text },
  } = await Tesseract.recognize(imageUrl, "eng");
  return text;
}

/* ==========================
   🤖 Generate AI Feedback (Gemini REST API)
========================== */
async function generateAIAnalysis(extractedText) {
  try {
    if (!extractedText || extractedText.trim().length === 0) {
      return { feedback: "❌ No readable text found in report." };
    }

    const prompt = `
You are a helpful AI medical assistant.
Analyze the following lab report and generate a structured response:

1️⃣ Summary of key findings  
2️⃣ Possible health implications  
3️⃣ Recommendations for the patient  
4️⃣ Is report normal or abnormal?

Keep it short and clear for non-technical users.

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
      "⚠️ Gemini returned no output.";

    return { feedback: aiText };
  } catch (err) {
    console.error("AI Analysis error:", err.message);
    return { error: "⚠️ AI analysis failed. Please try again later." };
  }
}

module.exports = {
  extractTextFromPDF,
  extractTextFromImage,
  generateAIAnalysis,
};
