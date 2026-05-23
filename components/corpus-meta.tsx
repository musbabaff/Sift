'use client';

import { useLanguage } from './language-provider';

export function CorpusMeta() {
  const { t } = useLanguage();
  return (
    <span className="corpus-meta">
      <span className="dot live" />
      {t('header_docs_meta')}
    </span>
  );
}
