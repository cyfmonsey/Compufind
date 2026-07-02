/**
 * Phase 1 rules engine: converts questionnaire answers into a target
 * hardware spec. Pure functions, no I/O — the output feeds the Phase 2+
 * retailer-search layer.
 *
 * Rules follow the draft table in the build spec. When multiple use
 * cases are selected, each requirement is resolved independently and the
 * strictest value wins.
 */

import type {
  CpuTier,
  GpuTier,
  QuestionnaireAnswers,
  SpecRecommendation,
  SpecTarget,
  UseCase,
} from './types.ts'

const CPU_ORDER: CpuTier[] = ['efficiency', 'mid', 'mid-high', 'high']
const GPU_ORDER: GpuTier[] = ['integrated', 'dedicated-entry', 'dedicated-mid']

function maxCpu(a: CpuTier, b: CpuTier): CpuTier {
  return CPU_ORDER.indexOf(a) >= CPU_ORDER.indexOf(b) ? a : b
}

function maxGpu(a: GpuTier, b: GpuTier): GpuTier {
  return GPU_ORDER.indexOf(a) >= GPU_ORDER.indexOf(b) ? a : b
}

/** Partial requirement contributed by one use case / answer. */
interface Requirement {
  ramGB: number
  ramRecommendedGB?: number
  cpuTier: CpuTier
  gpu: GpuTier
  gpuPreferredNotRequired?: boolean
  storageGB: number
  storageRecommendedGB?: number
  notes?: string[]
}

function basicOfficeRequirement(answers: QuestionnaireAnswers): Requirement {
  if (answers.heavyMultitasking) {
    return {
      ramGB: 32,
      cpuTier: 'mid-high',
      gpu: 'integrated',
      storageGB: 512,
      storageRecommendedGB: 1024,
      notes: [
        'Heavy multitasking (many apps alongside the browser) pushes the RAM target to 32GB so nothing swaps to disk.',
      ],
    }
  }
  if (answers.tabHabit === 'heavy') {
    return {
      ramGB: 16,
      cpuTier: 'mid',
      gpu: 'integrated',
      storageGB: 512,
      notes: [
        '15+ browser tabs alongside office apps is the point where 8GB machines start swapping — 16GB keeps things smooth.',
      ],
    }
  }
  return {
    ramGB: 8,
    ramRecommendedGB: 16,
    cpuTier: 'mid',
    gpu: 'integrated',
    storageGB: 256,
    storageRecommendedGB: 512,
  }
}

function programmingRequirement(answers: QuestionnaireAnswers): Requirement {
  switch (answers.programmingStack) {
    case 'ml-docker-vm':
      return {
        ramGB: 32,
        cpuTier: 'high',
        gpu: 'integrated',
        gpuPreferredNotRequired: true,
        storageGB: 1024,
        notes: [
          'ML/Docker/VM workloads are RAM- and core-hungry; a dedicated GPU helps for local ML but is not strictly required.',
        ],
      }
    case 'mobile-native':
      return {
        ramGB: 16,
        ramRecommendedGB: 32,
        cpuTier: 'mid-high',
        gpu: 'integrated',
        storageGB: 512,
        storageRecommendedGB: 1024,
        notes: [
          'Mobile/native builds and emulators benefit from extra cores and 32GB RAM when the budget allows.',
        ],
      }
    case 'web-light':
    default:
      return {
        ramGB: 16,
        cpuTier: 'mid',
        gpu: 'integrated',
        storageGB: 512,
      }
  }
}

const STATIC_REQUIREMENTS: Record<
  Exclude<UseCase, 'basic-office' | 'programming'>,
  Requirement
> = {
  graphics: {
    ramGB: 16,
    ramRecommendedGB: 32,
    cpuTier: 'high',
    gpu: 'dedicated-entry',
    storageGB: 512,
    storageRecommendedGB: 1024,
    notes: [
      'Photoshop/Creative Suite wants a high-performance multicore CPU and a dedicated GPU (RTX 3050/4050 class or better).',
    ],
  },
  cad: {
    ramGB: 32,
    cpuTier: 'high',
    gpu: 'dedicated-mid',
    storageGB: 1024,
    notes: [
      'Revit/CAD regen and sync are CPU-bound — strong single-core performance matters more than gaming benchmarks suggest. Look for a dedicated GPU with higher VRAM.',
    ],
  },
  portable: {
    ramGB: 16,
    cpuTier: 'efficiency',
    gpu: 'integrated',
    storageGB: 512,
    notes: [
      'For a light & portable / 2-in-1 machine, weight and battery life matter more than peak power — efficiency-focused (U/P-series) CPUs are the right fit.',
    ],
  },
}

