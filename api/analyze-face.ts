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

    // Ensure image has the data prefix
    const imageUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

    // VseGPT API Configuration
    const VSEGPT_API_URL = "https://api.vsegpt.ru/v1/chat/completions";
    const MODEL_ID = "openai/gpt-4o-mini"; 

    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        throw new Error("API Key is missing on server. Please add API_KEY to Vercel Environment Variables.");
    }

    const promptText = `Ты профессиональный стилист и эксперт по фейс-йоге. Проанализируй фото пользователя.
    
    Твоя задача:
    1. Определить цветотип (Зима/Весна/Лето/Осень) и подтип (например, Мягкое Лето).
    2. Дать краткое, но емкое описание особенностей внешности.
    3. Подобрать 3 идеальных цвета одежды (HEX коды) и 1 цвет, который старит/не подходит.
    4. Рекомендовать 1 эффективное упражнение фейс-фитнеса.

    Верни ответ строго в формате JSON. Если не уверен в цвете, используй нейтральные.`;

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
            content: "You are a helpful AI Stylist. Output valid JSON. Always include 'bestColors' array."
          },
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "low" // Keep cost low
                }
              }
            ]
          }
        ],
        temperature: 0.5,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error("VseGPT Error Response:", errorData);
        throw new Error(`Provider Error: ${response.status} - ${errorData.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content received from AI");

    let jsonResponse;
    try {
        jsonResponse = JSON.parse(content);
    } catch (e) {
        console.error("JSON Parse Error:", content);
        const cleanJson = content.replace(/```json\n?|```/g, '').trim();
        jsonResponse = JSON.parse(cleanJson);
    }

    // --- STRICT TYPE SANITIZATION ---
    // Force everything to String to prevent React crashes on frontend
    const safeString = (val: any, fallback: string) => {
        if (typeof val === 'string') return val;
        if (val && typeof val === 'object') return JSON.stringify(val).substring(0, 100); // Fallback for weird objects
        return fallback;
    };

    jsonResponse.season = safeString(jsonResponse.season, "Ваш цветотип");
    jsonResponse.description = safeString(jsonResponse.description, "Анализ завершен успешно.");
    jsonResponse.worstColor = safeString(jsonResponse.worstColor, "#8B4513");
    jsonResponse.yogaTitle = safeString(jsonResponse.yogaTitle, "Упражнение");
    jsonResponse.yogaText = safeString(jsonResponse.yogaText, "Выполните легкий массаж лица.");

    if (Array.isArray(jsonResponse.bestColors)) {
        jsonResponse.bestColors = jsonResponse.bestColors.map((c: any) => safeString(c, "#E6E6FA"));
    } else {
        jsonResponse.bestColors = ["#E6E6FA", "#000000", "#FFFFFF"];
    }

    // Final Valid Structure Response
    res.status(200).json(jsonResponse);

  } catch (error: any) {
    console.error("API Error Full:", error);
    
    let errorMessage = "Internal Server Error";
    
    if (error.message) {
        if (error.message.includes("429") || error.message.includes("quota") || error.message.includes("balance")) {
            errorMessage = "Сервис перегружен или закончился баланс API.";
        } else if (error.message.includes("400")) {
            errorMessage = "Ошибка формата данных (400).";
        } else {
            errorMessage = error.message.length > 200 ? "AI Processing Error" : error.message;
        }
    }
    
    res.status(500).json({ error: errorMessage });
  }
}