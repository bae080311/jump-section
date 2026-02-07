'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { type Locale } from '@/i18n-config';

interface HeroProps {
  dict: {
    new_badge: string;
    title_1: string;
    title_2: string;
    description: string;
    get_started: string;
    github_repo: string;
  };
  lang: Locale;
}

export function Hero({ dict, lang }: HeroProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] -z-10 animate-pulse delay-1000" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center px-4 max-w-4xl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex flex-col items-center gap-8 mb-8"
        >
          <div className="relative w-32 h-32 md:w-40 md:h-40">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <Image
              src="/logo.png"
              alt="Jump Section Logo"
              fill
              className="object-contain drop-shadow-2xl relative z-10"
              priority
            />
          </div>
          <div className="inline-block glass px-4 py-1.5 rounded-full text-xs font-medium border-white/20">
            <span className="opacity-70">{dict.new_badge}</span>
          </div>
        </motion.div>

        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 bg-linear-to-b from-white to-white/40 bg-clip-text text-transparent">
          {dict.title_1} <br />
          {dict.title_2}
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
          {dict.description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={`/${lang}/docs`}>
            <button className="group relative h-12 px-8 rounded-full bg-primary text-primary-foreground font-semibold overflow-hidden transition-all hover:scale-105 active:scale-95">
              <div className="absolute inset-0 bg-white/20 translate-y-12 group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative flex items-center gap-2">
                {dict.get_started} <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </Link>
          <a
            href="https://github.com/bae080311/jump-section"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button className="h-12 px-8 rounded-full glass border-white/10 hover:bg-white/5 transition-all font-medium flex items-center gap-2">
              {dict.github_repo}
            </button>
          </a>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-40"
      >
        <ChevronDown className="w-6 h-6" />
      </motion.div>
    </section>
  );
}
