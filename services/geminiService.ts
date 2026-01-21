import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = 'gemini-3-flash-preview';

export const analyzeDataStructure = async (csvSnippet: string): Promise<AIAnalysisResult> => {
  const prompt = `
    You are a Senior ERP Architect analyzing raw data for migration into a new SQL-based Car Wash ERP system.
    
    The system has 4 core modules:
    1. FINANCIALS (Double-entry GL, Accounts Table, Journal Entries)
    2. OPERATIONS (Services, Staff, Commissions)
    3. CRM (Customers, Vehicles)
    4. INVENTORY (Items, Suppliers, Stock)

    Analyze the provided CSV/Data snippet below. 
    1. Propose a specific SQL Schema (CREATE TABLE statements) that best fits this data, strictly typed.
    2. Create a step-by-step migration plan to ensure data integrity.
    3. Identify potential data integrity risks (e.g., duplicates, missing foreign keys).

    Data Snippet:
    ${csvSnippet}
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            proposedSchema: { type: Type.STRING, description: "The SQL CREATE TABLE statements." },
            migrationPlan: { type: Type.STRING, description: "Numbered list of steps for migration." },
            dataIntegrityNotes: { type: Type.STRING, description: "Warnings about data quality or gaps." }
          },
          required: ["proposedSchema", "migrationPlan", "dataIntegrityNotes"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return result as AIAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw new Error("Failed to analyze data structure.");
  }
};