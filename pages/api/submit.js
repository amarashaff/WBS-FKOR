const memStore = global._wbsData || (global._wbsData = [])
const settingsStore = global._wbsSettings || (global._wbsSettings = {
  emailAdmin: 'wbs@fkor.uns.ac.id',
  emailCC: '',
})

function hasSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.length > 0 && !url.includes('xxxxxxxxxxxx')
}

async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

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

  const now = new Date()
  const prefix = `WBS-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`
  const rand = Math.floor(1000 + Math.random() * 9000)
  const kode = `${prefix}-${rand}`

  const entry = {
    id: kode + '-' + Date.now(),
    kode, email,
    nama: nama || null,
    status_pelapor,
    nim_nip: nim_nip || null,
    kategori, unit, lokasi,
    tanggal_kejadian,
    prioritas: prioritas || 'Rendah',
    sudah_lapor: sudah_lapor || 'Belum',
    judul, uraian,
    harapan: harapan || null,
    lampiran: lampiran || null,
    status: 'Menunggu',
    catatan_evaluasi: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }

  if (hasSupabase()) {
    try {
      const supabase = await getSupabase()
      const { data, error } = await supabase.from('pengaduan').insert([{
        kode: entry.kode,
        email: entry.email,
        nama: entry.nama,
        status_pelapor: entry.status_pelapor,
        nim_nip: entry.nim_nip,
        kategori: entry.kategori,
        unit: entry.unit,
        lokasi: entry.lokasi,
        tanggal_kejadian: entry.tanggal_kejadian,
        prioritas: entry.prioritas,
        sudah_lapor: entry.sudah_lapor,
        judul: entry.judul,
        uraian: entry.uraian,
        harapan: entry.harapan,
        lampiran: entry.lampiran,
        status: 'Menunggu',
        catatan_evaluasi: null,
      }]).select()
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ kode, id: data[0].id })
    } catch (e) {
      return res.status(500).json({ error: 'Koneksi database gagal: ' + e.message })
    }
  }

  // Fallback: in-memory (untuk testing tanpa Supabase)
  memStore.unshift(entry)
  return res.status(200).json({ kode, id: entry.id, mode: 'demo' })
}
