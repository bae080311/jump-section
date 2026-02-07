'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Github, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { type Locale } from '@/i18n-config';

interface NavbarProps {
  dict: {
    docs: string;
    examples: string;
  };
  lang: Locale;
}

export function Navbar({ dict, lang }: NavbarProps) {
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    if (!pathname) return '/';
    const segments = pathname.split('/');
    segments[1] = newLocale;
    return segments.join('/');
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn('fixed top-0 left-0 right-0 z-50 flex justify-center p-4')}
    >
      <nav className="glass rounded-full px-6 py-2 flex items-center gap-8 max-w-4xl w-full justify-between backdrop-blur-md">
        <Link
          href={`/${lang}`}
          className="text-xl font-bold tracking-tighter text-glow flex items-center gap-2"
        >
          <Image
            src="/logo.png"
            alt="Jump Section Logo"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          jump-section
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href={`/${lang}/docs`}
            className="text-sm font-medium hover:text-primary/80 transition-colors"
          >
            {dict.docs}
          </Link>
          <Link
            href={`/${lang}/docs/example`}
            className="text-sm font-medium hover:text-primary/80 transition-colors"
          >
            {dict.examples}
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <Link
            href={switchLocale(lang === 'en' ? 'ko' : 'en')}
            className="text-sm font-medium hover:text-primary/80 transition-colors flex items-center gap-2"
          >
            <Languages className="w-4 h-4" />
            {lang === 'en' ? 'KO' : 'EN'}
          </Link>
          <a
            href="https://github.com/bae080311/jump-section"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-110 transition-transform"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </nav>
    </motion.header>
  );
}
