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

/**
 * Server-side function logic (intended for Vercel /api/analyze-face)
 */
export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), { status: 400 });
    }

    // Extract base64 data (remove header if present)
    const base64Data = image.split(',')[1] || image;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Using gemini-3-flash-preview for multimodal tasks
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
            
            Верни ответ строго на русском языке.`
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

    return new Response(text, {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}