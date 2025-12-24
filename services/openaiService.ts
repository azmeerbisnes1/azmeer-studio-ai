
/**
 * OPENAI SCRIPTING ENGINE (GPT-4o-mini)
 */

const getApiKey = (): string => {
  // Dalam Vite, variable MESTI bermula dengan VITE_ untuk akses di client-side
  // @ts-ignore
  const viteKey = import.meta.env?.VITE_OPENAI_API_KEY;
  if (viteKey) return viteKey.trim();

  // Fallback untuk persekitaran lain
  try {
    if (typeof process !== 'undefined' && process.env.VITE_OPENAI_API_KEY) {
      return process.env.VITE_OPENAI_API_KEY.trim();
    }
  } catch (e) {}

  return "";
};

const fetchOpenAI = async (payload: any) => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("Ralat Konfigurasi: VITE_OPENAI_API_KEY tidak dijumpai. Sila pastikan anda telah menambah variable bernama 'VITE_OPENAI_API_KEY' (bukan OPENAI_API_KEY sahaja) di Dashboard Vercel anda dan lakukan Redeploy.");
  }

  // Menggunakan proxy untuk mengelakkan ralat CORS di browser
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent("https://api.openai.com/v1/chat/completions")}`;

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI Error: ${response.status}`);
  }

  return data;
};

export const generateUGCPrompt = async (params: { 
  productDesc: string, 
  gender: 'male' | 'female', 
  platform: 'tiktok' | 'facebook',
  imageRef?: string
}): Promise<string> => {
  const ctaText = params.platform === 'tiktok' ? "tekan beg kuning sekarang" : "tekan learn more untuk tahu lebih lanjut";
  
  const femaleDesc = "A beautiful 30-year-old Malay woman, wearing a stylish modest hijab and professional attire. She has a friendly, charismatic influencer vibe.";
  const maleDesc = "A handsome 30-year-old Malay man, clean-shaved with neat short hair. Professional influencer look.";
  
  const characterRules = params.gender === 'female' ? femaleDesc : maleDesc;

  const systemPrompt = `You are a world-class UGC Creative Director.
Write a 15-second cinematic video prompt in English for Sora 2.0.

STRUCTURE:
- 0-3s: [HOOK] Extreme close-up. ${characterRules} looks at camera, smiling with the product.
- 3-12s: Angle changes every 3s showing the product usage.
- 12-15s: [CTA] Final camera shift. Text Overlay: "${ctaText}".

RULES:
- Any spoken words MUST be in natural "Bahasa Melayu Malaysia".
- Visual descriptions in high-end cinematic English.
- Return ONLY the final prompt.`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Product Idea: ${params.productDesc}` }
    ],
    temperature: 0.8
  };

  const result = await fetchOpenAI(payload);
  return result.choices?.[0]?.message?.content?.trim() || params.productDesc;
};

export const refinePromptWithOpenAI = async (text: string): Promise<string> => {
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert Sora 2.0 prompt engineer. Transform user input into a cinematic, detailed prompt in English." },
      { role: "user", content: text }
    ],
    temperature: 0.7
  };

  try {
    const result = await fetchOpenAI(payload);
    return result.choices?.[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error(error);
    return text;
  }
};
