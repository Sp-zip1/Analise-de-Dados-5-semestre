import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Card, Badge, Loading, PageHeader, SectionLabel } from '../components/UI'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts'
import styles from './Dashboard.module.css'

const COLORS = ['#4891E7','#BBE11A','#86D0FD','#042C8F','#C1E5FB','#E8F957','#4891e7','#BBE11A']

/* Hook que retorna as dimensões reais do container */
function useSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref])
  return size
}

/* Container que mede a si mesmo e passa width/height fixos aos filhos */
function AutoChart({ height = 260, children }) {
  const ref = useRef(null)
  const { w } = useSize(ref)
  return (
    <div ref={ref} style={{ width: '100%', height }}>
      {w > 0 ? children(w, height) : null}
    </div>
  )
}

function ChartCard({ title, children, height = 260 }) {
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartTitle}>{title}</div>
      <AutoChart height={height}>{children}</AutoChart>
    </div>
  )
}

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      {label && <div className={styles.tooltipLabel}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#c0392b' }}>
          {p.name ? `${p.name}: ` : ''}<strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

const tickStyle = { fontSize: 11, fontFamily: 'DM Mono, monospace', fill: '#6b7280' }
const tickStyleSm = { fontSize: 10, fontFamily: 'DM Mono, monospace', fill: '#6b7280' }

export default function Dashboard({ onNavigate }) {
  const [stats, setStats]           = useState(null)
  const [recent, setRecent]         = useState([])
  const [byYear, setByYear]         = useState([])
  const [byType, setByType]         = useState([])
  const [byLang, setByLang]         = useState([])
  const [topKw, setTopKw]           = useState([])
  const [topAuthors, setTopAuthors] = useState([])
  const [byAccess, setByAccess]     = useState([])

  useEffect(() => {
    async function load() {
      const [a, au, kw, r] = await Promise.all([
        supabase.from('article').select('id', { count: 'exact', head: true }),
        supabase.from('author').select('id', { count: 'exact', head: true }),
        supabase.from('keywords').select('id', { count: 'exact', head: true }),
        supabase.from('reference').select('id', { count: 'exact', head: true }),
      ])
      setStats({ articles: a.count||0, authors: au.count||0, keywords: kw.count||0, refs: r.count||0 })

      const { data: rec } = await supabase
        .from('article').select('id,title,year,language,document_type')
        .order('id', { ascending: false }).limit(5)
      setRecent(rec || [])

      const { data: arts } = await supabase
        .from('article').select('year,document_type,language,publication_acess')
      if (arts) {
        const yearMap = {}, typeMap = {}, langMap = {}, accessMap = {}
        arts.forEach(a => {
          if (a.year) yearMap[a.year] = (yearMap[a.year] || 0) + 1
          const t = a.document_type?.trim() || 'Não informado'
          typeMap[t] = (typeMap[t] || 0) + 1
          const l = a.language?.trim() || 'Não informado'
          langMap[l] = (langMap[l] || 0) + 1
          const ac = a.publication_acess?.trim() || 'Não informado'
          accessMap[ac] = (accessMap[ac] || 0) + 1
        })
        setByYear(Object.entries(yearMap).map(([year, count]) => ({ year: String(year), count })).sort((a,b) => a.year.localeCompare(b.year)))
        setByType(Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value-a.value).slice(0,6))
        setByLang(Object.entries(langMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value-a.value).slice(0,6))
        setByAccess(Object.entries(accessMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value-a.value))
      }

      const { data: kwLinks } = await supabase.from('article_keywords').select('keywords(keyword)')
      if (kwLinks) {
        const kwMap = {}
        kwLinks.forEach(k => { const n = k.keywords?.keyword?.trim(); if (n) kwMap[n] = (kwMap[n]||0)+1 })
        setTopKw(Object.entries(kwMap).map(([name,count]) => ({name,count})).sort((a,b) => b.count-a.count).slice(0,10))
      }

      const { data: auLinks } = await supabase.from('article_author').select('author(nome_completo)')
      if (auLinks) {
        const auMap = {}
        auLinks.forEach(a => { const n = a.author?.nome_completo?.trim(); if (n) auMap[n] = (auMap[n]||0)+1 })
        setTopAuthors(Object.entries(auMap).map(([name,count]) => ({name: name.split(',')[0], count})).sort((a,b) => b.count-a.count).slice(0,8))
      }
    }
    load()
  }, [])

  if (!stats) return <Loading />

  const STATS = [
    { n: stats.articles, label: 'Artigos',    icon: '📄' },
    { n: stats.authors,  label: 'Autores',     icon: '👤' },
    { n: stats.keywords, label: 'Keywords',    icon: '🏷' },
    { n: stats.refs,     label: 'Referências', icon: '🔗' },
  ]

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral e análise do banco de dados" />

      <div className={styles.statsGrid}>
        {STATS.map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statNum}>{s.n}</div>
            <div className={styles.statLabel}>{s.icon} {s.label}</div>
          </div>
        ))}
      </div>

      {/* ROW 1 */}
      <div className={styles.chartsRow}>
        <ChartCard title="Artigos por Ano" height={240}>
          {(w, h) => byYear.length === 0
            ? <div className={styles.noData}>Sem dados de ano</div>
            : <BarChart width={w} height={h} data={byYear} margin={{ top:5, right:10, left:-20, bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede6" />
                <XAxis dataKey="year" tick={tickStyle} />
                <YAxis tick={tickStyle} allowDecimals={false} />
                <Tooltip content={<TT />} />
                <Bar dataKey="count" name="Artigos" fill="#4891E7" radius={[4,4,0,0]} />
              </BarChart>
          }
        </ChartCard>

        <ChartCard title="Tipo de Documento" height={240}>
          {(w, h) => byType.length === 0
            ? <div className={styles.noData}>Sem dados</div>
            : <PieChart width={w} height={h}>
                <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={75} paddingAngle={2}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<TT />} />
                <Legend iconSize={9} iconType="circle" formatter={v => <span style={{ fontSize: 10, fontFamily: 'DM Mono' }}>{v}</span>} />
              </PieChart>
          }
        </ChartCard>
      </div>

      {/* ROW 2 */}
      <div className={styles.chartsRow}>
        <ChartCard title="Top 10 Keywords" height={290}>
          {(w, h) => topKw.length === 0
            ? <div className={styles.noData}>Sem dados</div>
            : <BarChart width={w} height={h} data={topKw} layout="vertical" margin={{ top:0, right:12, left:8, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede6" horizontal={false} />
                <XAxis type="number" tick={tickStyleSm} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={135} tick={tickStyleSm} />
                <Tooltip content={<TT />} />
                <Bar dataKey="count" name="Artigos" fill="#042C8F" radius={[0,4,4,0]} />
              </BarChart>
          }
        </ChartCard>

        <ChartCard title="Top 8 Autores mais produtivos" height={290}>
          {(w, h) => topAuthors.length === 0
            ? <div className={styles.noData}>Sem dados</div>
            : <BarChart width={w} height={h} data={topAuthors} layout="vertical" margin={{ top:0, right:12, left:8, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede6" horizontal={false} />
                <XAxis type="number" tick={tickStyleSm} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={120} tick={tickStyleSm} />
                <Tooltip content={<TT />} />
                <Bar dataKey="count" name="Artigos" fill="#BBE11A" radius={[0,4,4,0]} />
              </BarChart>
          }
        </ChartCard>
      </div>

      {/* ROW 3 */}
      <div className={styles.chartsRow}>
        <ChartCard title="Idiomas" height={220}>
          {(w, h) => byLang.length === 0
            ? <div className={styles.noData}>Sem dados</div>
            : <PieChart width={w} height={h}>
                <Pie data={byLang} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={45} outerRadius={72} paddingAngle={3}>
                  {byLang.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<TT />} />
                <Legend iconSize={9} iconType="circle" formatter={v => <span style={{ fontSize: 10, fontFamily: 'DM Mono' }}>{v}</span>} />
              </PieChart>
          }
        </ChartCard>

        <ChartCard title="Tipo de Acesso" height={220}>
          {(w, h) => byAccess.length === 0
            ? <div className={styles.noData}>Sem dados</div>
            : <PieChart width={w} height={h}>
                <Pie data={byAccess} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={45} outerRadius={72} paddingAngle={3}>
                  {byAccess.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<TT />} />
                <Legend iconSize={9} iconType="circle" formatter={v => <span style={{ fontSize: 10, fontFamily: 'DM Mono' }}>{v}</span>} />
              </PieChart>
          }
        </ChartCard>
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
