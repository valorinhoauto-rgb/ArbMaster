import { GoogleGenAI } from "@google/genai";

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
  date: number; // We'll still return a number to the component
}

export async function extractOperationFromImage(base64Image: string, mimeType: string, customKey?: string): Promise<ExtractedOperation | null> {
  try {
    const apiKey = customKey || process.env.GEMINI_API_KEY!;
    if (!apiKey) {
      console.error("No Gemini API key provided");
      return null;
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
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
          - Data e Hora (topo direita): Extraia a data e hora do evento que aparece entre parênteses (ex: 2026-04-09 20:00 -03:00). 
          - IMPORTANTE: Capture EXATAMENTE o horário que está escrito (ex: 20:00). IGNORE COMPLETAMENTE o fuso horário (ex: -03:00). NÃO some nem subtraia horas. 
          - Retorne a data e hora no formato de string: "YYYY-MM-DD HH:mm".
          - Jogo e Campeonato (topo esquerda): Identifique o nome do evento e a liga.
          
          Se o ano não estiver claro, use o ano atual (2026).
          
          Retorne os dados no formato JSON especificado.`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            bookmaker1: { type: "string", description: "Nome da primeira casa de aposta" },
            bookmaker2: { type: "string", description: "Nome da segunda casa de aposta" },
            event: { type: "string", description: "Nome do jogo/evento" },
            market: { type: "string", description: "Campeonato ou mercado principal" },
            selection1: { type: "string", description: "Seleção na casa 1" },
            selection2: { type: "string", description: "Seleção na casa 2" },
            odds1: { type: "number", description: "Odd na casa 1" },
            odds2: { type: "number", description: "Odd na casa 2" },
            stake1: { type: "number", description: "Valor apostado na casa 1" },
            stake2: { type: "number", description: "Valor apostado na casa 2" },
            profit: { type: "number", description: "Lucro previsto em R$" },
            profitPercentage: { type: "number", description: "Porcentagem de lucro" },
            dateString: { type: "string", description: "Data e hora no formato YYYY-MM-DD HH:mm" },
          },
          required: ["bookmaker1", "bookmaker2", "event", "market", "selection1", "selection2", "odds1", "odds2", "stake1", "stake2", "profit", "profitPercentage", "dateString"],
        },
      },
    });

    if (!response.text) return null;
    const data = JSON.parse(response.text);
    
    // Convert dateString to timestamp ignoring timezone (treat as local)
    // Format: YYYY-MM-DD HH:mm
    const [datePart, timePart] = data.dateString.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    
    // Use new Date(year, month-1, day, hour, minute) to get local timestamp
    const timestamp = new Date(year, month - 1, day, hour, minute).getTime();

    return {
      ...data,
      date: timestamp
    } as ExtractedOperation;
  } catch (error) {
    console.error("Error extracting operation from image:", error);
    return null;
  }
}
