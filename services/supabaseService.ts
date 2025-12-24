
/**
 * Fungsi pengesan env yang sangat agresif untuk Vercel/Vite.
 */
const getEnv = (key: string): string => {
  const variations = [
    `VITE_SUPABASE_${key}`,
    `SUPABASE_${key}`,
    `NEXT_PUBLIC_SUPABASE_${key}`
  ];

  // Cubaan 1: import.meta.env
  try {
    // @ts-ignore
    const meta = import.meta.env;
    if (meta) {
      for (const v of variations) {
        if (meta[v]) return meta[v].trim();
      }
    }
  } catch (e) {}

  // Cubaan 2: process.env
  try {
    if (typeof process !== 'undefined' && process.env) {
      for (const v of variations) {
        if (process.env[v]) return process.env[v].trim();
      }
    }
  } catch (e) {}

  // Cubaan 3: Global/Window
  try {
    if (typeof window !== 'undefined') {
      for (const v of variations) {
        if ((window as any)[v]) return (window as any)[v].trim();
      }
    }
  } catch (e) {}

  return "";
};

const SUPABASE_URL = getEnv('URL');
const SUPABASE_ANON_KEY = getEnv('ANON_KEY');

export const db = {
  /**
   * Semakan jika aplikasi mempunyai kredensial yang cukup
   */
  isReady: () => {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));
  },

  /**
   * Request handler yang selamat daripada ralat 'Unexpected end of JSON input'
   */
  request: async (path: string, options: RequestInit = {}) => {
    if (!db.isReady()) {
      return { 
        error: "TETAPAN DIPERLUKAN: Sila masukkan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di Vercel Settings dan lakukan REDEPLOY (uncheck build cache)." 
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
      
      // Ambil teks dahulu, JANGAN guna .json() terus
      const rawText = await response.text();
      
      let data: any = null;
      if (rawText && rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          // Jika gagal parse, ia mungkin bukan JSON yang sah
          console.warn("Respon bukan JSON:", rawText);
          data = { message: rawText };
        }
      }

      if (!response.ok) {
        // Jika 404, mungkin table belum wujud
        if (response.status === 404) {
          return { error: `Table atau endpoint '${path}' tidak dijumpai dalam Supabase.` };
        }
        return { error: data?.message || data?.error_description || `Ralat Pelayan ${response.status}` };
      }

      // Jika berjaya tapi tiada data (cth: POST 201 tanpa return representation)
      return data || { success: true };

    } catch (e: any) {
      console.error("Supabase Connectivity Error:", e);
      return { error: "RALAT RANGKAIAN: Sila semak sambungan internet atau tetapan CORS di Supabase." };
    }
  },

  saveUser: async (username: string, password: string, userData: any) => {
    // Gunakan 'return=representation' untuk pastikan kita dapat data balik (elak JSON kosong)
    return await db.request('azmeer_users', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ 
        username: username.toLowerCase().trim(), 
        password, 
        data: userData 
      })
    });
  },

  getUser: async (username: string) => {
    const data = await db.request(`azmeer_users?username=eq.${username.toLowerCase().trim()}&select=*`);
    if (data?.error) return data;
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  },

  updateUser: async (username: string, userData: any) => {
    return await db.request(`azmeer_users?username=eq.${username.toLowerCase().trim()}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: userData })
    });
  },

  saveUuid: async (userId: string, uuid: string) => {
    return await db.request('azmeer_uuids', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId.toLowerCase().trim(), uuid: uuid })
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
