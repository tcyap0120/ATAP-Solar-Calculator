
import { GoogleGenAI, Type } from "@google/genai";

// Extract solar project details from text using Gemini API
export const extractSolarData = async (text: string) => {
    // API key must be obtained exclusively from process.env.API_KEY
    if (!process.env.API_KEY) {
        throw new Error("API Key not found");
    }

    // Initialize the Gemini API client correctly with a named parameter
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Use gemini-3-flash-preview for basic text processing tasks like data extraction
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract solar project details from the following text: "${text}"`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    clientname: { type: Type.STRING },
                    clientcompany: { type: Type.STRING },
                    contactno: { type: Type.STRING },
                    email: { type: Type.STRING },
                    addressline1: { type: Type.STRING },
                    addressline2: { type: Type.STRING },
                    addressline3: { type: Type.STRING },
                    systemsize: { type: Type.STRING, description: "System size in kWp" },
                    panel: { type: Type.STRING, description: "Number of panels" },
                    invertersize: { type: Type.STRING, description: "Inverter size in kWac" },
                    inverterbrand: { type: Type.STRING },
                    systemprice: { type: Type.NUMBER, description: "Total system price without currency symbol" },
                    date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" }
                }
            }
        }
    });

    // Access the .text property directly (do not call it as a method)
    if (response.text) {
        try {
            return JSON.parse(response.text.trim());
        } catch (e) {
            console.error("Failed to parse Gemini JSON response:", e);
        }
    }
    return {};
};
