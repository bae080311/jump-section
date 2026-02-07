'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { type Locale } from '@/i18n-config';

const getItems = (lang: Locale) => [
  {
    title: 'Getting Started',
    links: [
      { name: 'Introduction', href: `/${lang}/docs` },
      { name: 'Installation', href: `/${lang}/docs/installation` },
      { name: 'Quick Start', href: `/${lang}/docs/quick-start` },
      { name: 'Example', href: `/${lang}/docs/example` },
    ],
  },
  {
    title: 'API Reference',
    links: [
      { name: 'React API', href: `/${lang}/docs/react` },
      { name: 'Vue API', href: `/${lang}/docs/vue` },
      { name: 'Core API', href: `/${lang}/docs/core` },
    ],
  },
];

export function Sidebar({ lang }: { lang: Locale }) {
  const pathname = usePathname();
  const items = getItems(lang);

  return (
    <aside className="w-64 fixed left-0 top-16 bottom-0 border-r border-white/5 p-8 overflow-y-auto hidden md:block">
      <nav className="space-y-8">
        {items.map((section, i) => (
          <div key={i}>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-4 opacity-40">
              {section.title}
            </h4>
            <ul className="space-y-2">
              {section.links.map((link, j) => (
                <li key={j}>
                  <Link
                    href={link.href}
                    className={cn(
                      'text-sm transition-colors block',
                      pathname === link.href
                        ? 'text-primary font-bold'
                        : 'text-muted-foreground hover:text-white',
                    )}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
