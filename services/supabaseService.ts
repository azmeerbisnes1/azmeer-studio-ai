
/**
 * PENTING UNTUK DEPLOYMENT:
 * Dalam Vite, pembolehubah persekitaran MESTI diakses menggunakan nama penuh secara literal
 * seperti `import.meta.env.VITE_NAMA_KEY`. Sebarang cubaan untuk mengakses secara dinamik 
 * seperti `env[key]` akan gagal dalam production kerana Vite melakukan 'Static Replacement'.
 */

// Cubaan akses literal (Vite akan menggantikan ini semasa build)
const getStaticUrl = () => {
  try {
    // @ts-ignore
    return import.meta.env.VITE_SUPABASE_URL || "";
  } catch {
    return "";
  }
};

const getStaticKey = () => {
  try {
    // @ts-ignore
    return import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  } catch {
    return "";
  }
};

// Fallback untuk persekitaran bukan Vite (misalnya Vercel Edge/Serverless)
const getFallbackUrl = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    }
    if (typeof window !== 'undefined') {
      const win = window as any;
      return win.VITE_SUPABASE_URL || win.SUPABASE_URL || "";
    }
  } catch {
    return "";
  }
  return "";
};

const getFallbackKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
    }
    if (typeof window !== 'undefined') {
      const win = window as any;
      return win.VITE_SUPABASE_ANON_KEY || win.SUPABASE_ANON_KEY || "";
    }
  } catch {
    return "";
  }
  return "";
};

const SUPABASE_URL = (getStaticUrl() || getFallbackUrl()).trim();
const SUPABASE_ANON_KEY = (getStaticKey() || getFallbackKey()).trim();

// Diagnostik Kritikal (Hanya dipaparkan jika kunci tiada)
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.group("🆘 AZMEER AI: AMARAN DATABASE");
  console.error("URL Status:", SUPABASE_URL ? "✅ OK" : "❌ MISSING");
  console.error("Key Status:", SUPABASE_ANON_KEY ? "✅ OK" : "❌ MISSING");
  console.warn("TINDAKAN SEGERA:");
  console.info("1. Buka Dashboard Vercel > Settings > Environment Variables.");
  console.info("2. Pastikan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY telah ditambah.");
  console.info("3. PENTING: Klik 'Save' dan lakukan 'REDEPLOY' (Production) untuk mengemas kini aplikasi.");
  console.groupEnd();
} else {
  console.log("🚀 Supabase Engine: Active and Ready.");
}

/**
 * Enjin permintaan (request engine) untuk berinteraksi dengan Supabase REST API.
 */
const supabaseRequest = async (path: string, options: RequestInit = {}) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
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
    
    const response = await fetch(url, { 
      ...options, 
      headers,
      mode: 'cors' 
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supabase API Error (${response.status}):`, errorText);
      return null;
    }

    if (response.status === 204) return { success: true };
    return await response.json();
  } catch (e) {
    console.error("Supabase Network Connection Error:", e);
    return null;
  }
};

export const db = {
  isReady: () => !!(SUPABASE_URL && SUPABASE_ANON_KEY),

  saveUser: async (username: string, password: string, userData: any) => {
    return await supabaseRequest('azmeer_users', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ 
        username: username.toLowerCase().trim(), 
        password, 
        data: userData 
      })
    });
  },

  updateUser: async (username: string, userData: any) => {
    return await supabaseRequest(`azmeer_users?username=eq.${username.toLowerCase().trim()}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: userData })
    });
  },

  getUser: async (username: string) => {
    const data = await supabaseRequest(`azmeer_users?username=eq.${username.toLowerCase().trim()}&select=*`);
    return data && data.length > 0 ? data[0] : null;
  },

  saveUuid: async (userId: string, uuid: string) => {
    return await supabaseRequest('azmeer_uuids', {
      method: 'POST',
      body: JSON.stringify({ 
        user_id: userId.toLowerCase().trim(), 
        uuid: uuid 
      })
    });
  },

  getUuids: async (userId: string) => {
    const data = await supabaseRequest(`azmeer_uuids?user_id=eq.${userId.toLowerCase().trim()}&select=uuid`);
    return data ? data.map((d: any) => d.uuid) : [];
  },

  getAllUsers: async () => {
    const data = await supabaseRequest('azmeer_users?select=*&order=created_at.desc');
    return data ? data : [];
  }
};
