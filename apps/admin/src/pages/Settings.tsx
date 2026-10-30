import type { Locale } from '@dm/shared';
import { useContext, useState } from 'react';
import { api } from '../api';
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
        <Field label={t('region')}>
          <input value={t(config?.region === 'ru' ? 'region_ru' : 'region_eu')} readOnly />
        </Field>
        <div>
          <Button disabled={name === org.name || !name.trim()} onClick={() => void save()}>
            {t('save')}
          </Button>
        </div>
      </fieldset>
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
