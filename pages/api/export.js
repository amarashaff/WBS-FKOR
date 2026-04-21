import { getDB, mem } from '../../lib/db'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fkor2026admin'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  const { periode } = req.query
  const now = new Date()
  let data  = []

  const db = getDB()

  if (db) {
    try {
      let q = db.from('pengaduan').select('*').order('created_at', { ascending: false })
      if (periode === 'minggu') { const s = new Date(now); s.setDate(s.getDate()-7); q = q.gte('created_at', s.toISOString()) }
      else if (periode === 'bulan')  q = q.gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
      else if (periode === 'tahun')  q = q.gte('created_at', new Date(now.getFullYear(), 0, 1).toISOString())
      const { data: rows, error } = await q
      if (error) return res.status(500).json({ error: error.message })
      data = rows
    } catch(e) { data = [...mem.data] }
  } else {
    data = [...mem.data]
  }

  try {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(data.map((d, i) => ({
      'No': i+1, 'Kode': d.kode,
      'Tanggal Masuk':    new Date(d.created_at).toLocaleDateString('id-ID'),
      'Tanggal Kejadian': d.tanggal_kejadian,
      'Judul': d.judul, 'Kategori': d.kategori, 'Unit': d.unit, 'Lokasi': d.lokasi,
      'Prioritas': d.prioritas, 'Status Pelapor': d.status_pelapor, 'Status': d.status,
      'Catatan Evaluasi': d.catatan_evaluasi||'', 'Uraian': d.uraian,
      'Harapan': d.harapan||'', 'Lampiran': d.lampiran||'', 'Email (Rahasia)': d.email,
    })))
    ws['!cols'] = [{wch:4},{wch:18},{wch:14},{wch:14},{wch:40},{wch:22},{wch:28},{wch:20},{wch:12},{wch:20},{wch:14},{wch:35},{wch:60},{wch:40},{wch:30},{wch:32}]
    const sc = { Menunggu:0,'Dalam Proses':0,Selesai:0,Ditolak:0 }
    data.forEach(d => { if(sc[d.status]!==undefined) sc[d.status]++ })
    const ws2 = XLSX.utils.json_to_sheet([
      {Keterangan:'Total Pengaduan',Jumlah:data.length},{Keterangan:'Menunggu',Jumlah:sc.Menunggu},
      {Keterangan:'Dalam Proses',Jumlah:sc['Dalam Proses']},{Keterangan:'Selesai',Jumlah:sc.Selesai},
      {Keterangan:'Ditolak',Jumlah:sc.Ditolak},{Keterangan:'Tanggal Export',Jumlah:now.toLocaleString('id-ID')},
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pengaduan WBS')
    XLSX.utils.book_append_sheet(wb, ws2, 'Ringkasan')
    const buf = XLSX.write(wb, { type:'buffer', bookType:'xlsx' })
    const filename = `WBS_FKOR_UNS_${periode||'export'}_${now.toISOString().slice(0,10)}.xlsx`
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition',`attachment; filename="${filename}"`)
    return res.send(buf)
  } catch(e) {
    return res.status(500).json({ error: 'Gagal generate Excel: '+e.message })
  }
}
