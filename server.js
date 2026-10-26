
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const SENIOR_PROMPT = `
Kamu adalah Solusi AI, asisten AI dan coding partner berbahasa Indonesia.
Bantu pengguna memahami gambar, membaca teks, menganalisis kode,
memperbaiki error, membuat website, dan menyusun jadwal pelajaran.
Jawab secara jelas, akurat, dan langsung ke inti masalah.
Jangan mengaku sebagai manusia.
Jika gambar atau konteks tidak tersedia, jelaskan dengan jujur.
`;

app.get("/", (req, res) => {
  res.json({
    status: "OK Live",
    endpoint: "/api/chat",
    persona: "Solusi AI"
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, messages, imageBase64, mimeType } = req.body ?? {};

    let userPrompt = "";

    if (typeof message === "string") {
      userPrompt = message;
    } else if (Array.isArray(messages) && messages.length > 0) {
      const last = messages[messages.length - 1];
      userPrompt = String(last?.content ?? last?.text ?? "");
    }

    if (!userPrompt.trim() && !imageBase64) {
      return res.status(400).json({
        error: "Pesan atau gambar harus disertakan."
      });
    }

    if (!ai) {
      return res.status(500).json({
        error: "GEMINI_API_KEY belum disetel di Render."
      });
    }

    const parts = [];

    if (userPrompt.trim()) {
      parts.push({ text: userPrompt });
    }

    if (imageBase64) {
      if (typeof imageBase64 !== "string") {
        return res.status(400).json({
          error: "Format data gambar tidak valid."
        });
      }

      const cleanBase64 = imageBase64.replace(
        /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
        ""
      );

      const supportedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif"
      ];

      const resolvedMime = supportedMimeTypes.includes(mimeType)
        ? mimeType
        : "image/jpeg";

      let imageBuffer;

      try {
        imageBuffer = Buffer.from(cleanBase64, "base64");
      } catch {
        return res.status(400).json({
          error: "Data gambar tidak dapat dibaca."
        });
      }

      if (imageBuffer.length === 0) {
        return res.status(400).json({
          error: "Gambar kosong atau tidak valid."
        });
      }

      parts.push({
        inlineData: {
          mimeType: resolvedMime,
          data: cleanBase64
        }
      });
    }

    const modelName =
      process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const result = await ai.models.generateContent({
      model: modelName,
      config: {
        systemInstruction: SENIOR_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 2000
      },
      contents: [
        {
          role: "user",
          parts
        }
      ]
    });

    const reply = result.text?.trim();

    if (!reply) {
      return res.status(502).json({
        error: "Gemini tidak memberikan jawaban. Silakan coba lagi."
      });
    }

    return res.json({ reply });
  } catch (e) {
    console.error("Kesalahan /api/chat:", e);

    return res.status(500).json({
      error: e?.message || "Terjadi kesalahan pada backend Solusi AI."
    });
  }
});

app.listen(port, () => {
  console.log(`Solusi AI berjalan di port ${port}`);
});
