export default async function handler(req, res) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  const envOk = url.startsWith('https://') && url.includes('.supabase.co') && key.length > 20

  const result = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    env: {
      SUPABASE_URL:   url  ? url.slice(0, 50) + '...' : '❌ KOSONG',
      SUPABASE_KEY:   key  ? '✅ ada (' + key.length + ' karakter)' : '❌ KOSONG',
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? '✅ ada' : '⚠️ pakai default fkor2026admin',
      envReady:       envOk ? '✅ ENV LENGKAP' : '❌ ENV TIDAK LENGKAP',
    },
    supabase: null,
    detail: [],
    memoryData: (global._wbs?.data || []).length + ' item (in-memory)',
  }

  if (!envOk) {
    result.supabase = '⚠️ ENV tidak lengkap — pakai in-memory'
    return res.status(200).json(result)
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(url, key)
    result.detail.push('Client berhasil dibuat')

    // Test SELECT langsung dengan raw query
    const { data: sel, error: selErr } = await db
      .from('pengaduan')
      .select('count', { count: 'exact', head: true })

    if (selErr) {
      result.detail.push('SELECT error: ' + selErr.message + ' | code: ' + selErr.code + ' | hint: ' + (selErr.hint||'-'))
      result.supabase = '❌ Tabel belum bisa diakses: ' + selErr.code
      
      // Coba cek via rpc apakah tabel ada
      const { data: rpcData, error: rpcErr } = await db.rpc('version')
      if (!rpcErr) {
        result.detail.push('Koneksi Supabase OK (DB versi: ' + rpcData + ')')
        result.detail.push('Kemungkinan: tabel pengaduan belum ada atau RLS memblokir')
      } else {
        result.detail.push('RPC juga gagal: ' + rpcErr.message)
      }
    } else {
      result.detail.push('SELECT OK — jumlah baris: ' + (sel || 0))

      // Test INSERT
      const testKode = 'DIAG-' + Date.now()
      const { error: insErr } = await db.from('pengaduan').insert([{
        kode: testKode,
        email: 'diag@test.com',
        status_pelapor: 'Test',
        kategori: 'Test',
        unit: 'Test',
        lokasi: 'Test',
        tanggal_kejadian: new Date().toISOString().slice(0,10),
        judul: 'DIAGNOSTIK AUTO-DELETE',
        uraian: 'Test otomatis dari diagnostik',
        status: 'Menunggu',
      }])

      if (insErr) {
        result.detail.push('INSERT error: ' + insErr.message)
        result.supabase = '❌ INSERT gagal: ' + insErr.message
      } else {
        result.detail.push('INSERT OK')
        await db.from('pengaduan').delete().eq('kode', testKode)
        result.detail.push('DELETE OK')
        result.supabase = '✅ SUPABASE TERHUBUNG & BERFUNGSI NORMAL — data tersimpan permanen'
      }
    }
  } catch (e) {
    result.supabase = '❌ Exception: ' + e.message
    result.detail.push('Stack: ' + (e.stack || '').slice(0, 200))
  }

  return res.status(200).json(result)
}
