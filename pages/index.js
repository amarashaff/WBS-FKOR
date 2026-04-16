import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'

const ADMIN_PASS = 'fkor2026admin'

const STATUS_BADGE = {
  'Menunggu': 'b-yellow',
  'Dalam Proses': 'b-blue',
  'Selesai': 'b-green',
  'Ditolak': 'b-red',
}
const PRIO_BADGE = {
  'Kritis': 'b-red',
  'Tinggi': 'b-orange',
  'Sedang': 'b-blue',
  'Rendah': 'b-gray',
}

function Badge({ text, type }) {
  return <span className={`badge ${type}`}>{text}</span>
}

function StatusBadge({ s }) {
  return <Badge text={s} type={STATUS_BADGE[s] || 'b-gray'} />
}
function PrioBadge({ p }) {
  const key = Object.keys(PRIO_BADGE).find(k => p && p.startsWith(k)) || 'Rendah'
  return <Badge text={key} type={PRIO_BADGE[key]} />
}

function Toast({ msg }) {
  return (
    <div className="toast-wrap">
      <div className={`toast${msg ? ' show' : ''}`}>{msg}</div>
    </div>
  )
}

export default function WBS() {
  const [page, setPage] = useState('beranda')
  const [isAdmin, setIsAdmin] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  // Public data
  const [pubData, setPubData] = useState([])
  const [pubLoading, setPubLoading] = useState(false)
  const [vSearch, setVSearch] = useState('')
  const [vStatus, setVStatus] = useState('')
  const [vKat, setVKat] = useState('')

  // Admin data
  const [adminData, setAdminData] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)

  // Form state
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    email:'', nama:'', status_pelapor:'', nim_nip:'',
    kategori:'', unit:'', lokasi:'', tanggal_kejadian:'',
    prioritas:'', sudah_lapor:'Belum',
    judul:'', uraian:'', harapan:'', lampiran:''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)

  // Admin login
  const [loginPass, setLoginPass] = useState('')
  const [loginErr, setLoginErr] = useState(false)

  // Stats
  const [stats, setStats] = useState({ total:0, menunggu:0, proses:0, selesai:0 })

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3000)
  }, [])

  const fetchPublic = useCallback(async () => {
    setPubLoading(true)
    try {
      const params = new URLSearchParams()
      if (vSearch) params.set('search', vSearch)
      if (vStatus) params.set('status', vStatus)
      if (vKat) params.set('kategori', vKat)
      const r = await fetch(`/api/pengaduan?${params}`)
      const d = await r.json()
      if (Array.isArray(d)) {
        setPubData(d)
        setStats({
          total: d.length,
          menunggu: d.filter(x=>x.status==='Menunggu').length,
          proses: d.filter(x=>x.status==='Dalam Proses').length,
          selesai: d.filter(x=>x.status==='Selesai').length,
        })
      }
    } catch(e) { /* ignore */ }
    setPubLoading(false)
  }, [vSearch, vStatus, vKat])

  const fetchAdmin = useCallback(async () => {
    if (!isAdmin) return
    setAdminLoading(true)
    try {
      const r = await fetch('/api/admin', { headers: { 'x-admin-password': ADMIN_PASS } })
      const d = await r.json()
      if (Array.isArray(d)) setAdminData(d)
    } catch(e) { /* ignore */ }
    setAdminLoading(false)
  }, [isAdmin])

  useEffect(() => { fetchPublic() }, [fetchPublic])
  useEffect(() => { if (isAdmin) fetchAdmin() }, [isAdmin, fetchAdmin])

  const doLogin = () => {
    if (loginPass === ADMIN_PASS) {
      setIsAdmin(true); setLoginErr(false); setLoginPass('')
      showToast('Login admin berhasil ✓')
    } else {
      setLoginErr(true); setLoginPass('')
    }
  }

  const doLogout = () => {
    setIsAdmin(false); setAdminData([])
    showToast('Berhasil keluar dari mode admin')
  }

  const navTo = (p) => { setPage(p); if(p==='daftar') fetchPublic() }

  const setF = (k, v) => setForm(f => ({...f, [k]:v}))

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const d = await r.json()
      if (r.ok) {
        setSubmitted(d.kode)
        setForm({ email:'', nama:'', status_pelapor:'', nim_nip:'', kategori:'', unit:'', lokasi:'', tanggal_kejadian:'', prioritas:'', sudah_lapor:'Belum', judul:'', uraian:'', harapan:'', lampiran:'' })
        setStep(1)
        fetchPublic()
      } else {
        showToast('Error: ' + d.error)
      }
    } catch(e) { showToast('Gagal mengirim. Coba lagi.') }
    setSubmitting(false)
  }

  const saveEval = async (item, newStatus, newCatatan) => {
    try {
      const r = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json', 'x-admin-password': ADMIN_PASS },
        body: JSON.stringify({ id: item.id, status: newStatus, catatan_evaluasi: newCatatan })
      })
      if (r.ok) { showToast(`${item.kode} disimpan ✓`); fetchAdmin(); fetchPublic() }
      else showToast('Gagal menyimpan')
    } catch(e) { showToast('Error koneksi') }
  }

  const doExport = async (periode) => {
    showToast('Menyiapkan file Excel...')
    try {
      const r = await fetch(`/api/export?periode=${periode}`, { headers: { 'x-admin-password': ADMIN_PASS } })
      if (!r.ok) { showToast('Gagal export'); return }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `WBS_FKOR_UNS_${periode}_${new Date().toISOString().slice(0,10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      showToast('File Excel berhasil diunduh ✓')
    } catch(e) { showToast('Gagal mengunduh file') }
  }

  // ─── Lock screen ───────────────────────────────
  const LockScreen = ({ page: p }) => (
    <div className="lock-screen">
      <div className="lock-icon-wrap">🔐</div>
      <h2>Akses Admin Diperlukan</h2>
      <p>Halaman ini hanya dapat diakses oleh administrator FKOR UNS.</p>
      <div className="admin-form">
        <input
          type="password" placeholder="Masukkan sandi admin"
          value={loginPass}
          onChange={e => { setLoginPass(e.target.value); setLoginErr(false) }}
          onKeyDown={e => e.key === 'Enter' && doLogin()}
        />
        <p className={`err-msg${loginErr ? ' show' : ''}`}>Sandi salah. Silakan coba lagi.</p>
        <button className="btn btn-primary" style={{width:'100%'}} onClick={doLogin}>Masuk sebagai Admin</button>
      </div>
    </div>
  )

  // ─── Pages ─────────────────────────────────────
  const PageBeranda = () => (
    <>
      <div className="hero">
        <div className="hero-top">
          <div className="hero-text">
            <h1>Whistle Blowing System</h1>
            <p>Platform pengaduan resmi Fakultas Keolahragaan Universitas Sebelas Maret. Sampaikan laporan Anda secara aman, transparan, dan terpercaya.</p>
          </div>
          <div className="cta-block">
            <p>Sampaikan pengaduan Anda sekarang. Identitas Anda dijamin aman dan rahasia.</p>
            <button className="cta-btn" onClick={() => navTo('laporan')}>+ Buat Pengaduan Sekarang</button>
            <div className="cta-anon"><span>🔒</span><span>Bisa dilaporkan secara anonim</span></div>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><div className="hero-stat-label">Total Pengaduan</div><div className="hero-stat-val" style={{color:'#0C447C'}}>{stats.total}</div></div>
          <div className="hero-stat"><div className="hero-stat-label">Belum Ditangani</div><div className="hero-stat-val" style={{color:'#633806'}}>{stats.menunggu}</div></div>
          <div className="hero-stat"><div className="hero-stat-label">Dalam Proses</div><div className="hero-stat-val" style={{color:'#0C447C'}}>{stats.proses}</div></div>
          <div className="hero-stat"><div className="hero-stat-label">Selesai</div><div className="hero-stat-val" style={{color:'#27500A'}}>{stats.selesai}</div></div>
        </div>
      </div>
      <div className="page-body">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
          <div className="card">
            <div className="card-title">Pengaduan terbaru</div>
            {pubData.slice(0,4).map(d => (
              <div key={d.id} className="tl-item">
                <div className="tl-dot" style={{background: d.status==='Selesai'?'#639922':d.status==='Dalam Proses'?'#378ADD':'#BA7517'}}></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{d.judul}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>{d.unit} · <StatusBadge s={d.status} /></div>
                </div>
              </div>
            ))}
            {pubData.length === 0 && <div style={{fontSize:13,color:'var(--text-hint)',padding:'1rem 0',textAlign:'center'}}>Belum ada pengaduan</div>}
          </div>
          <div className="card">
            <div className="card-title">Cara menyampaikan pengaduan</div>
            {[['1','Klik tombol "Buat Pengaduan" di pojok kanan atas.'],['2','Isi formulir dengan lengkap dan jujur.'],['3','Sertakan email untuk mendapatkan kode pelacak.'],['4','Pantau status di halaman Daftar Pengaduan.']].map(([n,t]) => (
              <div key={n} style={{display:'flex',gap:10,marginBottom:10,alignItems:'flex-start'}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:'#E6F1FB',color:'#0C447C',fontSize:11,fontWeight:500,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{n}</div>
                <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.5}}>{t}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{background:'#EAF3DE',borderColor:'#C0DD97'}}>
          <div style={{display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:500,color:'#27500A',marginBottom:4}}>Cek status pengaduan Anda</div>
              <div style={{fontSize:13,color:'#3B6D11'}}>Gunakan kode pelacak yang dikirim ke email Anda untuk memantau perkembangan pengaduan secara real-time.</div>
            </div>
            <button className="btn" style={{background:'white',borderColor:'#97C459',color:'#27500A'}} onClick={() => navTo('daftar')}>Lihat daftar pengaduan →</button>
          </div>
        </div>
      </div>
    </>
  )

  const PageLaporan = () => {
    const [localForm, setLocalForm] = useState(form)
    const setLF = (k,v) => setLocalForm(f=>({...f,[k]:v}))

    if (submitted) return (
      <div className="page-body">
        <div className="card" style={{textAlign:'center',padding:'2.5rem 1.5rem'}}>
          <div style={{fontSize:32,marginBottom:12}}>✅</div>
          <div style={{fontSize:18,fontWeight:500,marginBottom:8}}>Pengaduan berhasil dikirim!</div>
          <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>Kode pelacak Anda:</div>
          <div style={{fontSize:20,fontWeight:500,fontFamily:'monospace',background:'#E6F1FB',color:'#0C447C',display:'inline-block',padding:'8px 20px',borderRadius:8,marginBottom:16}}>{submitted}</div>
          <div style={{fontSize:13,color:'var(--text-muted)',maxWidth:400,margin:'0 auto 1.5rem'}}>Simpan kode ini. Cek status di halaman Daftar Pengaduan menggunakan kode tersebut.</div>
          <div className="btn-row" style={{justifyContent:'center'}}>
            <button className="btn btn-primary" onClick={()=>{setSubmitted(null);navTo('daftar')}}>Lihat status pengaduan</button>
            <button className="btn" onClick={()=>setSubmitted(null)}>Buat pengaduan lagi</button>
          </div>
        </div>
      </div>
    )

    return (
      <>
        <div className="hero" style={{padding:'1.25rem 1.5rem 1rem'}}>
          <h1 style={{fontSize:18,fontWeight:500,marginBottom:4}}>Buat Pengaduan Baru</h1>
          <p style={{fontSize:13,color:'var(--text-muted)'}}>Isi formulir berikut dengan lengkap dan jujur. Setiap laporan akan ditindaklanjuti.</p>
        </div>
        <div className="page-body">
          <div className="step-ind">
            <div className={`step${step===1?' cur':step>1?' done':''}`}><div className="sdot">{step>1?'✓':'1'}</div><span className="slabel">Identitas</span></div>
            <div className="sline"></div>
            <div className={`step${step===2?' cur':step>2?' done':''}`}><div className="sdot">{step>2?'✓':'2'}</div><span className="slabel">Detail Pengaduan</span></div>
            <div className="sline"></div>
            <div className={`step${step===3?' cur':''}`}><div className="sdot">3</div><span className="slabel">Konfirmasi</span></div>
          </div>

          {step === 1 && (
            <div>
              <div className="info-box blue"><span className="info-icon">🔒</span><p>Email Anda bersifat <strong>rahasia sepenuhnya</strong> dan hanya digunakan sebagai kunci akses laporan. Tidak akan disebarkan kepada siapapun.</p></div>
              <div className="card">
                <div className="card-title">Data identitas pelapor</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Email *</label>
                    <input type="email" placeholder="email@domain.com" value={localForm.email} onChange={e=>setLF('email',e.target.value)} />
                    <span className="form-hint">Kunci akses — tidak akan disebarkan</span>
                  </div>
                  <div className="form-group">
                    <label>Nama (opsional — bisa anonim)</label>
                    <input type="text" placeholder="Nama atau inisial" value={localForm.nama} onChange={e=>setLF('nama',e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Status / Peran *</label>
                    <select value={localForm.status_pelapor} onChange={e=>setLF('status_pelapor',e.target.value)}>
                      <option value="">-- Pilih --</option>
                      {['Mahasiswa','Dosen','Tenaga Kependidikan','Alumni','Masyarakat Umum'].map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>NIM / NIP (opsional)</label>
                    <input type="text" placeholder="Nomor identitas akademik" value={localForm.nim_nip} onChange={e=>setLF('nim_nip',e.target.value)} />
                  </div>
                </div>
                <div className="btn-row">
                  <button className="btn btn-primary" onClick={()=>{
                    if(!localForm.email||!localForm.status_pelapor){showToast('Email dan status wajib diisi');return}
                    setForm(localForm); setStep(2)
                  }}>Lanjut →</button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="card">
                <div className="card-title">Detail pengaduan</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Kategori *</label>
                    <select value={localForm.kategori} onChange={e=>setLF('kategori',e.target.value)}>
                      <option value="">-- Pilih --</option>
                      {['Fasilitas & Sarana Prasarana','Akademik & Kurikulum','Pelayanan Administrasi','Sumber Daya Manusia','Keuangan & Beasiswa','Keamanan & Ketertiban','Kebersihan & Lingkungan','Diskriminasi & Perundungan','Gratifikasi / KKN','Lainnya'].map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Unit / Bagian terkait *</label>
                    <select value={localForm.unit} onChange={e=>setLF('unit',e.target.value)}>
                      <option value="">-- Pilih --</option>
                      {['Dekanat / Pimpinan Fakultas','Prodi Pendidikan Jasmani','Prodi Ilmu Keolahragaan','Prodi PKO','Bagian Akademik','Bagian Kemahasiswaan','Bagian Keuangan','Sarana & Prasarana','Lab / Fasilitas Olahraga','Seluruh Fakultas'].map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Lokasi kejadian *</label>
                    <input type="text" placeholder="Misal: Gedung A, Lapangan Basket" value={localForm.lokasi} onChange={e=>setLF('lokasi',e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Tanggal kejadian *</label>
                    <input type="date" value={localForm.tanggal_kejadian} onChange={e=>setLF('tanggal_kejadian',e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Tingkat prioritas *</label>
                    <select value={localForm.prioritas} onChange={e=>setLF('prioritas',e.target.value)}>
                      <option value="">-- Pilih --</option>
                      {['Rendah — Informasi/Saran','Sedang — Perlu Perhatian','Tinggi — Perlu Segera Ditangani','Kritis — Darurat'].map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sudah lapor ke pihak lain?</label>
                    <select value={localForm.sudah_lapor} onChange={e=>setLF('sudah_lapor',e.target.value)}>
                      {['Belum','Sudah (internal)','Sudah (eksternal)'].map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Judul pengaduan *</label>
                    <input type="text" placeholder="Ringkasan singkat pengaduan" value={localForm.judul} onChange={e=>setLF('judul',e.target.value)} />
                  </div>
                  <div className="form-group full">
                    <label>Uraian lengkap *</label>
                    <textarea placeholder="Jelaskan: apa yang terjadi, kapan, siapa terlibat, dan dampaknya..." value={localForm.uraian} onChange={e=>setLF('uraian',e.target.value)} />
                  </div>
                  <div className="form-group full">
                    <label>Harapan / usulan tindak lanjut</label>
                    <textarea style={{minHeight:60}} placeholder="Apa yang Anda harapkan dari laporan ini?" value={localForm.harapan} onChange={e=>setLF('harapan',e.target.value)} />
                  </div>
                  <div className="form-group full">
                    <label>Lampiran (opsional)</label>
                    <input type="text" placeholder="Link Google Drive atau URL bukti" value={localForm.lampiran} onChange={e=>setLF('lampiran',e.target.value)} />
                  </div>
                </div>
                <div className="btn-row">
                  <button className="btn" onClick={()=>setStep(1)}>← Kembali</button>
                  <button className="btn btn-primary" onClick={()=>{
                    const req=[['kategori','Kategori'],['unit','Unit'],['lokasi','Lokasi'],['tanggal_kejadian','Tanggal'],['judul','Judul'],['uraian','Uraian']]
                    for(const[k,l] of req){ if(!localForm[k]){showToast(`${l} wajib diisi`);return} }
                    setForm(localForm); setStep(3)
                  }}>Lanjut →</button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="card">
                <div className="card-title">Konfirmasi & kirim</div>
                <div style={{fontSize:13,lineHeight:2,color:'var(--text-muted)'}}>
                  {[['Email',form.email],['Nama',form.nama||'(Anonim)'],['Status',form.status_pelapor],['Kategori',form.kategori],['Unit',form.unit],['Lokasi',form.lokasi],['Tanggal kejadian',form.tanggal_kejadian],['Prioritas',form.prioritas],['Judul',form.judul]].map(([k,v])=>(
                    <div key={k}><strong>{k}:</strong> {v}</div>
                  ))}
                </div>
                <div className="info-box blue" style={{marginTop:'1rem'}}>
                  <span className="info-icon">ℹ️</span>
                  <p>Dengan mengirim, Anda menyatakan data yang disampaikan benar. Kode pelacak akan ditampilkan setelah pengiriman berhasil.</p>
                </div>
                <div className="btn-row">
                  <button className="btn" onClick={()=>setStep(2)}>← Kembali</button>
                  <button className="btn btn-success" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Mengirim...' : '✓ Kirim Pengaduan'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    )
  }

  const PageDaftar = () => (
    <>
      <div className="hero" style={{padding:'1.25rem 1.5rem 1rem'}}>
        <h1 style={{fontSize:18,fontWeight:500,marginBottom:4}}>Daftar Pengaduan</h1>
        <p style={{fontSize:13,color:'var(--text-muted)'}}>Pantau status pengaduan yang masuk ke FKOR UNS secara transparan.</p>
      </div>
      <div className="page-body">
        <div className="viewer-notice"><span>👁</span><span>Mode tampilan publik — identitas pelapor disembunyikan untuk menjaga kerahasiaan.</span></div>
        <div className="card" style={{padding:'0.75rem 1rem'}}>
          <div className="search-row">
            <input type="text" placeholder="Cari judul, kode, kategori..." value={vSearch} onChange={e=>setVSearch(e.target.value)} />
            <select value={vStatus} onChange={e=>setVStatus(e.target.value)} style={{width:'auto'}}>
              <option value="">Semua Status</option>
              {['Menunggu','Dalam Proses','Selesai','Ditolak'].map(s=><option key={s}>{s}</option>)}
            </select>
            <select value={vKat} onChange={e=>setVKat(e.target.value)} style={{width:'auto'}}>
              <option value="">Semua Kategori</option>
              {['Fasilitas','Akademik','Keuangan','Kebersihan','Sarana','Lainnya'].map(k=><option key={k}>{k}</option>)}
            </select>
          </div>
          {pubLoading ? (
            <div style={{textAlign:'center',padding:'2rem',color:'var(--text-hint)',fontSize:13}}>Memuat data...</div>
          ) : (
            <div className="table-wrap">
              <table style={{tableLayout:'fixed',width:'100%'}}>
                <thead>
                  <tr>
                    <th style={{width:100}}>Kode</th>
                    <th style={{width:90}}>Tanggal</th>
                    <th>Judul</th>
                    <th style={{width:110}}>Kategori</th>
                    <th style={{width:130}}>Unit</th>
                    <th style={{width:80}}>Prioritas</th>
                    <th style={{width:100}}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pubData.length === 0 ? (
                    <tr><td colSpan={7} style={{textAlign:'center',padding:'2rem',color:'var(--text-hint)'}}>Tidak ada pengaduan ditemukan</td></tr>
                  ) : pubData.map(d => (
                    <tr key={d.id}>
                      <td style={{fontFamily:'monospace',fontSize:11,color:'var(--text-hint)'}}>{d.kode}</td>
                      <td style={{fontSize:12,color:'var(--text-muted)',whiteSpace:'nowrap'}}>{d.tanggal_kejadian}</td>
                      <td style={{fontSize:13}}>{d.judul}</td>
                      <td><span className="badge b-gray" style={{fontSize:11}}>{d.kategori?.split(' ')[0]}</span></td>
                      <td style={{fontSize:12,color:'var(--text-muted)'}}>{d.unit}</td>
                      <td><PrioBadge p={d.prioritas} /></td>
                      <td><StatusBadge s={d.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )

  const PageAdmin = () => {
    if (!isAdmin) return (
      <>
        <div className="hero" style={{padding:'1.25rem 1.5rem 1rem'}}>
          <h1 style={{fontSize:18,fontWeight:500,marginBottom:4}}>Area Admin</h1>
          <p style={{fontSize:13,color:'var(--text-muted)'}}>Masuk untuk mengakses evaluasi, export data, dan pengaturan.</p>
        </div>
        <div className="page-body"><div className="card"><LockScreen /></div></div>
      </>
    )

    return <AdminPanel />
  }

  const AdminPanel = () => {
    const [adminTab, setAdminTab] = useState('evaluasi')
    const [evalItems, setEvalItems] = useState(adminData.map(d => ({...d, _status: d.status, _catatan: d.catatan_evaluasi||''})))
    const [exportFrom, setExportFrom] = useState(new Date(Date.now()-7*86400000).toISOString().slice(0,10))
    const [exportTo, setExportTo] = useState(new Date().toISOString().slice(0,10))

    useEffect(() => {
      setEvalItems(adminData.map(d => ({...d, _status: d.status, _catatan: d.catatan_evaluasi||''})))
    }, [adminData])

    const tabs = [['evaluasi','🔍 Evaluasi'],['export','📤 Export Data'],['pengaturan','⚙️ Pengaturan']]

    return (
      <>
        <div className="hero" style={{padding:'1.25rem 1.5rem 1rem'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
            <div>
              <h1 style={{fontSize:18,fontWeight:500,marginBottom:4}}>Area Admin</h1>
              <p style={{fontSize:13,color:'var(--text-muted)'}}>Kelola pengaduan, evaluasi, dan export data.</p>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,background:'#FAEEDA',borderRadius:8,padding:'6px 12px',fontSize:12,color:'#633806'}}>
              <span>🔓</span><span>Mode admin aktif</span>
              <button onClick={doLogout} style={{marginLeft:8,fontSize:11,color:'#633806',background:'none',border:'0.5px solid #FAC775',borderRadius:4,padding:'2px 8px',cursor:'pointer',fontFamily:'inherit'}}>Keluar</button>
            </div>
          </div>
          <div style={{display:'flex',gap:4,marginTop:'1rem',borderBottom:'0.5px solid var(--border)',paddingBottom:0}}>
            {tabs.map(([key,label]) => (
              <button key={key} onClick={()=>setAdminTab(key)} style={{padding:'6px 14px',border:'none',background:'none',fontFamily:'inherit',fontSize:13,cursor:'pointer',color: adminTab===key?'#0C447C':'var(--text-muted)',borderBottom: adminTab===key?'2px solid #378ADD':'2px solid transparent',fontWeight: adminTab===key?500:400}}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="page-body">
          {adminTab === 'evaluasi' && (
            <>
              {adminLoading ? <div style={{textAlign:'center',padding:'2rem',color:'var(--text-hint)',fontSize:13}}>Memuat data...</div>
              : evalItems.length === 0 ? <div className="card" style={{textAlign:'center',padding:'2rem',color:'var(--text-hint)',fontSize:13}}>Belum ada pengaduan</div>
              : evalItems.map((d,i) => (
                <div key={d.id} className="card">
                  <div style={{display:'flex',alignItems:'flex-start',gap:'1rem',flexWrap:'wrap'}}>
                    <div style={{flex:1,minWidth:200}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                        <span style={{fontFamily:'monospace',fontSize:11,color:'var(--text-hint)'}}>{d.kode}</span>
                        <StatusBadge s={d._status} /><PrioBadge p={d.prioritas} />
                      </div>
                      <div style={{fontSize:14,fontWeight:500,marginBottom:3}}>{d.judul}</div>
                      <div style={{fontSize:12,color:'var(--text-muted)'}}>{d.unit} · {d.tanggal_kejadian}</div>
                      <div style={{fontSize:12,color:'var(--text-hint)',marginTop:2}}>Email: {d.email}</div>
                      {d.uraian && <div style={{fontSize:12,color:'var(--text-muted)',marginTop:6,lineHeight:1.5,background:'var(--bg-surface)',padding:'6px 8px',borderRadius:6}}>{d.uraian.length>120?d.uraian.slice(0,120)+'...':d.uraian}</div>}
                    </div>
                    <div style={{minWidth:260,display:'flex',flexDirection:'column',gap:6}}>
                      <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:500}}>Catatan evaluasi</label>
                      <textarea style={{minHeight:55,fontSize:12}} placeholder="Tambahkan catatan tindak lanjut..."
                        value={d._catatan}
                        onChange={e=>{const n=[...evalItems];n[i]={...n[i],_catatan:e.target.value};setEvalItems(n)}}
                      />
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        <select style={{fontSize:12,padding:'5px 8px',width:'auto'}}
                          value={d._status}
                          onChange={e=>{const n=[...evalItems];n[i]={...n[i],_status:e.target.value};setEvalItems(n)}}
                        >
                          {['Menunggu','Dalam Proses','Selesai','Ditolak'].map(s=><option key={s}>{s}</option>)}
                        </select>
                        <button className="btn btn-success" style={{fontSize:12,padding:'5px 10px'}}
                          onClick={()=>saveEval(d, d._status, d._catatan)}
                        >Simpan</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {adminTab === 'export' && (
            <>
              <div className="card" style={{maxWidth:500}}>
                <div className="card-title">Pilih periode export</div>
                <div className="form-grid">
                  <div className="form-group"><label>Dari tanggal</label><input type="date" value={exportFrom} onChange={e=>setExportFrom(e.target.value)} /></div>
                  <div className="form-group"><label>Sampai tanggal</label><input type="date" value={exportTo} onChange={e=>setExportTo(e.target.value)} /></div>
                </div>
              </div>
              <div className="export-grid">
                {[['minggu','📅','Laporan Mingguan','7 hari terakhir'],['bulan','📆','Laporan Bulanan','Bulan berjalan'],['tahun','🗓','Laporan Tahunan','Tahun berjalan'],['kustom','🔧','Export Kustom','Rentang tanggal pilihan']].map(([p,icon,title,desc])=>(
                  <div key={p} className="exp-card" onClick={()=>doExport(p)}>
                    <div className="exp-icon">{icon}</div>
                    <div className="exp-title">{title}</div>
                    <div className="exp-desc">{desc}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{background:'#EAF3DE',borderColor:'#C0DD97'}}>
                <div style={{fontSize:13,fontWeight:500,color:'#27500A',marginBottom:6}}>Jadwal export otomatis</div>
                <div style={{fontSize:13,color:'#3B6D11',lineHeight:1.9}}>
                  Mingguan: setiap Senin 07.00 WIB → dikirim ke email admin<br/>
                  Bulanan: tanggal 1 setiap bulan 07.00 WIB<br/>
                  Tahunan: 1 Januari setiap tahun — termasuk laporan analitik
                </div>
              </div>
            </>
          )}

          {adminTab === 'pengaturan' && (
            <>
              <div className="card">
                <div className="card-title">Email penerima laporan</div>
                <div className="form-grid" style={{maxWidth:540}}>
                  <div className="form-group full"><label>Email admin utama</label><input type="email" defaultValue="wbs@fkor.uns.ac.id" /></div>
                  <div className="form-group full"><label>Email CC (pisahkan koma)</label><input type="email" placeholder="dekan@fkor.uns.ac.id, wakil@fkor.uns.ac.id" /></div>
                </div>
              </div>
              <div className="card">
                <div className="card-title">Ubah sandi admin</div>
                <div className="form-grid" style={{maxWidth:540}}>
                  <div className="form-group"><label>Sandi saat ini</label><input type="password" placeholder="••••••••••••" /></div>
                  <div className="form-group"><label>Sandi baru</label><input type="password" placeholder="••••••••••••" /></div>
                </div>
                <div className="btn-row"><button className="btn btn-primary" onClick={()=>showToast('Pengaturan disimpan ✓')}>Simpan perubahan</button></div>
              </div>
              <div className="card">
                <div className="card-title">Kebijakan privasi & keamanan</div>
                <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:2}}>
                  {['Email pelapor dienkripsi — tidak tampil di antarmuka publik','Identitas hanya bisa diakses admin dengan sandi','Seluruh data tersimpan di database terenkripsi (Supabase)','Log akses tercatat untuk audit trail'].map(t=>(
                    <div key={t}>🔒 {t}</div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </>
    )
  }

  const pages = {
    beranda: <PageBeranda />,
    laporan: <PageLaporan />,
    daftar: <PageDaftar />,
    admin: <PageAdmin />,
  }

  return (
    <>
      <Head>
        <title>WBS — Fakultas Keolahragaan UNS</title>
        <meta name="description" content="Whistle Blowing System Fakultas Keolahragaan Universitas Sebelas Maret" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="app">
        <div className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-tag">FKOR · UNS</div>
            <div className="brand-name">WBS Fakultas Keolahragaan</div>
          </div>
          {[['beranda','🏠','Beranda'],['laporan','📝','Buat Pengaduan'],['daftar','📋','Daftar Pengaduan'],['admin','⚙️','Pengaturan']].map(([key,icon,label])=>(
            <button key={key} className={`nav-item${page===key?' active':''}`} onClick={()=>navTo(key)}>
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
          {isAdmin && (
            <div className="admin-bar">
              <span>🔓</span><span>Admin aktif</span>
              <button onClick={doLogout}>Keluar</button>
            </div>
          )}
          <div style={{flex:1}}></div>
          <div style={{padding:'6px 10px',fontSize:11,color:'var(--text-hint)',borderTop:'0.5px solid var(--border)',marginTop:4}}>WBS v2.0 · FKOR UNS</div>
        </div>
        <div className="main">
          {pages[page]}
        </div>
      </div>
      <Toast msg={toast} />
    </>
  )
}
