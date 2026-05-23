'use client';

import React from 'react';
import { useLanguage, Language } from './language-provider';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const langs: { code: Language; label: string }[] = [
    { code: 'az', label: 'AZ' },
    { code: 'en', label: 'EN' },
    { code: 'ru', label: 'RU' }
  ];

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs select-none">
      {langs.map((lang, index) => (
        <React.Fragment key={lang.code}>
          <button
            type="button"
            onClick={() => setLanguage(lang.code)}
            className={`font-semibold cursor-pointer transition-all hover:text-[var(--accent)] py-1 ${
              language === lang.code
                ? 'text-[var(--accent)] underline underline-offset-4 decoration-2'
                : 'text-[var(--muted)]'
            }`}
            title={`Switch to ${lang.code.toUpperCase()}`}
          >
            {lang.label}
          </button>
          {index < langs.length - 1 && (
            <span className="text-[var(--faint)]">·</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
