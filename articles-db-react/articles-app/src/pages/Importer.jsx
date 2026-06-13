import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { Alert, Button, Spinner, PageHeader, SectionLabel } from '../components/UI'
import styles from './Importer.module.css'

const STEPS = ['Arquivo', 'Preview', 'Importar', 'Concluído']

function norm(s) { return (s || '').toLowerCase().trim().replace(/\s+/g, ' ') }
function clean(v) { const s = (v || '').trim(); return s || null }
function parseYear(v) { const n = parseInt(v); return (n > 1000 && n < 2200) ? n : null }

export default function Importer() {
  const [step, setStep] = useState(0)
  const [rows, setRows] = useState([])
  const [dragging, setDragging] = useState(false)
  const [log, setLog] = useState([])
  const [progress, setProgress] = useState({ cur: 0, total: 0 })
  const [stats, setStats] = useState({ articles: 0, authors: 0, keywords: 0, skipped: 0, errors: 0 })
  const fileRef = useRef()
  const logRef = useRef()

  function addLog(msg, type = 'info') {
    const t = new Date().toLocaleTimeString('pt-BR', { hour12: false })
    setLog(p => [...p, { t, msg, type }])
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, 50)
  }

  function handleFile(file) {
    if (!file?.name.toLowerCase().endsWith('.csv')) { alert('Selecione um .csv'); return }
    Papa.parse(file, {
      header: true, skipEmptyLines: true, encoding: 'UTF-8',
      complete: r => { setRows(r.data); setStep(1) },
      error: e => alert('Erro ao ler CSV: ' + e.message)
    })
  }

  async function runImport() {
    setStep(2)
    setLog([])
    const s = { articles: 0, authors: 0, keywords: 0, skipped: 0, errors: 0 }
    addLog(`Iniciando importação de ${rows.length} artigos...`, 'info')

    const authorCache = {}, kwCache = {}
    const { data: exA } = await supabase.from('author').select('id,nome_completo')
    ;(exA || []).forEach(a => { authorCache[norm(a.nome_completo)] = a.id })
    const { data: exK } = await supabase.from('keywords').select('id,keyword')
    ;(exK || []).forEach(k => { kwCache[norm(k.keyword)] = k.id })
    addLog(`Cache: ${Object.keys(authorCache).length} autores, ${Object.keys(kwCache).length} keywords existentes.`, 'info')

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      setProgress({ cur: i + 1, total: rows.length })

      const title = (row['Title'] || '').trim()
      if (!title) { addLog(`Linha ${i + 2}: sem título — pulando.`, 'warn'); s.skipped++; continue }

      try {
        const payload = {
          title,
          year:              parseYear(row['Year']),
          source_title:      clean(row['Source title']),
          qt_cited:          parseInt(row['Cited by']) || 0,
          doi:               clean(row['DOI']),
          link:              clean(row['Link']),
          abstract:          clean(row['Abstract']),
          issn:              clean(row['ISSN']),
          language:          clean(row['Language of Original Document']),
          document_type:     clean(row['Document Type']),
          publication_acess: clean(row['Open Access']),
        }

        const { data: artData, error: artErr } = await supabase.from('article').insert([payload]).select('id')
        if (artErr) {
          if (artErr.code === '23505') { addLog(`[${i+1}] Duplicado: "${title.substring(0,50)}..."`, 'warn'); s.skipped++; continue }
          throw new Error(artErr.message)
        }
        const articleId = artData[0].id
        s.articles++

        // Autores — usa "Author full names" se disponível
        const rawAuthors = (row['Author full names'] || row['Authors'] || '').trim()
        if (rawAuthors) {
          const authorList = rawAuthors.split(';').map(a => a.replace(/\(\d+\)/g, '').trim()).filter(Boolean)
          for (const fullName of authorList) {
            const key = norm(fullName)
            let authorId = authorCache[key]
            if (!authorId) {
              const parts = fullName.split(',')
              const nome = (parts[0] || fullName).trim()
              const uid = 'A_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
              const { data: aData, error: aErr } = await supabase.from('author')
                .insert([{ id: uid, nome, nome_completo: fullName }]).select('id')
              if (!aErr) { authorId = aData[0].id; authorCache[key] = authorId; s.authors++ }
            }
            if (authorId) await supabase.from('article_author').insert([{ id_article: articleId, id_author: authorId }])
          }
        }

        // Keywords — separadas por ";"
        const rawKw = (row['Author Keywords'] || '').trim()
        if (rawKw) {
          const kwList = rawKw.split(';').map(k => k.trim()).filter(Boolean)
          for (const kw of kwList) {
            const key = norm(kw)
            let kwId = kwCache[key]
            if (!kwId) {
              const { data: kData, error: kErr } = await supabase.from('keywords').insert([{ keyword: kw }]).select('id')
              if (!kErr) { kwId = kData[0].id; kwCache[key] = kwId; s.keywords++ }
            }
            if (kwId) await supabase.from('article_keywords').insert([{ id_article: articleId, id_keywords: kwId }])
          }
        }

        addLog(`✓ [${i+1}/${rows.length}] ${title.substring(0, 65)}${title.length > 65 ? '…' : ''}`, 'ok')
      } catch (e) {
        addLog(`✗ [${i+1}] ${e.message}`, 'err')
        s.errors++
      }
    }

    setStats({ ...s })
    setProgress({ cur: rows.length, total: rows.length })
    setTimeout(() => setStep(3), 600)
  }

  const pct = progress.total ? Math.round((progress.cur / progress.total) * 100) : 0

  return (
    <div>
      <PageHeader title="Importar CSV do Scopus" subtitle="Importe exportações do Scopus / Café CAPES direto para o banco" />

      {/* Step indicator */}
      <div className={styles.steps}>
        {STEPS.map((s, i) => (
          <div key={s} className={`${styles.step} ${i === step ? styles.active : ''} ${i < step ? styles.done : ''}`}>
            <div className={styles.circle}>{i < step ? '✓' : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {/* Step 0: Upload */}
      {step === 0 && (
        <div>
          <Alert type="info">
            💡 <strong>Como exportar do Scopus:</strong> Na lista de resultados → <strong>Export</strong> → <strong>CSV</strong> → marque <em>todas as informações</em> → <strong>Export</strong>.
          </Alert>
          <div
            className={`${styles.drop} ${dragging ? styles.over : ''}`}
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          >
            <div className={styles.dropIcon}>📂</div>
            <p>Arraste o CSV aqui ou <strong>clique para selecionar</strong></p>
            <small>Exportação padrão Scopus (.csv)</small>
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        </div>
      )}

      {/* Step 1: Preview */}
      {step === 1 && (
        <div>
          <div className={styles.previewBadges}>
            <span className={styles.pbadge}>{rows.length} artigos</span>
            <span className={`${styles.pbadge} ${styles.blue}`}>Scopus CSV detectado</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {['Title', 'Authors', 'Year', 'DOI', 'Source title', 'Document Type'].map(c =>
                    <th key={c}>{c}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((row, i) => (
                  <tr key={i}>
                    {['Title', 'Authors', 'Year', 'DOI', 'Source title', 'Document Type'].map(c => (
                      <td key={c} title={row[c] || ''}>{(row[c] || '—').substring(0, 40)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <Button variant="secondary" onClick={() => setStep(0)}>← Trocar arquivo</Button>
            <Button onClick={runImport}>🚀 Iniciar Importação de {rows.length} artigos</Button>
          </div>
        </div>
      )}

      {/* Step 2: Progress */}
      {step === 2 && (
        <div>
          <div className={styles.progWrap}>
            <div className={styles.progBg}><div className={styles.progFill} style={{ width: pct + '%' }} /></div>
            <div className={styles.progTxt}>
              <span>Processando {progress.cur} de {progress.total}...</span>
              <span>{pct}%</span>
            </div>
          </div>
          <div className={styles.log} ref={logRef}>
            {log.map((l, i) => (
              <div key={i} className={styles.logLine}>
                <span className={styles.logTime}>{l.t}</span>
                <span className={styles['log_' + l.type]}>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <div>
          <Alert type={stats.errors > 0 ? 'warning' : 'success'}>
            {stats.errors > 0
              ? `Concluído com ${stats.errors} erro(s). Verifique o log.`
              : `${stats.articles} artigos importados com sucesso!`}
          </Alert>
          <div className={styles.sumGrid}>
            {[
              { n: stats.articles, l: '📄 Artigos inseridos' },
              { n: stats.authors,  l: '👤 Autores novos' },
              { n: stats.keywords, l: '🏷 Keywords novas' },
              { n: stats.skipped,  l: '⏭ Pulados/Duplicados' },
              { n: stats.errors,   l: '⚠️ Erros' },
              { n: stats.articles + stats.skipped, l: '📊 Total processado' },
            ].map(s => (
              <div key={s.l} className={styles.sumCard}>
                <div className={styles.sumN}>{s.n}</div>
                <div className={styles.sumL}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 22 }}>
            <Button variant="secondary" onClick={() => { setStep(0); setRows([]); setLog([]) }}>↩ Importar outro arquivo</Button>
          </div>
        </div>
      )}
    </div>
  )
}
