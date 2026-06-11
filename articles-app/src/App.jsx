import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import './index.css'

// ─── Supabase setup ───────────────────────────────────────────────────────────
function getSupabase(url, key) {
  return createClient(url, key)
}

// ─── Setup screen ─────────────────────────────────────────────────────────────
function SetupScreen({ onConnect }) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    if (!url || !key) { setError('Preencha os dois campos.'); return }
    setLoading(true); setError('')
    try {
      const sb = getSupabase(url.trim(), key.trim())
      const { error: e } = await sb.from('Article').select('ID').limit(1)
      if (e) { setError('Erro: ' + e.message); setLoading(false); return }
      onConnect(url.trim(), key.trim())
    } catch (err) {
      setError('Não foi possível conectar: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <h2>Conexão Supabase</h2>
        <p>Insira as credenciais do seu projeto para começar.</p>
        {error && <div className="alert alert-error">⚠️ {error}</div>}
        <div className="form-field" style={{marginBottom:14}}>
          <label>URL do Projeto</label>
          <input value={url} onChange={e=>setUrl(e.target.value)}
            placeholder="https://xxxx.supabase.co" />
          <span className="setup-hint">Project Settings → API → Project URL</span>
        </div>
        <div className="form-field" style={{marginBottom:24}}>
          <label>Anon Key</label>
          <input value={key} onChange={e=>setKey(e.target.value)}
            type="password" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
          <span className="setup-hint">Project Settings → API → anon public</span>
        </div>
        <button className="btn btn-primary" style={{width:'100%'}}
          onClick={handleConnect} disabled={loading}>
          {loading ? <><span className="spinner"/>Conectando...</> : '→ Conectar'}
        </button>
      </div>
    </div>
  )
}

// ─── Articles view ─────────────────────────────────────────────────────────────
function ArticlesPage({ sb }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [authors, setAuthors] = useState([])
  const [keywords, setKeywords] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('Article').select('*').order('ID', { ascending: false })
    setArticles(data || [])
    setLoading(false)
  }, [sb])

  useEffect(() => {
    load()
    sb.from('Author').select('*').then(r => setAuthors(r.data || []))
    sb.from('Keywords').select('*').then(r => setKeywords(r.data || []))
  }, [load, sb])

  const filtered = articles.filter(a =>
    (a.Title||'').toLowerCase().includes(search.toLowerCase()) ||
    (a.DOI||'').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Artigos</h2>
          <p>{articles.length} artigo(s) cadastrado(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Novo Artigo
        </button>
      </div>

      <div className="search-row">
        <input className="search-input" placeholder="Buscar por título ou DOI..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="loading-wrap"><span className="spinner"/> Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{fontSize:'2.5rem'}}>📄</div>
          <p>Nenhum artigo encontrado.</p>
        </div>
      ) : (
        filtered.map(a => (
          <div className="card" key={a.ID} style={{cursor:'pointer'}} onClick={() => setSelected(a)}>
            <div className="card-title">{a.Title?.trim()}</div>
            <div className="card-meta">
              {a.Year && <span className="badge">{a.Year}</span>}
              {a.Language && <span className="badge blue">{a.Language?.trim()}</span>}
              {a.Document_Type && <span className="badge green">{a.Document_Type?.trim()}</span>}
              {a.qt_cited != null && <span className="badge">{a.qt_cited} citações</span>}
            </div>
            {a.Abstract && <div className="card-abstract">{a.Abstract?.trim()}</div>}
          </div>
        ))
      )}

      {showForm && (
        <ArticleForm sb={sb} authors={authors} keywords={keywords}
          onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />
      )}

      {selected && (
        <ArticleDetail article={selected} sb={sb}
          onClose={() => setSelected(null)} onDeleted={() => { setSelected(null); load() }} />
      )}
    </div>
  )
}

