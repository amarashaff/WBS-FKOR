import { supabase } from '../../lib/db'

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

  const { data, error } = await supabase.from('pengaduan').insert([{
    kode,
    email,
    nama:             nama         || null,
    status_pelapor,
    nim_nip:          nim_nip      || null,
    kategori,
    unit,
    lokasi,
    tanggal_kejadian,
    prioritas:        prioritas    || 'Rendah',
    sudah_lapor:      sudah_lapor  || 'Belum',
    judul,
    uraian,
    harapan:          harapan      || null,
    lampiran:         lampiran     || null,
    status:           'Menunggu',
    catatan_evaluasi: null,
  }]).select()

  if (error) {
    console.error('[WBS submit]', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ kode, id: data[0].id })
}
