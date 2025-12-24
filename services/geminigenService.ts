
import { GeneratedVideo } from "../types.ts";
import { GoogleGenAI } from "@google/genai";

// Updated API Key from User Request
const GEMINIGEN_API_KEY = "tts-fe9842ffd74cffdf095bb639e1b21a01";
const BASE_URL = "https://api.geminigen.ai/uapi/v1";

/**
 * Menggunakan Gemini 3 Flash untuk pemurnian prompt secara sinematik.
 */
export const refinePromptWithAI = async (text: string): Promise<string> => {
  if (!text.trim()) return text;
  
  try {
    // Fix: Always use process.env.API_KEY directly in named parameter as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an elite cinematic director for Sora AI. 
      Transform the following user idea into a detailed, visually descriptive prompt. 
      Focus on camera work (e.g., sweeping cinematic shot, 35mm lens), cinematic lighting (e.g., volumetric lighting, golden hour), and hyper-realistic textures.
      Return ONLY the refined prompt text in English.
      
      User Idea: ${text}`,
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini Refinement Failed:", error);
    return text;
  }
};

/**
 * Proxy Nodes for reliable fetching
 */
const PROXY_NODES = [
  { name: "Direct", fn: (u: string) => u },
  { name: "CorsProxy", fn: (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}` },
  { name: "AllOrigins", fn: (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` }
];

/**
 * uapiFetch: Optimized network engine with x-api-key authentication.
 */
export async function uapiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `${BASE_URL}${cleanEndpoint}`;

  // According to documentation: Authentication uses "x-api-key" header
  const headers: Record<string, string> = {
    "x-api-key": GEMINIGEN_API_KEY,
    "Accept": "application/json",
    ...((options.headers as any) || {})
  };

  let lastError: any = null;

  for (let i = 0; i < PROXY_NODES.length; i++) {
    const node = PROXY_NODES[i];
    try {
      if (i > 0) await new Promise(r => setTimeout(r, 500)); 

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const finalUrl = node.fn(targetUrl);
      const response = await fetch(finalUrl, { 
        ...options, 
        headers,
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        lastError = new Error(errData?.detail?.message || `Status ${response.status}`);
        if (response.status === 401 || response.status === 403) break; // Don't retry auth errors
        continue;
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  throw new Error(lastError?.message || "Sambungan ke API gagal.");
}

export const getAllHistory = async (page = 1, limit = 50): Promise<any> => {
  return await uapiFetch(`/histories?filter_by=all&items_per_page=${limit}&page=${page}`);
};

// Documentation says: /uapi/v1/history/{conversion_uuid}
export const getSpecificHistory = async (uuid: string): Promise<any> => {
  return await uapiFetch(`/history/${uuid}`);
};

/**
 * Map API response to the app's internal GeneratedVideo type.
 * Handles nested generated_video array and status codes.
 */
export const mapToGeneratedVideo = (item: any): GeneratedVideo => {
  if (!item) return {} as GeneratedVideo;
  
  const status = Number(item.status);
  const uuid = String(item.uuid || item.id || "");
  
  // Extract video details from the specific structure shown in docs
  const vData = (item.generated_video && item.generated_video.length > 0) 
    ? item.generated_video[0] 
    : {};
  
  // Try to get URL from multiple possible locations in the response
  let rawUrl = vData.video_url || vData.video_uri || item.generate_result || "";
  
  // If it's a URI, construct the full CDN URL
  if (rawUrl && !rawUrl.startsWith('http') && !rawUrl.startsWith('blob:')) {
     rawUrl = `https://cdn.geminigen.ai/${rawUrl}`;
  }

  return {
    mediaType: 'video',
    uuid,
    url: rawUrl,
    prompt: item.input_text || item.prompt || "Neural Sora Generation",
    timestamp: new Date(item.created_at || Date.now()).getTime(),
    // Status 2 is Completed according to docs
    status: (status === 2 || (item.status_percentage && item.status_percentage >= 100)) ? 2 : (status === 3 ? 3 : 1),
    status_percentage: item.status_percentage || (status === 2 ? 100 : 5),
    aspectRatio: vData.aspect_ratio || item.aspect_ratio || "9:16",
    model_name: item.model_name || "sora-2",
    duration: vData.duration || item.duration || 10
  };
};

export const startVideoGen = async (params: { 
  prompt: string, 
  model: string, 
  duration: number, 
  ratio: string,
  imageFile?: File | string 
}) => {
  const formData = new FormData();
  formData.append("prompt", params.prompt);
  formData.append("model", "sora-2"); // Use sora-2 as requested
  formData.append("duration", params.duration.toString()); // 10 or 15
  formData.append("aspect_ratio", params.ratio === '16:9' ? 'landscape' : 'portrait');
  formData.append("resolution", "small"); // sora-2 only supports small (720p)

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
    // Do not set Content-Type header, fetch will set it correctly for FormData
  });
}

export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url) return "";
  
  try {
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch (e) {}

  // Try with proxies if direct fetch fails (CORS issues)
  const videoProxies = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  ];

  for (const pUrl of videoProxies) {
    try {
      const res = await fetch(pUrl);
      if (res.ok) {
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
    } catch (err) {}
  }

  return url;
};