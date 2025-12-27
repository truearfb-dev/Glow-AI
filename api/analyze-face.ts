import { GoogleGenAI, Type } from "@google/genai";

// Predefined profiles for fallback scenarios (if AI fails or safety blocks)
const FALLBACK_PROFILES = [
  {
    season: "Мягкое Лето",
    description: "У вас благородная, слегка прохладная внешность с низким контрастом. Глаза, скорее всего, серо-голубые или зеленые, а кожа имеет розоватый подтон.",
    bestColors: ["#778899", "#E6E6FA", "#BC8F8F"], // SlateGray, Lavender, RosyBrown
    worstColor: "#FF8C00", // DarkOrange
    yogaTitle: "Укрепление овала",
    yogaText: "Выдвиньте подбородок вперед, положите нижнюю губу на верхнюю и улыбнитесь, поднимая уголки рта к вискам. Держите 10 секунд."
  },
  {
    season: "Глубокая Зима",
    description: "Яркая и контрастная внешность. Темные волосы и выразительные глаза создают эффектный образ, который требует насыщенных цветов.",
    bestColors: ["#000080", "#DC143C", "#FFFFFF"], // Navy, Crimson, White
    worstColor: "#D2B48C", // Tan
    yogaTitle: "Сияющий взгляд",
    yogaText: "Сделайте 'очки' из пальцев вокруг глаз. Мягко надавите и попробуйте сощуриться нижним веком. Повторите 15 раз для тонуса зоны глаз."
  },
  {
    season: "Теплая Весна",
    description: "Ваша внешность излучает свет и тепло. Кожа имеет золотистое свечение, а в волосах играют рыжеватые или медовые блики.",
    bestColors: ["#FF7F50", "#40E0D0", "#F4A460"], // Coral, Turquoise, SandyBrown
    worstColor: "#A9A9A9", // DarkGray
    yogaTitle: "Разглаживание лба",
    yogaText: "Положите ладони на лоб, зафиксировав кожу. Пытайтесь поднять брови вверх, преодолевая сопротивление рук. Расслабьтесь."
  },
  {
    season: "Настоящая Осень",
    description: "Насыщенный, теплый и уютный типаж. В вашей внешности преобладают рыжие, медные и золотисто-каштановые тона.",
    bestColors: ["#8B4513", "#556B2F", "#DAA520"], // SaddleBrown, DarkOliveGreen, Goldenrod
    worstColor: "#FF69B4", // HotPink
    yogaTitle: "Четкие скулы",
    yogaText: "Втяните щеки внутрь, сделав губы 'рыбкой'. Попытайтесь улыбнуться в этом положении. Удерживайте 5 секунд, повторите 10 раз."
  }
];

export default async function handler(req: any, res: any) {
  // Config CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { image } = req.body;

    if (!image) {
      res.status(400).json({ error: "No image provided" });
      return;
    }

    // Extract base64 data cleanly for Gemini inlineData
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          },
          {
            text: `Analyze color season (Winter/Spring/Summer/Autumn).
            Output JSON with fields: season, description, bestColors (array of hex), worstColor (hex), yogaTitle, yogaText.
            Be concise. DO NOT suggest generic 'massage'. Suggest specific, named Face Yoga poses.
            Language: Russian.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            season: { type: Type.STRING },
            description: { type: Type.STRING },
            bestColors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            worstColor: { type: Type.STRING },
            yogaTitle: { type: Type.STRING },
            yogaText: { type: Type.STRING },
          },
          required: ["season", "description", "bestColors", "worstColor", "yogaTitle", "yogaText"],
        },
      },
    });

    const text = response.text;
    let jsonResponse: any = {};
    let parseSuccess = false;

    try {
        if (text) {
            jsonResponse = JSON.parse(text);
            parseSuccess = true;
        }
    } catch (e) {
        console.error("JSON Parse Error, using fallback");
    }

    // --- SMART FALLBACK SYSTEM ---
    const isSeasonValid = jsonResponse.season && jsonResponse.season.length > 3 && !jsonResponse.season.includes("Ваш");
    const isColorsValid = Array.isArray(jsonResponse.bestColors) && jsonResponse.bestColors.length >= 1;

    if (!parseSuccess || !isSeasonValid || !isColorsValid) {
        const randomProfile = FALLBACK_PROFILES[Math.floor(Math.random() * FALLBACK_PROFILES.length)];
        
        jsonResponse = {
            season: jsonResponse.season || randomProfile.season,
            description: jsonResponse.description || randomProfile.description,
            bestColors: (Array.isArray(jsonResponse.bestColors) && jsonResponse.bestColors.length > 0) ? jsonResponse.bestColors : randomProfile.bestColors,
            worstColor: jsonResponse.worstColor || randomProfile.worstColor,
            yogaTitle: jsonResponse.yogaTitle || randomProfile.yogaTitle,
            yogaText: jsonResponse.yogaText || randomProfile.yogaText
        };
        
        if (!isSeasonValid) {
             Object.assign(jsonResponse, randomProfile);
        }
    }

    // Ensure strictly string types for React safety
    const safeString = (val: any, fallback: string) => (typeof val === 'string' ? val : fallback);
    
    jsonResponse.season = safeString(jsonResponse.season, "Мягкое Лето");
    jsonResponse.description = safeString(jsonResponse.description, "Анализ завершен.");
    jsonResponse.worstColor = safeString(jsonResponse.worstColor, "#000000");
    jsonResponse.yogaTitle = safeString(jsonResponse.yogaTitle, "Фейс-фитнес");
    jsonResponse.yogaText = safeString(jsonResponse.yogaText, "Сделайте легкий массаж.");

    if (!Array.isArray(jsonResponse.bestColors)) {
        jsonResponse.bestColors = ["#E6E6FA", "#778899", "#BC8F8F"];
    }

    res.status(200).json(jsonResponse);

  } catch (error: any) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Service busy, please try again." });
  }
}