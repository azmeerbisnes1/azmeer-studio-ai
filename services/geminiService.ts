
import { GoogleGenAI, Modality } from "@google/genai";

// Re-export video services from geminigen
export { 
  getAllHistory, 
  getSpecificHistory, 
  fetchVideoAsBlob, 
  mapToGeneratedVideo,
  startVideoGen
} from './geminigenService.ts';

/**
 * Unified Gemini API Client Factory
 */
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Cinema Prompt Refinement (Gemini 3 Flash)
 */
export const refinePromptWithAI = async (text: string): Promise<string> => {
  if (!text.trim()) return text;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an elite cinematic director. Transform this idea into a detailed Sora 2.0 prompt. 
      Focus on lighting, camera angles (drone, 35mm), and textures. Return ONLY the refined prompt.
      Idea: ${text}`,
    });
    return response.text?.trim() || text;
  } catch (error) {
    return text;
  }
};

/**
 * Website to Cinematic Prompt (Gemini 3 Pro)
 */
export const generateWebVideoPrompt = async (webDesc: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Transform this website description into a masterpiece cinematic UI/UX showcase video prompt for Sora 2.0.
      Website Description: ${webDesc}
      
      Requirements:
      - Describe a futuristic, 3D landing page.
      - Mention dynamic interactions (parallax, floating elements).
      - Include "Cinematic 8k resolution, elegant UI design, premium typography".
      - Describe smooth camera movements like "macro focus on glass buttons" or "smooth scroll transition".
      - Tone: Luxury and High-Tech.
      
      Return ONLY the final prompt in English.`,
    });
    return response.text?.trim() || webDesc;
  } catch (error) {
    return webDesc;
  }
};

/**
 * UGC Wizard Logic (Gemini 3 Pro)
 */
export const generateUGCPrompt = async (params: { 
  productDescription: string, 
  gender: 'lelaki' | 'perempuan', 
  platform: 'tiktok' | 'facebook' 
}): Promise<string> => {
  const ai = getAI();
  const character = params.gender === 'perempuan' ? "Malay woman wearing hijab" : "Malay man";
  const platformTarget = params.platform === 'tiktok' ? "TikTok (9:16 vertical, high energy)" : "Facebook (1:1 or 4:5, conversational)";
  const cta = params.platform === 'tiktok' ? "tekan beg kuning" : "tekan link di bawah";

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Generate a high-converting UGC influencer video prompt for Sora 2.0.
    Product: ${params.productDescription}
    Character: ${character}
    Platform: ${platformTarget}
    Instructions: High energy, natural lighting, include a Malay script in the scene. 
    Ending CTA: ${cta}.
    Return ONLY the final prompt text.`,
  });

  return response.text?.trim() || params.productDescription;
};

/**
 * Chat Response Generator (Gemini 3 Pro)
 */
export const generateChatResponse = async (message: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: message,
  });
  return response.text || "";
};

/**
 * TTS Generator (Gemini 2.5 Flash TTS)
 */
export const generateGeminiTTS = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

/**
 * Image Generation (Gemini 2.5 Flash Image)
 */
export const generateGeminiImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16"): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio }
    },
  });
  
  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Imej tidak berjaya dijana.");
};

/**
 * Audio Core Utils
 */
export function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}
