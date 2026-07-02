import { describe, expect, it, vi, afterEach } from 'vitest'
import { fetchAffiliateFeed } from './affiliate-feed.mjs'

function mockFetchOnce(csv) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(csv),
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchAffiliateFeed', () => {
  it('parses a well-formed CSV feed and filters to laptops', async () => {
    const csv =
      'Name,Price,Buy URL,Image URL,SKU,Category\n' +
      'Costco Laptop Deal 16GB,699.99,https://costco.com/a,https://img/a.jpg,SKU1,Laptops\n' +
      'Costco Patio Umbrella,129.99,https://costco.com/b,https://img/b.jpg,SKU2,Outdoor\n'
    mockFetchOnce(csv)

    const products = await fetchAffiliateFeed('costco', 'https://feed.example/costco.csv', {
      alwaysDirect: true,
    })

    expect(products).toHaveLength(1)
    expect(products[0]).toMatchObject({
      id: 'costco-SKU1',
      title: 'Costco Laptop Deal 16GB',
      price: 699.99,
      url: 'https://costco.com/a',
      retailer: 'costco',
      sellerType: 'direct',
      condition: 'new',
    })
  })

  it('handles quoted fields containing commas', async () => {
    const csv =
      'Name,Price,Buy URL\n' +
      '"Dell Laptop, 16GB RAM, 512GB SSD",899.00,https://dell.com/a\n'
    mockFetchOnce(csv)

    const products = await fetchAffiliateFeed('dell', 'https://feed.example/dell.csv')
    expect(products).toHaveLength(1)
    expect(products[0].title).toBe('Dell Laptop, 16GB RAM, 512GB SSD')
    expect(products[0].price).toBe(899)
  })

  it('flags refurbished/outlet condition unless alwaysDirect is set', async () => {
    const csv =
      'Name,Price,Buy URL,Condition\n' +
      'Dell Latitude Refurbished Laptop,499.99,https://dell.com/b,Refurbished\n' +
      'Dell XPS Laptop,1299.99,https://dell.com/c,New\n'
    mockFetchOnce(csv)

    const products = await fetchAffiliateFeed('dell', 'https://feed.example/dell.csv')
    const refurb = products.find((p) => p.title.includes('Refurbished'))
    const fresh = products.find((p) => p.title.includes('XPS'))
    expect(refurb).toMatchObject({ sellerType: 'certified-refurbished', condition: 'certified-refurbished' })
    expect(fresh).toMatchObject({ sellerType: 'direct', condition: 'new' })
  })

  it('treats alwaysDirect retailers as direct even if condition looks refurbished', async () => {
    const csv =
      'Name,Price,Buy URL,Condition\n' +
      'Costco Open-Box Laptop Deal,599.99,https://costco.com/c,Open-Box\n'
    mockFetchOnce(csv)

    const products = await fetchAffiliateFeed('costco', 'https://feed.example/costco.csv', {
      alwaysDirect: true,
    })
    expect(products[0]).toMatchObject({ sellerType: 'direct', condition: 'new' })
  })

  it('skips non-laptop rows and rows missing required fields', async () => {
    const csv =
      'Name,Price,Buy URL,Category\n' +
      'Laptop Stand,29.99,https://bh.com/a,Accessories\n' +
      ',999.99,https://bh.com/b,Laptops\n' +
      'Laptop No Price,,https://bh.com/c,Laptops\n' +
      'Laptop No URL,999.99,,Laptops\n'
    mockFetchOnce(csv)

    const products = await fetchAffiliateFeed('bhphoto', 'https://feed.example/bh.csv')
    expect(products).toHaveLength(0)
  })

  it('is case-insensitive and alias-tolerant on headers', async () => {
    const csv =
      'title,sale price,landing_page_url,product_id\n' +
      'HP Notebook Deal,449.5,https://hp.com/a,HP123\n'
    mockFetchOnce(csv)

    const products = await fetchAffiliateFeed('hp', 'https://feed.example/hp.csv')
    expect(products).toEqual([
      {
        id: 'hp-HP123',
        title: 'HP Notebook Deal',
        price: 449.5,
        url: 'https://hp.com/a',
        image: undefined,
        retailer: 'hp',
        sellerType: 'direct',
        condition: 'new',
      },
    ])
  })

  it('throws when the feed request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 403, text: () => Promise.resolve('Forbidden') }),
    )
    await expect(fetchAffiliateFeed('dell', 'https://feed.example/bad.csv')).rejects.toThrow(/403/)
  })
})
