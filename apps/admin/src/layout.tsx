import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useT } from './i18n';
import { useOrg, useSession } from './session';

const ICONS: Record<string, string> = {
  menu: 'M4 6h16M4 12h16M4 18h10',
  scenes: 'M4 5h16v10H4zM8 19h8',
  screens: 'M3 5h18v12H3zM9 21h6M12 17v4',
  media: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
};

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

export function AppShell() {
  const t = useT();
  const { me, config, setOrgId, logout } = useSession();
  const { org, canAdmin } = useOrg();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const main = [
    { to: '/menu', label: t('nav_menu'), icon: 'menu' },
    { to: '/scenes', label: t('nav_scenes'), icon: 'scenes' },
    { to: '/screens', label: t('nav_screens'), icon: 'screens' },
    { to: '/media', label: t('nav_media'), icon: 'media' },
  ];
  const more = [
    { to: '/locations', label: t('nav_locations') },
    ...(canAdmin ? [{ to: '/team', label: t('nav_team') }, { to: '/audit', label: t('nav_audit') }] : []),
    { to: '/settings', label: t('nav_settings') },
  ];

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" />
          <div>
            <div className="brand-name">{config?.brandName}</div>
            <div className="brand-sub">{t('appTagline')}</div>
          </div>
        </div>
        {me && me.orgs.length > 1 ? (
          <select className="org-switch" value={org.id} onChange={(e) => setOrgId(e.target.value)}>
            {me.orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="org-name">{org.name}</div>
        )}
        <nav className="side-nav">
          {main.map((l) => (
            <NavLink key={l.to} to={l.to} className="side-link">
              <Icon name={l.icon} />
              {l.label}
            </NavLink>
          ))}
          <div className="side-sep" />
          {more.map((l) => (
            <NavLink key={l.to} to={l.to} className="side-link side-link-sm">
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <div className="muted small">{me?.user.email}</div>
          <button type="button" className="link-btn" onClick={onLogout}>
            {t('logout')}
          </button>
        </div>
      </aside>

      <header className="topbar">
        <span className="brand-mark" />
        <span className="topbar-title">{org.name}</span>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <nav className="tabbar">
        {main.map((l) => (
          <NavLink key={l.to} to={l.to} className="tab" onClick={() => setMoreOpen(false)}>
            <Icon name={l.icon} />
            <span>{l.label}</span>
          </NavLink>
        ))}
        <button type="button" className={`tab${moreOpen ? ' active' : ''}`} onClick={() => setMoreOpen((v) => !v)}>
          <Icon name="more" />
          <span>{t('nav_more')}</span>
        </button>
      </nav>
      {moreOpen ? (
        <div className="more-menu" onClick={() => setMoreOpen(false)}>
          {more.map((l) => (
            <NavLink key={l.to} to={l.to} className="more-link">
              {l.label}
            </NavLink>
          ))}
          <button type="button" className="more-link danger" onClick={onLogout}>
            {t('logout')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
