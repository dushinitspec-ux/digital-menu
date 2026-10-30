import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export function Button({
  children,
  variant = 'primary',
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'soft'; size?: 'sm' }) {
  return (
    <button type="button" {...props} className={`btn btn-${variant}${size === 'sm' ? ' btn-sm' : ''} ${props.className ?? ''}`}>
      {children}
    </button>
  );
}

/** Подпись к одному полю ввода. Для набора кнопок или нескольких полей — group: иначе <label> присвоит им общее имя. */
export function Field({ label, hint, children, group }: { label: string; hint?: string; children: ReactNode; group?: boolean }) {
  if (group) {
    return (
      <div className="field" role="group" aria-label={label}>
        <span className="field-label">{label}</span>
        {children}
        {hint ? <span className="field-hint">{hint}</span> : null}
      </div>
    );
  }
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`switch${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" />
      {label ? <span className="switch-label">{label}</span> : null}
    </button>
  );
}

export function Sheet({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="×">
            ×
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer ? <div className="sheet-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Spinner() {
  return <div className="spinner" aria-busy="true" />;
}

export function PageHead({ title, hint, actions }: { title: string; hint?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {hint ? <p className="muted">{hint}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

const ToastContext = createContext<(msg: string, kind?: 'ok' | 'error') => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'error'; id: number } | null>(null);
  const show = useCallback((msg: string, kind: 'ok' | 'error' = 'ok') => setToast({ msg, kind, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <div key={toast.id} className={`toast toast-${toast.kind}`} role="status">
          {toast.msg}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/** Подтверждение внутри страницы: системный confirm() блокирует интерфейс и не работает во встраиваемых окнах. */
const ConfirmContext = createContext<(message: string) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children, labels }: { children: ReactNode; labels: () => { ok: string; cancel: string } }) {
  const [pending, setPending] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);
  const ask = useCallback((message: string) => new Promise<boolean>((resolve) => setPending({ message, resolve })), []);
  const close = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };
  const { ok, cancel } = labels();
  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {pending ? (
        <div className="sheet-backdrop confirm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
          <div className="confirm" role="alertdialog" aria-modal="true" aria-label={pending.message}>
            <p>{pending.message}</p>
            <div className="confirm-actions">
              <Button variant="ghost" onClick={() => close(false)} autoFocus>
                {cancel}
              </Button>
              <Button variant="danger" onClick={() => close(true)}>
                {ok}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

export function timeAgo(iso: string | null, locale: string, never: string) {
  if (!iso) return never;
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diff < 60) return rtf.format(-Math.round(diff), 'second');
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  return rtf.format(-Math.round(diff / 86400), 'day');
}
