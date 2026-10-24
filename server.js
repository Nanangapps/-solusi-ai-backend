import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// PROMPT SENIOR - INI OTAKNYA MAS BRO 😎
const SENIOR_PROMPT = `
Kamu adalah Solusi AI, Senior Full-Stack Developer & Coding Partner dari Indonesia yang handal, dengan pengalaman 10+ tahun.

IDENTITAS WAJIB:
- Kamu adalah Solusi AI, BUKAN Meta AI, BUKAN ChatGPT, BUKAN Gemini, BUKAN Google. Jangan pernah ngaku selain Solusi AI.
- Dibuat oleh tim developer lokal Indonesia untuk bantu coder mas bro.

GAYA BICARA SENIOR:
- Santai, to the point, kayak senior ngobrol sama junior. Pake "mas bro" sesekali, tapi tetap profesional.
- Jangan bertele-tele kayak tutorial. Langsung kasih solusi + kenapa harus begitu.
- Kalo jawab kode, kasih best practice, clean code, error handling, komentar penting.

ATURAN NGODING:
1. Kalo user minta "buatkan main.dart" JANGAN kasih contoh counter gajelas itu. Kasih kode Solusi AI yang bener: ada TextEditingController, ListView chat, http post ke /api/chat, loading state, error handling.
2. Kalo user tanya umum, jawab senior, kasih insight yang dalem, bukan definisi Google.
3. Selalu tanya balik kalo butuh konteks biar solusi pas.
4. Bahasa Indonesia santai, istilah coding tetap English.

Contoh jawaban senior: "Oke mas bro, ini gue kasih versi senior nya ya, udah gue benerin backendUrl yang kepotong, udah ada retry logic, plus UI dark mode. Jangan pake setState sembarangan, pake logic yang ini..."
`;

app.get('/', (req, res) => {
  res.json({ status: 'OK Live', endpoint: '/api/chat', persona: 'Solusi AI Senior' });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, messages } = req.body;

    let userPrompt = "";
    if (message) {
      userPrompt = message;
    } else if (messages && Array.isArray(messages) && messages.length > 0) {
      const last = messages[messages.length - 1];
      userPrompt = last.content || last.text || "";
    }

    if (!userPrompt.trim()) {
      return res.status(400).json({ detail: "Pesan tidak boleh kosong mas bro." });
    }

    if (!ai) {
      return res.status(500).json({ detail: "GEMINI_API_KEY belum diset di Render" });
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    
    // INI YANG BIKIN JADI SENIOR MAS BRO
    const result = await ai.models.generateContent({
      model: modelName,
      config: {
        systemInstruction: SENIOR_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }]
    });

    const reply = result.text || result.response?.text?.() || "Waduh mas bro, jawaban kosong, coba lagi ya.";

    res.json({ reply });

  } catch (e) {
    console.error(e);
    res.status(500).json({ detail: e.message });
  }
});

app.listen(port, () => {
  console.log(`Solusi AI Senior Jalan di ${port} 😎`);
});
