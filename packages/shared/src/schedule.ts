import type { ScreenSchedule } from './types';

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** День недели (1 — пн … 7 — вс) и минуты от полуночи в часовом поясе точки. */
export function localTimeParts(date: Date, timeZone: string): { weekday: number; minutes: number } {
  const parts = formatterFor(timeZone).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = WEEKDAYS[get('weekday')] ?? 1;
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  return { weekday, minutes: hour * 60 + minute };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidHM(value: string): boolean {
  return HM.test(value);
}

export function parseHM(value: string): number {
  const m = HM.exec(value);
  if (!m) throw new Error(`Invalid time "${value}", expected HH:MM`);
  return Number(m[1]) * 60 + Number(m[2]);
}

const prevDay = (weekday: number) => (weekday === 1 ? 7 : weekday - 1);

/**
 * Какая сцена должна быть на экране в момент `date`.
 * Правила проверяются по порядку, побеждает первое подходящее. Интервал с start > end — ночной
 * (например, 20:00–02:00), его хвост после полуночи относится к дню начала. start === end — весь день.
 */
export function resolveSceneId(schedule: ScreenSchedule, date: Date, timeZone: string): string | null {
  const { weekday, minutes } = localTimeParts(date, timeZone);
  for (const rule of schedule.rules) {
    const start = parseHM(rule.start);
    const end = parseHM(rule.end);
    let match: boolean;
    if (start === end) {
      match = rule.days.includes(weekday);
    } else if (start < end) {
      match = rule.days.includes(weekday) && minutes >= start && minutes < end;
    } else {
      match = (rule.days.includes(weekday) && minutes >= start) || (rule.days.includes(prevDay(weekday)) && minutes < end);
    }
    if (match) return rule.sceneId;
  }
  return schedule.defaultSceneId;
}
