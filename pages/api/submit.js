import { getDB, mem } from '../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    email, nama, status_pelapor, nim_nip,
    kategori, unit, lokasi, tanggal_kejadian,
    prioritas, sudah_lapor, judul, uraian, harapan, lampiran
  } = req.body || {}

  if (!email || !status_pelapor || !kategori || !unit || !lokasi || !tanggal_kejadian || !judul || !uraian) {
    return res.status(400).json({ error: 'Field wajib tidak lengkap' })
  }

  const now    = new Date()
  const prefix = `WBS-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`
  const kode   = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`

  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    kode,
    email,
    nama:             nama        || null,
    status_pelapor,
    nim_nip:          nim_nip     || null,
    kategori,
    unit,
    lokasi,
    tanggal_kejadian,
    prioritas:        prioritas   || 'Rendah',
    sudah_lapor:      sudah_lapor || 'Belum',
    judul,
    uraian,
    harapan:          harapan     || null,
    lampiran:         lampiran    || null,
    status:           'Menunggu',
    catatan_evaluasi: null,
    created_at:       now.toISOString(),
    updated_at:       now.toISOString(),
  }

  const db = getDB()

  if (db) {
    // ── Mode Supabase (produksi) ──────────────────────────────
    try {
      const { data, error } = await db.from('pengaduan').insert([{
        kode:             entry.kode,
        email:            entry.email,
        nama:             entry.nama,
        status_pelapor:   entry.status_pelapor,
        nim_nip:          entry.nim_nip,
        kategori:         entry.kategori,
        unit:             entry.unit,
        lokasi:           entry.lokasi,
        tanggal_kejadian: entry.tanggal_kejadian,
        prioritas:        entry.prioritas,
        sudah_lapor:      entry.sudah_lapor,
        judul:            entry.judul,
        uraian:           entry.uraian,
        harapan:          entry.harapan,
        lampiran:         entry.lampiran,
        status:           'Menunggu',
        catatan_evaluasi: null,
      }]).select()
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ kode, id: data[0].id })
    } catch (e) {
      console.error('[WBS submit Supabase]', e.message)
      // Jangan return error — fall through ke in-memory
    }
  }

  // ── Mode demo/in-memory (tanpa Supabase) ─────────────────────
  mem.data.unshift(entry)
  return res.status(200).json({ kode, id: entry.id, demo: true })
}
