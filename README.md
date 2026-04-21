# WBS FKOR UNS — Panduan Deploy ke Vercel

## Stack
- Next.js 14 (React)
- Supabase (PostgreSQL gratis)
- Vercel (hosting gratis)
- xlsx (export Excel)

---

## Langkah 1 — Setup Supabase (database gratis)

1. Buka https://supabase.com → Sign up / Login
2. Klik **New Project** → isi nama project: `wbs-fkor-uns`
3. Pilih region: **Southeast Asia (Singapore)**
4. Tunggu project selesai dibuat (~2 menit)
5. Buka **SQL Editor** → klik **New query**
6. Copy-paste seluruh isi file `supabase-schema.sql` → klik **Run**
7. Buka **Settings → API**:
   - Copy **Project URL** → ini adalah `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public key** → ini adalah `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Langkah 2 — Upload ke GitHub

1. Buat repository baru di https://github.com (misal: `wbs-fkor-uns`)
2. Upload semua file project ini ke repository tersebut
   - Atau gunakan GitHub Desktop / VS Code

---

## Langkah 3 — Deploy ke Vercel

1. Buka https://vercel.com → Sign up dengan akun GitHub
2. Klik **New Project** → Import repository `wbs-fkor-uns`
3. Framework preset: **Next.js** (otomatis terdeteksi)
4. Buka **Environment Variables** → tambahkan:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL dari Supabase (langkah 1) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key dari Supabase (langkah 1) |
   | `ADMIN_PASSWORD` | `fkor2026admin` |

5. Klik **Deploy** → tunggu 1-2 menit
6. Website Anda live di: `https://wbs-fkor-uns.vercel.app`

---

## Ganti domain (opsional)

Di Vercel → Settings → Domains → tambahkan domain custom Anda.

---

## Fitur yang tersedia

- Halaman beranda dengan CTA pengaduan yang menonjol
- Form pengaduan 3 langkah dengan validasi
- Daftar pengaduan publik (mode viewer, email tersembunyi)
- Area admin (sandi: `fkor2026admin`) dengan:
  - Tab Evaluasi: ubah status + tambah catatan per pengaduan
  - Tab Export Data: unduh Excel per minggu/bulan/tahun
  - Tab Pengaturan: konfigurasi email admin
- Kode pelacak unik untuk setiap pengaduan (format: WBS-YYYYMM-XXXX)

---

## Ubah sandi admin

Edit file `.env` (lokal) atau Environment Variables di Vercel:
```
ADMIN_PASSWORD=sandibaruanda
```

---

## Catatan keamanan

- Email pelapor TIDAK tampil di halaman publik
- Endpoint `/api/admin` dan `/api/export` memerlukan header `x-admin-password`
- Sandi admin disimpan sebagai environment variable (bukan hardcode)