/**
 * Rough floor prices (USD) for a new machine meeting a spec, used only
 * to warn when the stated budget cannot realistically buy the derived
 * spec. Deliberately conservative; certified-refurbished units often
 * come in under these numbers.
 */
function estimateFloorPrice(spec: SpecTarget): number {
  let floor = 350 // 8GB / mid CPU / integrated baseline
  if (spec.ramGB >= 16) floor += 100
  if (spec.ramGB >= 32) floor += 200
  if (spec.cpuTier === 'mid-high') floor += 100
  if (spec.cpuTier === 'high') floor += 200
  if (spec.gpu === 'dedicated-entry') floor += 250
  if (spec.gpu === 'dedicated-mid') floor += 450
  if (spec.storageGB >= 1024) floor += 100
  return floor
}

function requirementsFor(answers: QuestionnaireAnswers): Requirement[] {
  return answers.useCases.map((useCase) => {
    if (useCase === 'basic-office') return basicOfficeRequirement(answers)
    if (useCase === 'programming') return programmingRequirement(answers)
    return STATIC_REQUIREMENTS[useCase]
  })
}

/**
 * Convert questionnaire answers into a spec target + budget bundle for
 * the retailer-search layer.
 *
 * @throws Error if no use case is selected or the budget is not positive.
 */
export function recommendSpec(answers: QuestionnaireAnswers): SpecRecommendation {
  if (answers.useCases.length === 0) {
    throw new Error('At least one use case must be selected.')
  }
  if (!Number.isFinite(answers.maxBudget) || answers.maxBudget <= 0) {
    throw new Error('Max budget must be a positive number.')
  }

  const requirements = requirementsFor(answers)

  const spec: SpecTarget = {
    ramGB: 0,
    ramRecommendedGB: 0,
    cpuTier: 'efficiency',
    gpu: 'integrated',
    gpuPreferredNotRequired: false,
    storageGB: 0,
    storageRecommendedGB: 0,
    formFactor: 'any',
    prioritizePortability: false,
    notes: [],
  }

  for (const req of requirements) {
    spec.ramGB = Math.max(spec.ramGB, req.ramGB)
    spec.ramRecommendedGB = Math.max(
      spec.ramRecommendedGB,
      req.ramRecommendedGB ?? req.ramGB,
    )
    spec.cpuTier = maxCpu(spec.cpuTier, req.cpuTier)
    spec.gpu = maxGpu(spec.gpu, req.gpu)
    spec.gpuPreferredNotRequired ||= req.gpuPreferredNotRequired ?? false
    spec.storageGB = Math.max(spec.storageGB, req.storageGB)
    spec.storageRecommendedGB = Math.max(
      spec.storageRecommendedGB,
      req.storageRecommendedGB ?? req.storageGB,
    )
    for (const note of req.notes ?? []) {
      if (!spec.notes.includes(note)) spec.notes.push(note)
    }
  }

  // A required dedicated GPU supersedes "dedicated preferred".
  if (spec.gpu !== 'integrated') spec.gpuPreferredNotRequired = false

  if (answers.useCases.includes('portable')) {
    spec.formFactor = 'convertible'
  }

  spec.prioritizePortability =
    answers.portability === 'very' || answers.useCases.includes('portable')

  const warnings: string[] = []
  if (
    answers.portability === 'very' &&
    (spec.gpu !== 'integrated' || spec.cpuTier === 'high')
  ) {
    spec.notes.push(
      'Your workload calls for high-performance parts, but you also rated portability as very important — expect a trade-off between weight/battery and peak power.',
    )
  }

  const floor = estimateFloorPrice(spec)
  if (answers.maxBudget < floor) {
    warnings.push(
      `A machine meeting this spec typically starts around $${floor} new — your $${answers.maxBudget} budget may only match certified-refurbished units, or you may need to relax the spec.`,
    )
  }

  return { spec, maxBudget: answers.maxBudget, warnings }
}
