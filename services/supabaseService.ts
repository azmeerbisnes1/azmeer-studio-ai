
/**
 * Utiliti untuk mendapatkan nilai Environment Variable secara selamat
 * merentasi pelbagai persekitaran (Vite, Node-like, atau Browser Global).
 */
const getEnv = (key: string): string => {
  try {
    // 1. Cuba akses melalui Vite (import.meta.env)
    // Fix: Access env through type assertion to avoid Property 'env' does not exist on type 'ImportMeta'
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const v = (import.meta as any).env[`VITE_${key}`] || (import.meta as any).env[key];
      if (v) return v;
    }
  } catch (e) {}

  try {
    // 2. Cuba akses melalui global process.env (Sering digunakan oleh persekitaran preview/injected)
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      const v = process.env[`VITE_${key}`] || process.env[key];
      if (v) return v;
    }
  } catch (e) {}

  try {
    // 3. Cuba akses melalui window global (Fallback terakhir)
    if (typeof window !== 'undefined') {
      const v = (window as any)._env_?.[`VITE_${key}`] || (window as any)._env_?.[key];
      if (v) return v;
    }
  } catch (e) {}

  return "";
};

const SUPABASE_URL = getEnv('SUPABASE_URL').trim();
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY').trim();

// Log diagnostik untuk membantu debug di Vercel Console
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ SUPABASE CONFIG MISSING: Sila pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY telah di-set dalam Dashboard Vercel (Environment Variables).");
} else {
  console.log("✅ Supabase Configuration successfully loaded.");
}

/**
 * Enjin permintaan (request engine) untuk berinteraksi dengan Supabase REST API.
 */
const supabaseRequest = async (path: string, options: RequestInit = {}) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase request aborted: Connection credentials not available.");
    return null;
  }
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { 
      ...options, 
      headers,
      mode: 'cors' 
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supabase Error (${response.status}):`, errorText);
      return null;
    }

    if (response.status === 204) return { success: true };
    return await response.json();
  } catch (e) {
    console.error("Supabase Network/CORS Error:", e);
    return null;
  }
};

export const db = {
  /**
   * Semakan status sambungan untuk paparan UI.
   */
  isReady: () => !!(SUPABASE_URL && SUPABASE_ANON_KEY),

  /**
   * Simpan atau Kemaskini User (Pendaftaran atau Kemaskini Admin)
   */
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

  /**
   * Kemaskini data pengguna (Status Kelulusan atau Had Video)
   */
  updateUser: async (username: string, userData: any) => {
    return await supabaseRequest(`azmeer_users?username=eq.${username.toLowerCase().trim()}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: userData })
    });
  },

  /**
   * Mengambil data pengguna tunggal mengikut username (Log Masuk)
   */
  getUser: async (username: string) => {
    const data = await supabaseRequest(`azmeer_users?username=eq.${username.toLowerCase().trim()}&select=*`);
    return data && data.length > 0 ? data[0] : null;
  },

  /**
   * Menyimpan UUID video yang dijana untuk arkib peribadi
   */
  saveUuid: async (userId: string, uuid: string) => {
    return await supabaseRequest('azmeer_uuids', {
      method: 'POST',
      body: JSON.stringify({ 
        user_id: userId.toLowerCase().trim(), 
        uuid: uuid 
      })
    });
  },

  /**
   * Mengambil semua senarai UUID video milik pengguna tertentu
   */
  getUuids: async (userId: string) => {
    const data = await supabaseRequest(`azmeer_uuids?user_id=eq.${userId.toLowerCase().trim()}&select=uuid`);
    return data ? data.map((d: any) => d.uuid) : [];
  },

  /**
   * Fungsi khas Admin untuk mendapatkan semua senarai pengguna
   */
  getAllUsers: async () => {
    const data = await supabaseRequest('azmeer_users?select=*&order=created_at.desc');
    return data ? data : [];
  }
};