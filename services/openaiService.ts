
// Safe access to process.env for Vite/Vercel production
const getOpenAiKey = () => {
  try {
    // Priority 1: Vercel/System Environment Variables (VITE_ prefix is recommended for Vite/Vercel client-side)
    const envKey = 
      (import.meta as any).env?.VITE_OPENAI_API_KEY ||
      (import.meta as any).env?.OPENAI_API_KEY ||
      (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : null);

    if (envKey && envKey.trim().length > 10) {
      return envKey.trim();
    }

    // No hardcoded fallback to ensure GitHub "Save" functionality works without being blocked by Secret Scanning
    return null;
  } catch (e) {
    return null;
  }
};

const OPENAI_API_KEY = getOpenAiKey();

/**
 * Proxy Wrapper to bypass browser CORS restrictions (Failed to fetch error)
 */
const proxiedFetch = async (url: string, options: RequestInit) => {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  return fetch(proxyUrl, options);
};

/**
 * General Prompt Refinement using GPT-4o mini
 */
export const refinePromptWithOpenAI = async (text: string): Promise<string> => {
  if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY tidak dijumpai dalam Environment Variables. Menggunakan teks asal.");
    return text;
  }

  try {
    const response = await proxiedFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are a cinematic video prompt engineer for Sora 2. Transform the user's idea into a detailed, visually descriptive prompt in English. Ensure the visual description contains NO text overlays, labels, or subtitles on screen. If there is dialogue, it MUST be in casual 'Bahasa Melayu Malaysia santai' as a voiceover only. Return ONLY the refined prompt text." 
          },
          { role: "user", content: `Refine this idea into a 15-second cinematic Sora prompt: ${text}` }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error("OpenAI API Error:", data.error.message);
      return text;
    }
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (error: any) {
    console.error("OpenAI Refine Error:", error);
    return text;
  }
};

/**
 * UGC Specialist Generator using GPT-4o mini
 */
export const generateUGCPrompt = async (idea: string, platform: 'tiktok' | 'facebook'): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error("Sila masukkan OPENAI_API_KEY dalam Vercel Environment Variables untuk menggunakan fungsi UGC.");
  }

  const ctaText = platform === 'tiktok' ? 'tekan beg kuning sekarang' : 'tekan learn more untuk tahu lebih lanjut';
  
  const systemPrompt = `You are a professional UGC (User Generated Content) Video Engineer for Sora 2 AI. 
  Your goal is to create a highly detailed 15-second technical video prompt in ENGLISH.
  
  CORE RULES:
  - Duration: EXACTLY 15 seconds.
  - Visual Changes: MUST change camera angle every 3 seconds.
  - Character Personas: Malay woman with Hijab or Malay man (influencer style).
  - Dialogue/Script: Informal 'Bahasa Melayu Malaysia santai'.
  - Text Rule: NO TEXT ON SCREEN until last 3 seconds.
  
  Return ONE long technical descriptive prompt in English.`;

  try {
    const response = await proxiedFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a high-conversion 15s UGC prompt for: ${idea}. Platform: ${platform}` }
        ],
        temperature: 0.8
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices?.[0]?.message?.content?.trim() || "";
  } catch (error: any) {
    console.error("OpenAI UGC Error:", error);
    throw new Error(`Ralat OpenAI: ${error.message}`);
  }
};
