-- ================================================================
-- WBS FKOR UNS — Schema Fix
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query → Run
-- Aman dijalankan berulang kali (DROP IF EXISTS + IF NOT EXISTS)
-- ================================================================

-- Step 1: Drop semua policy lama agar tidak conflict
DROP POLICY IF EXISTS "allow_insert"    ON pengaduan;
DROP POLICY IF EXISTS "allow_select"    ON pengaduan;
DROP POLICY IF EXISTS "allow_update"    ON pengaduan;
DROP POLICY IF EXISTS "allow_delete"    ON pengaduan;
DROP POLICY IF EXISTS "settings_select" ON wbs_settings;
DROP POLICY IF EXISTS "settings_upsert" ON wbs_settings;
DROP POLICY IF EXISTS "settings_update" ON wbs_settings;

-- Step 2: Buat tabel (skip jika sudah ada)
CREATE TABLE IF NOT EXISTS pengaduan (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kode              TEXT NOT NULL UNIQUE,
  email             TEXT NOT NULL,
  nama              TEXT,
  status_pelapor    TEXT NOT NULL,
  nim_nip           TEXT,
  kategori          TEXT NOT NULL,
  unit              TEXT NOT NULL,
  lokasi            TEXT NOT NULL,
  tanggal_kejadian  DATE NOT NULL,
  prioritas         TEXT,
  sudah_lapor       TEXT DEFAULT 'Belum',
  judul             TEXT NOT NULL,
  uraian            TEXT NOT NULL,
  harapan           TEXT,
  lampiran          TEXT,
  status            TEXT NOT NULL DEFAULT 'Menunggu',
  catatan_evaluasi  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wbs_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Aktifkan Row Level Security
ALTER TABLE pengaduan    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wbs_settings ENABLE ROW LEVEL SECURITY;

-- Step 4: Buat ulang semua policy
CREATE POLICY "allow_insert" ON pengaduan FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_select" ON pengaduan FOR SELECT USING (true);
CREATE POLICY "allow_update" ON pengaduan FOR UPDATE USING (true);
CREATE POLICY "allow_delete" ON pengaduan FOR DELETE USING (true);

CREATE POLICY "settings_select" ON wbs_settings FOR SELECT USING (true);
CREATE POLICY "settings_upsert" ON wbs_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "settings_update" ON wbs_settings FOR UPDATE USING (true);

-- Step 5: Index performa
CREATE INDEX IF NOT EXISTS idx_pengaduan_status   ON pengaduan(status);
CREATE INDEX IF NOT EXISTS idx_pengaduan_created  ON pengaduan(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pengaduan_kode     ON pengaduan(kode);

-- Step 6: Insert default settings
INSERT INTO wbs_settings (key, value)
VALUES ('emailAdmin', 'muammar@staff.uns.ac.id'), ('emailCC', '')
ON CONFLICT (key) DO NOTHING;

-- Step 7: Verifikasi — output ini harus menampilkan 2 tabel
SELECT table_name, 'OK' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('pengaduan', 'wbs_settings')
ORDER BY table_name;
