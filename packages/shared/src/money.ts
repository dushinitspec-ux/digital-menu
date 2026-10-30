import type { Currency, Locale } from './types';

const SYMBOLS: Record<Currency, string> = { RUB: '₽', EUR: '€', TRY: '₺' };

export function currencySymbol(currency: Currency): string {
  return SYMBOLS[currency];
}

const INTL_LOCALES: Record<Locale, string> = { ru: 'ru-RU', en: 'en-IE', tr: 'tr-TR' };

function intlLocale(locale: Locale): string {
  return INTL_LOCALES[locale] ?? 'en-IE';
}

/** Евро в английском меню пишется перед суммой (€4.50), остальные валюты — после (350 ₽, 185 ₺). */
export function currencyBeforeAmount(currency: Currency, locale: Locale): boolean {
  return currency === 'EUR' && locale === 'en';
}

/** Сумма без символа валюты: 35000 → «350», 450 → «4.50» (или «4,50» для ru и tr), 125000 в tr → «1.250». */
export function formatAmount(minor: number, locale: Locale): string {
  const hasFraction = minor % 100 !== 0;
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(minor / 100);
}

export function formatPrice(minor: number, currency: Currency, locale: Locale): string {
  const amount = formatAmount(minor, locale);
  const sym = SYMBOLS[currency];
  return currencyBeforeAmount(currency, locale) ? `${sym}${amount}` : `${amount} ${sym}`;
}

/** Разбор цены, введённой человеком: «350», «4,5», «4.50», «1 200», «185 TL». Возвращает минимальные единицы или null. */
export function parsePrice(input: string): number | null {
  const normalized = input.replace(/[\s ₽€₺]|TL$/gi, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}
