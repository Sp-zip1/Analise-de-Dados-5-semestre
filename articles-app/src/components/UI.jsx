import styles from './UI.module.css'

export function Card({ children, className = '', onClick }) {
  return (
    <div className={`${styles.card} ${onClick ? styles.clickable : ''} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}

export function Badge({ children, color = 'red' }) {
  return <span className={`${styles.badge} ${styles[color]}`}>{children}</span>
}

export function Button({ children, variant = 'primary', onClick, disabled, type = 'button', fullWidth }) {
  return (
    <button
      type={type}
      className={`${styles.btn} ${styles[variant]} ${fullWidth ? styles.full : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function Input({ label, hint, ...props }) {
  return (
    <div className={styles.field}>
      {label && <label className={styles.label}>{label}</label>}
      <input className={styles.input} {...props} />
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}

export function Textarea({ label, ...props }) {
  return (
    <div className={styles.field}>
      {label && <label className={styles.label}>{label}</label>}
      <textarea className={styles.textarea} {...props} />
    </div>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <div className={styles.field}>
      {label && <label className={styles.label}>{label}</label>}
      <select className={styles.input} {...props}>{children}</select>
    </div>
  )
}

export function Alert({ children, type = 'error' }) {
  return <div className={`${styles.alert} ${styles['alert_' + type]}`}>{children}</div>
}

export function Spinner({ size = 16 }) {
  return <span className={styles.spinner} style={{ width: size, height: size }} />
}

export function Loading() {
  return (
    <div className={styles.loading}>
      <Spinner size={20} />
      <span>Carregando...</span>
    </div>
  )
}

export function Empty({ icon = '📄', message = 'Nenhum registro encontrado.' }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>{icon}</div>
      <p>{message}</p>
    </div>
  )
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} ${wide ? styles.wide : ''}`}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <input
      className={styles.search}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || 'Buscar...'}
    />
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h2 className={styles.pageTitle}>{title}</h2>
        {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function SectionLabel({ children }) {
  return <div className={styles.sectionLabel}>{children}</div>
}
