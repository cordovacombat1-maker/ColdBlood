export type Units = 'lb' | 'kg'

interface Row {
  id: string
  user_id: string
  created_at?: string
  updated_at?: string
}

export interface Profile extends Row {
  fighter_name: string | null
  nickname: string | null
  weight_class: string | null
  stance: 'orthodox' | 'southpaw' | 'switch' | null
  height_cm: number | null
  reach_cm: number | null
  gym: string | null
  record_w: number
  record_l: number
  record_d: number
  record_ko: number
  units: Units
  walk_around_target: number | null
}

export type FightStatus = 'upcoming' | 'won' | 'lost' | 'draw' | 'NC'
export interface Fight extends Row {
  date: string
  opponent: string | null
  venue: string | null
  city: string | null
  commission: string | null
  weigh_in_at: string | null
  contract_weight: number | null
  rounds: number | null
  purse: number | null
  status: FightStatus
  method: string | null
  round_ended: number | null
  notes: string | null
  checklist: Record<string, boolean>
}

export const EVENT_TYPES = ['training', 'sparring', 'weigh-in', 'medical', 'media', 'travel', 'other'] as const
export type EventType = (typeof EVENT_TYPES)[number]
export interface Repeat {
  freq: 'daily' | 'weekly'
  days?: number[] // 0 = Sunday, for weekly
  until?: string | null // yyyy-mm-dd inclusive
}
export interface CalEvent extends Row {
  title: string
  type: EventType
  start_at: string
  end_at: string | null
  location: string | null
  camp_id: string | null
  reminder_min: number | null
  repeat: Repeat | null
}

export const SESSION_TYPES = ['roadwork', 'bag', 'pads', 'mitts', 'sparring', 'S&C', 'technique', 'recovery'] as const
export type SessionType = (typeof SESSION_TYPES)[number]
export interface TrainingSession extends Row {
  date: string
  type: SessionType
  duration_min: number | null
  rounds: number | null
  rpe_1_10: number | null
  notes: string | null
  video_url: string | null
}

export interface SparringRound extends Row {
  session_id: string
  partner: string | null
  rounds: number | null
  what_worked: string | null
  what_didnt: string | null
  damage_taken: 'none' | 'light' | 'moderate' | 'heavy' | null
}

export const WEIGH_TIMES = ['morning', 'midday', 'evening', 'post-training', 'official'] as const
export interface WeighIn extends Row {
  taken_at: string
  weight: number // lb
  time_of_day: (typeof WEIGH_TIMES)[number] | null
  notes: string | null
}

export const CONTACT_ROLES = [
  'trainer', 'manager', 'promoter', 'cutman', 'matchmaker', 'commission',
  'sparring', 'physio', 'nutritionist', 'media', 'other',
] as const
export type ContactRole = (typeof CONTACT_ROLES)[number]
export interface Contact extends Row {
  name: string
  role: ContactRole
  phone: string | null
  email: string | null
  company: string | null
  city: string | null
  notes: string | null
  favorite: boolean
}

export interface FightContact extends Row {
  fight_id: string
  contact_id: string
  role: string | null
}

export interface MkProgress extends Row {
  current_part: number
  part_started_at: string
  notes: Record<string, string>
  checks: Record<string, boolean[]>
}

export interface Affirmation extends Row {
  text: string
  active: boolean
  order: number
}

export interface JournalEntry extends Row {
  date: string
  gratitude: string | null
  intention: string | null
  reflection: string | null
}

export interface MindSession extends Row {
  date: string
  type: 'meditation' | 'visualization' | 'MK exercise'
  duration_min: number | null
  routine_id: string | null
  mk_part: number | null
}
