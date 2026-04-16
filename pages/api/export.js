const memStore = global._wbsData || (global._wbsData = [])
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fkor2026admin'

function hasSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.length > 0 && !url.includes('xxxxxxxxxxxx')
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const adminPass = req.headers['x-admin-password']
  if (adminPass !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  const { periode } = req.query
  const now = new Date()
  let data = []

  if (hasSupabase()) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      let q = supabase.from('pengaduan').select('*').order('created_at', { ascending: false })
      if (periode === 'minggu') {
        const start = new Date(now); start.setDate(now.getDate() - 7)
        q = q.gte('created_at', start.toISOString())
      } else if (periode === 'bulan') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        q = q.gte('created_at', start.toISOString())
      } else if (periode === 'tahun') {
        const start = new Date(now.getFullYear(), 0, 1)
        q = q.gte('created_at', start.toISOString())
      }
      const { data: rows, error } = await q
      if (error) return res.status(500).json({ error: error.message })
      data = rows
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  } else {
    data = [...memStore]
  }

  try {
    const XLSX = await import('xlsx')
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
      {wch:4},{wch:18},{wch:14},{wch:14},{wch:40},{wch:22},{wch:28},{wch:22},
      {wch:12},{wch:20},{wch:14},{wch:35},{wch:60},{wch:40},{wch:30},{wch:32}
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Pengaduan WBS')

    const sc = { Menunggu:0,'Dalam Proses':0,Selesai:0,Ditolak:0 }
    data.forEach(d => { if(sc[d.status]!==undefined) sc[d.status]++ })
    const sum = [
      {'Keterangan':'Total Pengaduan','Jumlah':data.length},
      {'Keterangan':'Menunggu','Jumlah':sc['Menunggu']},
      {'Keterangan':'Dalam Proses','Jumlah':sc['Dalam Proses']},
      {'Keterangan':'Selesai','Jumlah':sc['Selesai']},
      {'Keterangan':'Ditolak','Jumlah':sc['Ditolak']},
      {'Keterangan':'Tanggal Export','Jumlah':now.toLocaleString('id-ID')},
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sum), 'Ringkasan')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `WBS_FKOR_UNS_${periode||'export'}_${now.toISOString().slice(0,10)}.xlsx`
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition',`attachment; filename="${filename}"`)
    return res.send(buf)
  } catch (e) {
    return res.status(500).json({ error: 'Gagal generate Excel: ' + e.message })
  }
}
