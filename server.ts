import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoints
  app.post('/api/ai/suggest-goals', async (req, res) => {
    try {
      const { userLevel, xp, customMessage } = req.body;
      
      const prompt = `Jesteś mentorem biznesowym i doradcą AI. Pomagasz ambitnemu studentowi 2. roku informatyki.
Jego ostateczny CEL GŁÓWNY to zarobienie pierwszego miliona. 
Na ten moment jego misją na najbliższe 4 miesiące jest zarobienie 40k PLN ze sprzedaży usług automatyzacji.

Obecny poziom użytkownika: ${userLevel}
XP: ${xp}

Oto prośba użytkownika/kontekst do generacji celów:
${customMessage || "Zaproponuj 1 Cel Główny (bardzo ważny, duży wpływ) i 3 Cele Poboczne (mniejsze kroki) wspierające jego ścieżkę jako studenta i sprzedawcy automatyzacji."}

Wygeneruj listę w formacie JSON (tylko i wyłącznie JSON, bez markdowna, zaczynający się od '[' i kończący na ']'):
[
  { "title": "...", "description": "...", "type": "MAIN", "xpReward": 1000 },
  { "title": "...", "description": "...", "type": "SIDE", "xpReward": 250 },
  ...
]
Uwaga: Cel Główny (MAIN) ma duży xpReward (np. 1000-2000). Cele poboczne (SIDE) mają mniejszy (np. 100-500).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          temperature: 0.7,
        }
      });
      
      let responseText = response.text || "[]";
      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const goals = JSON.parse(responseText);

      res.json(goals);
    } catch (error) {
      console.error('Błąd AI:', error);
      res.status(500).json({ error: 'Nie udało się wygenerować celów.' });
    }
  });

  // Daily goals generation endpoint
  app.post('/api/ai/daily-goals', async (req, res) => {
    try {
      const { userLevel } = req.body;
      const prompt = `Jesteś mentorem AI. Wygeneruj dokładnie 1 cel poboczny na DZISIAJ dla studenta IT (poziom ${userLevel}), który chce zarobić pierwszy milion ze sprzedaży automatyzacji.
Ten cel poboczny to małe zadanie do wykonania w dzisiejszym dniu (np. napisanie jednego posta, zaprojektowanie szkicu oferty, przerobienie jednej lekcji z API).
Zwróć TYLKO czystą tablicę JSON, bez znaczników markdown:
[
  { "title": "...", "description": "...", "type": "SIDE", "xpReward": 150 }
]`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: { temperature: 0.8 }
      });
      let responseText = response.text || "[]";
      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const goals = JSON.parse(responseText);
      res.json(goals);
    } catch (error) {
      console.error('Błąd AI Daily:', error);
      res.status(500).json({ error: 'Błąd generacji dziennego celu' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
