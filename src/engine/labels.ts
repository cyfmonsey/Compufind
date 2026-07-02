/** Display labels for engine enums, kept out of the pure rules module. */

import type { CpuTier, FormFactor, GpuTier, UseCase } from './types.ts'

export const USE_CASE_LABELS: Record<UseCase, string> = {
  'basic-office': 'Basic / office / QuickBooks',
  graphics: 'Graphics / Photoshop / Adobe Creative Suite',
  cad: 'Revit / CAD / 3D modeling',
  programming: 'Programming / development',
  portable: 'Light & portable / 2-in-1',
}

export const CPU_TIER_LABELS: Record<CpuTier, string> = {
  efficiency: 'Efficiency-focused (U/P-series)',
  mid: 'Mid-range (i5 / Ryzen 5 class)',
  'mid-high': 'Upper mid-range (i7 / Ryzen 7 class)',
  high: 'High-performance multicore (i7/i9 H-series, Ryzen 7/9)',
}

export const GPU_TIER_LABELS: Record<GpuTier, string> = {
  integrated: 'Integrated graphics',
  'dedicated-entry': 'Dedicated GPU (RTX 3050/4050 class or better)',
  'dedicated-mid': 'Dedicated GPU with higher VRAM (RTX 4060+ class)',
}

export const FORM_FACTOR_LABELS: Record<FormFactor, string> = {
  any: 'Any',
  'thin-and-light': 'Thin & light',
  convertible: 'Convertible / 2-in-1',
}

export function formatStorage(gb: number): string {
  return gb >= 1024 ? `${gb / 1024}TB SSD` : `${gb}GB SSD`
}
