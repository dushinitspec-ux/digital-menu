import { describe, expect, it } from 'vitest';
import { formatAmount, formatPrice, parsePrice } from './money';
import { regionForCountry } from './regions';
import { localTimeParts, resolveSceneId } from './schedule';
import { claimScreenInput, itemInput, registerInput } from './schemas';
import type { ScreenSchedule } from './types';

// 2026-11-02 — понедельник.
const at = (iso: string) => new Date(iso);

const schedule: ScreenSchedule = {
  defaultSceneId: 'day',
  rules: [
    { id: 'b', days: [1, 2, 3, 4, 5], start: '07:00', end: '11:00', sceneId: 'breakfast' },
    { id: 'n', days: [5, 6], start: '20:00', end: '03:00', sceneId: 'night' },
    { id: 's', days: [7], start: '00:00', end: '00:00', sceneId: 'sunday' },
  ],
};

describe('schedule', () => {
  it('reads local weekday and time in the location time zone', () => {
    // 05:30 UTC = 08:30 в Москве, понедельник.
    expect(localTimeParts(at('2026-11-02T05:30:00Z'), 'Europe/Moscow')).toEqual({ weekday: 1, minutes: 8 * 60 + 30 });
  });

  it('picks breakfast on a weekday morning and default after it ends', () => {
    expect(resolveSceneId(schedule, at('2026-11-02T05:30:00Z'), 'Europe/Moscow')).toBe('breakfast');
    expect(resolveSceneId(schedule, at('2026-11-02T08:00:00Z'), 'Europe/Moscow')).toBe('day');
  });

  it('end time is exclusive', () => {
    expect(resolveSceneId(schedule, at('2026-11-02T08:00:00Z'), 'Europe/Moscow')).toBe('day'); // ровно 11:00
  });

  it('handles overnight rules including the tail after midnight', () => {
    // пятница 06.11, 22:00 Берлин (UTC+1) = 21:00 UTC
    expect(resolveSceneId(schedule, at('2026-11-06T21:00:00Z'), 'Europe/Berlin')).toBe('night');
    // суббота 07.11, 02:00 Берлин — хвост пятничной ночи
    expect(resolveSceneId(schedule, at('2026-11-07T01:00:00Z'), 'Europe/Berlin')).toBe('night');
    // четверг 05.11, 02:00 — в среду ночного правила нет
    expect(resolveSceneId(schedule, at('2026-11-05T01:00:00Z'), 'Europe/Berlin')).toBe('day');
  });

  it('start === end means the whole day', () => {
    expect(resolveSceneId(schedule, at('2026-11-08T12:00:00Z'), 'Europe/Moscow')).toBe('sunday');
  });

  it('first matching rule wins', () => {
    // Воскресенье 08.11, 01:00 Берлин: подходит и хвост субботней ночи, и «весь день воскресенья».
    expect(resolveSceneId(schedule, at('2026-11-08T00:00:00Z'), 'Europe/Berlin')).toBe('night');
  });
});

describe('money', () => {
  it('formats amounts per locale', () => {
    expect(formatAmount(35000, 'ru')).toBe('350');
    expect(formatAmount(450, 'en')).toBe('4.50');
    expect(formatAmount(450, 'ru')).toBe('4,50');
    expect(formatPrice(120000, 'RUB', 'ru')).toBe('1 200 ₽');
    expect(formatPrice(450, 'EUR', 'en')).toBe('€4.50');
  });

  it('parses human input', () => {
    expect(parsePrice('350')).toBe(35000);
    expect(parsePrice('4,5')).toBe(450);
    expect(parsePrice('1 200 ₽')).toBe(120000);
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('1.234')).toBeNull();
  });
});

describe('regions and schemas', () => {
  it('routes countries to contours', () => {
    expect(regionForCountry('ru')).toBe('ru');
    expect(regionForCountry('DE')).toBe('eu');
  });

  it('normalises register input', () => {
    const parsed = registerInput.parse({
      email: '  Owner@Cafe.RU ',
      password: 'secret123',
      name: 'Анна',
      orgName: 'Кофейня',
      businessType: 'coffee',
      locale: 'ru',
      country: 'ru',
      timezone: 'Europe/Moscow',
    });
    expect(parsed.email).toBe('owner@cafe.ru');
    expect(parsed.country).toBe('RU');
    expect(() => registerInput.parse({ ...parsed, timezone: 'Mars/Olympus' })).toThrow();
  });

  it('applies item defaults and normalises pairing codes', () => {
    const item = itemInput.parse({ categoryId: '0b9f6a1e-6d4a-4c43-9d55-2f1f2b9d7a10', name: 'Флэт уайт' });
    expect(item).toMatchObject({ price: null, variants: [], soldOut: false, hidden: false });
    expect(
      claimScreenInput.parse({ code: '483 921', locationId: '0b9f6a1e-6d4a-4c43-9d55-2f1f2b9d7a10', name: 'ТВ 1' }).code,
    ).toBe('483921');
  });
});
