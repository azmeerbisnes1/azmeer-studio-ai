
import { GeneratedVideo } from "../types.ts";
import { GoogleGenAI } from "@google/genai";

const GEMINIGEN_API_KEY = "tts-fe9842ffd74cffdf095bb639e1b21a01";
const BASE_URL = "https://api.geminigen.ai/uapi/v1";

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
 * Robust fetcher with CORS proxy fallbacks.
 * CORSProxy.io is usually very good with x-api-key headers.
 */
export async function uapiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const targetPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `${BASE_URL}${targetPath}`;
  
  const headers: Record<string, string> = {
    "x-api-key": GEMINIGEN_API_KEY,
    "Accept": "application/json",
    ...((options.headers as any) || {})
  };

  // We primarily use corsproxy.io as it handles headers best for Geminigen
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxyUrl, { 
      ...options, 
      headers 
    });

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
    console.error("Geminigen API Connection Error:", err.message);
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

export const getAllHistory = async (page: number = 1, limit: number = 50): Promise<any> => {
  return await uapiFetch(`/histories?page=${page}&items_per_page=${limit}`);
};

export const getSpecificHistory = async (uuid: string): Promise<any> => {
  return await uapiFetch(`/history/${uuid}`);
};

export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    return url;
  }
};

export const mapToGeneratedVideo = (item: any): GeneratedVideo => {
  if (!item) return {} as GeneratedVideo;
  
  // Data detail biasanya berada dalam root atau property .data
  const root = item.data || item;
  
  // Geminigen API meletakkan maklumat media dalam array generated_video
  const vList = root.generated_video || [];
  const vData = vList.length > 0 ? vList[0] : {};
  
  // Mencari URL video (video_url atau video_uri)
  let rawUrl = vData.video_url || vData.video_uri || root.generate_result || "";
  
  // Baiki URL jika ia relative path (cth: videos/xyz.mp4)
  if (rawUrl && typeof rawUrl === 'string' && !rawUrl.startsWith('http')) {
     const cleanPath = rawUrl.startsWith('/') ? rawUrl.substring(1) : rawUrl;
     rawUrl = `https://cdn.geminigen.ai/${cleanPath}`;
  }

  // Handle thumbnail URL
  let thumbUrl = vData.last_frame || root.thumbnail_url || "";
  if (thumbUrl && typeof thumbUrl === 'string' && !thumbUrl.startsWith('http')) {
    const cleanPath = thumbUrl.startsWith('/') ? thumbUrl.substring(1) : thumbUrl;
    thumbUrl = `https://cdn.geminigen.ai/${cleanPath}`;
  }

  const status = root.status !== undefined ? Number(root.status) : 1;
  const percentage = root.status_percentage !== undefined ? Number(root.status_percentage) : (status === 2 ? 100 : 5);

  return {
    mediaType: 'video',
    uuid: root.uuid || root.id || "unknown",
    url: typeof rawUrl === 'string' ? rawUrl : "",
    thumbnail: thumbUrl || "https://i.ibb.co/b5N15CGf/Untitled-design-18.png",
    prompt: root.input_text || root.prompt || "Sora Generation",
    timestamp: new Date(root.created_at || Date.now()).getTime(),
    status: status as (1 | 2 | 3), 
    status_percentage: percentage,
    aspectRatio: root.aspect_ratio || vData.aspect_ratio || "16:9",
    model_name: root.model_name || "sora-2",
    duration: vData.duration || root.duration || 10
  };
};
