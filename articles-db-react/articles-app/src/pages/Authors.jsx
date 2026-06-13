import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Input, Alert, Spinner, Loading, Empty, Modal, SearchInput, PageHeader } from '../components/UI'
import styles from './Table.module.css'

export default function Authors() {
  const [authors, setAuthors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('author').select('*').order('nome_completo')
    setAuthors(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = authors.filter(a =>
    (a.nome_completo || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Autores"
        subtitle={`${authors.length} autor(es)`}
        action={<Button onClick={() => setShowForm(true)}>+ Novo Autor</Button>}
      />
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      <div style={{ marginBottom: 16 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar autor..." />
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? <Empty icon="👤" message="Nenhum autor encontrado." /> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>ID</th><th>Nome Curto</th><th>Nome Completo</th></tr></thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td><code style={{ fontSize: '0.78rem' }}>{a.id}</code></td>
                  <td>{a.nome || '—'}</td>
                  <td>{a.nome_completo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AuthorForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setMsg({ type: 'success', text: 'Autor salvo!' }); load() }}
        />
      )}
    </div>
  )
}

function AuthorForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ id: '', nome: '', nome_completo: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!form.id || !form.nome_completo) { setError('ID e Nome Completo são obrigatórios.'); return }
    setSaving(true)
    const { error: e } = await supabase.from('author').insert([form])
    if (e) { setError(e.message); setSaving(false); return }
    onSaved()
  }

  return (
    <Modal title="Novo Autor" onClose={onClose}>
      {error && <Alert type="error">{error}</Alert>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="ID *" value={form.id} onChange={e => setForm(p => ({ ...p, id: e.target.value }))} placeholder="A001" />
        <Input label="Sobrenome / Nome Curto" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Silva" />
        <Input label="Nome Completo *" value={form.nome_completo} onChange={e => setForm(p => ({ ...p, nome_completo: e.target.value }))} placeholder="João da Silva" />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <><Spinner size={14} /> Salvando...</> : 'Salvar Autor'}
        </Button>
      </div>
    </Modal>
  )
}
