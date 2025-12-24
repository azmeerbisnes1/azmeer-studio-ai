
import { GeneratedVideo } from "../types.ts";
import { GoogleGenAI } from "@google/genai";

// Kunci API Geminigen (Gunakan yang diberikan oleh servis)
const GEMINIGEN_API_KEY = "tts-fe9842ffd74cffdf095bb639e1b21a01";
const BASE_URL = "https://api.geminigen.ai/uapi/v1";

/**
 * Menggunakan Gemini 3 Flash untuk pemurnian prompt secara sinematik.
 * Memberi arahan kepada model untuk bertindak sebagai Director Filem.
 */
export const refinePromptWithAI = async (text: string): Promise<string> => {
  if (!text.trim()) return text;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a world-class cinematic director for Sora 2.0. 
      Transform the following user idea into a highly detailed, visually stunning video prompt. 
      Include details about:
      - Camera movement (e.g. tracking shot, slow pan)
      - Lighting (e.g. cinematic volumetric lighting, neon glow)
      - Textures and Atmosphere (e.g. 8k resolution, hyper-realistic, rainy night)
      - Emotional tone.
      Return ONLY the refined English prompt.
      
      User Idea: ${text}`,
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini Refinement Failed:", error);
    return text;
  }
};

/**
 * Enjin fetch utama dengan pengesahan x-api-key
 */
export async function uapiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const targetUrl = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers: Record<string, string> = {
    "x-api-key": GEMINIGEN_API_KEY,
    "Accept": "application/json",
    ...((options.headers as any) || {})
  };

  try {
    const response = await fetch(targetUrl, { ...options, headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    return await response.json();
  } catch (err: any) {
    console.error("Fetch error:", err);
    throw err;
  }
}

export const startVideoGen = async (params: { 
  prompt: string, 
  duration: number, 
  ratio: string,
  imageFile?: File | string 
}) => {
  const formData = new FormData();
  formData.append("prompt", params.prompt);
  formData.append("model", "sora-2"); 
  formData.append("duration", params.duration.toString()); 
  formData.append("aspect_ratio", params.ratio === '16:9' ? 'landscape' : 'portrait');
  formData.append("resolution", "small"); 

  if (params.imageFile) {
    if (params.imageFile instanceof File) {
      formData.append("files", params.imageFile);
    } else {
      formData.append("file_urls", params.imageFile);
    }
  }

  return await uapiFetch("/video-gen/sora", { 
    method: "POST", 
    body: formData 
  });
}

// Added getAllHistory to fix member missing error in geminiService.ts
export const getAllHistory = async (page = 1, limit = 50): Promise<any> => {
  return await uapiFetch(`/history?page=${page}&limit=${limit}`);
};

export const getSpecificHistory = async (uuid: string): Promise<any> => {
  return await uapiFetch(`/history/${uuid}`);
};

export const mapToGeneratedVideo = (item: any): GeneratedVideo => {
  const vData = (item.generated_video && item.generated_video.length > 0) ? item.generated_video[0] : {};
  let rawUrl = vData.video_url || vData.video_uri || item.generate_result || "";
  
  if (rawUrl && !rawUrl.startsWith('http')) {
     rawUrl = `https://cdn.geminigen.ai/${rawUrl}`;
  }

  return {
    mediaType: 'video',
    uuid: item.uuid || item.id,
    url: rawUrl,
    prompt: item.input_text || "Sora Generation",
    timestamp: new Date(item.created_at || Date.now()).getTime(),
    status: (item.status === 2 || item.status_percentage >= 100) ? 2 : (item.status === 3 ? 3 : 1),
    status_percentage: item.status_percentage || (item.status === 2 ? 100 : 5),
    aspectRatio: item.aspect_ratio || "9:16",
    model_name: item.model_name || "sora-2",
    duration: vData.duration || 10
  };
};

export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    return url;
  }
};
