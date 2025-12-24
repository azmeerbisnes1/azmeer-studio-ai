
import { GeneratedVideo } from "../types.ts";
import { GoogleGenAI } from "@google/genai";

// Use the specific Geminigen key provided by the user
const GEMINIGEN_API_KEY = "tts-fe9842ffd74cffdf095bb639e1b21a01";
const BASE_URL = "https://api.geminigen.ai/uapi/v1";

/**
 * Core fetcher for Geminigen.ai API with CORS handling.
 */
export async function uapiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const targetPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `${BASE_URL}${targetPath}`;
  
  const headers: Record<string, string> = {
    "x-api-key": GEMINIGEN_API_KEY,
    "Accept": "application/json",
    ...((options.headers as any) || {})
  };

  // Using a robust proxy to bypass CORS issues for API calls
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
 * Get all generation history.
 * Documentation: GET https://api.geminigen.ai/uapi/v1/histories
 */
export const getAllHistory = async (page = 1, itemsPerPage = 50): Promise<any> => {
  return await uapiFetch(`/histories?filter_by=all&items_per_page=${itemsPerPage}&page=${page}`);
};

/**
 * Get specific history detail by UUID.
 * Documentation: GET https://api.geminigen.ai/uapi/v1/history/{conversion_uuid}
 */
export const getSpecificHistory = async (uuid: string): Promise<any> => {
  const res = await uapiFetch(`/history/${uuid}`);
  // Documentation shows data can be nested or at root depending on the endpoint wrapper
  return res.data || res.result || res;
};

/**
 * Restores and protects prompt refining logic as requested (Locked).
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

/**
 * Sora 2.0 Video Generation Trigger (Locked).
 */
export const startVideoGen = async (params: { 
  prompt: string; 
  duration?: number; 
  ratio?: string; 
  imageFile?: File; 
}): Promise<any> => {
  const formData = new FormData();
  formData.append('prompt', params.prompt);
  formData.append('model', 'sora-2');
  formData.append('resolution', 'small');
  formData.append('duration', String(params.duration || 10));
  formData.append('aspect_ratio', params.ratio === '16:9' ? 'landscape' : 'portrait');
  
  if (params.imageFile) {
    formData.append('files', params.imageFile);
  }

  return await uapiFetch('/video-gen/sora', {
    method: 'POST',
    body: formData
  });
};

/**
 * Sanitizes and normalizes CDN URLs.
 */
const normalizeUrl = (url: any): string => {
  if (!url || typeof url !== 'string') return "";
  let trimmed = url.trim();
  
  if (trimmed.toLowerCase().startsWith('http')) return trimmed;
  
  const cleanPath = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
  if (!cleanPath) return "";
  return `https://cdn.geminigen.ai/${cleanPath}`;
};

/**
 * Maps raw API response to the App's Typed GeneratedVideo model.
 */
export const mapToGeneratedVideo = (item: any): GeneratedVideo => {
  if (!item) return {} as GeneratedVideo;
  
  // Status: 1 (Processing), 2 (Completed), 3 (Failed)
  const status = item.status !== undefined ? Number(item.status) : 1;
  const percentage = item.status_percentage !== undefined ? Number(item.status_percentage) : (status === 2 ? 100 : 0);

  // Extract media from documented nested arrays
  const vList = item.generated_video || [];
  const vData = vList.length > 0 ? vList[0] : {};
  
  const rawUrl = vData.video_url || vData.video_uri || item.generate_result || "";
  const rawThumb = vData.thumbnail || vData.last_frame || item.thumbnail_url || "";

  return {
    mediaType: 'video',
    uuid: item.uuid || item.id || "unknown",
    url: normalizeUrl(rawUrl),
    thumbnail: normalizeUrl(rawThumb),
    prompt: item.input_text || item.prompt || "Cinema Sora Generation",
    timestamp: new Date(item.created_at || Date.now()).getTime(),
    status: status as (1 | 2 | 3), 
    status_percentage: percentage,
    aspectRatio: item.aspect_ratio || vData.aspect_ratio || "16:9",
    model_name: item.model_name || "sora-2",
    duration: vData.duration || item.duration || 10
  };
};

/**
 * Advanced Blob Syncing to bypass CORS and ensure direct preview/download.
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
      // Specifically mark as video/mp4 to ensure browser handles it as playable media
      const videoBlob = new Blob([blob], { type: 'video/mp4' });
      return URL.createObjectURL(videoBlob);
    } catch (e) {
      console.warn(`Neural Sync Attempt failed for ${url}:`, e);
      continue;
    }
  }
  
  return url; // Fallback to raw URL
};
