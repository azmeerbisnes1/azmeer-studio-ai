
# 🚀 Azmeer AI Studio - GitHub & Security Guide

## 1. Cara Simpan ke GitHub (Selesai!)
Masalah "Tak boleh save" telah dibaiki dengan membuang API Key daripada kod sumber. Kod anda kini mematuhi polisi keselamatan GitHub (No Secrets Policy).

## 2. Persediaan Vercel / Hosting
Untuk membolehkan fungsi AI (UGC & Refine) berfungsi semula, anda **WAJIB** menambah kunci API anda di Dashboard Vercel:
1. Pergi ke **Project Settings** > **Environment Variables**.
2. Tambah Key: `VITE_OPENAI_API_KEY`.
3. Masukkan Value: `sk-proj-36Owy...` (Kunci penuh anda).
4. Klik **Save** dan **Redeploy** projek anda.

## 3. Penyimpanan Data
Data pengguna dan arkib video disimpan secara berasingan dalam **Supabase Cloud**. Ia tidak terjejas oleh perubahan kod di GitHub.
