import { refinePromptWithAI } from "./geminigenService";

/**
 * Mendapatkan API Key daripada environment variable Vercel.
 */
const getApiKey = (): string => {
  // Vercel menyuntik environment variables ke dalam process.env
  return (process.env.OPENAI_API_KEY || process.env.API_KEY || "").trim();
};

const fetchOpenAI = async (apiUrl: string, payload: any) => {
  const currentKey = getApiKey();
  
  if (!currentKey) {
    throw new Error("API Key OpenAI tidak dijumpai. Sila masukkan OPENAI_API_KEY di Dashboard Vercel.");
  }

  // Menggunakan proxy untuk mengelakkan ralat CORS di browser
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;

  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || `Ralat OpenAI: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error("OpenAI Fetch Error:", error);
    throw error;
  }
};

export const generateUGCPrompt = async (params: { 
  productDesc: string, 
  gender: 'male' | 'female', 
  platform: 'tiktok' | 'facebook',
  imageRef?: string
}): Promise<string> => {
  const ctaText = params.platform === 'tiktok' ? "tekan beg kuning sekarang" : "tekan learn more untuk tahu lebih lanjut";
  
  const characterRules = params.gender === 'female' 
    ? "A beautiful 30-year-old Malay woman wearing a stylish modest hijab, looking clean and professional. She is friendly and charismatic." 
    : "A handsome 30-year-old Malay man with a polite and friendly influencer look. Neatly groomed hair. STRICTLY NO earrings, NO necklaces, NO bracelets, and NO rings. Wearing modest smart-casual influencer attire (no short pants).";

  const systemPrompt = `You are a world-class UGC (User Generated Content) Creative Director. 
Your goal is to write a 15-second cinematic video prompt for Sora 2.0 based on a product description.

STRICT VIDEO STRUCTURE (15 Seconds Total):
- 0-3s: [HOOK] Extreme close-up of the character reacting excitedly to the camera while holding the product. High-energy lighting.
- 3-6s: [FEATURE 1] Camera angle change to a high-angle 45-degree shot. Character demonstrates the product.
- 6-9s: [FEATURE 2] Camera angle change to a macro close-up of the product details/texture.
- 9-12s: [EXPLANATION] Camera angle change to a medium side-profile shot. Character explains the benefit with natural gestures.
- 12-15s: [CTA] Final camera angle change to an eye-level medium shot. Character points to the camera. ON-SCREEN TEXT (Center): "${ctaText}".

RULES:
- VISUAL STYLE: Cinematic, high-end commercial quality, soft studio lighting.
- CHARACTER: ${characterRules}
- DIALOGUE/VO: Any spoken words must be in casual "Bahasa Melayu Malaysia" (Bahasa santai/ringkas).
- TEXT: NO subtitles or captions on screen, EXCEPT for the final CTA text at the 12-second mark.
- CAMERA: Change angle every 3 seconds as specified.

Return ONLY the high-quality English prompt for Sora 2.0 that describes this entire scene sequence.`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Product Description: ${params.productDesc}` }
    ],
    temperature: 0.8
  };

  const result = await fetchOpenAI("https://api.openai.com/v1/chat/completions", payload);
  return result.choices?.[0]?.message?.content?.trim() || params.productDesc;
};

export const refinePromptWithOpenAI = async (text: string): Promise<string> => {
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a cinematic prompt expert. Improve the user's prompt for Sora 2.0. Focus on textures, lighting, and camera movement. Output ONLY the refined prompt in English." },
      { role: "user", content: text }
    ],
    temperature: 0.7
  };

  try {
    const result = await fetchOpenAI("https://api.openai.com/v1/chat/completions", payload);
    return result.choices?.[0]?.message?.content?.trim() || text;
  } catch (error) {
    return await refinePromptWithAI(text);
  }
};