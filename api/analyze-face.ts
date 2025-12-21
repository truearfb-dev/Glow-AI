import { GoogleGenAI, Type, Schema } from "@google/genai";

// Definition of the Response Schema for the AI
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    season: {
      type: Type.STRING,
      description: "Color season type (e.g. Winter, Spring) in Russian",
    },
    description: {
      type: Type.STRING,
      description: "Explanation of why this season fits, in Russian",
    },
    bestColors: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 HEX color codes ideally matching the user",
    },
    worstColor: {
      type: Type.STRING,
      description: "1 HEX color code that should be avoided",
    },
    yogaTitle: {
      type: Type.STRING,
      description: "Title of the face yoga exercise in Russian",
    },
    yogaText: {
      type: Type.STRING,
      description: "Instruction for the exercise in Russian",
    },
  },
  required: ["season", "description", "bestColors", "worstColor", "yogaTitle", "yogaText"],
};

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

    // Extract base64 data (remove header if present)
    const base64Data = image.split(',')[1] || image;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // User requested gemini-3-flash-preview.
    // Since we are running on Vercel US region (iad1), this model should be available.
    const modelId = "gemini-3-flash-preview";

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          },
          {
            text: `Проанализируй это лицо.
            1. Определи цветотип внешности (Зима/Весна/Лето/Осень) на основе тона кожи, глаз и волос.
            2. Подбери 3 идеальных цвета одежды и 1 цвет, который старит.
            3. Дай 1 простое упражнение фейс-фитнеса (Face Yoga), подходящее для этого типа лица.
            
            Верни ответ строго на русском языке в формате JSON.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.4,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    // Try to parse the text as JSON to ensure it's valid before sending
    let jsonResponse;
    try {
        jsonResponse = JSON.parse(text);
    } catch (e) {
        throw new Error("Invalid JSON response from model");
    }

    res.status(200).json(jsonResponse);

  } catch (error: any) {
    console.error("API Error:", error);
    
    // Sanitize error message for the client
    let errorMessage = "Internal Server Error";
    
    if (error.message) {
        if (error.message.includes("quota") || error.message.includes("429")) {
            errorMessage = "AI Quota Exceeded";
        } else {
            // Keep error short to prevent UI overflow
            errorMessage = error.message.length > 50 ? "AI Processing Error" : error.message;
        }
    }
    
    res.status(500).json({ error: errorMessage });
  }
}