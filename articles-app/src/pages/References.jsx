import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Textarea, Alert, Loading, Empty, PageHeader } from '../components/UI'
import styles from './Table.module.css'

export default function References() {
  const [refs, setRefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [newRef, setNewRef] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('reference').select('*').order('id', { ascending: false })
    setRefs(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addRef() {
    if (!newRef.trim()) return
    setSaving(true)
    const { error } = await supabase.from('reference').insert([{ reference: newRef.trim() }])
    setSaving(false)
    if (error) { setMsg({ type: 'error', text: error.message }); return }
    setMsg({ type: 'success', text: 'Referência adicionada!' })
    setNewRef(''); load()
  }

  return (
    <div>
      <PageHeader title="Referências" subtitle={`${refs.length} referência(s)`} />
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22, marginBottom: 18 }}>
        <Textarea label="Nova Referência" value={newRef} onChange={e => setNewRef(e.target.value)}
          placeholder="SOBRENOME, N. Título do trabalho. Revista, v.X, n.X, p.XX, YYYY." />
        <div style={{ marginTop: 12 }}>
          <Button onClick={addRef} disabled={saving}>+ Adicionar Referência</Button>
        </div>
      </div>
      {loading ? <Loading /> : refs.length === 0 ? <Empty icon="🔗" message="Nenhuma referência cadastrada." /> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th style={{ width: 50 }}>ID</th><th>Referência</th></tr></thead>
            <tbody>
              {refs.map(r => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--light)', fontFamily: 'DM Mono,monospace', fontSize: '0.76rem' }}>{r.id}</td>
                  <td style={{ fontSize: '0.84rem', lineHeight: 1.55 }}>{r.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
