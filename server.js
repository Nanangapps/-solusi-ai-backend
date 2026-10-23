
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "20kb" }));

const apiKey = process.env.GEMINI_API_KEY;

const ai = apiKey
  ? new GoogleGenAI({ apiKey })
  : null;

app.get("/", (req, res) => {
  res.json({
    app: "Solusi AI",
    status: "online",
    provider: "Google Gemini"
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!ai) {
      return res.status(503).json({
        error: "Gemini API belum dikonfigurasi di server."
      });
    }

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Pesan tidak boleh kosong."
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        error: "Pesan maksimal 4000 karakter."
      });
    }

    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: message.trim(),
      config: {
        systemInstruction:
          "Kamu adalah Solusi AI, asisten yang ramah dan membantu. " +
          "Jawab menggunakan bahasa pengguna. " +
          "Untuk pertanyaan coding, jelaskan langkah-langkahnya " +
          "dan berikan contoh kode yang mudah dipahami."
      }
    });

    res.json({
      reply: result.text || "Maaf, AI belum menghasilkan jawaban."
    });
  } catch (error) {
    console.error("Gemini API error:", error.message);

    res.status(500).json({
      error: "Solusi AI sedang mengalami kendala. Silakan coba lagi."
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Solusi AI berjalan di port ${port}`);
});
