import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface ExtractedOperation {
  bookmaker1: string;
  bookmaker2: string;
  event: string;
  market: string;
  selection1: string;
  selection2: string;
  odds1: number;
  odds2: number;
  stake1: number;
  stake2: number;
  profit: number;
  profitPercentage: number;
  date: number;
}

export async function extractOperationFromImage(base64Image: string, mimeType: string): Promise<ExtractedOperation | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Image.split(',')[1] || base64Image,
            mimeType: mimeType,
          },
        },
        {
          text: `Analise este print de calculadora de arbitragem (surebet) e extraia as informações seguindo este modelo:
          - Casas envolvidas (esquerda): Identifique as duas casas de aposta.
          - Mercados/Chances (centro): Identifique as seleções de cada casa.
          - Odds (verde): Identifique as odds de cada seleção.
          - Valores apostados (azul): Identifique o valor (stake) de cada aposta.
          - Lucro previsto (amarelo ou preto): Identifique o lucro em R$ e a porcentagem.
          - Data e Hora (topo direita): Extraia a data e hora do evento que aparece entre parênteses (ex: 2026-04-09 06:00). Ignore o fuso horário -03:00. Retorne o valor como uma string ISO ou formato YYYY-MM-DD HH:mm.
          - Jogo e Campeonato (topo esquerda): Identifique o nome do evento e a liga.
          
          IMPORTANTE: Para a data, converta o texto '2026-04-09 06:00' para um timestamp numérico (milissegundos). Se o ano não estiver claro, use o ano atual (2026).
          
          Retorne os dados no formato JSON especificado.`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bookmaker1: { type: Type.STRING, description: "Nome da primeira casa de aposta" },
            bookmaker2: { type: Type.STRING, description: "Nome da segunda casa de aposta" },
            event: { type: Type.STRING, description: "Nome do jogo/evento" },
            market: { type: Type.STRING, description: "Campeonato ou mercado principal" },
            selection1: { type: Type.STRING, description: "Seleção na casa 1" },
            selection2: { type: Type.STRING, description: "Seleção na casa 2" },
            odds1: { type: Type.NUMBER, description: "Odd na casa 1" },
            odds2: { type: Type.NUMBER, description: "Odd na casa 2" },
            stake1: { type: Type.NUMBER, description: "Valor apostado na casa 1" },
            stake2: { type: Type.NUMBER, description: "Valor apostado na casa 2" },
            profit: { type: Type.NUMBER, description: "Lucro previsto em R$" },
            profitPercentage: { type: Type.NUMBER, description: "Porcentagem de lucro" },
            date: { type: Type.NUMBER, description: "Timestamp numérico (milissegundos) da data do evento" },
          },
          required: ["bookmaker1", "bookmaker2", "event", "market", "selection1", "selection2", "odds1", "odds2", "stake1", "stake2", "profit", "profitPercentage", "date"],
        },
      },
    });

    if (!response.text) return null;
    return JSON.parse(response.text) as ExtractedOperation;
  } catch (error) {
    console.error("Error extracting operation from image:", error);
    return null;
  }
}
