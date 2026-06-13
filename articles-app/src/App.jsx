import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Articles from './pages/Articles'
import Authors from './pages/Authors'
import Keywords from './pages/Keywords'
import References from './pages/References'
import Importer from './pages/Importer'
import styles from './App.module.css'

export default function App() {
  const [page, setPage] = useState('dashboard')

  const pages = {
    dashboard:  <Dashboard onNavigate={setPage} />,
    articles:   <Articles />,
    authors:    <Authors />,
    keywords:   <Keywords />,
    references: <References />,
    importer:   <Importer />,
  }

  return (
    <div className={styles.shell}>
      <Sidebar page={page} setPage={setPage} onDisconnect={() => {}} />
      <main className={styles.main}>
        {pages[page] || <Dashboard onNavigate={setPage} />}
      </main>
    </div>
  )
}
