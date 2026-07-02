/**
 * Normalized product shape shared by the data-refresh script (which
 * writes public/products.json) and the frontend matching layer.
 */

export type Retailer = 'bestbuy' | 'ebay' | 'costco' | 'bhphoto' | 'dell' | 'hp'

export type SellerType = 'direct' | 'certified-refurbished'

export interface ProductSpecs {
  ramGB?: number
  storageGB?: number
  /** Raw CPU string, e.g. "Intel Core i7-13700H" or "Ryzen 5 7530U". */
  cpu?: string
  /** Raw GPU string, e.g. "RTX 4060" — absent means integrated/unknown. */
  gpu?: string
}

export interface Product {
  id: string
  title: string
  /** Current price in USD. */
  price: number
  url: string
  image?: string
  retailer: Retailer
  /**
   * 'direct' = sold and shipped by the retailer itself;
   * 'certified-refurbished' = manufacturer-certified refurbished unit.
   * Anything else is excluded at the data layer and never reaches here.
   */
  sellerType: SellerType
  condition: 'new' | 'certified-refurbished'
  specs?: ProductSpecs
}

export interface ProductsFile {
  generatedAt: string
  /** True while the catalog is seed data rather than live API results. */
  sampleData: boolean
  products: Product[]
}

export const RETAILER_LABELS: Record<Retailer, string> = {
  bestbuy: 'Best Buy',
  ebay: 'eBay',
  costco: 'Costco',
  bhphoto: 'B&H Photo',
  dell: 'Dell',
  hp: 'HP',
}
