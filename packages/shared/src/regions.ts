import type { Currency, Locale, Region } from './types';

/**
 * Страны, клиенты из которых живут в российском контуре. Все остальные — в европейском.
 * Беларусь здесь потому, что европейские платёжные провайдеры её не обслуживают.
 * Остальные страны СНГ — бизнес-решение: при необходимости добавьте их сюда.
 */
export const RU_REGION_COUNTRIES = ['RU', 'BY'] as const;

export function regionForCountry(country: string): Region {
  return (RU_REGION_COUNTRIES as readonly string[]).includes(country.toUpperCase()) ? 'ru' : 'eu';
}

export const REGION_DEFAULTS: Record<Region, { currency: Currency; locale: Locale; timezone: string }> = {
  ru: { currency: 'RUB', locale: 'ru', timezone: 'Europe/Moscow' },
  eu: { currency: 'EUR', locale: 'en', timezone: 'Europe/Berlin' },
};
