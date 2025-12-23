
/**
 * PENGESANAN API KEY OPENAI (Vercel & Vite Optimized)
 * Menggunakan akses literal untuk memastikan Vite melakukan static replacement dengan tepat.
 */
const getApiKey = (): string => {
  let key = "";
  try {
    // Vite mencari string literal ini semasa build time. 
    // Jangan gunakan optional chaining atau pembolehubah dinamik di sini.
    // @ts-ignore
    key = import.meta.env.VITE_OPENAI_API_KEY || "";
    
    // Fallback untuk persekitaran Node/Server-side jika diperlukan
    if (!key && typeof process !== 'undefined' && process.env) {
      key = process.env.VITE_OPENAI_API_KEY || "";
    }
  } catch (e) {
    console.warn("Environment access restricted.");
  }
  
  // CUCI KUNCI: Buang ruang kosong dan buang tanda petikan (" atau ') 
  // yang sering tersilap masuk semasa copy-paste ke Vercel.
  return key.trim().replace(/^["'](.+)["']$/, '$1');
};

const OPENAI_API_KEY = getApiKey();

/**
 * Proxy Wrapper untuk mengelakkan sekatan CORS
 */
const proxiedFetch = async (url: string, options: RequestInit) => {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  return fetch(proxyUrl, options);
};

/**
 * Refinement Prompt menggunakan OpenAI GPT-4o-mini
 */
export const refinePromptWithOpenAI = async (text: string): Promise<string> => {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 10) {
    console.warn("OpenAI API Key is missing or too short.");
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
      console.error("OpenAI API Error Details:", data.error);
      return text;
    }
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (error: any) {
    console.error("OpenAI Connection Error:", error);
    return text;
  }
};

/**
 * Penjana UGC Specialist menggunakan OpenAI GPT-4o-mini
 */
export const generateUGCPrompt = async (idea: string, platform: 'tiktok' | 'facebook'): Promise<string> => {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 10) {
    throw new Error(`KUNCI API TIDAK SAH: Sila pastikan VITE_OPENAI_API_KEY telah ditambah di Vercel/Hosting anda tanpa tanda petikan.`);
  }

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
