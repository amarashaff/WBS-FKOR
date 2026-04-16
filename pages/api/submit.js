import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, nama, status_pelapor, nim_nip, kategori, unit, lokasi, tanggal_kejadian, prioritas, sudah_lapor, judul, uraian, harapan, lampiran } = req.body

  if (!email || !kategori || !unit || !lokasi || !tanggal_kejadian || !judul || !uraian) {
    return res.status(400).json({ error: 'Field wajib tidak lengkap' })
  }

  // Generate kode unik WBS-YYYYMM-XXXX
  const now = new Date()
  const prefix = `WBS-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`
  const rand = Math.floor(1000 + Math.random() * 9000)
  const kode = `${prefix}-${rand}`

  const { data, error } = await supabase.from('pengaduan').insert([{
    kode,
    email,
    nama: nama || null,
    status_pelapor,
    nim_nip: nim_nip || null,
    kategori,
    unit,
    lokasi,
    tanggal_kejadian,
    prioritas,
    sudah_lapor,
    judul,
    uraian,
    harapan: harapan || null,
    lampiran: lampiran || null,
    status: 'Menunggu',
    catatan_evaluasi: null,
  }]).select()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ kode, id: data[0].id })
}
