
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
    persona: "Solusi AI",
    endpoints: ["/api/chat", "/api/generate-image"]
  });
});

// Chat dan analisis gambar yang sudah ada.
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

      const imageBuffer = Buffer.from(cleanBase64, "base64");

      if (!imageBuffer.length) {
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

    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      config: {
        systemInstruction: SENIOR_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 2000
      },
      contents: [{ role: "user", parts }]
    });

    const reply = result.text?.trim();

    if (!reply) {
      return res.status(502).json({
        error: "Gemini tidak memberikan jawaban."
      });
    }

    return res.json({ reply });
  } catch (e) {
    console.error("Kesalahan /api/chat:", e);
    return res.status(500).json({
      error: "Chat gagal diproses. Periksa log Render."
    });
  }
});

// BARU: Membuat gambar dari deskripsi teks.
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body ?? {};

    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        error: "Deskripsi gambar harus diisi."
      });
    }

    if (prompt.length > 4000) {
      return res.status(400).json({
        error: "Deskripsi gambar maksimal 4000 karakter."
      });
    }

    if (!ai) {
      return res.status(500).json({
        error: "GEMINI_API_KEY belum disetel di Render."
      });
    }

    const model =
      process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

    const result = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Buat satu gambar sesuai deskripsi berikut. " +
                "Hasilkan gambar, bukan hanya penjelasan teks.\n\n" +
                prompt.trim()
            }
          ]
        }
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"]
      }
    });

    const parts =
      result.candidates?.[0]?.content?.parts ?? [];

    let image = null;
    let reply = "";

    for (const part of parts) {
      if (part.inlineData?.data) {
        image = {
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png"
        };
      }

      if (part.text) {
        reply += part.text;
      }
    }

    if (!image) {
      console.error(
        "Model tidak mengembalikan gambar:",
        JSON.stringify(parts.map(p => ({
          hasText: Boolean(p.text),
          hasImage: Boolean(p.inlineData?.data)
        })))
      );

      return res.status(502).json({
        error:
          "Model tidak mengembalikan gambar. " +
          "Periksa dukungan model, kuota, dan log Render.",
        reply: reply.trim()
      });
    }

    return res.json({
      reply: reply.trim() || "Gambar berhasil dibuat.",
      imageBase64: image.imageBase64,
      mimeType: image.mimeType
    });
  } catch (e) {
    console.error("Kesalahan /api/generate-image:", e);

    return res.status(500).json({
      error:
        e?.message ||
        "Gagal membuat gambar. Periksa akses model dan kuota Gemini."
    });
  }
});

app.listen(port, () => {
  console.log(`Solusi AI berjalan di port ${port}`);
});
