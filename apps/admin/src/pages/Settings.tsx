import type { Locale } from '@dm/shared';
import { useContext, useState } from 'react';
import { api, ApiError } from '../api';
import { LocaleContext, useT } from '../i18n';
import { useOrg, useSession } from '../session';
import { Button, Field, PageHead, useToast } from '../ui';

export function SettingsPage() {
  const t = useT();
  const { org, base, canAdmin } = useOrg();
  const { refresh, config } = useSession();
  const { locale, setLocale } = useContext(LocaleContext);
  const toast = useToast();
  const [name, setName] = useState(org.name);
  const [pw, setPw] = useState({ current: '', next: '' });

  const changePassword = async () => {
    try {
      await api.post('/auth/password', { currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: '', next: '' });
      toast(t('passwordChanged'));
    } catch (err) {
      toast(err instanceof ApiError && err.code === 'wrong_password' ? t('wrongPassword') : t('error'), 'error');
    }
  };

  const save = async () => {
    try {
      await api.patch(base, { name });
      await refresh();
      toast(t('saved'));
    } catch {
      toast(t('error'), 'error');
    }
  };

  return (
    <div className="page">
      <PageHead title={t('settings')} />
      <fieldset className="card form-card" disabled={!canAdmin}>
        <Field label={t('orgName')}>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid-2">
          <Field label={t('region')}>
            <input value={t(config?.region === 'ru' ? 'region_ru' : 'region_eu')} readOnly />
          </Field>
          <Field label={t('plan')}>
            <input value={t(org.plan === 'complimentary' ? 'plan_complimentary' : 'plan_standard')} readOnly />
          </Field>
        </div>
        <div>
          <Button disabled={name === org.name || !name.trim()} onClick={() => void save()}>
            {t('save')}
          </Button>
        </div>
      </fieldset>
      <div className="card form-card">
        <h2>{t('changePassword')}</h2>
        <div className="grid-2">
          <Field label={t('currentPassword')}>
            <input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </Field>
          <Field label={t('newPassword')} hint={t('passwordHint')}>
            <input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </Field>
        </div>
        <div>
          <Button disabled={!pw.current || pw.next.length < 8} onClick={() => void changePassword()}>
            {t('changePassword')}
          </Button>
        </div>
      </div>
      <div className="card form-card">
        <Field label={t('language')} group>
          <div className="seg">
            {(['ru', 'en'] as Locale[]).map((l) => (
              <button type="button" key={l} className={locale === l ? 'is-on' : ''} onClick={() => setLocale(l)}>
                {l === 'ru' ? 'Русский' : 'English'}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}
