import type { PlayerEvent } from '@dm/shared';
import type { Db } from './db';

const CHANNEL = 'dm_events';

interface Message {
  orgId: string;
  screenIds?: string[];
  event: PlayerEvent;
}

export interface RealtimeClient {
  orgId: string;
  screenId: string;
  send(event: PlayerEvent): void;
}

/** Разовое «меню изменилось» без экземпляра Realtime — для CLI-скриптов вроде импорта меню. */
export async function notifyOrgChanged(sql: Db, orgId: string) {
  const message: Message = { orgId, event: { type: 'manifest' } };
  await sql.notify(CHANNEL, JSON.stringify(message));
}

/**
 * Доставка событий экранам. Публикация идёт через PostgreSQL NOTIFY, поэтому работает при нескольких
 * экземплярах API; каждый экземпляр держит SSE-соединения своих экранов и рассылает им событие.
 */
export class Realtime {
  private readonly byOrg = new Map<string, Set<RealtimeClient>>();
  private readonly pending = new Map<string, NodeJS.Timeout>();
  private unlisten: (() => Promise<void>) | null = null;

  constructor(
    private readonly sql: Db,
    private readonly debounceMs = 200,
  ) {}

  async start() {
    const { unlisten } = await this.sql.listen(CHANNEL, (payload) => {
      try {
        this.dispatch(JSON.parse(payload) as Message);
      } catch {
        // повреждённое сообщение игнорируем
      }
    });
    this.unlisten = unlisten;
  }

  async stop() {
    for (const timer of this.pending.values()) clearTimeout(timer);
    this.pending.clear();
    await this.unlisten?.();
  }

  add(client: RealtimeClient) {
    let set = this.byOrg.get(client.orgId);
    if (!set) this.byOrg.set(client.orgId, (set = new Set()));
    set.add(client);
  }

  remove(client: RealtimeClient) {
    const set = this.byOrg.get(client.orgId);
    set?.delete(client);
    if (set?.size === 0) this.byOrg.delete(client.orgId);
  }

  /** Что-то в меню, сценах или экранах организации изменилось — экраны перечитают манифест. Серия правок склеивается. */
  orgChanged(orgId: string) {
    if (this.pending.has(orgId)) return;
    this.pending.set(
      orgId,
      setTimeout(() => {
        this.pending.delete(orgId);
        void this.publish({ orgId, event: { type: 'manifest' } });
      }, this.debounceMs),
    );
  }

  screenEvent(orgId: string, screenId: string, event: PlayerEvent) {
    return this.publish({ orgId, screenIds: [screenId], event });
  }

  isConnected(orgId: string, screenId: string) {
    for (const c of this.byOrg.get(orgId) ?? []) if (c.screenId === screenId) return true;
    return false;
  }

  private async publish(message: Message) {
    await this.sql.notify(CHANNEL, JSON.stringify(message));
  }

  private dispatch(message: Message) {
    for (const client of this.byOrg.get(message.orgId) ?? []) {
      if (!message.screenIds || message.screenIds.includes(client.screenId)) client.send(message.event);
    }
  }
}
