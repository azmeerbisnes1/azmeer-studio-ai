
/**
 * OPENAI SCRIPTING ENGINE (GPT-4o-mini) - LOCKED VERSION
 * Specialized for Sora 2.0 UGC Cinema Prompts with Lip-Sync Dialogue
 * DO NOT MODIFY THE STRUCTURE BELOW.
 */

const getApiKey = (): string => {
  // @ts-ignore
  const viteKey = import.meta.env?.VITE_OPENAI_API_KEY;
  if (viteKey) return viteKey.trim();

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
    throw new Error("Konfigurasi Diperlukan: Sila pastikan VITE_OPENAI_API_KEY telah dimasukkan dalam environment Vercel.");
  }

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
  
  const charFemale = "A professional and charismatic 30-year-old Malay woman influencer, wearing a stylish modest hijab and elegant modern clothing. She has a friendly face and warm smile.";
  const charMale = "A polite and professional 30-year-old Malay man, clean-shaven with neat short hair, wearing a smart long-sleeve shirt and long trousers. STRICTLY NO earrings, NO necklaces, NO bracelets, NO rings, and NO shorts. He has a friendly Malaysian influencer vibe.";
  
  const selectedChar = params.gender === 'female' ? charFemale : charMale;

  const systemPrompt = `You are a world-class UGC Creative Director specializing in Sora 2.0 AI video prompts.
Your goal is to write a 15-second cinematic video prompt in English that includes SPECIFIC SPOKEN DIALOGUE in casual Bahasa Melayu Malaysia.

STRICT VIDEO STRUCTURE (15 SECONDS TOTAL):
- You must divide the prompt into 5 segments of 3 seconds each.
- EVERY 3 SECONDS, change the camera angle, lighting, and visual style.
- THE CHARACTER MUST SPEAK in every segment except the final CTA.

SORA 2.0 PROMPT REQUIREMENTS:
1. CHARACTER: ${selectedChar}.
2. DIALOGUE: Spoken dialogue MUST be in "Bahasa Melayu Malaysia" (casual/santai/influencer style).
3. VISUAL STYLE: Photorealistic 4K, cinematic lighting, 8k resolution, volumetric shadows.
4. TEXT: DO NOT include any subtitles or on-screen text until the very end (12s-15s).

TIMELINE BREAKDOWN TO GENERATE:
- [0s-3s] HOOK: Extreme close-up. The character looks at the camera and says a high-energy hook in Malay.
- [3s-6s] PRODUCT INTRO: Medium shot, side angle. Character shows the product. Character explains why it's great in casual Malay.
- [6s-9s] DETAIL/MACRO: Macro close-up on the product. Character's voice continues in Malay (voiceover style) explaining the benefits. High-end textures.
- [9s-12s] RESULT/REACTION: Low angle hero shot. Character shows a 'wow' reaction or the result of using the product. Character speaks short Malay dialogue like "Memang berbaloi!" or "Tengoklah hasil dia!".
- [12s-15s] CTA: Medium shot, eye level. Character points to the screen. A bold text overlay appears: "${ctaText}". Character says: "Jom dapatkan sekarang!" or similar.

Return ONLY the final detailed prompt in English, with the Malay dialogue clearly quoted within the visual description for Sora to perform.`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Product Description/Idea: ${params.productDesc}` }
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
      { role: "system", content: "You are an expert Sora 2.0 prompt engineer. Transform user input into a cinematic, detailed prompt in English focusing on lighting (anamorphic flares, volumetric fog), camera paths (dolly zoom, slow pan), and high-end textures. Ensure the description implies high-quality lip-sync if dialogue is present." },
      { role: "user", content: text }
    ],
    temperature: 0.7
  };

  try {
    const result = await fetchOpenAI(payload);
    return result.choices?.[0]?.message?.content?.trim() || text;
  } catch (error) {
    return text;
  }
};
