import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fkor2026admin'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const adminPass = req.headers['x-admin-password']
  if (adminPass !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  const { periode, from, to, format } = req.query

  let query = supabase.from('pengaduan').select('*').order('created_at', { ascending: false })

  const now = new Date()
  if (periode === 'minggu') {
    const start = new Date(now); start.setDate(now.getDate() - 7)
    query = query.gte('created_at', start.toISOString())
  } else if (periode === 'bulan') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    query = query.gte('created_at', start.toISOString())
  } else if (periode === 'tahun') {
    const start = new Date(now.getFullYear(), 0, 1)
    query = query.gte('created_at', start.toISOString())
  } else if (from && to) {
    query = query.gte('created_at', from).lte('created_at', to)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const rows = data.map((d, i) => ({
    'No': i + 1,
    'Kode': d.kode,
    'Tanggal Masuk': new Date(d.created_at).toLocaleDateString('id-ID'),
    'Tanggal Kejadian': d.tanggal_kejadian,
    'Judul': d.judul,
    'Kategori': d.kategori,
    'Unit': d.unit,
    'Lokasi': d.lokasi,
    'Prioritas': d.prioritas,
    'Status Pelapor': d.status_pelapor,
    'Status': d.status,
    'Catatan Evaluasi': d.catatan_evaluasi || '',
    'Uraian': d.uraian,
    'Harapan': d.harapan || '',
    'Lampiran': d.lampiran || '',
    'Email (Rahasia)': d.email,
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    {wch:4},{wch:18},{wch:14},{wch:14},{wch:40},{wch:20},{wch:25},{wch:20},
    {wch:12},{wch:18},{wch:14},{wch:30},{wch:60},{wch:40},{wch:30},{wch:30}
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Pengaduan WBS')

  // Summary sheet
  const statusCount = { Menunggu:0, 'Dalam Proses':0, Selesai:0, Ditolak:0 }
  data.forEach(d => { if(statusCount[d.status] !== undefined) statusCount[d.status]++ })
  const summary = [
    { 'Keterangan': 'Total Pengaduan', 'Jumlah': data.length },
    { 'Keterangan': 'Menunggu', 'Jumlah': statusCount['Menunggu'] },
    { 'Keterangan': 'Dalam Proses', 'Jumlah': statusCount['Dalam Proses'] },
    { 'Keterangan': 'Selesai', 'Jumlah': statusCount['Selesai'] },
    { 'Keterangan': 'Ditolak', 'Jumlah': statusCount['Ditolak'] },
    { 'Keterangan': 'Tanggal Export', 'Jumlah': new Date().toLocaleString('id-ID') },
  ]
  const ws2 = XLSX.utils.json_to_sheet(summary)
  XLSX.utils.book_append_sheet(wb, ws2, 'Ringkasan')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filename = `WBS_FKOR_UNS_${periode||'kustom'}_${now.toISOString().slice(0,10)}.xlsx`

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  return res.send(buf)
}
