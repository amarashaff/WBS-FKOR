import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'

const ADMIN_PASS = 'fkor2026admin'

const STATUS_BADGE = { 'Menunggu':'b-yellow','Dalam Proses':'b-blue','Selesai':'b-green','Ditolak':'b-red' }
const PRIO_BADGE   = { 'Kritis':'b-red','Tinggi':'b-orange','Sedang':'b-blue','Rendah':'b-gray' }

const Badge = ({ text, type }) => <span className={`badge ${type}`}>{text}</span>
const StatusBadge = ({ s }) => <Badge text={s} type={STATUS_BADGE[s]||'b-gray'} />
const PrioBadge   = ({ p }) => {
  const k = Object.keys(PRIO_BADGE).find(k => p?.startsWith(k)) || 'Rendah'
  return <Badge text={k} type={PRIO_BADGE[k]} />
}

function WBSLogo({ size=32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="#1D6FB8"/>
      <path d="M32 13L48 20.5L48 34C48 43 41 50.5 32 53C23 50.5 16 43 16 34L16 20.5Z" fill="none" stroke="white" strokeWidth="2" opacity="0.9"/>
      <rect x="19" y="27" width="10" height="13" rx="2" fill="white"/>
      <path d="M29 25L43 19L43 38L29 33Z" fill="white"/>
      <path d="M45 24Q49 28.5 45 33" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M48 21Q54 28.5 48 36" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>
      <circle cx="46" cy="16" r="5" fill="#FAC775"/>
      <path d="M46 13L46.8 15.4L49.4 15.4L47.3 16.9L48.1 19.4L46 17.9L43.9 19.4L44.7 16.9L42.6 15.4L45.2 15.4Z" fill="#633806"/>
    </svg>
  )
}

function ConfirmDialog({ msg, onConfirm, onCancel }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',padding:'1.5rem',maxWidth:360,width:'90%',border:'0.5px solid var(--border)'}}>
        <div style={{fontSize:14,fontWeight:500,marginBottom:8}}>Konfirmasi Hapus</div>
        <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:'1.25rem',lineHeight:1.6}}>{msg}</div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn" onClick={onCancel}>Batal</button>
          <button className="btn" style={{background:'#FCEBEB',color:'#791F1F',borderColor:'#F7C1C1'}} onClick={onConfirm}>Ya, Hapus</button>
        </div>
      </div>
    </div>
  )
}

