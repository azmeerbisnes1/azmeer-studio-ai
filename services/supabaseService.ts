
/**
 * Neural Database Service - v12 Security Updated
 */
const getEnv = (key: string): string => {
  const variations = [`VITE_SUPABASE_${key}`, `SUPABASE_${key}`, `NEXT_PUBLIC_SUPABASE_${key}`];
  try {
    // @ts-ignore
    const meta = import.meta.env;
    if (meta) { for (const v of variations) { if (meta[v]) return meta[v].trim(); } }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      for (const v of variations) { if (process.env[v]) return process.env[v].trim(); }
    }
  } catch (e) {}
  return localStorage.getItem(`AZMEER_SUPABASE_${key}`)?.trim() || "";
};

let SUPABASE_URL = getEnv('URL');
let SUPABASE_ANON_KEY = getEnv('ANON_KEY');

const safeLower = (str: any) => (str ? String(str).toLowerCase().trim() : "");

// LocalStorage Fallback Key
const LOCAL_UUID_KEY = (userId: string) => `azmeer_local_uuids_${safeLower(userId)}`;

export const db = {
  isReady: () => !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http')),

  setManualKeys: (url: string, key: string) => {
    localStorage.setItem('AZMEER_SUPABASE_URL', url.trim());
    localStorage.setItem('AZMEER_SUPABASE_ANON_KEY', key.trim());
    window.location.reload();
  },

  request: async (path: string, options: RequestInit = {}) => {
    if (!db.isReady()) return { error: "Supabase belum di-config." };
    
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const url = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
      const response = await fetch(url, { ...options, headers });
      const rawText = await response.text();
      let data = rawText ? JSON.parse(rawText) : { success: true };

      if (!response.ok) {
        if (data?.code === 'PGRST116' || data?.message?.includes('not found')) {
          return { error: `Table '${path.split('?')[0]}' tidak wujud dalam Supabase anda.`, isTableMissing: true };
        }
        return { error: data?.message || `HTTP ${response.status}` };
      }
      return data;
    } catch (e) {
      return { error: "Network Error: Gagal menyambung ke Supabase." };
    }
  },

  saveUser: async (username: string, password: string, userData: any) => {
    return await db.request('azmeer_users', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ username: safeLower(username), password, data: userData })
    });
  },

  getUser: async (username: string) => {
    const data = await db.request(`azmeer_users?username=eq.${safeLower(username)}&select=*`);
    if (data?.error) return data;
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  },

  updateUser: async (username: string, userData: any) => {
    return await db.request(`azmeer_users?username=eq.${safeLower(username)}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: userData })
    });
  },

  saveUuid: async (userId: string, uuid: string) => {
    if (!userId || !uuid) return;
    const uid = safeLower(userId);
    
    console.log(`[Database] Menyimpan UUID: ${uuid} untuk user: ${uid}`);

    // 1. Simpan ke LocalStorage (Kecemasan/Pantas)
    try {
      const localData = JSON.parse(localStorage.getItem(LOCAL_UUID_KEY(uid)) || "[]");
      if (!localData.includes(uuid)) {
        localData.push(uuid);
        localStorage.setItem(LOCAL_UUID_KEY(uid), JSON.stringify(localData));
      }
    } catch (e) {}

    // 2. Simpan ke Supabase (Cloud)
    return await db.request('azmeer_uuids', {
      method: 'POST',
      body: JSON.stringify({ user_id: uid, uuid: uuid })
    });
  },

  getUuids: async (userId: string) => {
    if (!userId) return [];
    const uid = safeLower(userId);
    
    // Ambil dari LocalStorage dahulu (Sentiasa ada backup)
    let localUuids: string[] = [];
    try {
      localUuids = JSON.parse(localStorage.getItem(LOCAL_UUID_KEY(uid)) || "[]");
    } catch (e) {}

    // Ambil dari Supabase (Master data)
    const cloudData = await db.request(`azmeer_uuids?user_id=eq.${uid}&select=uuid`);
    const cloudUuids = Array.isArray(cloudData) ? cloudData.map((d: any) => d.uuid) : [];

    // Gabungkan dan buang duplicate
    const combined = Array.from(new Set([...localUuids, ...cloudUuids]));
    return combined;
  },

  getAllUsers: async () => {
    const data = await db.request('azmeer_users?select=*&order=created_at.desc');
    return Array.isArray(data) ? data : [];
  }
};