// ─── Article form modal ────────────────────────────────────────────────────────
function ArticleForm({ sb, authors, keywords, onClose, onSaved }) {
  const empty = { Title:'', Year:'', Source_title:'', qt_cited:'', DOI:'',
    Link:'', Abstract:'', ISSN:'', Language:'', Document_Type:'', Publication_Acess:'' }
  const [form, setForm] = useState(empty)
  const [selAuthors, setSelAuthors] = useState([])
  const [selKeywords, setSelKeywords] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(p => ({...p, [k]: v})) }

  async function save() {
    if (!form.Title) { setError('Título é obrigatório.'); return }
    setSaving(true); setError('')
    const payload = { ...form,
      Year: form.Year ? parseInt(form.Year) : null,
      qt_cited: form.qt_cited ? parseInt(form.qt_cited) : 0
    }
    const { data, error: e } = await sb.from('Article').insert([payload]).select()
    if (e) { setError(e.message); setSaving(false); return }
    const id = data[0].ID
    if (selAuthors.length) {
      await sb.from('Article_Author').insert(selAuthors.map(a => ({ ID_Article: id, ID_Author: a })))
    }
    if (selKeywords.length) {
      await sb.from('Article_Keywords').insert(selKeywords.map(k => ({ ID_Article: id, ID_Keywords: k })))
    }
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Novo Artigo</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {error && <div className="alert alert-error">⚠️ {error}</div>}
        <div className="form-grid">
          <div className="form-field span2">
            <label>Título *</label>
            <input value={form.Title} onChange={e=>set('Title',e.target.value)} placeholder="Título do artigo" />
          </div>
          <div className="form-field">
            <label>Ano</label>
            <input type="number" value={form.Year} onChange={e=>set('Year',e.target.value)} placeholder="2024" />
          </div>
          <div className="form-field">
            <label>Idioma</label>
            <input value={form.Language} onChange={e=>set('Language',e.target.value)} placeholder="English" />
          </div>
          <div className="form-field">
            <label>DOI</label>
            <input value={form.DOI} onChange={e=>set('DOI',e.target.value)} placeholder="10.xxxx/xxxxx" />
          </div>
          <div className="form-field">
            <label>ISSN</label>
            <input value={form.ISSN} onChange={e=>set('ISSN',e.target.value)} placeholder="0000-0000" />
          </div>
          <div className="form-field span2">
            <label>Título da Fonte</label>
            <input value={form.Source_title} onChange={e=>set('Source_title',e.target.value)} placeholder="Journal of..." />
          </div>
          <div className="form-field">
            <label>Tipo de Documento</label>
            <input value={form.Document_Type} onChange={e=>set('Document_Type',e.target.value)} placeholder="Journal Article" />
          </div>
          <div className="form-field">
            <label>Citações</label>
            <input type="number" value={form.qt_cited} onChange={e=>set('qt_cited',e.target.value)} placeholder="0" />
          </div>
          <div className="form-field span2">
            <label>Link</label>
            <input value={form.Link} onChange={e=>set('Link',e.target.value)} placeholder="https://..." />
          </div>
          <div className="form-field span2">
            <label>Acesso à Publicação</label>
            <input value={form.Publication_Acess} onChange={e=>set('Publication_Acess',e.target.value)} placeholder="Open Access" />
          </div>
          <div className="form-field span2">
            <label>Abstract</label>
            <textarea value={form.Abstract} onChange={e=>set('Abstract',e.target.value)} placeholder="Resumo do artigo..." style={{minHeight:100}} />
          </div>
          {authors.length > 0 && (
            <div className="form-field span2">
              <label>Autores</label>
              <select multiple style={{height:90}} value={selAuthors}
                onChange={e => setSelAuthors([...e.target.selectedOptions].map(o => o.value))}>
                {authors.map(a => <option key={a.ID} value={a.ID}>{a.NomeCompleto?.trim()}</option>)}
              </select>
            </div>
          )}
          {keywords.length > 0 && (
            <div className="form-field span2">
              <label>Keywords</label>
              <select multiple style={{height:90}} value={selKeywords.map(String)}
                onChange={e => setSelKeywords([...e.target.selectedOptions].map(o => parseInt(o.value)))}>
                {keywords.map(k => <option key={k.ID} value={k.ID}>{k.keywords?.trim()}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:10,marginTop:24,justifyContent:'flex-end'}}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><span className="spinner"/>Salvando...</> : 'Salvar Artigo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Article detail modal ──────────────────────────────────────────────────────
function ArticleDetail({ article: a, sb, onClose, onDeleted }) {
  const [articleAuthors, setArticleAuthors] = useState([])
  const [articleKeywords, setArticleKeywords] = useState([])
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    sb.from('Article_Author').select('Author(*)').eq('ID_Article', a.ID)
      .then(r => setArticleAuthors((r.data||[]).map(x=>x.Author)))
    sb.from('Article_Keywords').select('Keywords(*)').eq('ID_Article', a.ID)
      .then(r => setArticleKeywords((r.data||[]).map(x=>x.Keywords)))
  }, [a.ID, sb])

  async function handleDelete() {
    if (!confirm('Excluir este artigo?')) return
    setDeleting(true)
    await sb.from('Article_Author').delete().eq('ID_Article', a.ID)
    await sb.from('Article_Keywords').delete().eq('ID_Article', a.ID)
    await sb.from('Article').delete().eq('ID', a.ID)
    onDeleted()
  }

  const fields = [
    ['Ano', a.Year], ['Idioma', a.Language?.trim()], ['DOI', a.DOI?.trim()],
    ['ISSN', a.ISSN?.trim()], ['Fonte', a.Source_title?.trim()],
    ['Tipo', a.Document_Type?.trim()], ['Citações', a.qt_cited],
    ['Acesso', a.Publication_Acess?.trim()],
    ['Link', a.Link?.trim() ? <a href={a.Link.trim()} target="_blank" rel="noreferrer">{a.Link.trim()}</a> : null],
  ].filter(([,v]) => v != null && v !== '')

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:700}}>
        <div className="modal-header">
          <h3 style={{fontSize:'1.15rem', maxWidth:'90%'}}>{a.Title?.trim()}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {fields.map(([l,v]) => (
          <div className="detail-row" key={l}>
            <span className="detail-label">{l}</span>
            <span>{v}</span>
          </div>
        ))}
        {a.Abstract && (
          <div style={{marginTop:14}}>
            <div className="detail-label" style={{marginBottom:6}}>Abstract</div>
            <p style={{fontSize:'0.86rem', color:'var(--text-muted)', lineHeight:1.7}}>{a.Abstract?.trim()}</p>
          </div>
        )}
        {articleAuthors.length > 0 && (
          <div style={{marginTop:14}}>
            <div className="detail-label" style={{marginBottom:6}}>Autores</div>
            <div className="tags-wrap">
              {articleAuthors.map(au => au && <span key={au.ID} className="badge">{au.NomeCompleto?.trim()}</span>)}
            </div>
          </div>
        )}
        {articleKeywords.length > 0 && (
          <div style={{marginTop:14}}>
            <div className="detail-label" style={{marginBottom:6}}>Keywords</div>
            <div className="tags-wrap">
              {articleKeywords.map(kw => kw && <span key={kw.ID} className="badge blue">{kw.keywords?.trim()}</span>)}
            </div>
          </div>
        )}
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:24}}>
          <button className="btn btn-ghost" style={{color:'#c0392b'}}
            onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Excluindo...' : '🗑 Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Authors page ──────────────────────────────────────────────────────────────
