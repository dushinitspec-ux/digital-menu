import type { Currency, Locale } from './types';

const SYMBOLS: Record<Currency, string> = { RUB: '₽', EUR: '€' };

export function currencySymbol(currency: Currency): string {
  return SYMBOLS[currency];
}

function intlLocale(locale: Locale): string {
  return locale === 'ru' ? 'ru-RU' : 'en-IE';
}

/** Сумма без символа валюты: 35000 → «350», 450 → «4.50» (или «4,50» для ru). */
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
  return currency === 'RUB' ? `${amount} ₽` : locale === 'ru' ? `${amount} €` : `€${amount}`;
}

/** Разбор цены, введённой человеком: «350», «4,5», «4.50», «1 200». Возвращает минимальные единицы или null. */
export function parsePrice(input: string): number | null {
  const normalized = input.replace(/[\s ₽€]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}
