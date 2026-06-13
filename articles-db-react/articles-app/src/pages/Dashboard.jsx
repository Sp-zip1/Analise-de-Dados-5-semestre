import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, Badge, Loading, PageHeader, SectionLabel } from '../components/UI'
import styles from './Dashboard.module.css'

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])

  useEffect(() => {
    async function load() {
      const [a, au, kw, r, rec] = await Promise.all([
        supabase.from('article').select('id', { count: 'exact', head: true }),
        supabase.from('author').select('id', { count: 'exact', head: true }),
        supabase.from('keywords').select('id', { count: 'exact', head: true }),
        supabase.from('reference').select('id', { count: 'exact', head: true }),
        supabase.from('article').select('id,title,year,language,document_type').order('id', { ascending: false }).limit(6),
      ])
      setStats({ articles: a.count || 0, authors: au.count || 0, keywords: kw.count || 0, refs: r.count || 0 })
      setRecent(rec.data || [])
    }
    load()
  }, [])

  if (!stats) return <Loading />

  const STATS = [
    { n: stats.articles, label: 'Artigos',     icon: '📄' },
    { n: stats.authors,  label: 'Autores',      icon: '👤' },
    { n: stats.keywords, label: 'Keywords',     icon: '🏷' },
    { n: stats.refs,     label: 'Referências',  icon: '🔗' },
  ]

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do banco de dados" />
      <div className={styles.statsGrid}>
        {STATS.map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statNum}>{s.n}</div>
            <div className={styles.statLabel}>{s.icon} {s.label}</div>
          </div>
        ))}
      </div>
      <Card>
        <SectionLabel>Artigos Recentes</SectionLabel>
        {recent.length === 0
          ? <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Nenhum artigo cadastrado.</p>
          : recent.map(a => (
            <div key={a.id} className={styles.recentItem} onClick={() => onNavigate('articles')}>
              <div className={styles.recentTitle}>{a.title}</div>
              <div className={styles.recentMeta}>
                {a.year && <Badge>{a.year}</Badge>}
                {a.language && <Badge color="blue">{a.language}</Badge>}
                {a.document_type && <Badge color="green">{a.document_type}</Badge>}
              </div>
            </div>
          ))
        }
      </Card>
    </div>
  )
}