function AuthorsPage({ sb }) {
  const [authors, setAuthors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ ID:'', Nome:'', NomeCompleto:'' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('Author').select('*').order('NomeCompleto')
    setAuthors(data || []); setLoading(false)
  }, [sb])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!form.ID || !form.NomeCompleto) { setMsg({type:'error',text:'ID e Nome Completo são obrigatórios.'}); return }
    setSaving(true)
    const { error } = await sb.from('Author').insert([form])
    if (error) { setMsg({type:'error',text:error.message}); setSaving(false); return }
    setMsg({type:'success', text:'Autor salvo!'}); setSaving(false)
    setForm({ ID:'', Nome:'', NomeCompleto:'' }); setShowForm(false); load()
  }

  const filtered = authors.filter(a =>
    (a.NomeCompleto||'').toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="page-header">
        <div><h2>Autores</h2><p>{authors.length} autor(es)</p></div>
        <button className="btn btn-primary" onClick={()=>setShowForm(true)}>+ Novo Autor</button>
      </div>
      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
      <div className="search-row">
        <input className="search-input" placeholder="Buscar autor..."
          value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      {loading ? <div className="loading-wrap"><span className="spinner"/> Carregando...</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Nome</th><th>Nome Completo</th></tr></thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={3} style={{textAlign:'center',color:'var(--text-muted)',padding:32}}>Nenhum autor encontrado.</td></tr>
                : filtered.map(a => (
                  <tr key={a.ID}>
                    <td><code style={{fontSize:'0.78rem'}}>{a.ID}</code></td>
                    <td>{a.Nome?.trim()}</td>
                    <td>{a.NomeCompleto?.trim()}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal" style={{maxWidth:480}}>
            <div className="modal-header">
              <h3>Novo Autor</h3>
              <button className="modal-close" onClick={()=>setShowForm(false)}>×</button>
            </div>
            <div className="form-grid full">
              <div className="form-field">
                <label>ID *</label>
                <input value={form.ID} onChange={e=>setForm(p=>({...p,ID:e.target.value}))} placeholder="A001" />
              </div>
              <div className="form-field">
                <label>Sobrenome / Nome Curto</label>
                <input value={form.Nome} onChange={e=>setForm(p=>({...p,Nome:e.target.value}))} placeholder="Silva" />
              </div>
              <div className="form-field">
                <label>Nome Completo *</label>
                <input value={form.NomeCompleto} onChange={e=>setForm(p=>({...p,NomeCompleto:e.target.value}))} placeholder="João da Silva" />
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}>
              <button className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><span className="spinner"/>...</> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Keywords page ─────────────────────────────────────────────────────────────
function KeywordsPage({ sb }) {
  const [keywords, setKeywords] = useState([])
  const [loading, setLoading] = useState(true)
  const [newKw, setNewKw] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('Keywords').select('*').order('keywords')
    setKeywords(data || []); setLoading(false)
  }, [sb])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!newKw.trim()) return
    setSaving(true)
    const { error } = await sb.from('Keywords').insert([{ keywords: newKw.trim() }])
    if (error) { setMsg({type:'error',text:error.message}); setSaving(false); return }
    setMsg({type:'success', text:'Keyword adicionada!'}); setNewKw(''); setSaving(false); load()
  }

  return (
    <div>
      <div className="page-header">
        <div><h2>Keywords</h2><p>{keywords.length} palavra(s)-chave</p></div>
      </div>
      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
      <div className="card" style={{display:'flex',gap:12,alignItems:'flex-end',marginBottom:20}}>
        <div className="form-field" style={{flex:1}}>
          <label>Nova Keyword</label>
          <input value={newKw} onChange={e=>setNewKw(e.target.value)}
            placeholder="ex: Machine Learning" onKeyDown={e=>e.key==='Enter'&&save()} />
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? '...' : '+ Adicionar'}
        </button>
      </div>
      {loading ? <div className="loading-wrap"><span className="spinner"/> Carregando...</div> : (
        <div className="tags-wrap">
          {keywords.length === 0
            ? <p style={{color:'var(--text-muted)', fontSize:'0.88rem'}}>Nenhuma keyword cadastrada.</p>
            : keywords.map(k => (
              <span key={k.ID} className="badge blue" style={{fontSize:'0.82rem', padding:'5px 12px'}}>
                {k.keywords?.trim()}
              </span>
            ))}
        </div>
      )}
    </div>
  )
}