export default function WBS() {
  const [page, setPage]         = useState('beranda')
  const [isAdmin, setIsAdmin]   = useState(false)
  const [toast, setToast]       = useState('')
  const toastTimer              = useRef(null)

  const [pubData, setPubData]   = useState([])
  const [pubLoad, setPubLoad]   = useState(false)
  const [vSearch, setVSearch]   = useState('')
  const [vStatus, setVStatus]   = useState('')
  const [vKat, setVKat]         = useState('')

  const [adminData, setAdminData] = useState([])
  const [adminLoad, setAdminLoad] = useState(false)

  const [step, setStep]         = useState(1)
  const emptyForm = { email:'',nama:'',status_pelapor:'',nim_nip:'',kategori:'',unit:'',lokasi:'',tanggal_kejadian:'',prioritas:'',sudah_lapor:'Belum',judul:'',uraian:'',harapan:'',lampiran:'' }
  const [form, setForm]         = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(null)

  const [loginPass, setLoginPass] = useState('')
  const [loginErr, setLoginErr]   = useState(false)
  const [stats, setStats]         = useState({ total:0, menunggu:0, proses:0, selesai:0 })

  const [confirmDel, setConfirmDel] = useState(null) // { id, kode }

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3500)
  }, [])

  const fetchPublic = useCallback(async () => {
    setPubLoad(true)
    try {
      const p = new URLSearchParams()
      if (vSearch) p.set('search', vSearch)
      if (vStatus) p.set('status', vStatus)
      if (vKat)    p.set('kategori', vKat)
      const r = await fetch(`/api/pengaduan?${p}`)
      if (!r.ok) throw new Error(await r.text())
      const d = await r.json()
      if (Array.isArray(d)) {
        setPubData(d)
        setStats({ total:d.length, menunggu:d.filter(x=>x.status==='Menunggu').length, proses:d.filter(x=>x.status==='Dalam Proses').length, selesai:d.filter(x=>x.status==='Selesai').length })
      }
    } catch(e) { console.error('[fetchPublic]', e) }
    setPubLoad(false)
  }, [vSearch, vStatus, vKat])

  const fetchAdmin = useCallback(async () => {
    if (!isAdmin) return
    setAdminLoad(true)
    try {
      const r = await fetch('/api/admin', { headers:{ 'x-admin-password': ADMIN_PASS } })
      const d = await r.json()
      if (Array.isArray(d)) setAdminData(d)
    } catch(e) { console.error('[fetchAdmin]', e) }
    setAdminLoad(false)
  }, [isAdmin])

  useEffect(() => { fetchPublic() }, [fetchPublic])
  useEffect(() => { if (isAdmin) fetchAdmin() }, [isAdmin, fetchAdmin])

  const doLogin = () => {
    if (loginPass === ADMIN_PASS) { setIsAdmin(true); setLoginErr(false); setLoginPass(''); showToast('Login admin berhasil ✓') }
    else { setLoginErr(true); setLoginPass('') }
  }
  const doLogout = () => { setIsAdmin(false); setAdminData([]); showToast('Berhasil keluar dari mode admin') }
  const navTo = (p) => { setPage(p); if (p==='daftar') setTimeout(fetchPublic, 50) }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const r = await fetch('/api/submit', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
      const d = await r.json()
      if (r.ok) {
        setSubmitted({ kode: d.kode, storage: d.storage || 'supabase' })
        setForm(emptyForm); setStep(1); fetchPublic()
      } else {
        showToast('Gagal kirim: ' + (d.error || 'Unknown error'))
      }
    } catch(e) { showToast('Gagal terhubung ke server: ' + e.message) }
    setSubmitting(false)
  }

  const saveEval = async (item, newStatus, newCatatan) => {
    try {
      const r = await fetch('/api/admin', { method:'PATCH', headers:{'Content-Type':'application/json','x-admin-password':ADMIN_PASS}, body:JSON.stringify({ id:item.id, status:newStatus, catatan_evaluasi:newCatatan }) })
      if (r.ok) { showToast(`${item.kode} disimpan ✓`); fetchAdmin(); fetchPublic() }
      else { const d=await r.json(); showToast('Gagal: '+d.error) }
    } catch(e) { showToast('Error koneksi') }
  }

  const doDelete = async (id, kode) => {
    setConfirmDel(null)
    try {
      const r = await fetch('/api/admin', { method:'DELETE', headers:{'Content-Type':'application/json','x-admin-password':ADMIN_PASS}, body:JSON.stringify({ id }) })
      if (r.ok) { showToast(`${kode} berhasil dihapus`); fetchAdmin(); fetchPublic() }
      else { const d=await r.json(); showToast('Gagal hapus: '+d.error) }
    } catch(e) { showToast('Error koneksi') }
  }

  const doExport = async (periode) => {
    showToast('Menyiapkan file Excel...')
    try {
      const r = await fetch(`/api/export?periode=${periode}`, { headers:{'x-admin-password':ADMIN_PASS} })
      if (!r.ok) { const d=await r.json(); showToast('Gagal: '+d.error); return }
      const blob = await r.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a'); a.href=url; a.download=`WBS_FKOR_UNS_${periode}_${new Date().toISOString().slice(0,10)}.xlsx`; a.click()
      URL.revokeObjectURL(url)
      showToast('File Excel berhasil diunduh ✓')
    } catch(e) { showToast('Gagal: '+e.message) }
  }

  // ── Components ─────────────────────────────────────────────────

  const LockScreen = () => {
    const [showPw, setShowPw] = useState(false)
    return (
      <div className="lock-screen">
        <div className="lock-icon-wrap">🔐</div>
        <h2>Akses Admin Diperlukan</h2>
        <p>Halaman ini hanya dapat diakses oleh administrator FKOR UNS.</p>
        <div className="admin-form">
          <div style={{position:'relative',marginBottom:10}}>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Masukkan sandi admin"
              value={loginPass}
              style={{paddingRight:40,marginBottom:0,width:'100%'}}
              onChange={e=>{ setLoginPass(e.target.value); setLoginErr(false) }}
              onKeyDown={e=>e.key==='Enter'&&doLogin()}
            />
            <button
              type="button"
              onClick={()=>setShowPw(v=>!v)}
              style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',padding:0,color:'var(--text-hint)',fontSize:13,fontFamily:'inherit'}}
              title={showPw ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
            >
              {showPw ? '🙈' : '👁'}
            </button>
          </div>
          <p className={`err-msg${loginErr?' show':''}`}>Sandi salah. Silakan coba lagi.</p>
          <button className="btn btn-primary" style={{width:'100%'}} onClick={doLogin}>Masuk sebagai Admin</button>
          <p style={{fontSize:11,color:'var(--text-hint)',marginTop:10,textAlign:'center',lineHeight:1.5}}>
            Lupa sandi? Hubungi pengelola sistem atau cek environment variable <code style={{background:'var(--bg-surface)',padding:'1px 4px',borderRadius:3}}>ADMIN_PASSWORD</code> di Vercel.
          </p>
        </div>
      </div>
    )
  }

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
            <button className="cta-btn" onClick={()=>navTo('laporan')}>+ Buat Pengaduan Sekarang</button>
            <div className="cta-anon"><span>🔒</span><span>Bisa dilaporkan secara anonim</span></div>
          </div>
        </div>
        <div className="hero-stats">
          {[['Total Pengaduan',stats.total,'#0C447C'],['Belum Ditangani',stats.menunggu,'#633806'],['Dalam Proses',stats.proses,'#0C447C'],['Selesai',stats.selesai,'#27500A']].map(([l,v,c])=>(
            <div key={l} className="hero-stat"><div className="hero-stat-label">{l}</div><div className="hero-stat-val" style={{color:c}}>{v}</div></div>
          ))}
        </div>
      </div>
      <div className="page-body">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
          <div className="card">
            <div className="card-title">Pengaduan terbaru</div>
            {pubData.slice(0,5).map(d=>(
              <div key={d.id} className="tl-item">
                <div className="tl-dot" style={{background:d.status==='Selesai'?'#639922':d.status==='Dalam Proses'?'#378ADD':'#BA7517'}}></div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{d.judul}</div><div style={{fontSize:12,color:'var(--text-muted)'}}>{d.unit} · <StatusBadge s={d.status}/></div></div>
              </div>
            ))}
            {pubData.length===0&&<div style={{fontSize:13,color:'var(--text-hint)',padding:'0.75rem 0',textAlign:'center'}}>Belum ada pengaduan</div>}
          </div>
          <div className="card">
            <div className="card-title">Cara menyampaikan pengaduan</div>
            {[['1','Klik tombol "Buat Pengaduan" di halaman ini.'],['2','Isi formulir 3 langkah dengan lengkap dan jujur.'],['3','Sertakan email untuk mendapatkan kode pelacak.'],['4','Pantau status di halaman Daftar Pengaduan.']].map(([n,t])=>(
              <div key={n} style={{display:'flex',gap:10,marginBottom:10,alignItems:'flex-start'}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:'#E6F1FB',color:'#0C447C',fontSize:11,fontWeight:500,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{n}</div>
                <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.5}}>{t}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{background:'#EAF3DE',borderColor:'#C0DD97'}}>
          <div style={{display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500,color:'#27500A',marginBottom:4}}>Cek status pengaduan Anda</div><div style={{fontSize:13,color:'#3B6D11'}}>Gunakan kode pelacak untuk memantau perkembangan pengaduan Anda.</div></div>
            <button className="btn" style={{background:'white',borderColor:'#97C459',color:'#27500A'}} onClick={()=>navTo('daftar')}>Lihat daftar pengaduan →</button>
          </div>
        </div>
      </div>
    </>
  )

  const PageLaporan = () => {
    const [lf, setLF] = useState(form)
    const set = (k,v) => setLF(f=>({...f,[k]:v}))

    if (submitted) return (
      <div className="page-body">
        <div className="card" style={{textAlign:'center',padding:'2.5rem 1.5rem',maxWidth:480,margin:'0 auto'}}>
          <div style={{fontSize:40,marginBottom:12}}>{submitted.storage==='memory'?'⚠️':'✅'}</div>
          <div style={{fontSize:18,fontWeight:500,marginBottom:8}}>
            {submitted.storage==='memory' ? 'Terkirim (mode demo)' : 'Pengaduan berhasil dikirim!'}
          </div>
          {submitted.storage==='memory' && (
            <div style={{background:'#FAEEDA',border:'0.5px solid #FAC775',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#633806',textAlign:'left',lineHeight:1.6}}>
              ⚠️ <strong>Perhatian:</strong> Data tersimpan sementara (Supabase belum terhubung). Data akan hilang saat server restart. Hubungi admin untuk mengkonfigurasi database.
            </div>
          )}
          <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:12}}>Kode pelacak Anda:</div>
          <div style={{fontSize:22,fontWeight:500,fontFamily:'monospace',background:'#E6F1FB',color:'#0C447C',display:'inline-block',padding:'10px 24px',borderRadius:8,marginBottom:16,letterSpacing:'0.05em'}}>{submitted.kode}</div>
          <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:'1.5rem',lineHeight:1.6}}>
            {submitted.storage==='memory'
              ? 'Data belum tersimpan permanen. Minta admin untuk setup Supabase.'
              : 'Simpan kode ini untuk memantau status pengaduan di halaman Daftar Pengaduan.'}
          </div>
          <div className="btn-row" style={{justifyContent:'center'}}>
            <button className="btn btn-primary" onClick={()=>{setSubmitted(null);navTo('daftar')}}>Lihat daftar pengaduan</button>
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

          {step===1&&(
            <div>
              <div className="info-box blue"><span className="info-icon">🔒</span><p>Email Anda bersifat <strong>rahasia sepenuhnya</strong>. Hanya digunakan sebagai kunci akses laporan dan tidak akan disebarkan kepada siapapun.</p></div>
              <div className="card">
                <div className="card-title">Data identitas pelapor</div>
                <div className="form-grid">
                  <div className="form-group"><label>Email *</label><input type="email" placeholder="email@domain.com" value={lf.email} onChange={e=>set('email',e.target.value)}/><span className="form-hint">Kunci akses — tidak akan disebarkan</span></div>
                  <div className="form-group"><label>Nama (opsional)</label><input type="text" placeholder="Nama atau inisial" value={lf.nama} onChange={e=>set('nama',e.target.value)}/></div>
                  <div className="form-group"><label>Status / Peran *</label><select value={lf.status_pelapor} onChange={e=>set('status_pelapor',e.target.value)}><option value="">-- Pilih --</option>{['Mahasiswa','Dosen','Tenaga Kependidikan','Alumni','Masyarakat Umum'].map(o=><option key={o}>{o}</option>)}</select></div>
                  <div className="form-group"><label>NIM / NIP (opsional)</label><input type="text" placeholder="Nomor identitas akademik" value={lf.nim_nip} onChange={e=>set('nim_nip',e.target.value)}/></div>
                </div>
                <div className="btn-row"><button className="btn btn-primary" onClick={()=>{ if(!lf.email||!lf.status_pelapor){showToast('Email dan status wajib diisi');return}; setForm(lf); setStep(2) }}>Lanjut →</button></div>
              </div>
            </div>
          )}

          {step===2&&(
            <div className="card">
              <div className="card-title">Detail pengaduan</div>
              <div className="form-grid">
                <div className="form-group"><label>Kategori *</label><select value={lf.kategori} onChange={e=>set('kategori',e.target.value)}><option value="">-- Pilih --</option>{['Fasilitas & Sarana Prasarana','Akademik & Kurikulum','Pelayanan Administrasi','Sumber Daya Manusia','Keuangan & Beasiswa','Keamanan & Ketertiban','Kebersihan & Lingkungan','Diskriminasi & Perundungan','Gratifikasi / KKN','Lainnya'].map(o=><option key={o}>{o}</option>)}</select></div>
                <div className="form-group"><label>Unit / Bagian *</label><select value={lf.unit} onChange={e=>set('unit',e.target.value)}><option value="">-- Pilih --</option>{['Dekanat / Pimpinan Fakultas','Prodi Pendidikan Jasmani','Prodi Ilmu Keolahragaan','Prodi PKO','Bagian Akademik','Bagian Kemahasiswaan','Bagian Keuangan','Sarana & Prasarana','Lab / Fasilitas Olahraga','Seluruh Fakultas'].map(o=><option key={o}>{o}</option>)}</select></div>
                <div className="form-group"><label>Lokasi kejadian *</label><input type="text" placeholder="Misal: Gedung A, Lapangan Basket" value={lf.lokasi} onChange={e=>set('lokasi',e.target.value)}/></div>
                <div className="form-group"><label>Tanggal kejadian *</label><input type="date" value={lf.tanggal_kejadian} onChange={e=>set('tanggal_kejadian',e.target.value)}/></div>
                <div className="form-group"><label>Prioritas *</label><select value={lf.prioritas} onChange={e=>set('prioritas',e.target.value)}><option value="">-- Pilih --</option>{['Rendah — Informasi/Saran','Sedang — Perlu Perhatian','Tinggi — Perlu Segera Ditangani','Kritis — Darurat'].map(o=><option key={o}>{o}</option>)}</select></div>
                <div className="form-group"><label>Sudah lapor ke pihak lain?</label><select value={lf.sudah_lapor} onChange={e=>set('sudah_lapor',e.target.value)}>{['Belum','Sudah (internal)','Sudah (eksternal)'].map(o=><option key={o}>{o}</option>)}</select></div>
                <div className="form-group full"><label>Judul pengaduan *</label><input type="text" placeholder="Ringkasan singkat pengaduan" value={lf.judul} onChange={e=>set('judul',e.target.value)}/></div>
                <div className="form-group full"><label>Uraian lengkap *</label><textarea placeholder="Jelaskan: apa yang terjadi, kapan, siapa terlibat, dan dampaknya..." value={lf.uraian} onChange={e=>set('uraian',e.target.value)}/></div>
                <div className="form-group full"><label>Harapan / usulan tindak lanjut</label><textarea style={{minHeight:60}} placeholder="Apa yang Anda harapkan?" value={lf.harapan} onChange={e=>set('harapan',e.target.value)}/></div>
                <div className="form-group full"><label>Lampiran (opsional)</label><input type="text" placeholder="Link Google Drive atau URL bukti" value={lf.lampiran} onChange={e=>set('lampiran',e.target.value)}/></div>
              </div>
              <div className="btn-row">
                <button className="btn" onClick={()=>{setForm(lf);setStep(1)}}>← Kembali</button>
                <button className="btn btn-primary" onClick={()=>{ const req=[['kategori','Kategori'],['unit','Unit'],['lokasi','Lokasi'],['tanggal_kejadian','Tanggal'],['judul','Judul'],['uraian','Uraian']]; for(const[k,l] of req){if(!lf[k]){showToast(`${l} wajib diisi`);return}}; setForm(lf); setStep(3) }}>Lanjut →</button>
              </div>
            </div>
          )}

          {step===3&&(
            <div className="card">
              <div className="card-title">Konfirmasi & kirim</div>
              <div style={{fontSize:13,lineHeight:2.1,color:'var(--text-muted)',marginBottom:'1rem'}}>
                {[['Email',form.email],['Nama',form.nama||'(Anonim)'],['Status',form.status_pelapor],['Kategori',form.kategori],['Unit',form.unit],['Lokasi',form.lokasi],['Tanggal kejadian',form.tanggal_kejadian],['Prioritas',form.prioritas||'—'],['Judul',form.judul]].map(([k,v])=>(
                  <div key={k}><strong style={{color:'var(--text)'}}>{k}:</strong> {v}</div>
                ))}
              </div>
              <div className="info-box blue"><span className="info-icon">ℹ️</span><p>Dengan mengirim, Anda menyatakan data yang disampaikan benar. Kode pelacak akan ditampilkan setelah pengiriman berhasil.</p></div>
              <div className="btn-row">
                <button className="btn" onClick={()=>setStep(2)}>← Kembali</button>
                <button className="btn btn-success" onClick={handleSubmit} disabled={submitting}>{submitting?'⏳ Mengirim...':'✓ Kirim Pengaduan'}</button>
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
        <p style={{fontSize:13,color:'var(--text-muted)'}}>Semua pengaduan yang masuk — termasuk yang sudah selesai ditangani.</p>
      </div>
      <div className="page-body">
        <div className="viewer-notice"><span>👁</span><span>Mode tampilan publik — identitas pelapor disembunyikan. Laporan yang sudah selesai tetap tampil untuk transparansi.</span></div>
        <div className="card" style={{padding:'0.75rem 1rem'}}>
          <div className="search-row">
            <input type="text" placeholder="Cari judul, kode, kategori..." value={vSearch} onChange={e=>setVSearch(e.target.value)}/>
            <select value={vStatus} onChange={e=>setVStatus(e.target.value)} style={{width:'auto'}}>
              <option value="">Semua Status</option>
              {['Menunggu','Dalam Proses','Selesai','Ditolak'].map(s=><option key={s}>{s}</option>)}
            </select>
            <select value={vKat} onChange={e=>setVKat(e.target.value)} style={{width:'auto'}}>
              <option value="">Semua Kategori</option>
              {['Fasilitas','Akademik','Keuangan','Kebersihan','Sarana','Lainnya'].map(k=><option key={k}>{k}</option>)}
            </select>
          </div>
          {pubLoad
            ? <div style={{textAlign:'center',padding:'2rem',color:'var(--text-hint)',fontSize:13}}>Memuat data...</div>
            : <div className="table-wrap">
                <table style={{tableLayout:'fixed',width:'100%'}}>
                  <thead><tr>
                    <th style={{width:100}}>Kode</th>
                    <th style={{width:90}}>Tanggal</th>
                    <th>Judul</th>
                    <th style={{width:110}}>Kategori</th>
                    <th style={{width:130}}>Unit</th>
                    <th style={{width:80}}>Prioritas</th>
                    <th style={{width:100}}>Status</th>
                  </tr></thead>
                  <tbody>
                    {pubData.length===0
                      ? <tr><td colSpan={7} style={{textAlign:'center',padding:'2rem',color:'var(--text-hint)'}}>Belum ada pengaduan tercatat</td></tr>
                      : pubData.map(d=>(
                        <tr key={d.id}>
                          <td style={{fontFamily:'monospace',fontSize:11,color:'var(--text-hint)'}}>{d.kode}</td>
                          <td style={{fontSize:12,color:'var(--text-muted)',whiteSpace:'nowrap'}}>{d.tanggal_kejadian}</td>
                          <td style={{fontSize:13}}>{d.judul}</td>
                          <td><span className="badge b-gray" style={{fontSize:11}}>{d.kategori?.split(' ')[0]}</span></td>
                          <td style={{fontSize:12,color:'var(--text-muted)'}}>{d.unit}</td>
                          <td><PrioBadge p={d.prioritas}/></td>
                          <td><StatusBadge s={d.status}/></td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
          }
        </div>
      </div>
    </>
  )

  const PageAdmin = () => {
    if (!isAdmin) return (
      <>
        <div className="hero" style={{padding:'1.25rem 1.5rem 1rem'}}>
          <h1 style={{fontSize:18,fontWeight:500,marginBottom:4}}>Area Admin</h1>
          <p style={{fontSize:13,color:'var(--text-muted)'}}>Akses terbatas — masuk dengan sandi admin.</p>
        </div>
        <div className="page-body"><div className="card"><LockScreen/></div></div>
      </>
    )
    return <AdminPanel/>
  }

  const AdminPanel = () => {
    const [tab, setTab]               = useState('evaluasi')
    const [items, setItems]           = useState([])
    const [emailAdmin, setEmailAdmin] = useState('muammar@staff.uns.ac.id')
    const [emailCC, setEmailCC]       = useState('')
    const [settingsOK, setSettingsOK] = useState(false)
    const [savingS, setSavingS]       = useState(false)
    const [filterEval, setFilterEval] = useState('')

    useEffect(() => {
      setItems(adminData.map(d=>({...d, _status:d.status, _catatan:d.catatan_evaluasi||''})))
    }, [adminData])

    useEffect(() => {
      if (tab==='pengaturan'&&!settingsOK) {
        fetch('/api/admin?type=settings',{headers:{'x-admin-password':ADMIN_PASS}})
          .then(r=>r.json())
          .then(d=>{
            setEmailAdmin(d.emailAdmin || 'muammar@staff.uns.ac.id')
            setEmailCC(d.emailCC || '')
            setSettingsOK(true)
          })
          .catch(()=>{ setSettingsOK(true) })
      }
    }, [tab, settingsOK])

    const saveSettings = async () => {
      if (!emailAdmin.trim()) { showToast('Email admin tidak boleh kosong'); return }
      setSavingS(true)
      try {
        const r = await fetch('/api/admin?type=settings',{
          method:'POST',
          headers:{'Content-Type':'application/json','x-admin-password':ADMIN_PASS},
          body:JSON.stringify({ emailAdmin: emailAdmin.trim(), emailCC: emailCC.trim() })
        })
        const d = await r.json()
        if (r.ok) showToast('Email penerima berhasil disimpan \u2713')
        else showToast('Gagal menyimpan: ' + (d.error || 'Unknown error'))
      } catch(e){ showToast('Error koneksi: '+e.message) }
      setSavingS(false)
    }

    const filteredItems = filterEval ? items.filter(d=>d._status===filterEval) : items

    return (
      <>
        <div className="hero" style={{padding:'1.25rem 1.5rem 1rem'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
            <div><h1 style={{fontSize:18,fontWeight:500,marginBottom:4}}>Area Admin</h1><p style={{fontSize:13,color:'var(--text-muted)'}}>Kelola pengaduan, evaluasi, dan export data.</p></div>
            <div style={{display:'flex',alignItems:'center',gap:8,background:'#FAEEDA',borderRadius:8,padding:'6px 12px',fontSize:12,color:'#633806'}}>
              <span>🔓</span><span>Mode admin aktif</span>
              <button onClick={doLogout} style={{marginLeft:8,fontSize:11,color:'#633806',background:'none',border:'0.5px solid #FAC775',borderRadius:4,padding:'2px 8px',cursor:'pointer',fontFamily:'inherit'}}>Keluar</button>
            </div>
          </div>
          <div style={{display:'flex',gap:4,marginTop:'1rem',borderBottom:'0.5px solid var(--border)'}}>
            {[['evaluasi','🔍 Evaluasi'],['export','📤 Export Data'],['pengaturan','⚙️ Pengaturan'],['diag','🩺 Diagnostik']].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{padding:'6px 14px',border:'none',background:'none',fontFamily:'inherit',fontSize:13,cursor:'pointer',color:tab===k?'#0C447C':'var(--text-muted)',borderBottom:tab===k?'2px solid #378ADD':'2px solid transparent',fontWeight:tab===k?500:400}}>{l}</button>
            ))}
          </div>
        </div>

        <div className="page-body">

          {/* ── Evaluasi ── */}
          {tab==='evaluasi'&&(
            <>
              <div style={{display:'flex',gap:8,marginBottom:'1rem',flexWrap:'wrap',alignItems:'center'}}>
                <span style={{fontSize:13,color:'var(--text-muted)'}}>Filter:</span>
                {['','Menunggu','Dalam Proses','Selesai','Ditolak'].map(s=>(
                  <button key={s} onClick={()=>setFilterEval(s)} style={{padding:'4px 12px',border:'0.5px solid',borderColor:filterEval===s?'#378ADD':'var(--border-md)',borderRadius:20,background:filterEval===s?'#E6F1FB':'var(--bg-card)',color:filterEval===s?'#0C447C':'var(--text-muted)',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
                    {s||'Semua'} {s&&<span style={{fontWeight:500}}>({items.filter(d=>d._status===s).length})</span>}
                  </button>
                ))}
                <button onClick={fetchAdmin} style={{marginLeft:'auto',padding:'4px 12px',border:'0.5px solid var(--border-md)',borderRadius:20,background:'var(--bg-card)',color:'var(--text-muted)',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>↻ Refresh</button>
              </div>

              {adminLoad
                ? <div style={{textAlign:'center',padding:'2rem',color:'var(--text-hint)',fontSize:13}}>Memuat data...</div>
                : filteredItems.length===0
                  ? <div className="card" style={{textAlign:'center',padding:'2rem',color:'var(--text-hint)',fontSize:13}}>{filterEval?`Tidak ada pengaduan dengan status "${filterEval}"`:'Belum ada pengaduan'}</div>
                  : filteredItems.map((d,i)=>(
                    <div key={d.id} className="card" style={{borderLeft: d._status==='Kritis'?'3px solid #E24B4A': d._status==='Menunggu'?'3px solid #EF9F27':'0.5px solid var(--border)'}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:'1rem',flexWrap:'wrap'}}>
                        <div style={{flex:1,minWidth:200}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,flexWrap:'wrap'}}>
                            <span style={{fontFamily:'monospace',fontSize:11,color:'var(--text-hint)'}}>{d.kode}</span>
                            <StatusBadge s={d._status}/><PrioBadge p={d.prioritas}/>
                          </div>
                          <div style={{fontSize:14,fontWeight:500,marginBottom:3}}>{d.judul}</div>
                          <div style={{fontSize:12,color:'var(--text-muted)'}}>{d.unit} · {d.tanggal_kejadian}</div>
                          <div style={{fontSize:12,color:'var(--text-hint)',marginTop:1}}>Pelapor: {d.status_pelapor} · Email: {d.email}</div>
                          {d.uraian&&<div style={{fontSize:12,color:'var(--text-muted)',marginTop:6,lineHeight:1.5,background:'var(--bg-surface)',padding:'6px 8px',borderRadius:6}}>{d.uraian.length>160?d.uraian.slice(0,160)+'...':d.uraian}</div>}
                          {d.lampiran&&<div style={{fontSize:12,marginTop:4}}><a href={d.lampiran} target="_blank" rel="noreferrer" style={{color:'#378ADD'}}>📎 Lihat lampiran</a></div>}
                        </div>
                        <div style={{minWidth:260,display:'flex',flexDirection:'column',gap:6}}>
                          <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:500}}>Catatan evaluasi</label>
                          <textarea style={{minHeight:55,fontSize:12}} placeholder="Tambahkan catatan tindak lanjut..."
                            value={d._catatan}
                            onChange={e=>{ const n=[...filteredItems]; const idx=items.findIndex(x=>x.id===d.id); const full=[...items]; full[idx]={...full[idx],_catatan:e.target.value}; setItems(full) }}
                          />
                          <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                            <select style={{fontSize:12,padding:'5px 8px',width:'auto'}} value={d._status}
                              onChange={e=>{ const idx=items.findIndex(x=>x.id===d.id); const full=[...items]; full[idx]={...full[idx],_status:e.target.value}; setItems(full) }}
                            >
                              {['Menunggu','Dalam Proses','Selesai','Ditolak'].map(s=><option key={s}>{s}</option>)}
                            </select>
                            <button className="btn btn-success" style={{fontSize:12,padding:'5px 10px'}} onClick={()=>saveEval(d,d._status,d._catatan)}>Simpan</button>
                            <button
                              onClick={()=>setConfirmDel({id:d.id,kode:d.kode})}
                              style={{fontSize:12,padding:'5px 10px',border:'0.5px solid #F7C1C1',borderRadius:'var(--radius-md)',background:'#FCEBEB',color:'#791F1F',cursor:'pointer',fontFamily:'inherit',marginLeft:'auto'}}
                              title="Hapus laporan ini"
                            >🗑 Hapus</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              }
            </>
          )}

          {/* ── Export ── */}
          {tab==='export'&&(
            <>
              <div className="export-grid">
                {[['minggu','📅','Laporan Mingguan','7 hari terakhir'],['bulan','📆','Laporan Bulanan','Bulan berjalan'],['tahun','🗓','Laporan Tahunan','Tahun berjalan'],['semua','📁','Semua Data','Seluruh riwayat']].map(([p,icon,title,desc])=>(
                  <div key={p} className="exp-card" onClick={()=>doExport(p)}><div className="exp-icon">{icon}</div><div className="exp-title">{title}</div><div className="exp-desc">{desc}</div></div>
                ))}
              </div>
              <div className="card" style={{background:'#EAF3DE',borderColor:'#C0DD97'}}>
                <div style={{fontSize:13,fontWeight:500,color:'#27500A',marginBottom:6}}>Isi file Excel yang diunduh</div>
                <div style={{fontSize:13,color:'#3B6D11',lineHeight:1.9}}>Sheet 1 — Pengaduan: semua kolom termasuk email pelapor<br/>Sheet 2 — Ringkasan: statistik total, per status, dan tanggal export</div>
              </div>
            </>
          )}

          {/* ── Pengaturan ── */}
          {tab==='pengaturan'&&(
            <>
              <div className="card">
                <div className="card-title">Email penerima laporan</div>
                <div className="info-box blue" style={{marginBottom:'1rem'}}>
                  <span className="info-icon">📧</span>
                  <p>Laporan pengaduan masuk akan diteruskan ke email di bawah ini. Email admin utama sudah diset ke <strong>muammar@staff.uns.ac.id</strong>.</p>
                </div>
                <div className="form-grid" style={{maxWidth:540}}>
                  <div className="form-group full">
                    <label>Email admin utama (penerima semua laporan)</label>
                    <input type="email" value={emailAdmin} onChange={e=>setEmailAdmin(e.target.value)} placeholder="muammar@staff.uns.ac.id"/>
                  </div>
                  <div className="form-group full">
                    <label>Email CC — opsional (pisahkan koma untuk beberapa email)</label>
                    <input type="text" value={emailCC} onChange={e=>setEmailCC(e.target.value)} placeholder="dekan@fkor.uns.ac.id, wakil@fkor.uns.ac.id"/>
                  </div>
                </div>
                <div className="btn-row">
                  <button className="btn btn-primary" onClick={saveSettings} disabled={savingS}>
                    {savingS ? '⏳ Menyimpan...' : 'Simpan email'}
                  </button>
                </div>
              </div>

              <div className="card" style={{borderColor:'#F7C1C1'}}>
                <div className="card-title" style={{color:'#791F1F'}}>⚠️ Hapus massal laporan</div>
                <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.7,marginBottom:'1rem'}}>
                  Hapus laporan berdasarkan status tertentu. Tindakan ini <strong>tidak dapat dibatalkan</strong>. Gunakan hanya untuk laporan yang sudah dikonfirmasi salah masuk atau duplikat.
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {['Ditolak','Menunggu'].map(s=>(
                    <button key={s} onClick={()=>setConfirmDel({bulk:true,status:s})}
                      style={{padding:'6px 14px',border:'0.5px solid #F7C1C1',borderRadius:'var(--radius-md)',background:'#FCEBEB',color:'#791F1F',cursor:'pointer',fontFamily:'inherit',fontSize:13}}>
                      Hapus semua "{s}"
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title">Ubah sandi admin</div>
                <div className="info-box amber">
                  <span className="info-icon">⚠️</span>
                  <p>Untuk mengubah sandi, edit environment variable <strong>ADMIN_PASSWORD</strong> di dashboard Vercel → Settings → Environment Variables → Redeploy.</p>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Kebijakan privasi & keamanan</div>
                <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:2}}>
                  {['Email pelapor tidak tampil di antarmuka publik','Identitas hanya bisa diakses admin dengan sandi','Data tersimpan permanen di Supabase (PostgreSQL terenkripsi)','Laporan "Selesai" tetap tampil di daftar publik — hanya admin yang bisa hapus','Endpoint admin dilindungi header x-admin-password'].map(t=><div key={t}>🔒 {t}</div>)}
                </div>
              </div>
            </>
          )}

          {/* ── Diagnostik ── */}
          {tab==='diag'&&(
            <DiagPanel/>
          )}
        </div>
      </>
    )
  }

  const DiagPanel = () => {
    const [diagData, setDiagData] = useState(null)
    const [loading, setLoading] = useState(false)

    const runDiag = async () => {
      setLoading(true)
      try {
        const r = await fetch('/api/diag')
        const d = await r.json()
        setDiagData(d)
      } catch(e) {
        setDiagData({ error: e.message })
      }
      setLoading(false)
    }

    useEffect(() => { runDiag() }, [])

    if (loading) return <div style={{textAlign:'center',padding:'2rem',fontSize:13,color:'var(--text-hint)'}}>Mengecek koneksi...</div>
    if (!diagData) return null

    const isSupabaseOK = diagData.supabase?.startsWith('✅')
    const isEnvOK = diagData.env?.envReady?.startsWith('✅')

    return (
      <>
        <div className={`card`} style={{borderColor: isSupabaseOK ? '#C0DD97' : '#F7C1C1', background: isSupabaseOK ? '#EAF3DE' : '#FCEBEB'}}>
          <div style={{fontSize:15,fontWeight:500,color: isSupabaseOK ? '#27500A' : '#791F1F',marginBottom:8}}>
            {isSupabaseOK ? '✅ Database terhubung — data tersimpan permanen' : '❌ Database TIDAK terhubung — data akan hilang!'}
          </div>
          <div style={{fontSize:13,color: isSupabaseOK ? '#3B6D11' : '#A32D2D',lineHeight:1.7}}>
            {diagData.supabase}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Status environment variable</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {diagData.env && Object.entries(diagData.env).map(([k,v]) => (
              <div key={k} style={{display:'flex',gap:10,fontSize:13,padding:'6px 0',borderBottom:'0.5px solid var(--border)'}}>
                <code style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-muted)',minWidth:280,flexShrink:0}}>{k}</code>
                <span style={{color: String(v).startsWith('✅') ? '#27500A' : String(v).startsWith('❌') ? '#791F1F' : 'var(--text-muted)'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {!isEnvOK && (
          <div className="card" style={{borderColor:'#F7C1C1'}}>
            <div style={{fontSize:14,fontWeight:500,color:'#791F1F',marginBottom:10}}>Cara memperbaiki</div>
            <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:2}}>
              <div>1. Buka <strong>vercel.com</strong> → pilih project WBS → Settings → Environment Variables</div>
              <div>2. Tambahkan: <code style={{background:'var(--bg-surface)',padding:'1px 5px',borderRadius:3}}>NEXT_PUBLIC_SUPABASE_URL</code> = URL dari Supabase</div>
              <div>3. Tambahkan: <code style={{background:'var(--bg-surface)',padding:'1px 5px',borderRadius:3}}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> = anon key dari Supabase</div>
              <div>4. <strong>Klik Redeploy</strong> setelah menyimpan env variable</div>
              <div>5. Jalankan ulang SQL schema di Supabase SQL Editor</div>
            </div>
          </div>
        )}

        {diagData.detail && diagData.detail.length > 0 && (
          <div className="card">
            <div className="card-title">Log detail koneksi</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-muted)',lineHeight:2}}>
              {diagData.detail.map((d,i) => <div key={i}>{d}</div>)}
            </div>
          </div>
        )}
        <div className="card">
          <div className="card-title">Data saat ini</div>
          <div style={{fontSize:13,color:'var(--text-muted)'}}>
            In-memory (sementara): <strong>{diagData.memoryData}</strong>
            {!isSupabaseOK && <span style={{color:'#791F1F',marginLeft:8}}>— akan hilang saat server restart</span>}
          </div>
          <div className="btn-row"><button className="btn" onClick={runDiag}>↻ Cek ulang</button></div>
        </div>
      </>
    )
  }

  const pages = { beranda:<PageBeranda/>, laporan:<PageLaporan/>, daftar:<PageDaftar/>, admin:<PageAdmin/> }

  return (
    <>
      <Head>
        <title>WBS — Fakultas Keolahragaan UNS</title>
        <meta name="description" content="Whistle Blowing System Fakultas Keolahragaan Universitas Sebelas Maret"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="icon" type="image/svg+xml" href="/icon.svg"/>
        <meta property="og:title" content="WBS FKOR UNS"/>
        <meta property="og:description" content="Sistem pengaduan resmi Fakultas Keolahragaan UNS"/>
        <meta property="og:image" content="/icon-512.svg"/>
      </Head>
      <div className="app">
        <div className="sidebar">
          <div className="sidebar-brand">
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <WBSLogo size={28}/>
              <div><div className="brand-tag">FKOR · UNS</div><div className="brand-name">WBS Keolahragaan</div></div>
            </div>
          </div>
          {[['beranda','🏠','Beranda'],['laporan','📝','Buat Pengaduan'],['daftar','📋','Daftar Pengaduan'],['admin','⚙️','Pengaturan']].map(([key,icon,label])=>(
            <button key={key} className={`nav-item${page===key?' active':''}`} onClick={()=>navTo(key)}>
              <span className="nav-icon">{icon}</span><span>{label}</span>
            </button>
          ))}
          {isAdmin&&(
            <div className="admin-bar"><span>🔓</span><span>Admin aktif</span><button onClick={doLogout}>Keluar</button></div>
          )}
          <div style={{flex:1}}></div>
          <div style={{padding:'6px 10px',fontSize:11,color:'var(--text-hint)',borderTop:'0.5px solid var(--border)',marginTop:4}}>WBS v2.3 · FKOR UNS</div>
        </div>
        <div className="main">{pages[page]}</div>
      </div>

      {/* Dialog konfirmasi hapus */}
      {confirmDel&&(
        confirmDel.bulk
          ? <ConfirmDialog
              msg={`Hapus SEMUA laporan berstatus "${confirmDel.status}"? Tindakan ini permanen dan tidak bisa dibatalkan.`}
              onConfirm={async()=>{
                setConfirmDel(null)
                const toDelete = adminData.filter(d=>d.status===confirmDel.status)
                let count=0
                for(const d of toDelete){
                  const r=await fetch('/api/admin',{method:'DELETE',headers:{'Content-Type':'application/json','x-admin-password':ADMIN_PASS},body:JSON.stringify({id:d.id})})
                  if(r.ok) count++
                }
                showToast(`${count} laporan dihapus`)
                fetchAdmin(); fetchPublic()
              }}
              onCancel={()=>setConfirmDel(null)}
            />
          : <ConfirmDialog
              msg={`Hapus laporan ${confirmDel.kode}? Tindakan ini permanen dan tidak bisa dibatalkan.`}
              onConfirm={()=>doDelete(confirmDel.id, confirmDel.kode)}
              onCancel={()=>setConfirmDel(null)}
            />
      )}

      <div className="toast-wrap"><div className={`toast${toast?' show':''}`}>{toast}</div></div>
    </>
  )
}
