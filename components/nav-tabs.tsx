'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="nav-tabs">
      <Link href="/" className={`nav-tab ${pathname === '/' ? 'is-active' : ''}`}>
        Search
      </Link>
      <Link href="/insights" className={`nav-tab ${pathname === '/insights' ? 'is-active' : ''}`}>
        Insights
      </Link>
      <Link href="/bot" className={`nav-tab ${pathname === '/bot' ? 'is-active' : ''}`}>
        Bot
      </Link>
    </nav>
  );
}
