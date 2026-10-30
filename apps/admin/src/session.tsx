import { roleAtLeast } from './roles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, type Me, type OrgSummary, type PublicConfig } from './api';
import { LocaleContext } from './i18n';
import type { Locale } from '@dm/shared';

interface Session {
  me: Me | null;
  config: PublicConfig | null;
  loading: boolean;
  org: OrgSummary | null;
  setOrgId: (id: string) => void;
  refresh: () => Promise<unknown>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);
const ORG_KEY = 'dm.admin.org';
const LOCALE_KEY = 'dm.admin.locale';

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const config = useQuery({ queryKey: ['config'], queryFn: () => api.get<PublicConfig>('/config'), staleTime: Infinity });
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api.get<Me>('/auth/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 60_000,
  });
  const [orgId, setOrgIdState] = useState<string | null>(() => localStorage.getItem(ORG_KEY));
  const [locale, setLocaleState] = useState<Locale | null>(() => localStorage.getItem(LOCALE_KEY) as Locale | null);

  const org = useMemo(() => {
    const orgs = me.data?.orgs ?? [];
    return orgs.find((o) => o.id === orgId) ?? orgs[0] ?? null;
  }, [me.data, orgId]);

  const effectiveLocale: Locale = locale ?? me.data?.user.locale ?? config.data?.locale ?? (navigator.language.startsWith('ru') ? 'ru' : 'en');

  useEffect(() => {
    document.documentElement.lang = effectiveLocale;
  }, [effectiveLocale]);

  const session: Session = {
    me: me.data ?? null,
    config: config.data ?? null,
    loading: me.isLoading || config.isLoading,
    org,
    setOrgId: (id) => {
      localStorage.setItem(ORG_KEY, id);
      setOrgIdState(id);
    },
    refresh: () => qc.invalidateQueries({ queryKey: ['me'] }),
    logout: async () => {
      await api.post('/auth/logout');
      qc.clear();
      await qc.invalidateQueries();
    },
  };

  return (
    <LocaleContext.Provider
      value={{
        locale: effectiveLocale,
        setLocale: (l) => {
          localStorage.setItem(LOCALE_KEY, l);
          setLocaleState(l);
        },
      }}
    >
      <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
    </LocaleContext.Provider>
  );
}

export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error('SessionProvider missing');
  return s;
}

/** Текущая организация и права. Вызывается только внутри защищённых страниц. */
export function useOrg() {
  const { org } = useSession();
  if (!org) throw new Error('No organisation');
  return {
    org,
    base: `/orgs/${org.id}`,
    canEdit: roleAtLeast(org.role, 'editor'),
    canAdmin: roleAtLeast(org.role, 'admin'),
  };
}
