// Language selection and translation. German is the source language of the text;
// English strings live in i18n/en.json keyed by the German source.
import EN from './i18n/en.json';

const dict = EN as Record<string, string>;

export type Lang = 'en' | 'de';

export const LANG: Lang = (() => {
  // Node (headless tests) has no localStorage: keep the German source text there.
  if (typeof localStorage === 'undefined') return 'de';
  try {
    const v = localStorage.getItem('sfe-lang');
    return v === 'de' ? 'de' : 'en';
  } catch {
    return 'en';
  }
})();

export function TR(source: string): string {
  if (LANG !== 'en') return source;
  const t = dict[source];
  return t != null ? t : source;
}

export const LOCALE = LANG === 'en' ? 'en-GB' : 'de-DE';
