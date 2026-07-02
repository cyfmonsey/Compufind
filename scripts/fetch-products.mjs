/**
 * Fetches laptop listings from the Best Buy and eBay APIs, normalizes
 * them to the shared Product shape, and writes public/products.json.
 *
 * Sourcing constraint: Best Buy API results are first-party (sold by
 * Best Buy); eBay results are filtered to CERTIFIED_REFURBISHED, eBay's
 * manufacturer-backed refurbished program. No third-party-marketplace
 * "new" listings are ever requested.
 *
 * Required environment (either or both):
 *   BESTBUY_API_KEY                      https://developer.bestbuy.com
 *   EBAY_CLIENT_ID / EBAY_CLIENT_SECRET  https://developer.ebay.com
 *
 * With no credentials set, exits 0 without touching products.json so
 * the committed sample catalog stays in place.
 */

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'products.json')

const LAPTOP_CATEGORY_BESTBUY = 'abcat0502000' // Laptops
const LAPTOP_CATEGORY_EBAY = '177' // PC Laptops & Netbooks

async function fetchBestBuy(apiKey) {
  const products = []
  for (let page = 1; page <= 3; page++) {
    const url =
      `https://api.bestbuy.com/v1/products((categoryPath.id=${LAPTOP_CATEGORY_BESTBUY}))` +
      `?apiKey=${apiKey}&format=json&pageSize=100&page=${page}` +
      `&show=sku,name,salePrice,regularPrice,url,image,condition,onlineAvailability` +
      `&sort=salePrice.asc`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Best Buy API ${res.status}: ${await res.text()}`)
    const data = await res.json()
    for (const p of data.products ?? []) {
      if (!p.onlineAvailability) continue
      products.push({
        id: `bestbuy-${p.sku}`,
        title: p.name,
        price: p.salePrice ?? p.regularPrice,
        url: p.url,
        image: p.image || undefined,
        retailer: 'bestbuy',
        sellerType: 'direct',
        condition: p.condition === 'refurbished' ? 'certified-refurbished' : 'new',
      })
    }
    if (page >= (data.totalPages ?? 1)) break
  }
  return products
}

async function fetchEbay(clientId, clientSecret) {
  const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
  })
  if (!tokenRes.ok) throw new Error(`eBay OAuth ${tokenRes.status}: ${await tokenRes.text()}`)
  const { access_token: token } = await tokenRes.json()

  const products = []
  for (let offset = 0; offset < 400; offset += 200) {
    const url =
      `https://api.ebay.com/buy/browse/v1/item_summary/search` +
      `?q=laptop&category_ids=${LAPTOP_CATEGORY_EBAY}&limit=200&offset=${offset}` +
      `&filter=${encodeURIComponent('conditions:{CERTIFIED_REFURBISHED},buyingOptions:{FIXED_PRICE},priceCurrency:USD')}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
    })
    if (!res.ok) throw new Error(`eBay Browse API ${res.status}: ${await res.text()}`)
    const data = await res.json()
    for (const item of data.itemSummaries ?? []) {
      if (!item.price?.value) continue
      products.push({
        id: `ebay-${item.itemId}`,
        title: item.title,
        price: Number(item.price.value),
        url: item.itemWebUrl,
        image: item.image?.imageUrl,
        retailer: 'ebay',
        sellerType: 'certified-refurbished',
        condition: 'certified-refurbished',
      })
    }
    if (!data.itemSummaries || data.itemSummaries.length < 200) break
  }
  return products
}

const bestBuyKey = process.env.BESTBUY_API_KEY
const ebayId = process.env.EBAY_CLIENT_ID
const ebaySecret = process.env.EBAY_CLIENT_SECRET

if (!bestBuyKey && !(ebayId && ebaySecret)) {
  console.log('No retailer API credentials set — keeping the existing catalog.')
  process.exit(0)
}

const products = []
if (bestBuyKey) {
  const items = await fetchBestBuy(bestBuyKey)
  console.log(`Best Buy: ${items.length} products`)
  products.push(...items)
}
if (ebayId && ebaySecret) {
  const items = await fetchEbay(ebayId, ebaySecret)
  console.log(`eBay certified refurbished: ${items.length} products`)
  products.push(...items)
}

if (products.length === 0) {
  console.error('Credentials were set but no products were fetched — not overwriting catalog.')
  process.exit(1)
}

await writeFile(
  OUT_PATH,
  JSON.stringify({ generatedAt: new Date().toISOString(), sampleData: false, products }, null, 1),
)
console.log(`Wrote ${products.length} products to ${OUT_PATH}`)
