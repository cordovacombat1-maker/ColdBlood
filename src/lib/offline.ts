// Offline-first logging: inserts for queueable tables are written to a local
// queue when the network is down, then replayed (idempotently, by client id)
// when the connection returns.

export interface QueuedInsert {
  table: string
  row: Record<string, unknown> & { id: string }
  queuedAt: string
}

export interface KV {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
}

export type Sender = (table: string, row: Record<string, unknown>) => Promise<{ error: { message: string; code?: string } | null }>

const KEY = 'cb:queue:v1'

export function isNetworkError(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err) return false
  if (err.code) return false // Postgres / PostgREST errors carry a code
  return /fetch|network|load failed|timeout/i.test(err.message ?? '')
}

export class OfflineQueue {
  private listeners = new Set<() => void>()
  private flushing = false

  constructor(private store: KV, private send: Sender) {}

  items(): QueuedInsert[] {
    try {
      return JSON.parse(this.store.getItem(KEY) ?? '[]') as QueuedInsert[]
    } catch {
      return []
    }
  }

  pending(table: string, userId: string | undefined): Record<string, unknown>[] {
    return this.items()
      .filter((q) => q.table === table && q.row.user_id === userId)
      .map((q) => ({ ...q.row, _pending: true }))
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private save(items: QueuedInsert[]) {
    this.store.setItem(KEY, JSON.stringify(items))
    this.listeners.forEach((l) => l())
  }

  enqueue(table: string, row: QueuedInsert['row']) {
    this.save([...this.items(), { table, row, queuedAt: new Date().toISOString() }])
  }

  // Sends the given user's queued rows oldest first. Stops at the first
  // network failure; drops rows the server rejects outright so one bad row
  // can't block the queue.
  async flush(userId: string): Promise<{ sent: number; dropped: number }> {
    if (this.flushing) return { sent: 0, dropped: 0 }
    this.flushing = true
    let sent = 0
    let dropped = 0
    try {
      for (const item of this.items()) {
        if (item.row.user_id !== userId) continue
        const { error } = await this.send(item.table, item.row)
        if (error && isNetworkError(error)) break
        if (error) {
          dropped++
          console.warn('Dropping queued row rejected by server', item, error)
        } else sent++
        this.save(this.items().filter((q) => q.row.id !== item.row.id))
      }
    } finally {
      this.flushing = false
    }
    return { sent, dropped }
  }
}
