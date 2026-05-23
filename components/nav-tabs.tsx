'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from './language-provider';

export function NavTabs() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="nav-tabs">
      <Link href="/" className={`nav-tab ${pathname === '/' ? 'is-active' : ''}`}>
        {t('nav_search')}
      </Link>
      <Link href="/insights" className={`nav-tab ${pathname === '/insights' ? 'is-active' : ''}`}>
        {t('nav_insights')}
      </Link>
      <Link href="/bot" className={`nav-tab ${pathname === '/bot' ? 'is-active' : ''}`}>
        {t('nav_bot')}
      </Link>
    </nav>
  );
}
