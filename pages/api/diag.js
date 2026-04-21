export default async function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  const envOk = url.startsWith('https://') && url.includes('.supabase.co') && key.length > 20

  const result = {
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL:  url  ? url.slice(0, 40) + '...' : '❌ KOSONG',
      SUPABASE_KEY:  key  ? '✅ ada (' + key.length + ' karakter)' : '❌ KOSONG',
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? '✅ ada' : '⚠️ pakai default',
      envReady: envOk ? '✅ ENV LENGKAP' : '❌ ENV TIDAK LENGKAP',
    },
    supabase: null,
    memoryData: (global._wbs?.data || []).length + ' item (in-memory)',
  }

  if (!envOk) {
    result.supabase = '⚠️ Skip — env tidak lengkap, pakai in-memory'
    return res.status(200).json(result)
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(url, key)

    // Test 1: cek tabel ada
    const { data: tables, error: tErr } = await db
      .from('pengaduan').select('id').limit(1)

    if (tErr) {
      result.supabase = '❌ Query error: ' + tErr.message + ' (code: ' + tErr.code + ')'
    } else {
      // Test 2: cek bisa insert + delete
      const testKode = 'TEST-' + Date.now()
      const { error: iErr } = await db.from('pengaduan').insert([{
        kode: testKode,
        email: 'test@test.com',
        status_pelapor: 'Test',
        kategori: 'Test',
        unit: 'Test',
        lokasi: 'Test',
        tanggal_kejadian: new Date().toISOString().slice(0,10),
        judul: 'TEST DIAGNOSTIK - HAPUS OTOMATIS',
        uraian: 'Test insert dari halaman diagnostik',
        status: 'Menunggu',
      }])

      if (iErr) {
        result.supabase = '❌ Insert gagal: ' + iErr.message
      } else {
        // Hapus data test
        await db.from('pengaduan').delete().eq('kode', testKode)
        result.supabase = '✅ SUPABASE TERHUBUNG & BERFUNGSI NORMAL'
      }
    }
  } catch (e) {
    result.supabase = '❌ Exception: ' + e.message
  }

  return res.status(200).json(result)
}
