import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { OfflineQueue, isNetworkError } from './offline'
import { useAuth } from './auth'

// Tables whose inserts may be queued while offline.
const QUEUEABLE = new Set(['weigh_ins', 'training_sessions', 'sparring_rounds'])

const memoryStore = new Map<string, string>()
const kv = {
  getItem: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return memoryStore.get(k) ?? null
    }
  },
  setItem: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      memoryStore.set(k, v)
    }
  },
}

export const queue = new OfflineQueue(kv, async (table, row) => {
  const { error } = await supabase.from(table).upsert(row, { onConflict: 'id', ignoreDuplicates: true })
  return { error }
})

// Every mutation bumps this so all mounted lists refetch.
const changeListeners = new Set<(table: string) => void>()
export function notifyChange(table: string) {
  changeListeners.forEach((l) => l(table))
}

let flushTimer: number | undefined
export function startSync() {
  const run = async () => {
    if (!navigator.onLine || !queue.items().length) return
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user.id
    if (!userId) return
    const tables = new Set(queue.items().map((q) => q.table))
    const { sent } = await queue.flush(userId)
    if (sent) tables.forEach(notifyChange)
  }
  window.addEventListener('online', run)
  window.clearInterval(flushTimer)
  flushTimer = window.setInterval(run, 30_000)
  void run()
}

export function usePendingCount(): number {
  const userId = useAuth().session?.user.id
  return useSyncExternalStore(
    (cb) => queue.subscribe(cb),
    () => queue.items().filter((q) => q.row.user_id === userId).length,
  )
}

export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Not signed in')
  return id
}

export type Pending<T> = T & { _pending?: boolean }

interface ListOpts {
  order?: string
  ascending?: boolean
  limit?: number
  since?: { column: string; value: string }
}

// Fetches the signed-in user's rows (RLS scopes them) and caches the last
// result locally so lists still render offline.
export function useRows<T extends { id: string }>(table: string, opts: ListOpts = {}) {
  const { order = 'created_at', ascending = false, limit, since } = opts
  const userId = useAuth().session?.user.id
  const cacheKey = `cb:cache:${table}:${order}:${ascending}:${limit ?? ''}:${since?.column ?? ''}:${since?.value ?? ''}`
  const [rows, setRows] = useState<T[]>(() => {
    try {
      return JSON.parse(kv.getItem(cacheKey) ?? '[]') as T[]
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    let q = supabase.from(table).select('*').order(order, { ascending })
    if (since) q = q.gte(since.column, since.value)
    if (limit) q = q.limit(limit)
    const { data, error } = await q
    if (error) {
      if (!isNetworkError(error)) setError(error.message)
    } else {
      setError(null)
      setRows(data as T[])
      kv.setItem(cacheKey, JSON.stringify(data))
    }
    setLoading(false)
  }, [table, order, ascending, limit, since?.column, since?.value, cacheKey])

  useEffect(() => {
    void load()
    const onChange = (t: string) => t === table && void load()
    changeListeners.add(onChange)
    return () => {
      changeListeners.delete(onChange)
    }
  }, [load, table])

  // Merge rows still waiting in the offline queue.
  useSyncExternalStore(
    (cb) => queue.subscribe(cb),
    () => queue.items().length,
  )
  const pending = QUEUEABLE.has(table) ? (queue.pending(table, userId) as Pending<T>[]) : []
  const ids = new Set(rows.map((r) => r.id))
  const merged = [...pending.filter((p) => !ids.has(p.id)), ...rows] as Pending<T>[]

  return { rows: merged, loading, error, reload: load }
}

// Inserts a row. For queueable tables, falls back to the offline queue when
// the network is unavailable. Returns the row (with its client-side id).
export async function insertRow<T extends Record<string, unknown>>(table: string, row: T): Promise<T & { id: string; user_id: string }> {
  const full = { id: crypto.randomUUID(), user_id: await currentUserId(), ...row }
  if (QUEUEABLE.has(table) && !navigator.onLine) {
    queue.enqueue(table, full)
    return full
  }
  const { error } = await supabase.from(table).insert(full)
  if (error) {
    if (QUEUEABLE.has(table) && isNetworkError(error)) {
      queue.enqueue(table, full)
      return full
    }
    throw new Error(error.message)
  }
  notifyChange(table)
  return full
}

export async function updateRow(table: string, id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from(table).update(patch).eq('id', id)
  if (error) throw new Error(error.message)
  notifyChange(table)
}

export async function deleteRow(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw new Error(error.message)
  notifyChange(table)
}

// For one-row-per-user tables (profiles, mk_progress): fetch or create.
export function useSingleton<T extends { id: string }>(table: string, defaults: Record<string, unknown> = {}) {
  const cacheKey = `cb:cache:${table}:single`
  const [row, setRow] = useState<T | null>(() => {
    try {
      return JSON.parse(kv.getItem(cacheKey) ?? 'null') as T | null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)
  const defaultsJson = JSON.stringify(defaults)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from(table).select('*').maybeSingle()
    if (!error) {
      let r = data as T | null
      if (!r) {
        const created = await supabase
          .from(table)
          .insert({ user_id: await currentUserId(), ...JSON.parse(defaultsJson) })
          .select()
          .single()
        r = (created.data as T | null) ?? null
      }
      setRow(r)
      kv.setItem(cacheKey, JSON.stringify(r))
    }
    setLoading(false)
  }, [table, cacheKey, defaultsJson])

  useEffect(() => {
    void load()
    const onChange = (t: string) => t === table && void load()
    changeListeners.add(onChange)
    return () => {
      changeListeners.delete(onChange)
    }
  }, [load, table])

  const save = useCallback(
    async (patch: Partial<T>) => {
      if (!row) return
      const id = row.id
      setRow({ ...row, ...patch })
      await updateRow(table, id, patch as Record<string, unknown>)
    },
    [row, table],
  )

  return { row, loading, save, reload: load }
}
