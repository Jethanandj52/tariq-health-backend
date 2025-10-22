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
   🧠 Extract Text from Image
========================== */
async function extractTextFromImage(imageUrl) {
  try {
    console.log("🖼️ Performing OCR on image:", imageUrl);
    const {
      data: { text },
    } = await Tesseract.recognize(imageUrl, "eng", {
      logger: (m) => console.log(m.status),
    });
    return text.trim();
  } catch (err) {
    console.error("❌ Image OCR Failed:", err.message);
    return "";
  }
}

/* ==========================
   ⚡ Generate AI Feedback (Gemini)
========================== */
async function generateAIAnalysis(extractedText) {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key not found in environment variables.");
    }

    if (!extractedText || extractedText.length < 30) {
      return { feedback: "⚠ No readable text found in report." };
    }

    // ✂️ Limit text size for faster response
    const limitedText = extractedText.slice(0, 3000);

    const prompt = `
You are an AI medical assistant. Analyze this lab report and respond clearly with:
1. Summary of findings
2. Possible health implications
3. Recommendations
4. Whether the report appears normal or abnormal
Keep the response concise (under 200 words).

Report:
${limitedText}
`;

    console.log("⚙️ Sending request to Gemini API...");

    // Use smaller, faster Gemini model (if flash is slow)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await axios.post(
      apiUrl,
      { contents: [{ parts: [{ text: prompt }] }] },
      { timeout: 30000, headers: { "Content-Type": "application/json" } }
    );

    const aiText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠ Gemini returned no output.";

    console.log("✅ AI Analysis Completed");
    return { feedback: aiText };
  } catch (err) {
    console.error("❌ AI Analysis Error:", err.message);
    return { feedback: "⚠ AI analysis failed or took too long. Please try again." };
  }
}

module.exports = { extractTextFromPDF, extractTextFromImage, generateAIAnalysis };
