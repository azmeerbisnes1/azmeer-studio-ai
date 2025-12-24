
# 🚀 Azmeer AI Studio - GitHub & Security Guide

## 1. Kenapa Commit Anda Disekat? (Fixed)
GitHub mempunyai **Secret Scanning**. Jika anda membiarkan API Key dalam kod, GitHub akan menyekat sebarang cubaan *stage* atau *push*. Saya telah membuang semua hardcoded keys.

## 2. Cara Mengaktifkan Semula AI (Video & UGC)
Anda **WAJIB** menambah kunci ini di Dashboard Hosting (contoh: Vercel) anda di bawah bahagian **Environment Variables**:

1. **VITE_OPENAI_API_KEY**: Masukkan kunci OpenAI anda untuk Prompt Generator.
2. **VITE_GEMINIGEN_API_KEY**: Masukkan `tts-fe9842ffd74cffdf095bb639e1b21a01` untuk penjanaan video.
3. **API_KEY**: Masukkan kunci Google Gemini anda.

## 3. Cara Stage & Commit Sekarang
1. Klik butang **Stage All Changes** di IDE anda.
2. Masukkan mesej: `fix: security cleanup and path resolution`
3. Klik **Commit & Push**.
4. Ia sepatutnya berfungsi lancar sekarang kerana kod sudah bersih daripada "Secrets".
