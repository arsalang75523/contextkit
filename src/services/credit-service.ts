import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";
import { createId } from "@/utils/id";

export type CreditEvent = {
  id: string;
  ownerId: string;
  type: "grant" | "debit" | "refund";
  amountUsd: number;
  balanceAfterUsd: number;
  route?: string;
  requestId?: string;
  apiKeyId?: string;
  note?: string;
  createdAt: string;
};

export class CreditService {
  private readonly kv: AppKV;

  constructor(env: AppBindings["Bindings"] = {}) {
    this.kv = new AppKV(env.CONTEXTKIT_KV);
  }

  async balance(ownerId: string) {
    return Number(((await this.kv.get<number>(balanceKey(ownerId))) ?? 0).toFixed(6));
  }

  async summary(ownerId: string) {
    return {
      ownerId,
      balanceUsd: await this.balance(ownerId),
      events: await this.events(ownerId)
    };
  }

  async grant(input: { ownerId: string; amountUsd: number; note?: string }) {
    const amountUsd = normalizeAmount(input.amountUsd);
    if (amountUsd <= 0) throw new Error("invalid_credit_amount");
    const next = Number(((await this.balance(input.ownerId)) + amountUsd).toFixed(6));
    await this.kv.set(balanceKey(input.ownerId), next);
    return this.recordEvent({
      ownerId: input.ownerId,
      type: "grant",
      amountUsd,
      balanceAfterUsd: next,
      note: input.note
    });
  }

  async canDebit(ownerId: string, amountUsd: number) {
    return (await this.balance(ownerId)) >= normalizeAmount(amountUsd);
  }

  async debit(input: { ownerId: string; amountUsd: number; route: string; requestId: string; apiKeyId?: string }) {
    const amountUsd = normalizeAmount(input.amountUsd);
    const current = await this.balance(input.ownerId);
    if (current < amountUsd) throw new Error("insufficient_credits");
    const next = Number((current - amountUsd).toFixed(6));
    await this.kv.set(balanceKey(input.ownerId), next);
    return this.recordEvent({
      ownerId: input.ownerId,
      type: "debit",
      amountUsd: -amountUsd,
      balanceAfterUsd: next,
      route: input.route,
      requestId: input.requestId,
      apiKeyId: input.apiKeyId
    });
  }

  async events(ownerId: string) {
    const index = await this.kv.getMany<{ id: string }>(`credit-event-index:${ownerId}:`);
    const events = await Promise.all(index.map((item) => this.kv.get<CreditEvent>(`credit-event:${item.id}`)));
    return events
      .filter((event): event is CreditEvent => Boolean(event))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private async recordEvent(input: Omit<CreditEvent, "id" | "createdAt">) {
    const event: CreditEvent = {
      ...input,
      id: createId("cred"),
      createdAt: new Date().toISOString()
    };
    await Promise.all([
      this.kv.set(`credit-event:${event.id}`, event),
      this.kv.set(`credit-event-index:${event.ownerId}:${event.id}`, { id: event.id })
    ]);
    return event;
  }
}

function balanceKey(ownerId: string) {
  return `credit-balance:${ownerId}`;
}

function normalizeAmount(amount: number) {
  return Number(Number(amount || 0).toFixed(6));
}
