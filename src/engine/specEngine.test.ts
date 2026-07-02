import { describe, expect, it } from 'vitest'
import { recommendSpec } from './specEngine.ts'
import type { QuestionnaireAnswers } from './types.ts'

function answers(overrides: Partial<QuestionnaireAnswers>): QuestionnaireAnswers {
  return {
    maxBudget: 2000,
    useCases: ['basic-office'],
    portability: 'not-important',
    ...overrides,
  }
}

describe('recommendSpec — single use cases (rules table)', () => {
  it('basic/QuickBooks with light tabs → 8GB, mid CPU, integrated, 256GB min', () => {
    const { spec } = recommendSpec(answers({ tabHabit: 'light' }))
    expect(spec.ramGB).toBe(8)
    expect(spec.cpuTier).toBe('mid')
    expect(spec.gpu).toBe('integrated')
    expect(spec.storageGB).toBe(256)
    expect(spec.storageRecommendedGB).toBe(512)
  })

  it('basic/QuickBooks with heavy tabs (15+) → 16GB, 512GB', () => {
    const { spec } = recommendSpec(answers({ tabHabit: 'heavy' }))
    expect(spec.ramGB).toBe(16)
    expect(spec.cpuTier).toBe('mid')
    expect(spec.gpu).toBe('integrated')
    expect(spec.storageGB).toBe(512)
  })

  it('basic + heavy multitasking → 32GB, mid-high CPU, up to 1TB', () => {
    const { spec } = recommendSpec(
      answers({ tabHabit: 'heavy', heavyMultitasking: true }),
    )
    expect(spec.ramGB).toBe(32)
    expect(spec.cpuTier).toBe('mid-high')
    expect(spec.gpu).toBe('integrated')
    expect(spec.storageGB).toBe(512)
    expect(spec.storageRecommendedGB).toBe(1024)
  })

  it('graphics/Photoshop → 16–32GB, high CPU, dedicated entry GPU', () => {
    const { spec } = recommendSpec(answers({ useCases: ['graphics'] }))
    expect(spec.ramGB).toBe(16)
    expect(spec.ramRecommendedGB).toBe(32)
    expect(spec.cpuTier).toBe('high')
    expect(spec.gpu).toBe('dedicated-entry')
    expect(spec.gpuPreferredNotRequired).toBe(false)
    expect(spec.storageGB).toBe(512)
  })

  it('Revit/CAD → 32GB, high CPU, dedicated-mid GPU, 1TB', () => {
    const { spec } = recommendSpec(answers({ useCases: ['cad'] }))
    expect(spec.ramGB).toBe(32)
    expect(spec.cpuTier).toBe('high')
    expect(spec.gpu).toBe('dedicated-mid')
    expect(spec.storageGB).toBe(1024)
  })

  it('programming (web/light) → 16GB, mid CPU, integrated, 512GB', () => {
    const { spec } = recommendSpec(
      answers({ useCases: ['programming'], programmingStack: 'web-light' }),
    )
    expect(spec.ramGB).toBe(16)
    expect(spec.cpuTier).toBe('mid')
    expect(spec.gpu).toBe('integrated')
    expect(spec.storageGB).toBe(512)
  })

  it('programming (ML/Docker/VMs) → 32GB, high CPU, GPU preferred not required, 1TB', () => {
    const { spec } = recommendSpec(
      answers({ useCases: ['programming'], programmingStack: 'ml-docker-vm' }),
    )
    expect(spec.ramGB).toBe(32)
    expect(spec.cpuTier).toBe('high')
    expect(spec.gpu).toBe('integrated')
    expect(spec.gpuPreferredNotRequired).toBe(true)
    expect(spec.storageGB).toBe(1024)
  })

  it('programming (mobile/native) → 16GB min / 32GB recommended, mid-high CPU', () => {
    const { spec } = recommendSpec(
      answers({ useCases: ['programming'], programmingStack: 'mobile-native' }),
    )
    expect(spec.ramGB).toBe(16)
    expect(spec.ramRecommendedGB).toBe(32)
    expect(spec.cpuTier).toBe('mid-high')
  })

  it('light & portable / 2-in-1 → 16GB, efficiency CPU, convertible form factor', () => {
    const { spec } = recommendSpec(answers({ useCases: ['portable'] }))
    expect(spec.ramGB).toBe(16)
    expect(spec.cpuTier).toBe('efficiency')
    expect(spec.gpu).toBe('integrated')
    expect(spec.storageGB).toBe(512)
    expect(spec.formFactor).toBe('convertible')
    expect(spec.prioritizePortability).toBe(true)
  })
})

