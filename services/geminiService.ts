
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
      Focus on lighting (volumetric, anamorphic flares), camera angles (dolly zoom, drone path), and high-end textures. 
      Return ONLY the refined prompt in English.
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
      contents: `You are a world-class UI/UX Motion Designer. Create a masterpiece cinematic video prompt for Sora 2.0 based on this website description.
      Website Description: ${webDesc}
      
      Requirements for the video:
      - 3D spatial UI elements floating in a luxurious dark environment.
      - Smooth parallax scrolling with "Macro Lens" focus on high-fidelity buttons and typography.
      - Soft glowing borders (Neon Cyan/Purple) and glassmorphism textures.
      - Cinematic camera movement: A slow sweeping drone shot over the digital landscape.
      - Aesthetic: Premium, Futuristic, Apple-style product reveal.
      
      Return ONLY the final prompt in English.`,
    });
    return response.text?.trim() || webDesc;
  } catch (error) {
    return webDesc;
  }
};

/**
 * Chat Response Generator (Gemini 3 Pro)
 */
export const generateChatResponse = async (message: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: message,
    config: {
      systemInstruction: "You are the AI brain of Azmeer AI Studio. You are an expert in cinematic video generation and Sora 2.0 prompts. Be professional, creative, and inspiring."
    }
  });
  return response.text || "Maaf, sistem sedang sibuk.";
};

/**
 * TTS Generator (Gemini 2.5 Flash TTS)
 */
export const generateGeminiTTS = async (text: string): Promise<string> => {
  const ai = getAI();
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
 * Image Generator (Gemini 2.5 Flash Image)
 */
// Added to fix missing export error in ImageLabView.tsx
export const generateGeminiImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1"): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio,
      },
    },
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("No image data found in response");
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
