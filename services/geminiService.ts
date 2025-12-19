import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";

// Note: In a production Vercel app, this logic resides in api/analyze-face.ts.
// We implement it here client-side so the React App is functional without a Node backend running.

const analysisSchema: Schema = {
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
};

export const analyzeFaceClientSide = async (base64Image: string): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = base64Image.split(',')[1] || base64Image;

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
    },
  });

  const text = response.text;
  if (!text) throw new Error("No output from AI");

  return JSON.parse(text) as AnalysisResult;
};