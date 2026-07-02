/**
 * Generic importer for affiliate-network product feeds (Impact, Rakuten
 * Advertising, CJ Affiliate). Costco, B&H Photo, Dell, and HP have no
 * self-serve developer API — per the build spec's Tier B/C, they're only
 * reachable once you're approved as an affiliate of one of those
 * networks, which then gives you a per-merchant feed URL (CSV, usually
 * refreshed daily) with seller-of-record baked in.
 *
 * This module downloads and parses one of those feed URLs and filters
 * it down to laptops. Column names vary by network, so header lookup is
 * alias-based and case-insensitive rather than hard-coded.
 */

const TITLE_KEYS = ['name', 'title', 'product name', 'product_name']
const PRICE_KEYS = ['price', 'sale price', 'saleprice', 'current price', 'finalprice']
const URL_KEYS = ['buy url', 'buy_url', 'link', 'landing page url', 'landing_page_url', 'url', 'trackingurl', 'tracking_url']
const IMAGE_KEYS = ['image url', 'image_url', 'imageurl', 'image link', 'image_link']
const ID_KEYS = ['sku', 'id', 'product id', 'product_id', 'mpn']
const CONDITION_KEYS = ['condition', 'product condition']
const CATEGORY_KEYS = ['category', 'primary category', 'product type', 'producttype']

const LAPTOP_KEYWORDS = /\b(laptop|notebook|chromebook|macbook|ultrabook|2-in-1|2 in 1)\b/i
const ACCESSORY_KEYWORDS =
  /\b(stand|sleeve|case|bag|backpack|charger|charging|adapter|dock(?:ing)?|mount|cooler|cooling pad|hub|skin|cover|lock|screen protector|keyboard cover)\b/i
// Note: no trailing \b after "refurb" — it must also match "Refurbished".
const REFURB_KEYWORDS = /\brefurb|\brenewed\b|\boutlet\b|\bopen[- ]?box\b|\bcertified pre[- ]?owned\b/i

/** Minimal RFC 4180 CSV parser — handles quoted fields containing commas/newlines. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.length > 1 || r[0] !== '')
}

function buildHeaderIndex(headerRow) {
  const index = new Map()
  headerRow.forEach((h, i) => index.set(h.trim().toLowerCase(), i))
  return index
}

function pick(row, headerIndex, keys) {
  for (const key of keys) {
    const i = headerIndex.get(key)
    if (i !== undefined && row[i] !== undefined && row[i] !== '') return row[i]
  }
  return undefined
}

/**
 * Fetch a merchant's affiliate product feed and normalize it to the
 * shared Product shape, keeping only laptop listings.
 *
 * @param retailer  Retailer key ('costco' | 'bhphoto' | 'dell' | 'hp')
 * @param feedUrl   The per-merchant feed URL from your affiliate network
 * @param opts.alwaysDirect  True for retailers that never resell other
 *   brands' refurbished stock under their own name (Costco, B&H) — every
 *   row becomes sellerType 'direct' regardless of the condition column.
 */
export async function fetchAffiliateFeed(retailer, feedUrl, { alwaysDirect = false } = {}) {
  const res = await fetch(feedUrl)
  if (!res.ok) throw new Error(`${retailer} feed ${res.status}: ${await res.text()}`)
  const text = await res.text()
  const rows = parseCsv(text)
  if (rows.length === 0) return []

  const headerIndex = buildHeaderIndex(rows[0])
  const products = []

  for (const row of rows.slice(1)) {
    const title = pick(row, headerIndex, TITLE_KEYS)
    const priceRaw = pick(row, headerIndex, PRICE_KEYS)
    const url = pick(row, headerIndex, URL_KEYS)
    if (!title || !priceRaw || !url) continue

    const category = pick(row, headerIndex, CATEGORY_KEYS) ?? ''
    const looksLikeLaptop = LAPTOP_KEYWORDS.test(title) || LAPTOP_KEYWORDS.test(category)
    if (!looksLikeLaptop || ACCESSORY_KEYWORDS.test(title)) continue

    const price = Number(String(priceRaw).replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(price) || price <= 0) continue

    const conditionRaw = pick(row, headerIndex, CONDITION_KEYS) ?? ''
    const isRefurb = !alwaysDirect && REFURB_KEYWORDS.test(`${conditionRaw} ${title}`)

    const id = pick(row, headerIndex, ID_KEYS) ?? url
    products.push({
      id: `${retailer}-${id}`,
      title,
      price,
      url,
      image: pick(row, headerIndex, IMAGE_KEYS),
      retailer,
      sellerType: isRefurb ? 'certified-refurbished' : 'direct',
      condition: isRefurb ? 'certified-refurbished' : 'new',
    })
  }

  return products
}
