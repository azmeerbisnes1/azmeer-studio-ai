
/**
 * Fungsi pengesan env yang lebih lasak untuk pelbagai platform (Vercel, Vite, etc)
 */
const getEnv = (key: string): string => {
  const variations = [
    `VITE_SUPABASE_${key}`,
    `SUPABASE_${key}`,
    `NEXT_PUBLIC_SUPABASE_${key}`,
    `REACT_APP_SUPABASE_${key}`
  ];

  for (const v of variations) {
    try {
      // 1. Cuba via import.meta.env (Vite standard)
      // @ts-ignore
      const meta = import.meta.env?.[v];
      if (meta) return meta.trim();
    } catch (e) {}

    try {
      // 2. Cuba via process.env (Standard node/webpack)
      const proc = process.env?.[v];
      if (proc) return proc.trim();
    } catch (e) {}

    try {
      // 3. Cuba via window (Global injection)
      const win = (window as any)._env_?.[v] || (window as any)?.[v];
      if (win) return win.trim();
    } catch (e) {}
  }
  return "";
};

const SUPABASE_URL = getEnv('URL');
const SUPABASE_ANON_KEY = getEnv('ANON_KEY');

// Log Diagnostik untuk membantu pengguna di Vercel
console.group("🔍 [DIAGNOSTIK SUPABASE]");
console.log("URL Dikesan:", SUPABASE_URL ? "✅ ADA" : "❌ TIADA");
console.log("Key Dikesan:", SUPABASE_ANON_KEY ? "✅ ADA" : "❌ TIADA");
console.groupEnd();

export const db = {
  /**
   * Semakan status setup
   */
  isReady: () => {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));
  },

  request: async (path: string, options: RequestInit = {}) => {
    if (!db.isReady()) {
      return { 
        error: "SILA SEMAK VERCEL: Kod tidak dapat membaca VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY." 
      };
    }
    
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const baseUrl = SUPABASE_URL.replace(/\/+$/, "");
      const url = `${baseUrl}/rest/v1/${path}`;
      
      const response = await fetch(url, { ...options, headers });
      
      // Ambil respon sebagai text dahulu untuk elak ralat "Unexpected end of JSON"
      const responseText = await response.text();
      let responseData: any = null;
      
      try {
        if (responseText) responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = null;
      }

      if (!response.ok) {
        const rawMessage = responseData?.message || responseText || "";

        if (rawMessage.toLowerCase().includes("forbidden use of secret api key") || response.status === 401) {
          return { 
            error: "ANDA GUNA KEY SALAH: Sila tukar kepada 'Anon Key' (Public) di Vercel. Jangan guna Secret Key." 
          };
        }

        if (response.status === 404) {
          return { error: "JADUAL HILANG: Sila 'Run SQL' di Supabase untuk jadual 'azmeer_users'." };
        }
        
        return { error: rawMessage || `Ralat Pelayan (${response.status})` };
      }

      // Jika berjaya (200, 201, 204)
      if (response.status === 204 || !responseText) return { success: true };
      return responseData;
    } catch (e: any) {
      console.error("Supabase Fetch Error:", e);
      return { error: "MASALAH TEKNIKAL: Gagal menghubungi pangkalan data." };
    }
  },

  saveUser: async (username: string, password: string, userData: any) => {
    return await db.request('azmeer_users', {
      method: 'POST',
      headers: { 
        'Prefer': 'return=representation,resolution=merge-duplicates' 
      },
      body: JSON.stringify({ 
        username: username.toLowerCase().trim(), 
        password, 
        data: userData 
      })
    });
  },

  updateUser: async (username: string, userData: any) => {
    return await db.request(`azmeer_users?username=eq.${username.toLowerCase().trim()}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: userData })
    });
  },

  getUser: async (username: string) => {
    const data = await db.request(`azmeer_users?username=eq.${username.toLowerCase().trim()}&select=*`);
    if (data?.error) return data;
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  },

  saveUuid: async (userId: string, uuid: string) => {
    return await db.request('azmeer_uuids', {
      method: 'POST',
      body: JSON.stringify({ 
        user_id: userId.toLowerCase().trim(), 
        uuid: uuid 
      })
    });
  },

  getUuids: async (userId: string) => {
    const data = await db.request(`azmeer_uuids?user_id=eq.${userId.toLowerCase().trim()}&select=uuid`);
    return Array.isArray(data) ? data.map((d: any) => d.uuid) : [];
  },

  getAllUsers: async () => {
    const data = await db.request('azmeer_users?select=*&order=created_at.desc');
    return Array.isArray(data) ? data : [];
  }
};