// ─── References page ───────────────────────────────────────────────────────────
function ReferencesPage({ sb }) {
  const [refs, setRefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [newRef, setNewRef] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('Reference').select('*').order('ID', { ascending: false })
    setRefs(data || []); setLoading(false)
  }, [sb])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!newRef.trim()) return
    setSaving(true)
    const { error } = await sb.from('Reference').insert([{ Reference: newRef.trim() }])
    if (error) { setMsg({type:'error',text:error.message}); setSaving(false); return }
    setMsg({type:'success', text:'Referência adicionada!'}); setNewRef(''); setSaving(false); load()
  }

  return (
    <div>
      <div className="page-header">
        <div><h2>Referências</h2><p>{refs.length} referência(s)</p></div>
      </div>
      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
      <div className="card" style={{marginBottom:20}}>
        <div className="form-field" style={{marginBottom:12}}>
          <label>Nova Referência</label>
          <textarea value={newRef} onChange={e=>setNewRef(e.target.value)}
            placeholder="SOBRENOME, N. Título do trabalho. Revista, v.X, n.X, p.XX-XX, YYYY." />
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? '...' : '+ Adicionar Referência'}
        </button>
      </div>
      {loading ? <div className="loading-wrap"><span className="spinner"/> Carregando...</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Referência</th></tr></thead>
            <tbody>
              {refs.length === 0
                ? <tr><td colSpan={2} style={{textAlign:'center',color:'var(--text-muted)',padding:32}}>Nenhuma referência.</td></tr>
                : refs.map(r => (
                  <tr key={r.ID}>
                    <td style={{width:50,color:'var(--text-light)',fontFamily:'DM Mono,monospace',fontSize:'0.78rem'}}>{r.ID}</td>
                    <td style={{fontSize:'0.84rem',lineHeight:1.5}}>{r.Reference?.trim()}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardPage({ sb }) {
  const [stats, setStats] = useState({ articles:0, authors:0, keywords:0, refs:0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [a, au, kw, r, rec] = await Promise.all([
        sb.from('Article').select('ID', {count:'exact', head:true}),
        sb.from('Author').select('ID', {count:'exact', head:true}),
        sb.from('Keywords').select('ID', {count:'exact', head:true}),
        sb.from('Reference').select('ID', {count:'exact', head:true}),
        sb.from('Article').select('ID,Title,Year,Language').order('ID',{ascending:false}).limit(5)
      ])
      setStats({ articles: a.count||0, authors: au.count||0, keywords: kw.count||0, refs: r.count||0 })
      setRecent(rec.data || [])
      setLoading(false)
    }
    load()
  }, [sb])

  if (loading) return <div className="loading-wrap"><span className="spinner"/> Carregando...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Visão geral do banco de dados de artigos</p>
        </div>
      </div>
      <div className="stats-row">
        {[
          { num: stats.articles, label: 'Artigos', icon: '📄' },
          { num: stats.authors,  label: 'Autores',  icon: '👤' },
          { num: stats.keywords, label: 'Keywords', icon: '🏷' },
          { num: stats.refs,     label: 'Referências', icon: '🔗' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.icon} {s.label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.72rem',letterSpacing:'0.1em',
          textTransform:'uppercase',color:'var(--text-muted)',marginBottom:14}}>
          Artigos Recentes
        </div>
        {recent.length === 0
          ? <p style={{color:'var(--text-muted)',fontSize:'0.88rem'}}>Nenhum artigo ainda.</p>
          : recent.map(a => (
            <div key={a.ID} style={{padding:'10px 0', borderBottom:'1px solid var(--border)'}}>
              <div style={{fontFamily:'DM Serif Display,serif',fontSize:'0.95rem'}}>{a.Title?.trim()}</div>
              <div style={{display:'flex',gap:8,marginTop:4}}>
                {a.Year && <span className="badge">{a.Year}</span>}
                {a.Language && <span className="badge blue">{a.Language?.trim()}</span>}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ─── APP ROOT ──────────────────────────────────────────────────────────────────
const PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'articles',  label: 'Artigos',   icon: '📄' },
  { id: 'authors',   label: 'Autores',   icon: '👤' },
  { id: 'keywords',  label: 'Keywords',  icon: '🏷' },
  { id: 'references',label: 'Referências',icon: '🔗' },
]

export default function App() {
  const [creds, setCreds] = useState(() => {
    const c = sessionStorage.getItem('sb_creds')
    return c ? JSON.parse(c) : null
  })
  const [page, setPage] = useState('dashboard')

  const sb = creds ? getSupabase(creds.url, creds.key) : null

  function handleConnect(url, key) {
    sessionStorage.setItem('sb_creds', JSON.stringify({ url, key }))
    setCreds({ url, key })
  }

  if (!creds) return <SetupScreen onConnect={handleConnect} />

  function renderPage() {
    switch(page) {
      case 'dashboard':   return <DashboardPage sb={sb} />
      case 'articles':    return <ArticlesPage sb={sb} />
      case 'authors':     return <AuthorsPage sb={sb} />
      case 'keywords':    return <KeywordsPage sb={sb} />
      case 'references':  return <ReferencesPage sb={sb} />
      default:            return <DashboardPage sb={sb} />
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Articles DB</h1>
          <span>Scientific Manager</span>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Menu</div>
          {PAGES.map(p => (
            <button key={p.id} className={`nav-btn ${page===p.id?'active':''}`}
              onClick={() => setPage(p.id)}>
              <span className="nav-icon">{p.icon}</span>
              {p.label}
            </button>
          ))}
          <div className="nav-section-label" style={{marginTop:24}}>Conta</div>
          <button className="nav-btn" onClick={() => { sessionStorage.removeItem('sb_creds'); setCreds(null) }}>
            <span className="nav-icon">⎋</span> Desconectar
          </button>
        </nav>
      </aside>
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}
