const memStore = global._wbsData || (global._wbsData = [])

function hasSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.length > 0 && !url.includes('xxxxxxxxxxxx')
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { search, status, kategori } = req.query
  const publicFields = 'id,kode,judul,kategori,unit,lokasi,tanggal_kejadian,prioritas,status,created_at'

  if (hasSupabase()) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      let q = supabase.from('pengaduan').select(publicFields).order('created_at', { ascending: false })
      if (status) q = q.eq('status', status)
      if (kategori) q = q.ilike('kategori', `%${kategori}%`)
      if (search) q = q.or(`judul.ilike.%${search}%,kode.ilike.%${search}%,kategori.ilike.%${search}%`)
      const { data, error } = await q
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // Fallback: filter dari memory
  let data = [...memStore]
  if (status) data = data.filter(d => d.status === status)
  if (kategori) data = data.filter(d => d.kategori?.toLowerCase().includes(kategori.toLowerCase()))
  if (search) {
    const q = search.toLowerCase()
    data = data.filter(d =>
      d.judul?.toLowerCase().includes(q) ||
      d.kode?.toLowerCase().includes(q) ||
      d.kategori?.toLowerCase().includes(q)
    )
  }
  // Hapus email dari response publik
  const safe = data.map(({ email, nim_nip, ...rest }) => rest)
  return res.status(200).json(safe)
}
