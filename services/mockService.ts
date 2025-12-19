import { AnalysisResult } from "../types";

export const analyzeFaceMock = async (_base64Image: string): Promise<AnalysisResult> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return {
    season: "Мягкое Лето",
    description: "У вас холодный подтон кожи с мягким контрастом. Глаза серо-голубые, волосы русые. Вам подходят приглушенные, дымчатые оттенки.",
    bestColors: ["#778899", "#E6E6FA", "#BC8F8F"], // SlateGray, Lavender, RosyBrown
    worstColor: "#FF8C00", // DarkOrange
    yogaTitle: "Укрепление овала лица",
    yogaText: "Выдвиньте подбородок вперед и положите нижнюю губу на верхнюю. Поднимите уголки рта вверх (улыбнитесь) и поднимите подбородок к потолку. Держите 10 секунд."
  };
};