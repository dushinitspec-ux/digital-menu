import { currencySymbol, type Locale } from '@dm/shared';
import { useContext, useState } from 'react';
import { api } from '../api';
import { LocaleContext, useT } from '../i18n';
import { useOrg, useSession } from '../session';
import { Button, Field, PageHead, useToast } from '../ui';

const SCREEN_LOCALES: [Locale, string][] = [
  ['ru', 'Русский'],
  ['en', 'English'],
  ['tr', 'Türkçe'],
];

export function SettingsPage() {
  const t = useT();
  const { org, base, canAdmin } = useOrg();
  const { refresh, config } = useSession();
  const { locale, setLocale } = useContext(LocaleContext);
  const toast = useToast();
  const [name, setName] = useState(org.name);
  const [screenLocale, setScreenLocale] = useState<Locale>(org.locale);

  const save = async () => {
    try {
      await api.patch(base, { name, locale: screenLocale });
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
        <Field label={t('currency')}>
          <input value={`${org.currency} · ${currencySymbol(org.currency)}`} readOnly />
        </Field>
        <Field label={t('screenLanguage')} hint={t('screenLanguageHint')} group>
          <div className="seg">
            {SCREEN_LOCALES.map(([l, label]) => (
              <button type="button" key={l} className={screenLocale === l ? 'is-on' : ''} onClick={() => setScreenLocale(l)}>
                {label}
              </button>
            ))}
          </div>
        </Field>
        <div>
          <Button disabled={(name === org.name && screenLocale === org.locale) || !name.trim()} onClick={() => void save()}>
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
