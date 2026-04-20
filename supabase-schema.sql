-- ================================================================
-- WBS FKOR UNS — Supabase Schema
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================

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

ALTER TABLE pengaduan    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wbs_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_insert"  ON pengaduan FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_select"  ON pengaduan FOR SELECT USING (true);
CREATE POLICY "allow_update"  ON pengaduan FOR UPDATE USING (true);
CREATE POLICY "allow_delete"  ON pengaduan FOR DELETE USING (true);

CREATE POLICY "settings_select" ON wbs_settings FOR SELECT USING (true);
CREATE POLICY "settings_upsert" ON wbs_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "settings_update" ON wbs_settings FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_pengaduan_status   ON pengaduan(status);
CREATE INDEX IF NOT EXISTS idx_pengaduan_created  ON pengaduan(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pengaduan_kode     ON pengaduan(kode);

INSERT INTO wbs_settings (key, value)
VALUES ('emailAdmin', 'wbs@fkor.uns.ac.id'), ('emailCC', '')
ON CONFLICT (key) DO NOTHING;
