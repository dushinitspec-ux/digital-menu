import { type BusinessType, type Locale } from '@dm/shared';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { api, ApiError } from '../api';
import { useT } from '../i18n';
import { useSession } from '../session';
import { Button, Field } from '../ui';

const COUNTRIES: { code: string; ru: string; en: string }[] = [
  { code: 'RU', ru: 'Россия', en: 'Russia' },
  { code: 'BY', ru: 'Беларусь', en: 'Belarus' },
  { code: 'DE', ru: 'Германия', en: 'Germany' },
  { code: 'FR', ru: 'Франция', en: 'France' },
  { code: 'ES', ru: 'Испания', en: 'Spain' },
  { code: 'IT', ru: 'Италия', en: 'Italy' },
  { code: 'NL', ru: 'Нидерланды', en: 'Netherlands' },
  { code: 'PL', ru: 'Польша', en: 'Poland' },
  { code: 'CZ', ru: 'Чехия', en: 'Czechia' },
  { code: 'AT', ru: 'Австрия', en: 'Austria' },
  { code: 'PT', ru: 'Португалия', en: 'Portugal' },
  { code: 'GR', ru: 'Греция', en: 'Greece' },
  { code: 'CY', ru: 'Кипр', en: 'Cyprus' },
  { code: 'LV', ru: 'Латвия', en: 'Latvia' },
  { code: 'LT', ru: 'Литва', en: 'Lithuania' },
  { code: 'EE', ru: 'Эстония', en: 'Estonia' },
  { code: 'FI', ru: 'Финляндия', en: 'Finland' },
  { code: 'RS', ru: 'Сербия', en: 'Serbia' },
  { code: 'ME', ru: 'Черногория', en: 'Montenegro' },
  { code: 'GB', ru: 'Великобритания', en: 'United Kingdom' },
  { code: 'CH', ru: 'Швейцария', en: 'Switzerland' },
  { code: 'TR', ru: 'Турция', en: 'Türkiye' },
];

function AuthFrame({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useT();
  const { config } = useSession();
  return (
    <div className="auth">
      <div className="auth-side">
        <span className="brand-mark brand-mark-lg" />
        <div className="auth-brand">{config?.brandName}</div>
        <p>{t('appTagline')}</p>
      </div>
      <div className="auth-main">
        <form className="auth-card" onSubmit={(e) => e.preventDefault()}>
          <h1>{title}</h1>
          {children}
        </form>
      </div>
    </div>
  );
}

export function LoginPage() {
  const t = useT();
  const { refresh } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/login', { email, password });
      await refresh();
      navigate((location.state as { from?: string } | null)?.from ?? '/menu', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'invalid_credentials' ? t('invalidCredentials') : t('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame title={t('loginTitle')}>
      <Field label={t('email')}>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label={t('password')}>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          required
        />
      </Field>
      {error ? <div className="form-error">{error}</div> : null}
      <Button className="btn-block" disabled={busy || !email || !password} onClick={() => void submit()}>
        {t('signIn')}
      </Button>
      <p className="auth-alt">
        {t('noAccount')} <Link to="/register">{t('register')}</Link>
      </p>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const t = useT();
  const { config, refresh } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    orgName: '',
    businessType: 'coffee' as BusinessType,
    country: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || config?.timezone || 'Europe/Moscow',
  });
  const [error, setError] = useState<{ msg: string; redirect?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });

  // Список стран — только своего контура; клиентов другого региона API отправит на другой домен.
  const countries = COUNTRIES.filter((c) => (config?.region === 'ru' ? c.code === 'RU' || c.code === 'BY' : c.code !== 'RU' && c.code !== 'BY'));
  const country = form.country || countries[0]?.code || 'RU';

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const locale: Locale = t.locale;
      await api.post('/auth/register', { ...form, country, locale });
      await refresh();
      navigate('/screens', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'wrong_region') {
        setError({ msg: t('wrongRegion'), redirect: (err.details as { redirect?: string })?.redirect });
      } else if (err instanceof ApiError && err.code === 'email_taken') {
        setError({ msg: t('emailTaken') });
      } else {
        setError({ msg: t('error') });
      }
    } finally {
      setBusy(false);
    }
  };

  const types: BusinessType[] = ['coffee', 'cafe', 'restaurant', 'bar', 'hookah'];
  return (
    <AuthFrame title={t('registerTitle')}>
      <div className="grid-2">
        <Field label={t('yourName')}>
          <input value={form.name} onChange={set('name')} autoComplete="name" />
        </Field>
        <Field label={t('venueName')}>
          <input value={form.orgName} onChange={set('orgName')} autoComplete="organization" />
        </Field>
      </div>
      <Field label={t('businessType')} group>
        <div className="chips">
          {types.map((bt) => (
            <button
              type="button"
              key={bt}
              className={`chip${form.businessType === bt ? ' is-on' : ''}`}
              onClick={() => setForm({ ...form, businessType: bt })}
            >
              {t(`bt_${bt}`)}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid-2">
        <Field label={t('country')}>
          <select value={country} onChange={set('country')}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {t.locale === 'ru' ? c.ru : c.en}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('timezone')}>
          <input value={form.timezone} onChange={set('timezone')} />
        </Field>
      </div>
      <Field label={t('email')}>
        <input type="email" value={form.email} onChange={set('email')} autoComplete="email" />
      </Field>
      <Field label={t('password')} hint={t('passwordHint')}>
        <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
      </Field>
      {error ? (
        <div className="form-error">
          {error.msg} {error.redirect ? <a href={`${error.redirect}/admin/register`}>{error.redirect}</a> : null}
        </div>
      ) : null}
      <p className="consent">{t('consent')}</p>
      <Button
        className="btn-block"
        disabled={busy || !form.email || form.password.length < 8 || !form.name || !form.orgName}
        onClick={() => void submit()}
      >
        {t('createAccount')}
      </Button>
      <p className="auth-alt">
        {t('haveAccount')} <Link to="/login">{t('signIn')}</Link>
      </p>
    </AuthFrame>
  );
}
