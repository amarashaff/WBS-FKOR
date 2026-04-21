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

  const payload = {
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
  }

  const db = getDB()

  if (db) {
    try {
      const { data, error } = await db.from('pengaduan').insert([payload]).select()

      if (error) {
        console.error('[WBS submit] Supabase insert error:', JSON.stringify(error))
        // Jangan fallback diam-diam — kembalikan error yang jelas
        return res.status(500).json({
          error: `Database error: ${error.message} (${error.code})`,
          hint: error.hint || '',
        })
      }

      console.log('[WBS submit] ✅ Tersimpan ke Supabase:', kode)
      return res.status(200).json({ kode, id: data[0].id, storage: 'supabase' })
    } catch (e) {
      console.error('[WBS submit] Exception:', e.message)
      return res.status(500).json({ error: 'Koneksi database gagal: ' + e.message })
    }
  }

  // ── Fallback in-memory (hanya jika env tidak dikonfigurasi) ──────
  const entry = {
    ...payload,
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }
  mem.data.unshift(entry)

  console.warn('[WBS submit] ⚠️ Disimpan ke memory (TIDAK PERMANEN):', kode)
  return res.status(200).json({
    kode,
    id: entry.id,
    storage: 'memory',
    warning: 'Data tersimpan sementara. Konfigurasi Supabase untuk penyimpanan permanen.'
  })
}
