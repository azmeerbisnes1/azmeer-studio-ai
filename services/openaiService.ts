
/**
 * OPENAI SCRIPTING ENGINE (GPT-4o-mini)
 * Specialized for Sora 2.0 UGC Cinema Prompts
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
    throw new Error("Konfigurasi Diperlukan: Sila pastikan VITE_OPENAI_API_KEY telah dimasukkan dalam environment Vercel dan anda telah melakukan Redeploy.");
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
  
  // Character Definitions
  const charFemale = "A beautiful 30-year-old Malay woman, wearing a stylish modest hijab and professional modern attire. She has a charismatic Malaysian influencer vibe, warm and friendly.";
  const charMale = "A handsome 30-year-old Malay man in his 30s, wearing a smart casual outfit like a polo shirt or clean t-shirt. He is clean-shaven with neat short hair. STRICTLY NO earrings, NO necklaces, NO bracelets, and NO rings. He looks like a polite, professional Malaysian influencer.";
  
  const selectedChar = params.gender === 'female' ? charFemale : charMale;

  const systemPrompt = `You are a world-class UGC (User Generated Content) Creative Director for Sora 2.0.
Your task is to write a single, highly detailed cinematic video prompt in English for an AI video generator.

VIDEO ARCHITECTURE (Exactly 15 Seconds):
The video MUST have 5 distinct segments of 3 seconds each. Every 3 seconds, you MUST describe a drastic camera angle change and visual shift.

STRICT TIMELINE AND CONTENT INSTRUCTION:
- Visual Style: Photorealistic, cinematic 4K, high-end studio lighting, volumetric shadows, 8k resolution.
- Characters: Use the provided character description (${params.gender === 'female' ? 'Female Malay Hijab' : 'Male Malay polite influencer'}).
- Dialogue: The character MUST be speaking in natural, casual "Bahasa Melayu Malaysia" (Malaysian daily conversation style).
- Text: NO subtitles. NO text overlays in the first 12 seconds. ONLY the final CTA text at the end.

TIMELINE BREAKDOWN:
1. 0s-3s [THE HOOK]: Extreme close-up or high-energy medium shot. ${selectedChar} looks directly at the lens, smiling enthusiastically while holding the product. They say a catchy hook in casual Malay.
2. 3s-6s [PRODUCT INTRO]: 45-degree side shot or over-the-shoulder shot. Character demonstrating the product in a premium home or minimalist office setting. Character continues speaking casual Malay about why they love it.
3. 6s-9s [MACRO DETAIL]: Macro lens extreme close-up focusing on the product's texture, premium label, or specific high-quality feature. Cinematic lighting with anamorphic lens flares. Character's voiceover in Malay explains the benefit.
4. 9s-12s [DEMONSTRATION/REACTION]: Eye-level medium shot. Character using the product and showing a look of extreme satisfaction or "wow" factor. Energetic body language. Dialogue in Malay confirms the result.
5. 12s-15s [THE CTA]: Final camera shift to a direct eye-level centered shot. Character pointing towards the viewer/screen with a friendly smile. A clean, bold Text Overlay appears in the center reading: "${ctaText}".

Return ONLY the final detailed cinematic prompt string in English (with the Malay dialogue embedded where appropriate).`;

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
      { role: "system", content: "You are an expert Sora 2.0 prompt engineer. Transform user input into a cinematic, detailed prompt in English focusing on lighting, camera paths, and high-end textures." },
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
