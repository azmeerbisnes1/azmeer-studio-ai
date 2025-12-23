
// Kunci API kini ditarik dari persekitaran (Environment Variables) untuk keselamatan
const OPENAI_API_KEY = (window as any).process?.env?.OPENAI_API_KEY || "";

/**
 * General Prompt Refinement using GPT-4o mini
 */
export const refinePromptWithOpenAI = async (text: string): Promise<string> => {
  if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY tidak dijumpai. Menggunakan teks asal.");
    return text;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
          { role: "user", content: `Refine this idea: ${text}` }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("OpenAI Refine Error:", error);
    return text;
  }
};

/**
 * UGC Specialist Generator using GPT-4o mini
 */
export const generateUGCPrompt = async (idea: string, platform: 'tiktok' | 'facebook'): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error("Sila masukkan OPENAI_API_KEY dalam environment variables untuk menggunakan fungsi UGC.");
  }

  const cta = platform === 'tiktok' ? 'tekan beg kuning sekarang' : 'tekan learn more untuk tahu lebih lanjut';
  
  const systemPrompt = `You are a professional UGC (User Generated Content) Video Engineer for Sora 2 AI. 
  Your goal is to create a highly detailed 15-second video prompt.
  
  RULES:
  - Total Duration: EXACTLY 15 seconds.
  - Visual Changes: Every 3 seconds (Change camera angle, lighting, and visual style).
  - Visual Language: Technical and descriptive English.
  - TEXT RULE: STRICTLY NO TEXT OVERLAYS, GRAPHICS, OR SUBTITLES ON SCREEN from 0s to 12s. 
  - CTA EXCEPTION: Text elements or graphics are ONLY permitted in the final CTA scene (12-15s).
  - Dialogue/Voiceover: Informal, conversational 'Bahasa Melayu Malaysia santai & ringkas' (Voiceover only).
  
  STORYBOARD STRUCTURE (15s):
  [0-3s]: Hook Scene. Intense visual/Extreme close up action. NO TEXT. Dialogue: Catchy Malay hook.
  [3-6s]: Product Intro Scene. Different angle/lighting showing product details. NO TEXT. Dialogue: Explain product.
  [6-9s]: Usage Scene. Handheld POV style showing product in action. NO TEXT. Dialogue: How it helps.
  [9-12s]: Result/Benefits Scene. New angle/clean visual showing the after-effect. NO TEXT. Dialogue: Positive outcome.
  [12-15s]: CTA Scene. Close up on gesture or product with graphic overlay. ONLY HERE text is allowed. Dialogue: "${cta}".
  
  Output ONLY the final combined technical prompt string.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a 15-second UGC prompt for: ${idea}` }
        ],
        temperature: 0.8
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content.trim();
  } catch (error: any) {
    console.error("OpenAI UGC Error:", error);
    throw new Error(`Ralat OpenAI: ${error.message}`);
  }
};
