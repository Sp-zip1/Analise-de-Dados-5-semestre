import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Card, Badge, Button, Input, Textarea, Select, Alert, Spinner,
  Loading, Empty, Modal, SearchInput, PageHeader, SectionLabel
} from '../components/UI'
import styles from './Articles.module.css'

export default function Articles() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [detail, setDetail] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('article').select('*').order('id', { ascending: false })
    setArticles(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = articles.filter(a =>
    (a.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.doi || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Artigos"
        subtitle={`${articles.length} artigo(s) cadastrado(s)`}
        action={<Button onClick={() => setShowForm(true)}>+ Novo Artigo</Button>}
      />
      <div style={{ marginBottom: 16 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por título ou DOI..." />
      </div>

      {loading ? <Loading /> : filtered.length === 0
        ? <Empty icon="📄" message="Nenhum artigo encontrado." />
        : filtered.map(a => (
          <Card key={a.id} onClick={() => setDetail(a)}>
            <div className={styles.artTitle}>{a.title}</div>
            <div className={styles.artMeta}>
              {a.year && <Badge>{a.year}</Badge>}
              {a.language && <Badge color="blue">{a.language}</Badge>}
              {a.document_type && <Badge color="green">{a.document_type}</Badge>}
              {a.qt_cited != null && <Badge color="gray">{a.qt_cited} citações</Badge>}
            </div>
            {a.abstract && <p className={styles.artAbstract}>{a.abstract}</p>}
          </Card>
        ))
      }

      {showForm && (
        <ArticleForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}

      {detail && (
        <ArticleDetail
          article={detail}
          onClose={() => setDetail(null)}
          onDeleted={() => { setDetail(null); load() }}
        />
      )}
    </div>
  )
}

/* ── Article Form ── */
function ArticleForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '', year: '', language: '', doi: '', issn: '',
    source_title: '', document_type: '', qt_cited: '',
    link: '', publication_acess: '', abstract: ''
  })
  const [authors, setAuthors] = useState([])
  const [keywords, setKeywords] = useState([])
  const [selAuthors, setSelAuthors] = useState([])
  const [selKw, setSelKw] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('author').select('*').order('nome_completo').then(r => setAuthors(r.data || []))
    supabase.from('keywords').select('*').order('keyword').then(r => setKeywords(r.data || []))
  }, [])

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    if (!form.title) { setError('Título é obrigatório.'); return }
    setSaving(true); setError('')
    const payload = {
      ...form,
      year: form.year ? parseInt(form.year) : null,
      qt_cited: form.qt_cited ? parseInt(form.qt_cited) : 0,
    }
    const { data, error: e } = await supabase.from('article').insert([payload]).select()
    if (e) { setError(e.message); setSaving(false); return }
    const id = data[0].id
    if (selAuthors.length) await supabase.from('article_author').insert(selAuthors.map(a => ({ id_article: id, id_author: a })))
    if (selKw.length) await supabase.from('article_keywords').insert(selKw.map(k => ({ id_article: id, id_keywords: k })))
    onSaved()
  }

  return (
    <Modal title="Novo Artigo" onClose={onClose} wide>
      {error && <Alert type="error">{error}</Alert>}
      <div className={styles.formGrid}>
        <div className={styles.span2}>
          <Input label="Título *" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Título do artigo" />
        </div>
        <Input label="Ano" type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2024" />
        <Input label="Idioma" value={form.language} onChange={e => set('language', e.target.value)} placeholder="English" />
        <Input label="DOI" value={form.doi} onChange={e => set('doi', e.target.value)} placeholder="10.xxxx/xxxxx" />
        <Input label="ISSN" value={form.issn} onChange={e => set('issn', e.target.value)} placeholder="0000-0000" />
        <div className={styles.span2}>
          <Input label="Título da Fonte" value={form.source_title} onChange={e => set('source_title', e.target.value)} placeholder="Journal of..." />
        </div>
        <Input label="Tipo de Documento" value={form.document_type} onChange={e => set('document_type', e.target.value)} placeholder="Journal Article" />
        <Input label="Nº de Citações" type="number" value={form.qt_cited} onChange={e => set('qt_cited', e.target.value)} placeholder="0" />
        <div className={styles.span2}>
          <Input label="Link" value={form.link} onChange={e => set('link', e.target.value)} placeholder="https://..." />
        </div>
        <div className={styles.span2}>
          <Input label="Acesso à Publicação" value={form.publication_acess} onChange={e => set('publication_acess', e.target.value)} placeholder="Open Access" />
        </div>
        <div className={styles.span2}>
          <Textarea label="Abstract" value={form.abstract} onChange={e => set('abstract', e.target.value)} placeholder="Resumo do artigo..." style={{ minHeight: 100 }} />
        </div>
        {authors.length > 0 && (
          <div className={styles.span2}>
            <Select label="Autores (Ctrl+clique para múltiplos)" multiple value={selAuthors}
              onChange={e => setSelAuthors([...e.target.selectedOptions].map(o => o.value))}
              style={{ height: 90 }}>
              {authors.map(a => <option key={a.id} value={a.id}>{a.nome_completo}</option>)}
            </Select>
          </div>
        )}
        {keywords.length > 0 && (
          <div className={styles.span2}>
            <Select label="Keywords (Ctrl+clique para múltiplas)" multiple value={selKw.map(String)}
              onChange={e => setSelKw([...e.target.selectedOptions].map(o => parseInt(o.value)))}
              style={{ height: 90 }}>
              {keywords.map(k => <option key={k.id} value={k.id}>{k.keyword}</option>)}
            </Select>
          </div>
        )}
      </div>
      <div className={styles.formActions}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <><Spinner size={14} /> Salvando...</> : 'Salvar Artigo'}
        </Button>
      </div>
    </Modal>
  )
}

