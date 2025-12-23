
/**
 * PENGESANAN API KEY OPENAI (Manual & Environment)
 */
const getApiKey = (): string => {
  let key = "";
  try {
    // 1. UTAMA: Ambil daripada input manual user di UI (localStorage)
    const manualKey = localStorage.getItem('azmeer_manual_openai_key');
    if (manualKey && manualKey.length > 10) {
      key = manualKey.trim();
    } else {
      // 2. FALLBACK: Ambil daripada Vite build-time env
      // @ts-ignore
      key = (import.meta.env.VITE_OPENAI_API_KEY || "").trim();
      
      // 3. FALLBACK: Ambil daripada process.env
      if (!key && typeof process !== 'undefined' && process.env) {
        key = (process.env.VITE_OPENAI_API_KEY || "").trim();
      }
    }
  } catch (e) {
    console.warn("Environment access restricted.");
  }
  
  // CUCI KUNCI: Buang tanda petikan (" atau ') dan ruang kosong
  const cleanedKey = key.replace(/^["'](.+)["']$/, '$1').trim();

  // VALIDASI: Jika kunci mengandungi banyak bintang, bermakna user tersalin kunci 'masked'
  if (cleanedKey.includes('****')) {
    throw new Error("KUNCI API TIDAK SAH: Anda nampaknya menyalin kunci yang 'dihijab' (masked) dengan simbol bintang dari dashboard OpenAI. Sila salin kunci penuh (klik butang 'Copy' atau buat kunci baru).");
  }

  return cleanedKey;
};

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
  let currentKey = "";
  try {
    currentKey = getApiKey();
  } catch (err: any) {
    throw err;
  }

  if (!currentKey || currentKey.length < 10) {
    throw new Error("KUNCI API DIPERLUKAN: Sila masukkan OpenAI API Key yang sah dalam ruangan 'OpenAI Key Terminal' di atas.");
  }

  try {
    const response = await proxiedFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentKey}`
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
      // Jika OpenAI pulangkan ralat key, beri mesej yang lebih jelas
      if (data.error.code === 'invalid_api_key' || data.error.message.includes('Incorrect API key')) {
        throw new Error("RALAT KUNCI API: OpenAI tidak menerima kunci ini. Sila pastikan kunci adalah penuh, aktif, dan mempunyai kredit.");
      }
      throw new Error(data.error.message);
    }
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (error: any) {
    console.error("OpenAI Refine Error:", error);
    throw error;
  }
};

/**
 * Penjana UGC Specialist menggunakan OpenAI GPT-4o-mini
 */
export const generateUGCPrompt = async (idea: string, platform: 'tiktok' | 'facebook'): Promise<string> => {
  let currentKey = "";
  try {
    currentKey = getApiKey();
  } catch (err: any) {
    throw err;
  }

  if (!currentKey || currentKey.length < 10) {
    throw new Error("KUNCI API DIPERLUKAN: Sila masukkan OpenAI API Key yang sah dalam ruangan 'OpenAI Key Terminal' di atas.");
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
        "Authorization": `Bearer ${currentKey}`
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
    if (data.error) {
      if (data.error.code === 'invalid_api_key' || data.error.message.includes('Incorrect API key')) {
        throw new Error("RALAT KUNCI API: OpenAI tidak menerima kunci ini. Sila pastikan kunci adalah penuh, aktif, dan mempunyai kredit.");
      }
      throw new Error(data.error.message);
    }
    return data.choices?.[0]?.message?.content?.trim() || "";
  } catch (error: any) {
    console.error("OpenAI UGC Error:", error);
    throw error;
  }
};
