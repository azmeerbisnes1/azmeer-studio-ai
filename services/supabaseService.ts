
/**
 * PENTING: Untuk aplikasi yang dibina dengan Vite, pembolehubah persekitaran 
 * MESTI diakses secara selamat. Ralat 'Cannot read properties of undefined' 
 * berlaku jika import.meta.env diakses secara terus dalam persekitaran 
 * yang tidak menyokongnya.
 */

const getSupabaseUrl = (): string => {
  try {
    // 1. Cuba akses statik Vite secara selamat (Statik Replacement)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
      // @ts-ignore
      return import.meta.env.VITE_SUPABASE_URL.trim();
    }
    
    // 2. Fallback kepada process.env (Standard Node/Vercel)
    if (typeof process !== 'undefined' && process.env) {
      const val = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      if (val) return val.trim();
    }

    // 3. Fallback terakhir kepada window (Jika disuntik secara global)
    if (typeof window !== 'undefined') {
      const win = window as any;
      const val = win.VITE_SUPABASE_URL || win.SUPABASE_URL;
      if (val) return val.trim();
    }
  } catch (e) {
    console.error("Gagal mengesan Supabase URL:", e);
  }
  return "";
};

const getSupabaseAnonKey = (): string => {
  try {
    // 1. Cuba akses statik Vite secara selamat
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_SUPABASE_ANON_KEY.trim();
    }

    // 2. Fallback kepada process.env
    if (typeof process !== 'undefined' && process.env) {
      const val = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      if (val) return val.trim();
    }

    // 3. Fallback terakhir kepada window
    if (typeof window !== 'undefined') {
      const win = window as any;
      const val = win.VITE_SUPABASE_ANON_KEY || win.SUPABASE_ANON_KEY;
      if (val) return val.trim();
    }
  } catch (e) {
    console.error("Gagal mengesan Supabase Key:", e);
  }
  return "";
};

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = getSupabaseAnonKey();

// Log Diagnostik untuk membantu pengguna membetulkan ralat konfigurasi
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.group("🆘 AZMEER AI: AMARAN DATABASE");
  console.error("URL Status:", SUPABASE_URL ? "✅ Dikesan" : "❌ MISSING (Tiada)");
  console.error("Key Status:", SUPABASE_ANON_KEY ? "✅ Dikesan" : "❌ MISSING (Tiada)");
  console.warn("TINDAKAN SEGERA:");
  console.info("1. Sila ke Dashboard Vercel > Settings > Environment Variables.");
  console.info("2. Tambah dua variable ini: VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.");
  console.info("3. PENTING: Anda WAJIB klik 'Save' dan lakukan 'REDEPLOY' pada projek anda.");
  console.groupEnd();
} else {
  console.log("🚀 Supabase Engine: Successfully Initialized.");
}

/**
 * Enjin permintaan (request engine) untuk berinteraksi dengan Supabase REST API.
 */
const supabaseRequest = async (path: string, options: RequestInit = {}) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Permintaan Supabase dibatalkan: Kunci API tidak lengkap.");
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
    
    const response = await fetch(url, { ...options, headers, mode: 'cors' });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supabase API Error (${response.status}):`, errorText);
      return null;
    }

    if (response.status === 204) return { success: true };
    return await response.json();
  } catch (e) {
    console.error("Ralat rangkaian Supabase:", e);
    return null;
  }
};

export const db = {
  /**
   * Semak jika pangkalan data sedia untuk digunakan.
   */
  isReady: () => !!(SUPABASE_URL && SUPABASE_ANON_KEY),

  /**
   * Simpan atau kemaskini profil pengguna.
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
   * Kemaskini data pengguna mengikut username.
   */
  updateUser: async (username: string, userData: any) => {
    return await supabaseRequest(`azmeer_users?username=eq.${username.toLowerCase().trim()}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: userData })
    });
  },

  /**
   * Ambil maklumat pengguna tunggal.
   */
  getUser: async (username: string) => {
    const data = await supabaseRequest(`azmeer_users?username=eq.${username.toLowerCase().trim()}&select=*`);
    return data && data.length > 0 ? data[0] : null;
  },

  /**
   * Simpan ID video yang dijana ke arkib peribadi.
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
   * Ambil semua senarai UUID video milik pengguna.
   */
  getUuids: async (userId: string) => {
    const data = await supabaseRequest(`azmeer_uuids?user_id=eq.${userId.toLowerCase().trim()}&select=uuid`);
    return data ? data.map((d: any) => d.uuid) : [];
  },

  /**
   * Fungsi khas Admin untuk melihat semua pengguna.
   */
  getAllUsers: async () => {
    const data = await supabaseRequest('azmeer_users?select=*&order=created_at.desc');
    return data ? data : [];
  }
};
