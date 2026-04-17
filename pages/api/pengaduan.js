import { isSupabaseReady, getClient } from '../../lib/store'

const PUBLIC_COLS = 'id,kode,judul,kategori,unit,lokasi,tanggal_kejadian,prioritas,status,created_at'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { search, status, kategori } = req.query

  if (isSupabaseReady()) {
    try {
      const sb = await getClient()
      let q = sb.from('pengaduan').select(PUBLIC_COLS).order('created_at', { ascending: false })
      if (status)   q = q.eq('status', status)
      if (kategori) q = q.ilike('kategori', `%${kategori}%`)
      if (search)   q = q.or(`judul.ilike.%${search}%,kode.ilike.%${search}%,kategori.ilike.%${search}%`)
      const { data, error } = await q
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json(data)
    } catch (e) {
      console.error('[WBS] Supabase select failed, falling back:', e.message)
    }
  }

  // Fallback: in-memory
  let data = [...(global._wbsData || [])]
  if (status)   data = data.filter(d => d.status === status)
  if (kategori) data = data.filter(d => d.kategori?.toLowerCase().includes(kategori.toLowerCase()))
  if (search) {
    const q = search.toLowerCase()
    data = data.filter(d =>
      d.judul?.toLowerCase().includes(q) ||
      d.kode?.toLowerCase().includes(q)  ||
      d.kategori?.toLowerCase().includes(q)
    )
  }
  // Hapus kolom sensitif dari response publik
  return res.status(200).json(data.map(({ email, nim_nip, ...rest }) => rest))
}