describe('recommendSpec — combining use cases', () => {
  it('takes the strictest value per field across use cases', () => {
    const { spec } = recommendSpec(
      answers({
        useCases: ['basic-office', 'graphics', 'portable'],
        tabHabit: 'light',
      }),
    )
    expect(spec.ramGB).toBe(16) // graphics/portable over basic's 8
    expect(spec.ramRecommendedGB).toBe(32) // graphics recommendation
    expect(spec.cpuTier).toBe('high') // graphics over mid/efficiency
    expect(spec.gpu).toBe('dedicated-entry') // graphics over integrated
    expect(spec.storageGB).toBe(512)
    expect(spec.formFactor).toBe('convertible') // portable selected
  })

  it('a required dedicated GPU overrides "preferred not required" from ML', () => {
    const { spec } = recommendSpec(
      answers({
        useCases: ['programming', 'cad'],
        programmingStack: 'ml-docker-vm',
      }),
    )
    expect(spec.gpu).toBe('dedicated-mid')
    expect(spec.gpuPreferredNotRequired).toBe(false)
  })

  it('CAD + heavy multitasking keeps 32GB and 1TB', () => {
    const { spec } = recommendSpec(
      answers({
        useCases: ['basic-office', 'cad'],
        tabHabit: 'heavy',
        heavyMultitasking: true,
      }),
    )
    expect(spec.ramGB).toBe(32)
    expect(spec.storageGB).toBe(1024)
  })
})

describe('recommendSpec — portability & notes', () => {
  it('flags portability priority when the user rates it very important', () => {
    const { spec } = recommendSpec(
      answers({ useCases: ['programming'], programmingStack: 'web-light', portability: 'very' }),
    )
    expect(spec.prioritizePortability).toBe(true)
  })

  it('adds a trade-off note when high-power needs meet a very-portable preference', () => {
    const { spec } = recommendSpec(
      answers({ useCases: ['cad'], portability: 'very' }),
    )
    expect(spec.notes.some((n) => n.includes('trade-off'))).toBe(true)
  })

  it('does not prioritize portability by default', () => {
    const { spec } = recommendSpec(answers({ tabHabit: 'light' }))
    expect(spec.prioritizePortability).toBe(false)
    expect(spec.formFactor).toBe('any')
  })
})

describe('recommendSpec — budget and validation', () => {
  it('passes the budget through to the recommendation', () => {
    const rec = recommendSpec(answers({ maxBudget: 1234, tabHabit: 'light' }))
    expect(rec.maxBudget).toBe(1234)
  })

  it('warns when the budget is unrealistically low for the spec', () => {
    const rec = recommendSpec(answers({ useCases: ['cad'], maxBudget: 500 }))
    expect(rec.warnings.length).toBeGreaterThan(0)
    expect(rec.warnings[0]).toContain('$500')
  })

  it('does not warn when the budget comfortably covers the spec', () => {
    const rec = recommendSpec(answers({ tabHabit: 'light', maxBudget: 800 }))
    expect(rec.warnings).toHaveLength(0)
  })

  it('rejects an empty use-case list', () => {
    expect(() => recommendSpec(answers({ useCases: [] }))).toThrow(
      /use case/i,
    )
  })

  it('rejects a non-positive budget', () => {
    expect(() => recommendSpec(answers({ maxBudget: 0 }))).toThrow(/budget/i)
    expect(() => recommendSpec(answers({ maxBudget: -100 }))).toThrow(/budget/i)
  })
})
