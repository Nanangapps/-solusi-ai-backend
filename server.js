import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.get('/', (req, res) => {
  res.json({ status: 'OK Live', endpoint: '/api/chat' });
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
      return res.status(400).json({ detail: "Pesan tidak boleh kosong." });
    }

    if (!ai) {
      return res.status(500).json({ detail: "GEMINI_API_KEY belum diset di Render" });
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    
    const result = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }]
    });

    const reply = result.text || result.response?.text() || "Jawaban kosong";

    res.json({ reply });

  } catch (e) {
    console.error(e);
    res.status(500).json({ detail: e.message });
  }
});

app.listen(port, () => {
  console.log(`Jalan di ${port}`);
});
