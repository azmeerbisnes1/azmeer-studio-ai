
import { refinePromptWithAI } from "./geminigenService";

/**
 * PENGESANAN API KEY OPENAI
 * Membersihkan kunci daripada sebarang karakter "invisible" atau ruang yang tidak diingini.
 */
const getApiKey = (passedKey?: string): string => {
  let rawKey = "";
  if (typeof passedKey === 'string' && passedKey.trim().length > 0) {
    rawKey = passedKey;
  } else {
    try {
      rawKey = (localStorage.getItem('azmeer_manual_openai_key') || "").trim();
    } catch (e) {
      console.warn("LocalStorage blocked");
    }
  }

  if (!rawKey) {
    try {
      // Fix: Access env through type assertion to avoid Property 'env' does not exist on type 'ImportMeta'
      rawKey = ((import.meta as any).env?.VITE_OPENAI_API_KEY || (process.env as any)?.VITE_OPENAI_API_KEY || "").trim();
    } catch (e) {}
  }
  
  // Pembersihan Agresif
  return rawKey
    .replace(/[\u0000-\u001F\u007F-\u009F\u00AD\u200B-\u200D\uFEFF]/g, "") 
    .replace(/["']/g, "") 
    .replace(/\s+/g, "") 
    .trim();
};

const fetchOpenAI = async (apiUrl: string, payload: any, currentKey: string) => {
  // corsproxy.io adalah yang paling telus untuk header Authorization
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://thingproxy.freeboard.io/fetch/${u}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
  ];

  let lastError: any = null;

  for (const proxyFn of proxies) {
    try {
      const url = proxyFn(apiUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        continue; // Cuba proxy lain jika bukan JSON
      }

      if (!response.ok) {
        const msg = data?.error?.message || "";
        const code = data?.error?.code || "";

        // Pengesahan Ralat OpenAI Sebenar
        if (code === "invalid_api_key" || msg.toLowerCase().includes("invalid api key") || msg.toLowerCase().includes("incorrect api key")) {
          throw new Error("KUNCI DITOLAK: OpenAI mengesahkan kunci API ini tidak sah. Sila salin semula kunci 'sk-...' yang betul.");
        }
        
        if (code === "insufficient_quota" || msg.toLowerCase().includes("quota")) {
          throw new Error("KREDIT HABIS: Kunci ini tiada baki atau sudah tamat tempoh.");
        }

        lastError = new Error(msg || `Ralat Pelayan (${response.status})`);
        continue;
      }

      return data;
    } catch (error: any) {
      if (error.message.includes("KUNCI DITOLAK") || error.message.includes("KREDIT HABIS")) {
        throw error;
      }
      lastError = error;
      continue; 
    }
  }
  
  throw new Error(lastError?.message || "Rangkaian sesak. Sila cuba lagi sebentar.");
};

export const refinePromptWithOpenAI = async (text: string, manualKey?: string): Promise<string> => {
  const currentKey = getApiKey(manualKey);
  
  // Jika tiada kunci, guna Gemini secara senyap
  if (!currentKey || currentKey.length < 10) {
    return await refinePromptWithAI(text);
  }

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a professional cinematic prompt engineer. Transform the idea into a high-quality video prompt. Return ONLY the refined prompt text in English." },
      { role: "user", content: `Refine: ${text}` }
    ],
    temperature: 0.7
  };

  try {
    const data = await fetchOpenAI("https://api.openai.com/v1/chat/completions", payload, currentKey);
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (error: any) {
    console.warn("OpenAI Failed, trying Gemini backup:", error.message);
    return await refinePromptWithAI(text);
  }
};

export const generateUGCPrompt = async (params: { 
  text: string, 
  gender: 'male' | 'female', 
  platform: 'tiktok' | 'facebook',
  manualKey?: string 
}): Promise<string> => {
  const currentKey = getApiKey(params.manualKey);
  
  if (!currentKey || currentKey.length < 10) {
    throw new Error("Sila masukkan OpenAI API Key di terminal untuk fungsi UGC.");
  }

  const cta = params.platform === 'tiktok' ? "tekan beg kuning" : "tekan learn more";
  const desc = params.gender === 'female' ? "Malay woman wearing hijab" : "Malay man";

  const systemPrompt = `Create a 15s UGC video prompt for Sora 2. Character: ${desc}. Style: Influencer. CTA: "${cta}". Return ONLY the prompt in English with Malay script.`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Topic: ${params.text}` }
    ],
    temperature: 0.7
  };

  const data = await fetchOpenAI("https://api.openai.com/v1/chat/completions", payload, currentKey);
  return data.choices?.[0]?.message?.content?.trim() || params.text;
};