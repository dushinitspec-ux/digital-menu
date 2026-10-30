import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useT } from '../i18n';
import { useOrg } from '../session';
import { PageHead, Spinner } from '../ui';

interface Entry {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
  userName: string | null;
}

export function AuditPage() {
  const t = useT();
  const { base, org } = useOrg();
  const log = useQuery({ queryKey: ['audit', org.id], queryFn: () => api.get<Entry[]>(`${base}/audit`) });
  if (log.isLoading) return <Spinner />;
  const fmt = new Intl.DateTimeFormat(org.locale, { dateStyle: 'short', timeStyle: 'short' });
  return (
    <div className="page">
      <PageHead title={t('audit')} />
      <div className="card">
        <table className="table">
          <tbody>
            {log.data?.map((e) => (
              <tr key={e.id}>
                <td className="muted small nowrap">{fmt.format(new Date(e.createdAt))}</td>
                <td>{e.userName ?? '—'}</td>
                <td>
                  <code>
                    {e.action} {e.entity}
                  </code>{' '}
                  <span className="muted small">{typeof e.details.name === 'string' ? e.details.name : ''}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
