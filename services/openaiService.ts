
/**
 * PENGESANAN API KEY OPENAI (Manual & Environment)
 */
const getApiKey = (): string => {
  let key = "";
  try {
    const manualKey = localStorage.getItem('azmeer_manual_openai_key');
    if (manualKey && manualKey.trim().length > 10) {
      key = manualKey.trim();
    } else {
      // @ts-ignore
      key = (import.meta.env.VITE_OPENAI_API_KEY || "").trim();
      if (!key && typeof process !== 'undefined' && process.env) {
        key = (process.env.VITE_OPENAI_API_KEY || "").trim();
      }
    }
  } catch (e) {
    console.warn("Access restriction.");
  }
  
  const cleanedKey = key.replace(/^["'](.+)["']$/, '$1').trim();

  if (cleanedKey && !cleanedKey.startsWith('sk-')) {
    throw new Error("FORMAT SALAH: Kunci API OpenAI mestilah bermula dengan 'sk-'.");
  }
  if (cleanedKey.includes('*')) {
    throw new Error("KUNCI 'MASKED' DIKESAN: Sila salin semula kunci PENUH (tanpa bintang) dari dashboard OpenAI.");
  }

  return cleanedKey;
};

const proxiedFetch = async (url: string, options: RequestInit) => {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  return fetch(proxyUrl, options);
};

export const refinePromptWithOpenAI = async (text: string): Promise<string> => {
  let currentKey = "";
  try {
    currentKey = getApiKey();
  } catch (err: any) {
    throw err;
  }

  if (!currentKey) {
    throw new Error("KUNCI DIPERLUKAN: Sila isi OpenAI API Key di Terminal.");
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
          { role: "system", content: "You are a cinematic video prompt engineer for Sora 2. Return ONLY the refined prompt text in English. Dialogue must be in casual Bahasa Melayu voiceover." },
          { role: "user", content: `Refine this idea: ${text}` }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) {
      if (data.error.message.includes("Incorrect API key") || response.status === 401) {
        throw new Error("KUNCI DITOLAK: OpenAI berkata kunci ini tidak sah. Sila pastikan kunci penuh disalin.");
      }
      throw new Error(data.error.message);
    }
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (error: any) {
    throw error;
  }
};
