-- Jalankan SQL ini di Supabase SQL Editor
-- https://supabase.com → Project → SQL Editor

CREATE TABLE pengaduan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kode TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  nama TEXT,
  status_pelapor TEXT NOT NULL,
  nim_nip TEXT,
  kategori TEXT NOT NULL,
  unit TEXT NOT NULL,
  lokasi TEXT NOT NULL,
  tanggal_kejadian DATE NOT NULL,
  prioritas TEXT,
  sudah_lapor TEXT DEFAULT 'Belum',
  judul TEXT NOT NULL,
  uraian TEXT NOT NULL,
  harapan TEXT,
  lampiran TEXT,
  status TEXT NOT NULL DEFAULT 'Menunggu',
  catatan_evaluasi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aktifkan Row Level Security
ALTER TABLE pengaduan ENABLE ROW LEVEL SECURITY;

-- Policy: siapapun bisa insert (kirim pengaduan)
CREATE POLICY "allow_insert" ON pengaduan
  FOR INSERT WITH CHECK (true);

-- Policy: siapapun bisa baca kolom publik (tanpa email)
-- Dibatasi di API layer, bukan di RLS

-- Policy: API bisa baca semua (via service role / anon untuk kolom publik)
CREATE POLICY "allow_select" ON pengaduan
  FOR SELECT USING (true);

-- Policy: API bisa update (via server-side dengan validasi password admin)
CREATE POLICY "allow_update" ON pengaduan
  FOR UPDATE USING (true);

-- Index untuk performa query
CREATE INDEX idx_pengaduan_status ON pengaduan(status);
CREATE INDEX idx_pengaduan_created ON pengaduan(created_at DESC);
CREATE INDEX idx_pengaduan_kode ON pengaduan(kode);

-- Tabel settings (opsional — untuk simpan email admin secara persisten)
CREATE TABLE IF NOT EXISTS wbs_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wbs_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_all" ON wbs_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default settings
INSERT INTO wbs_settings (key, value) VALUES
  ('emailAdmin', 'wbs@fkor.uns.ac.id'),
  ('emailCC', '')
ON CONFLICT (key) DO NOTHING;
