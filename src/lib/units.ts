import type { Units } from './types'

// Weights are stored in pounds; convert only for display and input.
export const LB_PER_KG = 2.2046226218

export function toDisplay(lb: number, units: Units): number {
  return units === 'kg' ? lb / LB_PER_KG : lb
}

export function fromInput(value: number, units: Units): number {
  return units === 'kg' ? value * LB_PER_KG : value
}

export function fmtWeight(lb: number | null | undefined, units: Units, withUnit = true): string {
  if (lb == null || Number.isNaN(lb)) return '—'
  const v = toDisplay(lb, units).toFixed(1)
  return withUnit ? `${v} ${units}` : v
}

export function cmToFtIn(cm: number): string {
  const inches = Math.round(cm / 2.54)
  return `${Math.floor(inches / 12)}'${inches % 12}"`
}
