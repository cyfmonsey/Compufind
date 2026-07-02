/**
 * Questionnaire inputs and spec-target output types for the
 * Phase 1 rules engine. This module has no external dependencies so it
 * can later move to a shared package used by both frontend and backend.
 */

export type UseCase =
  | 'basic-office' // Basic / office / QuickBooks
  | 'graphics' // Photoshop / Adobe Creative Suite
  | 'cad' // Revit / CAD / 3D modeling
  | 'programming' // Programming / development
  | 'portable' // Light & portable / 2-in-1

export type TabHabit = 'light' | 'moderate' | 'heavy'

export type ProgrammingStack = 'web-light' | 'ml-docker-vm' | 'mobile-native'

export type PortabilityPriority = 'not-important' | 'somewhat' | 'very'

export interface QuestionnaireAnswers {
  /** Maximum budget in USD. */
  maxBudget: number
  /** One or more primary use cases. */
  useCases: UseCase[]
  /** Browser tab habit — only meaningful when 'basic-office' is selected. */
  tabHabit?: TabHabit
  /**
   * Whether the user keeps several heavy apps open alongside the browser
   * (the "basic + heavy multitasking" row of the rules table).
   * Only meaningful when 'basic-office' is selected.
   */
  heavyMultitasking?: boolean
  /** Programming stack — only meaningful when 'programming' is selected. */
  programmingStack?: ProgrammingStack
  /** How much battery life & weight matter relative to raw power. */
  portability: PortabilityPriority
}

/** CPU tiers ordered from least to most powerful. */
export type CpuTier = 'efficiency' | 'mid' | 'mid-high' | 'high'

/** GPU tiers ordered from least to most powerful. */
export type GpuTier =
  | 'integrated'
  | 'dedicated-entry' // RTX 3050/4050 class or equivalent
  | 'dedicated-mid' // higher-VRAM dedicated (CAD/3D workloads)

export type FormFactor = 'any' | 'thin-and-light' | 'convertible'

export interface SpecTarget {
  /** Minimum RAM in GB. */
  ramGB: number
  /** RAM to prefer when budget allows (>= ramGB). */
  ramRecommendedGB: number
  cpuTier: CpuTier
  gpu: GpuTier
  /**
   * True when a dedicated GPU helps but is not required
   * (e.g. ML/Docker workloads). Ranking may boost dedicated-GPU
   * machines without excluding integrated ones.
   */
  gpuPreferredNotRequired: boolean
  /** Minimum storage in GB. */
  storageGB: number
  /** Storage to prefer when budget allows (>= storageGB). */
  storageRecommendedGB: number
  formFactor: FormFactor
  /** True when battery life & weight should outrank raw performance. */
  prioritizePortability: boolean
  /** Human-readable guidance derived from the answers. */
  notes: string[]
}

export interface SpecRecommendation {
  spec: SpecTarget
  maxBudget: number
  /**
   * Warnings about the answers themselves — e.g. a budget that is
   * unrealistically low for the derived spec.
   */
  warnings: string[]
}
