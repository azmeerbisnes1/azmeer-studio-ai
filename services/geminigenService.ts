
import { HistoryItem, GeneratedVideo, GeneratedImage, GeneratedTTS } from "../types";
import { GoogleGenAI } from "@google/genai";

const GEMINIGEN_API_KEY = "tts-fe8bac4d9a7681f6193dbedb69313c2d";
const BASE_URL = "https://api.geminigen.ai/uapi/v1";

/**
 * DIVERSIFIED PROXY CLUSTER
 * Randomized selection to prevent rate-limiting.
 */
const PROXY_NODES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
  (url: string) => `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(url)}`,
];

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to shuffle proxies so we don't hit the same one first every time
const getShuffledProxies = () => [...PROXY_NODES].sort(() => Math.random() - 0.5);

export const refinePromptWithAI = async (text: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Act as a cinematic prompt engineer. Transform this basic idea into a highly detailed, visually descriptive prompt for Sora AI (approx 40 words): "${text}". Return ONLY the refined prompt text.`,
      config: { temperature: 0.7 }
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return text;
  }
};

/**
 * Ultra-Resilient Fetch with randomized proxy rotation.
 */
export async function uapiFetch(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // Use a stable timestamp for 5 seconds to allow some caching but prevent stale data
  const targetUrl = `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}_nocache=${Math.floor(Date.now() / 5000)}`;

  const headers = {
    ...options.headers,
    'x-api-key': GEMINIGEN_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const proxies = getShuffledProxies();
  let lastError: any = null;

  for (const proxyFn of proxies) {
    try {
      const proxiedUrl = proxyFn(targetUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(proxiedUrl, { 
        ...options, 
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error("AUTH_FAIL");
        throw new Error(`HTTP_${response.status}`);
      }
      
      const data = await response.json();
      if (!data) throw new Error("EMPTY_DATA");
      return data;
    } catch (error: any) {
      lastError = error;
      if (error.message === "AUTH_FAIL") break;
      // If it's a "Failed to fetch" (CORS/Network), try the next proxy immediately
      continue; 
    }
  }

  // Final retry with a longer wait
  if (retryCount < 1) {
    await wait(1500);
    return uapiFetch(endpoint, options, retryCount + 1);
  }

  throw lastError || new Error("Cluster network is currently unreachable.");
}

export const getSpecificHistory = async (uuid: string) => {
  try {
    const data = await uapiFetch(`/history/${uuid}`);
    return data;
  } catch (e) {
    return null;
  }
};

/**
 * Normalize URLs safely preserving all signed query parameters.
 */
export const normalizeUrl = (url: any, type: 'video' | 'image' | 'audio', uuid?: string): string => {
  if (url && typeof url === 'string' && url.startsWith('http')) {
    // Clean only escaped slashes, preserve query string perfectly
    let clean = url.replace(/\\/g, '').trim();
    if (clean.startsWith('http://')) clean = clean.replace('http://', 'https://');
    return clean;
  }
  if (!uuid) return "";
  const folder = type === 'video' ? 'videos' : type === 'image' ? 'images' : 'audio';
  const ext = type === 'video' ? 'mp4' : type === 'image' ? 'jpg' : 'mp3';
  return `https://cdn.geminigen.ai/${folder}/${uuid}.${ext}`;
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  try {
    const data = await uapiFetch("/histories?filter_by=all&items_per_page=40&page=1");
    const results = data.result || data.data || data.histories || [];
    
    if (!Array.isArray(results)) return [];

    let syncLimit = 0;
    const items = await Promise.all(results.map(async (item: any): Promise<HistoryItem | null> => {
      const type = (item.type || item.media_type || '').toLowerCase();
      const uuid = item.uuid || "";
      let status = Number(item.status);
      let percentage = Number(item.status_percentage) || 0;
      let finalUrl = item.generate_result || item.video_url || item.image_url || "";

      // Pastikan CreatedAt ada zon masa UTC jika tiada, untuk elak ralat pengiraan 3 jam
      let rawDateStr = item.created_at;
      if (rawDateStr && !rawDateStr.includes('Z') && !rawDateStr.includes('+')) {
        rawDateStr += 'Z';
      }
      const finalTimestamp = new Date(rawDateStr || Date.now()).getTime();

      if ((status === 1 || (status === 2 && !finalUrl)) && syncLimit < 4) {
        syncLimit++;
        const detail = await getSpecificHistory(uuid);
        if (detail) {
          const detailObj = detail.result || detail.data || detail;
          status = Number(detailObj.status) || status;
          percentage = Math.max(percentage, Number(detailObj.status_percentage) || 0);
          if (status === 2 || percentage === 100) {
            status = 2;
            const res = detailObj.generated_video?.[0] || detailObj.result_data || detailObj;
            finalUrl = res.video_url || res.video_uri || res.generate_result || res.url || finalUrl;
          }
        }
      }

      if (type.includes('video') || type === 'video_generation' || type.includes('sora')) {
        return {
          mediaType: 'video',
          uuid: uuid,
          url: normalizeUrl(finalUrl, 'video', uuid),
          prompt: item.input_text || item.prompt || "Sora 2 Masterpiece",
          timestamp: finalTimestamp,
          status: status as (1 | 2 | 3),
          status_percentage: percentage,
          aspectRatio: item.aspect_ratio || '16:9',
          model_name: item.model_name || "Sora 2 Elite",
          duration: Number(item.duration) || 10
        } as GeneratedVideo;
      }
      
      if (type.includes('image') || type === 'image_generation') {
        return {
          mediaType: 'image',
          uuid: uuid,
          url: normalizeUrl(finalUrl, 'image', uuid),
          prompt: item.input_text || item.prompt || "Visionary Image",
          aspectRatio: item.aspect_ratio || "1:1",
          timestamp: finalTimestamp
        } as GeneratedImage;
      }

      if (type.includes('tts') || type === 'tts-text') {
        return {
          mediaType: 'tts',
          uuid: uuid,
          prompt: item.input_text || item.prompt || "Sonic Output",
          status: status,
          url: normalizeUrl(finalUrl, 'audio', uuid),
          voice: item.voice || (item.generated_audio?.[0]?.voices?.[0]) || "Gacrux",
          speed: Number(item.speed) || 1.0,
          timestamp: finalTimestamp
        } as GeneratedTTS;
      }

      return null;
    }));
    
    return items.filter(i => i !== null) as HistoryItem[];
    
  } catch (error) {
    throw error;
  }
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
  formData.append("model", "sora-2"); 
  formData.append("resolution", "small"); 
  formData.append("duration", params.duration.toString());
  formData.append("aspect_ratio", params.ratio === '16:9' ? 'landscape' : 'portrait');

  if (params.imageFile) {
    if (params.imageFile instanceof File) {
      formData.append("files", params.imageFile);
    } else {
      formData.append("file_urls", params.imageFile);
    }
  }

  const proxies = getShuffledProxies();
  let lastErr: any = null;

  for (const proxyFn of proxies) {
    try {
      const target = `${BASE_URL}/video-gen/sora`;
      const response = await fetch(proxyFn(target), {
        method: "POST",
        headers: { 'x-api-key': GEMINIGEN_API_KEY },
        body: formData,
        signal: AbortSignal.timeout(60000) 
      });

      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      return await response.json();
    } catch (e: any) {
      lastErr = e;
      continue;
    }
  }

  throw lastErr || new Error("Gagal menghantar ke cluster penjanaan.");
}
