/**
 * Matching layer: scores cached products against a spec target + budget
 * and returns ranked results.
 *
 * Product listings rarely carry structured spec fields, so this module
 * also extracts RAM/storage/CPU/GPU from listing titles with pragmatic
 * heuristics. A spec field that cannot be determined is treated as
 * "unknown" — the product is still eligible but ranks below products
 * whose specs are confirmed, and the UI can flag it as unverified.
 */

import type { CpuTier, GpuTier, SpecTarget } from './types.ts'
import type { Product, ProductSpecs } from './products.ts'

export interface MatchResult {
  product: Product
  /** Spec fields confirmed to meet the target. */
  meets: string[]
  /** Spec fields that could not be determined from the listing. */
  unknowns: string[]
  /** Parsed specs used for the evaluation (title-derived if needed). */
  specs: ProductSpecs
}

/** Extract hardware specs from a listing title. Best-effort. */
export function parseSpecsFromTitle(title: string): ProductSpecs {
  const specs: ProductSpecs = {}

  const ram = title.match(/(\d{1,3})\s*GB\s*(?:DDR\d\w*\s*|LPDDR\d\w*\s*)?(?:RAM|Memory)/i)
  if (ram) specs.ramGB = Number(ram[1])

  const storage = title.match(/(\d+(?:\.\d+)?)\s*(GB|TB)\s*(?:PCIe\s*|NVMe\s*|M\.2\s*)*(?:SSD|Solid[- ]?State)/i)
  if (storage) {
    const n = Number(storage[1])
    specs.storageGB = storage[2].toUpperCase() === 'TB' ? n * 1024 : n
  }

  const cpu = title.match(
    /((?:Intel\s*)?Core\s*(?:Ultra\s*\d\s*)?i[3579][- ]?\w*|Ryzen\s*(?:AI\s*)?[3579]\w*(?:\s*\d{4}\w*)?|Apple\s*M[1-4](?:\s*(?:Pro|Max|Ultra))?|Snapdragon\s*X?\s*\w+)/i,
  )
  if (cpu) specs.cpu = cpu[1].replace(/\s+/g, ' ').trim()

  const gpu = title.match(/((?:GeForce\s*)?(?:RTX|GTX)\s*\d{3,4}\w*|Radeon\s*RX\s*\d{3,4}\w*|Intel\s*Arc\s*\w+)/i)
  if (gpu) specs.gpu = gpu[1].replace(/\s+/g, ' ').trim()

  return specs
}

/**
 * Map a raw CPU string to the highest CpuTier it can satisfy.
 * Returns undefined when the string is unrecognized.
 */
export function cpuCapability(cpu: string): CpuTier | undefined {
  const s = cpu.toLowerCase()
  if (/m[1-4]\s*(pro|max|ultra)/.test(s)) return 'high'
  if (/i9|ryzen\s*(ai\s*)?9/.test(s)) return 'high'
  // H/HX-suffix i7/Ryzen 7 parts are high-performance; U/P parts are not.
  if (/(i7|ryzen\s*(ai\s*)?7)[\s\S]*?(hx|h)\b/.test(s)) return 'high'
  if (/i7|ryzen\s*(ai\s*)?7|core\s*ultra\s*7/.test(s)) return 'mid-high'
  if (/i5|ryzen\s*(ai\s*)?5|core\s*ultra\s*5|apple\s*m[1-4]|snapdragon/.test(s)) return 'mid'
  if (/i3|ryzen\s*(ai\s*)?3/.test(s)) return 'efficiency'
  return undefined
}

/** Map a raw GPU string to a GpuTier. No dedicated-GPU token → integrated. */
export function gpuCapability(gpu: string | undefined): GpuTier {
  if (!gpu) return 'integrated'
  const s = gpu.toLowerCase()
  const rtx = s.match(/rtx\s*(\d{4})/)
  if (rtx) {
    const model = Number(rtx[1])
    // x050 class → entry; x060 and above → mid.
    return model % 100 >= 60 || model % 1000 >= 60 ? 'dedicated-mid' : 'dedicated-entry'
  }
  if (/gtx\s*\d{3,4}|radeon\s*rx|arc/.test(s)) return 'dedicated-entry'
  return 'integrated'
}

const CPU_ORDER: CpuTier[] = ['efficiency', 'mid', 'mid-high', 'high']
const GPU_ORDER: GpuTier[] = ['integrated', 'dedicated-entry', 'dedicated-mid']

/**
 * Rank products against the spec target and budget.
 *
 * Eligibility: price within budget, and no spec field confirmed to fall
 * short of the target. Ranking: most confirmed fields first, then fewest
 * unknowns, then lowest price.
 */
export function matchProducts(
  products: Product[],
  spec: SpecTarget,
  maxBudget: number,
  limit = 10,
): MatchResult[] {
  const results: MatchResult[] = []

  for (const product of products) {
    if (product.price > maxBudget) continue

    const specs: ProductSpecs = {
      ...parseSpecsFromTitle(product.title),
      ...product.specs,
    }

    const meets: string[] = []
    const unknowns: string[] = []
    let fails = false

    if (specs.ramGB === undefined) unknowns.push('RAM')
    else if (specs.ramGB >= spec.ramGB) meets.push('RAM')
    else fails = true

    if (specs.storageGB === undefined) unknowns.push('storage')
    else if (specs.storageGB >= spec.storageGB) meets.push('storage')
    else fails = true

    const cpuTier = specs.cpu ? cpuCapability(specs.cpu) : undefined
    if (cpuTier === undefined) unknowns.push('CPU')
    else if (CPU_ORDER.indexOf(cpuTier) >= CPU_ORDER.indexOf(spec.cpuTier)) meets.push('CPU')
    else fails = true

    // GPU: absence of a dedicated-GPU token means integrated, which is
    // a real reading of the listing rather than an unknown.
    const gpuTier = gpuCapability(specs.gpu)
    if (GPU_ORDER.indexOf(gpuTier) >= GPU_ORDER.indexOf(spec.gpu)) meets.push('GPU')
    else fails = true

    if (fails) continue
    results.push({ product, meets, unknowns, specs })
  }

  results.sort(
    (a, b) =>
      b.meets.length - a.meets.length ||
      a.unknowns.length - b.unknowns.length ||
      a.product.price - b.product.price,
  )

  return results.slice(0, limit)
}
