import { describe, expect, it } from 'vitest'
import {
  cpuCapability,
  gpuCapability,
  matchProducts,
  parseSpecsFromTitle,
} from './matching.ts'
import type { Product } from './products.ts'
import type { SpecTarget } from './types.ts'

function product(overrides: Partial<Product>): Product {
  return {
    id: 'p1',
    title: 'Generic Laptop',
    price: 999,
    url: 'https://example.com',
    retailer: 'bestbuy',
    sellerType: 'direct',
    condition: 'new',
    ...overrides,
  }
}

function spec(overrides: Partial<SpecTarget>): SpecTarget {
  return {
    ramGB: 16,
    ramRecommendedGB: 16,
    cpuTier: 'mid',
    gpu: 'integrated',
    gpuPreferredNotRequired: false,
    storageGB: 512,
    storageRecommendedGB: 512,
    formFactor: 'any',
    prioritizePortability: false,
    notes: [],
    ...overrides,
  }
}

describe('parseSpecsFromTitle', () => {
  it('parses a typical Best Buy style title', () => {
    const s = parseSpecsFromTitle(
      'HP - 15.6" Laptop - Intel Core i5-1335U - 16GB Memory - 512GB SSD - Silver',
    )
    expect(s.ramGB).toBe(16)
    expect(s.storageGB).toBe(512)
    expect(s.cpu).toMatch(/i5/i)
    expect(s.gpu).toBeUndefined()
  })

  it('parses TB storage, RAM wording, and dedicated GPUs', () => {
    const s = parseSpecsFromTitle(
      'ASUS ROG Strix 16 Gaming Laptop Ryzen 9 7940HX 32GB DDR5 RAM 1TB PCIe SSD GeForce RTX 4060',
    )
    expect(s.ramGB).toBe(32)
    expect(s.storageGB).toBe(1024)
    expect(s.cpu).toMatch(/Ryzen 9/i)
    expect(s.gpu).toMatch(/RTX 4060/i)
  })

  it('returns empty specs for an uninformative title', () => {
    const s = parseSpecsFromTitle('Dell Latitude 5440 Business Laptop')
    expect(s.ramGB).toBeUndefined()
    expect(s.storageGB).toBeUndefined()
    expect(s.cpu).toBeUndefined()
  })
})

describe('cpuCapability / gpuCapability', () => {
  it('grades CPU strings into tiers', () => {
    expect(cpuCapability('Intel Core i3-1215U')).toBe('efficiency')
    expect(cpuCapability('Intel Core i5-1335U')).toBe('mid')
    expect(cpuCapability('Ryzen 7 7730U')).toBe('mid-high')
    expect(cpuCapability('Intel Core i7-13700H')).toBe('high')
    expect(cpuCapability('Ryzen 9 7940HX')).toBe('high')
    expect(cpuCapability('Apple M3 Pro')).toBe('high')
    expect(cpuCapability('Apple M2')).toBe('mid')
    expect(cpuCapability('Mystery Chip 9000')).toBeUndefined()
  })

  it('grades GPU strings into tiers', () => {
    expect(gpuCapability(undefined)).toBe('integrated')
    expect(gpuCapability('RTX 4050')).toBe('dedicated-entry')
    expect(gpuCapability('RTX 4060')).toBe('dedicated-mid')
    expect(gpuCapability('RTX 3070')).toBe('dedicated-mid')
    expect(gpuCapability('GTX 1650')).toBe('dedicated-entry')
  })
})

describe('matchProducts', () => {
  const catalog: Product[] = [
    product({
      id: 'cheap-8gb',
      title: 'Lenovo IdeaPad 1 Intel Core i5-1235U 8GB Memory 256GB SSD',
      price: 399,
    }),
    product({
      id: 'solid-16gb',
      title: 'HP Pavilion Intel Core i5-1335U 16GB Memory 512GB SSD',
      price: 649,
    }),
    product({
      id: 'gaming-32gb',
      title: 'ASUS ROG Ryzen 9 7940HX 32GB RAM 1TB SSD RTX 4060',
      price: 1499,
    }),
    product({
      id: 'mystery',
      title: 'Dell Latitude 5440 Business Laptop',
      price: 549,
    }),
    product({
      id: 'over-budget',
      title: 'Razer Blade 16 Intel Core i9-14900HX 32GB RAM 2TB SSD RTX 4090',
      price: 3999,
    }),
  ]

  it('excludes products over budget', () => {
    const results = matchProducts(catalog, spec({}), 2000)
    expect(results.map((r) => r.product.id)).not.toContain('over-budget')
  })

  it('excludes products confirmed to fall short of the spec', () => {
    const results = matchProducts(catalog, spec({ ramGB: 16 }), 2000)
    expect(results.map((r) => r.product.id)).not.toContain('cheap-8gb')
  })

  it('keeps unknown-spec products but ranks confirmed matches first', () => {
    const results = matchProducts(catalog, spec({}), 2000)
    const ids = results.map((r) => r.product.id)
    expect(ids).toContain('mystery')
    expect(ids.indexOf('solid-16gb')).toBeLessThan(ids.indexOf('mystery'))
    const mystery = results.find((r) => r.product.id === 'mystery')!
    expect(mystery.unknowns).toEqual(['RAM', 'storage', 'CPU'])
  })

  it('ranks cheaper products first among equal matches', () => {
    const results = matchProducts(
      [
        product({ id: 'a', title: 'Laptop i5-1335U 16GB RAM 512GB SSD', price: 899 }),
        product({ id: 'b', title: 'Laptop i5-1334U 16GB RAM 512GB SSD', price: 699 }),
      ],
      spec({}),
      2000,
    )
    expect(results.map((r) => r.product.id)).toEqual(['b', 'a'])
  })

  it('enforces dedicated GPU requirements', () => {
    const results = matchProducts(catalog, spec({ gpu: 'dedicated-mid', ramGB: 32, storageGB: 1024, cpuTier: 'high' }), 2000)
    expect(results.map((r) => r.product.id)).toEqual(['gaming-32gb'])
  })

  it('respects the result limit', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      product({ id: `p${i}`, title: 'Laptop i5-1335U 16GB RAM 512GB SSD', price: 500 + i }),
    )
    expect(matchProducts(many, spec({}), 2000, 5)).toHaveLength(5)
  })
})
