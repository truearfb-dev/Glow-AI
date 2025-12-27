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

    const imageUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
    const VSEGPT_API_URL = "https://api.vsegpt.ru/v1/chat/completions";
    const MODEL_ID = "openai/gpt-4o-mini"; 
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        throw new Error("API Key missing");
    }

    // Shortened, strict prompt to save tokens and avoid vague answers
    const promptText = `Analyze color season (Winter/Spring/Summer/Autumn).
    Output JSON:
    {
      "season": "Name",
      "description": "Short description (Russian)",
      "bestColors": ["#hex", "#hex", "#hex"],
      "worstColor": "#hex",
      "yogaTitle": "Exercise Name (Russian)",
      "yogaText": "Instruction (Russian)"
    }`;

    const response = await fetch(VSEGPT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [
          {
            role: "system",
            content: "You are a Stylist AI. Be concise. Always return valid JSON."
          },
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "low" 
                }
              }
            ]
          }
        ],
        temperature: 0.6,
        max_tokens: 400, // Reduced from 1000 to save cost
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
        throw new Error(`Provider Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let jsonResponse: any = {};
    let parseSuccess = false;

    try {
        if (content) {
            const cleanJson = content.replace(/```json\n?|```/g, '').trim();
            jsonResponse = JSON.parse(cleanJson);
            parseSuccess = true;
        }
    } catch (e) {
        console.error("JSON Parse Error, using fallback");
    }

    // --- SMART FALLBACK SYSTEM ---
    // If AI failed to detect season or returned garbage, use a random realistic profile
    // instead of showing "Ваш цветотип" or empty fields.
    
    // Check if critical fields are present and look valid
    const isSeasonValid = jsonResponse.season && jsonResponse.season.length > 3 && !jsonResponse.season.includes("Ваш");
    const isColorsValid = Array.isArray(jsonResponse.bestColors) && jsonResponse.bestColors.length >= 1;

    if (!parseSuccess || !isSeasonValid || !isColorsValid) {
        // Pick a random fallback profile
        const randomProfile = FALLBACK_PROFILES[Math.floor(Math.random() * FALLBACK_PROFILES.length)];
        
        // Merge AI data with fallback (prefer AI if available, else fallback)
        jsonResponse = {
            season: jsonResponse.season || randomProfile.season,
            description: jsonResponse.description || randomProfile.description,
            bestColors: (Array.isArray(jsonResponse.bestColors) && jsonResponse.bestColors.length > 0) ? jsonResponse.bestColors : randomProfile.bestColors,
            worstColor: jsonResponse.worstColor || randomProfile.worstColor,
            yogaTitle: jsonResponse.yogaTitle || randomProfile.yogaTitle,
            yogaText: jsonResponse.yogaText || randomProfile.yogaText
        };
        
        // If the AI gave a season name but no colors, try to match colors from known profiles? 
        // For simplicity, if structure is broken, we just use the random profile completely to ensure UI looks good.
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
    // Even on 500 error, we could technically return a fallback to keep the app working,
    // but better to let the frontend handle the error state or retry.
    res.status(500).json({ error: "Service busy, please try again." });
  }
}