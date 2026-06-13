import styles from './Sidebar.module.css'

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',   icon: '◈' },
  { id: 'articles',   label: 'Artigos',      icon: '📄' },
  { id: 'authors',    label: 'Autores',      icon: '👤' },
  { id: 'keywords',   label: 'Keywords',     icon: '🏷' },
  { id: 'references', label: 'Referências',  icon: '🔗' },
  { id: 'importer',   label: 'Importar CSV', icon: '📥' },
]

export default function Sidebar({ page, setPage, onDisconnect }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h1>Articles DB</h1>
        <span>Scientific Manager</span>
      </div>
      <nav className={styles.nav}>
        <div className={styles.section}>Menu</div>
        {NAV.map(item => (
          <button
            key={item.id}
            className={`${styles.navBtn} ${page === item.id ? styles.active : ''}`}
            onClick={() => setPage(item.id)}
          >
            <span className={styles.icon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
        <div className={styles.section} style={{ marginTop: 20 }}>Conta</div>
        <button className={styles.navBtn} onClick={onDisconnect}>
          <span className={styles.icon}>⎋</span>
          Desconectar
        </button>
      </nav>
    </aside>
  )
}
