
# 🚀 Azmeer AI Studio - GitHub & Security Guide

## 1. Cara "Save" ke GitHub
Jika anda tidak dapat "save" terus, ini adalah kerana persekitaran web ini tidak mempunyai akses tulis (write access) ke akaun GitHub anda secara automatik.

**Langkah Manual:**
1. Klik butang **Download Project** (ikon anak panah bawah) di bahagian atas kanan editor.
2. Ekstrak fail .zip tersebut di komputer anda.
3. Pergi ke akaun [GitHub](https://github.com/) anda.
4. Bina satu **New Repository** (Set sebagai **Private**).
5. Guna butang **"Upload files"** dan tarik semua fail tadi ke dalam GitHub.

## 2. Keselamatan API Key
Semua kunci API OpenAI telah dibuang daripada kod sumber. Untuk menggunakan semula fungsi AI:
- Masukkan kunci anda dalam **Environment Variables** di platform hosting (seperti Vercel, Netlify, atau Replit).
- Nama variable: `OPENAI_API_KEY`.

## 3. Penyimpanan Data
Data user dan history video anda **automatik tersimpan** dalam **Supabase**. Anda tidak perlu save ke GitHub untuk simpan data user; GitHub hanya untuk simpan kod sahaja.
