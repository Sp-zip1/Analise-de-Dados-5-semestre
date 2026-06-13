import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Card, Badge, Button, Input, Alert, Loading, Empty, PageHeader } from '../components/UI'

export default function Keywords() {
  const [keywords, setKeywords] = useState([])
  const [loading, setLoading] = useState(true)
  const [newKw, setNewKw] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('keywords').select('*').order('keyword')
    setKeywords(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addKw() {
    if (!newKw.trim()) return
    setSaving(true)
    const { error } = await supabase.from('keywords').insert([{ keyword: newKw.trim() }])
    setSaving(false)
    if (error) { setMsg({ type: 'error', text: error.message }); return }
    setMsg({ type: 'success', text: 'Keyword adicionada!' })
    setNewKw(''); load()
  }

  return (
    <div>
      <PageHeader title="Keywords" subtitle={`${keywords.length} palavra(s)-chave`} />
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      <Card>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input label="Nova Keyword" value={newKw}
              onChange={e => setNewKw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addKw()}
              placeholder="ex: Machine Learning" />
          </div>
          <Button onClick={addKw} disabled={saving}>+ Adicionar</Button>
        </div>
      </Card>
      {loading ? <Loading /> : keywords.length === 0 ? <Empty icon="🏷" message="Nenhuma keyword cadastrada." /> : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {keywords.map(k => (
            <span key={k.id} style={{ fontSize: '0.83rem', padding: '5px 13px' }}>
              <Badge color="blue">{k.keyword}</Badge>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