/* ── Article Detail ── */
function ArticleDetail({ article: a, onClose, onDeleted }) {
  const [artAuthors, setArtAuthors] = useState([])
  const [artKw, setArtKw] = useState([])
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase.from('article_author').select('author(*)').eq('id_article', a.id)
      .then(r => setArtAuthors((r.data || []).map(x => x.author).filter(Boolean)))
    supabase.from('article_keywords').select('keywords(*)').eq('id_article', a.id)
      .then(r => setArtKw((r.data || []).map(x => x.keywords).filter(Boolean)))
  }, [a.id])

  async function handleDelete() {
    if (!confirm('Excluir este artigo? A ação é irreversível.')) return
    setDeleting(true)
    await supabase.from('article_author').delete().eq('id_article', a.id)
    await supabase.from('article_keywords').delete().eq('id_article', a.id)
    await supabase.from('article').delete().eq('id', a.id)
    onDeleted()
  }

  const fields = [
    ['Ano', a.year], ['Idioma', a.language], ['ISSN', a.issn],
    ['Fonte', a.source_title], ['Tipo', a.document_type],
    ['Citações', a.qt_cited], ['Acesso', a.publication_acess],
    ['DOI', a.doi ? <a href={`https://doi.org/${a.doi}`} target="_blank" rel="noreferrer">{a.doi}</a> : null],
    ['Link', a.link ? <a href={a.link} target="_blank" rel="noreferrer">{a.link}</a> : null],
  ].filter(([, v]) => v != null && v !== '')

  return (
    <Modal title={a.title} onClose={onClose} wide>
      {fields.map(([l, v]) => (
        <div key={l} className={styles.detailRow}>
          <span className={styles.detailLabel}>{l}</span>
          <span>{v}</span>
        </div>
      ))}
      {a.abstract && (
        <div style={{ marginTop: 14 }}>
          <SectionLabel>Abstract</SectionLabel>
          <p style={{ fontSize: '0.86rem', color: 'var(--muted)', lineHeight: 1.7 }}>{a.abstract}</p>
        </div>
      )}
      {artAuthors.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <SectionLabel>Autores</SectionLabel>
          <div className={styles.tagWrap}>
            {artAuthors.map(au => <Badge key={au.id}>{au.nome_completo}</Badge>)}
          </div>
        </div>
      )}
      {artKw.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <SectionLabel>Keywords</SectionLabel>
          <div className={styles.tagWrap}>
            {artKw.map(k => <Badge key={k.id} color="blue">{k.keyword}</Badge>)}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
        <button className={styles.deleteBtn} onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Excluindo...' : '🗑 Excluir Artigo'}
        </button>
      </div>
    </Modal>
  )
}
