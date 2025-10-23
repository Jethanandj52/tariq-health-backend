const axios = require("axios");
const PDFParser = require("pdf2json");
const fs = require("fs");

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  "AIzaSyCF8IutexTkZhF6k155aDHmTXQ59kHWJwA"; // apni valid Gemini key
const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY;

/* 📄 Extract Text from PDF */
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

/* 🖼️ Extract Text from Image */
async function extractTextFromImage(imageUrl) {
  try {
    const formData = new URLSearchParams();
    formData.append("url", imageUrl);
    formData.append("language", "eng");

    const res = await axios.post("https://api.ocr.space/parse/image", formData, {
      headers: {
        apikey: OCR_SPACE_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return res.data.ParsedResults?.[0]?.ParsedText?.trim() || "";
  } catch (err) {
    console.error("❌ OCR Failed:", err.message);
    return "";
  }
}

/* 🌐 Translation Helper */
async function translateTextGemini(text, targetLang) {
  try {
    if (!text || !targetLang) return text;

    const langFull =
      targetLang === "romanUrdu"
        ? "Roman Urdu"
        : targetLang === "romanHindi"
        ? "Roman Hindi"
        : "English";

    const prompt = `Translate the following English text into ${langFull}. 
Use Roman script if Urdu or Hindi. Keep natural and accurate tone.

Text:
${text}`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const body = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    const response = await axios.post(apiUrl, body, {
      headers: { "Content-Type": "application/json" },
    });

    return (
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠ Translation failed."
    );
  } catch (err) {
    console.error("❌ Translation error:", err.message);
    return "⚠ Translation failed.";
  }
}

/* ⚡ AI Feedback */
async function generateAIAnalysis(extractedText, language = "english") {
  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key missing.");
    if (!extractedText || extractedText.length < 30)
      return { feedback: "⚠ No readable text found in report." };

    const prompt = `
You are an AI medical assistant. Analyze this lab report and respond with:
1. Summary of findings
2. Possible health implications
3. Recommendations
4. Whether the report is normal or abnormal
Keep it under 200 words.

Report:
${extractedText.slice(0, 3000)}
`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const body = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    const response = await axios.post(apiUrl, body, {
      headers: { "Content-Type": "application/json" },
    });

    const aiText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠ Gemini returned no output.";

    // Translate if language set
    let translated = aiText;
    if (language === "romanHindi" || language === "romanUrdu") {
      translated = await translateTextGemini(aiText, language);
    }

    return { feedback: aiText, translated };
  } catch (err) {
    console.error("❌ AI Analysis Error:", err.message);
    return { feedback: "⚠ AI analysis failed." };
  }
}

module.exports = {
  extractTextFromPDF,
  extractTextFromImage,
  generateAIAnalysis,
  translateTextGemini,
};
