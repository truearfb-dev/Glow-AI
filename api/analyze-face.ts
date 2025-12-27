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

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("API Key is missing on server");
      throw new Error("API Key configuration error");
    }

    // Ensure image format for VseGPT/OpenAI (must contain data: prefix)
    const imageUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

    // Use fetch to call VseGPT API directly
    const response = await fetch("https://api.vsegpt.ru/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // Explicitly route to gpt-4o-mini via VseGPT
        messages: [
          {
            role: "system",
            content: `You are a professional Stylist and Face Yoga instructor. 
            Analyze the user's photo. 
            1. Determine their color season (Spring, Summer, Autumn, Winter) based on skin tone, eyes, and hair.
            2. Suggest 3 best clothing colors (hex codes) and 1 worst color.
            3. Suggest 1 specific Face Yoga exercise with a creative title.
            
            Return ONLY valid JSON. Language: Russian.`
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: `Analyze this face. Strictly follow this JSON structure:
                {
                  "season": "String (e.g. 'Мягкое Лето')",
                  "description": "String (Russian description of features)",
                  "bestColors": ["#hex", "#hex", "#hex"],
                  "worstColor": "#hex",
                  "yogaTitle": "String (Exercise Name)",
                  "yogaText": "String (Instructions)"
                }`
              },
              {
                type: "image_url",
                image_url: { 
                  url: imageUrl,
                  detail: "low" // "low" is cheaper and usually sufficient for color analysis
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`VseGPT API Error (${response.status}):`, errorText);
      throw new Error(`VseGPT Service Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Invalid VseGPT response structure:", data);
      throw new Error("Invalid response from AI provider");
    }

    const content = data.choices[0].message.content;
    let jsonResponse;
    
    try {
      jsonResponse = JSON.parse(content);
    } catch (e) {
      console.error("JSON Parse Error:", content);
      throw new Error("Failed to parse AI response");
    }

    // Validate essential fields
    if (!jsonResponse.season || !jsonResponse.bestColors) {
      throw new Error("Incomplete AI response");
    }

    // Sanitization
    const safeString = (val: any, fallback: string) => (typeof val === 'string' ? val : fallback);
    jsonResponse.season = safeString(jsonResponse.season, "Цветотип");
    jsonResponse.description = safeString(jsonResponse.description, "Анализ завершен.");
    jsonResponse.worstColor = safeString(jsonResponse.worstColor, "#000000");
    jsonResponse.yogaTitle = safeString(jsonResponse.yogaTitle, "Фейс-фитнес");
    jsonResponse.yogaText = safeString(jsonResponse.yogaText, "Выполните упражнение.");
    
    if (!Array.isArray(jsonResponse.bestColors)) {
       jsonResponse.bestColors = ["#CCCCCC", "#888888", "#444444"];
    }

    // Success - return real data (isDemo is undefined/false)
    res.status(200).json(jsonResponse);

  } catch (error: any) {
    console.error("API Handler Error:", error);
    
    // Use fallback profile and MARK AS DEMO
    const randomProfile = FALLBACK_PROFILES[Math.floor(Math.random() * FALLBACK_PROFILES.length)];
    res.status(200).json({
      ...randomProfile,
      isDemo: true // Signals frontend to show the "Demo/Test Mode" warning
    });
  }
}