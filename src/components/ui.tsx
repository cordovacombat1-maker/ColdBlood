import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'

export function Page({ title, back, actions, children }: { title: string; back?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="pb-28">
      <header className="safe-top sticky top-0 z-10 bg-ink/95 backdrop-blur border-b border-line">
        <div className="flex items-center gap-2 px-4 h-14">
          {back && (
            <Link to={back} aria-label="Back" className="-ml-2 w-11 h-11 grid place-items-center text-2xl text-mute">
              ‹
            </Link>
          )}
          <h1 className="text-2xl font-bold flex-1 truncate">{title}</h1>
          {actions}
        </div>
      </header>
      <main className="px-4 pt-4 space-y-4">{children}</main>
    </div>
  )
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const cls = `block w-full text-left bg-panel border border-line rounded-2xl p-4 ${className}`
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} active:bg-raised`}>
      {children}
    </button>
  ) : (
    <section className={cls}>{children}</section>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-sm font-medium text-mute tracking-widest">{children}</h2>
      {action}
    </div>
  )
}

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'subtle'
const btn: Record<BtnVariant, string> = {
  primary: 'bg-blood text-white active:bg-blood-dark',
  ghost: 'border border-line text-bone active:bg-raised',
  subtle: 'bg-raised text-bone active:bg-line',
  danger: 'border border-blood text-blood active:bg-blood/10',
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      type="button"
      {...rest}
      className={`min-h-12 px-5 rounded-xl font-display uppercase tracking-wider text-lg disabled:opacity-40 ${btn[variant]} ${className}`}
    />
  )
}

const inputCls = 'w-full min-h-12 bg-raised border border-line rounded-xl px-3 text-bone placeholder:text-mute/60 focus:border-blood focus:outline-none'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-mute mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-mute mt-1">{hint}</span>}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${inputCls} py-3 ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

// Big tappable choice chips (e.g. session type, RPE).
export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  label = (o) => String(o),
  cols,
}: {
  options: readonly T[]
  value: T | null | undefined
  onChange: (v: T) => void
  label?: (o: T) => string
  cols?: number
}) {
  return (
    <div className={cols ? 'grid gap-2' : 'flex flex-wrap gap-2'} style={cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : undefined}>
      {options.map((o) => (
        <button
          type="button"
          key={String(o)}
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`min-h-12 rounded-xl border capitalize ${cols ? 'px-1 text-sm' : 'px-3 text-base'} ${
            value === o ? 'bg-blood border-blood text-white font-semibold' : 'bg-raised border-line text-bone'
          }`}
        >
          {label(o)}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex bg-raised rounded-xl p-1 border border-line">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`flex-1 min-h-10 rounded-lg font-display uppercase tracking-wider text-sm ${value === o.value ? 'bg-bone text-ink' : 'text-mute'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Bottom sheet used for every quick-log form.
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto bg-panel border-t border-line rounded-t-3xl safe-bottom">
        <div className="sticky top-0 bg-panel flex items-center justify-between px-4 h-14 border-b border-line z-10">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="w-11 h-11 -mr-2 text-2xl text-mute" aria-label="Close">
            ×
          </button>
        </div>
        <div className="p-4 space-y-4 pb-8">{children}</div>
      </div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-mute text-center py-8">{children}</p>
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-mute">{label}</div>
      <div className="font-display text-3xl font-bold leading-tight">{value}</div>
      {sub && <div className="text-xs text-mute">{sub}</div>}
    </div>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? <p className="text-blood text-sm">{children}</p> : null
}

export function PendingDot() {
  return <span title="Waiting to sync" className="inline-block w-2 h-2 rounded-full bg-amber-400 ml-2 align-middle" />
}

export function SubNav({ items }: { items: { to: string; label: string; active: boolean }[] }) {
  return (
    <nav className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
      {items.map((i) => (
        <Link
          key={i.to}
          to={i.to}
          className={`shrink-0 min-h-10 px-4 rounded-full grid place-items-center font-display uppercase tracking-wider text-sm border ${
            i.active ? 'bg-bone text-ink border-bone' : 'border-line text-mute'
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  )
}
