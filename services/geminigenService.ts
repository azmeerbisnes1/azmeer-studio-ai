
import { GeneratedVideo } from "../types.ts";
import { GoogleGenAI } from "@google/genai";

const GEMINIGEN_API_KEY = "tts-fe9842ffd74cffdf095bb639e1b21a01";
const BASE_URL = "https://api.geminigen.ai/uapi/v1";

/**
 * Robust fetcher with CORS proxy for Geminigen API calls.
 */
export async function uapiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const targetPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `${BASE_URL}${targetPath}`;
  
  const headers: Record<string, string> = {
    "x-api-key": GEMINIGEN_API_KEY,
    "Accept": "application/json",
    ...((options.headers as any) || {})
  };

  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxyUrl, { ...options, headers });
    const rawText = await response.text();
    let data: any = null;
    
    if (rawText && rawText.trim().length > 0) {
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        data = { message: rawText };
      }
    }

    if (!response.ok) {
      const errorMsg = data?.detail?.message || data?.message || `API Error: ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err: any) {
    console.error("Geminigen API Error:", err.message);
    throw err;
  }
}

/**
 * Cinema Prompt Refinement (Gemini 3 Flash)
 */
export const refinePromptWithAI = async (text: string): Promise<string> => {
  if (!text.trim()) return text;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a world-class cinematic director for Sora 2.0. 
      Transform the following user idea into a highly detailed, visually stunning video prompt. 
      Return ONLY the refined English prompt.
      User Idea: ${text}`,
    });
    return response.text?.trim() || text;
  } catch (error) {
    return text;
  }
};

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
      formData.append("file_urls", params.imageFile as string);
    }
  }

  return await uapiFetch("/video-gen/sora", { 
    method: "POST", 
    body: formData 
  });
}

export const getSpecificHistory = async (uuid: string): Promise<any> => {
  const res = await uapiFetch(`/history/${uuid}`);
  // The documentation shows the data can be the root object or nested in .data
  return res.data || res.result || res;
};

const normalizeUrl = (url: any): string => {
  if (!url || typeof url !== 'string') return "";
  let trimmed = url.trim();
  
  if (trimmed.toLowerCase().startsWith('http://') || trimmed.toLowerCase().startsWith('https://')) {
    return trimmed;
  }
  
  const cleanPath = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
  if (!cleanPath) return "";
  return `https://cdn.geminigen.ai/${cleanPath}`;
};

export const mapToGeneratedVideo = (item: any): GeneratedVideo => {
  if (!item) return {} as GeneratedVideo;
  
  const root = item;
  const vList = root.generated_video || [];
  const vData = vList.length > 0 ? vList[0] : {};
  
  // Status: 1 (Processing), 2 (Completed), 3 (Failed)
  const status = root.status !== undefined ? Number(root.status) : 1;
  const percentage = root.status_percentage !== undefined ? Number(root.status_percentage) : (status === 2 ? 100 : 0);

  // Preference order for video URL: generated_video[0].video_url -> root.generate_result
  let rawUrl = vData.video_url || vData.video_uri || root.generate_result || "";
  let rawThumb = vData.thumbnail || vData.last_frame || root.thumbnail_url || "";

  return {
    mediaType: 'video',
    uuid: root.uuid || root.id || "unknown",
    url: normalizeUrl(rawUrl),
    thumbnail: normalizeUrl(rawThumb) || "https://i.ibb.co/b5N15CGf/Untitled-design-18.png",
    prompt: root.input_text || root.prompt || "Sora Generation",
    timestamp: new Date(root.created_at || Date.now()).getTime(),
    status: status as (1 | 2 | 3), 
    status_percentage: percentage,
    aspectRatio: root.aspect_ratio || vData.aspect_ratio || "16:9",
    model_name: root.model_name || "sora-2",
    duration: vData.duration || root.duration || 10
  };
};

/**
 * Fetches video data and converts it to a browser-compatible MP4 blob URL.
 */
export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url) return "";
  
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
  ];

  for (const proxyFn of proxies) {
    try {
      const response = await fetch(proxyFn(url));
      if (!response.ok) continue;
      
      const blob = await response.blob();
      // Ensure the blob is specifically marked as video/mp4
      const videoBlob = new Blob([blob], { type: 'video/mp4' });
      return URL.createObjectURL(videoBlob);
    } catch (e) {
      console.warn(`Proxy attempt failed for ${url}:`, e);
      continue;
    }
  }
  
  return url; 
};
