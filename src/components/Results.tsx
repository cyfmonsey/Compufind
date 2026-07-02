import { useEffect, useState } from 'react'
import type { SpecRecommendation } from '../engine/types.ts'
import type { ProductsFile } from '../engine/products.ts'
import { RETAILER_LABELS } from '../engine/products.ts'
import { matchProducts, type MatchResult } from '../engine/matching.ts'
import { formatStorage } from '../engine/labels.ts'

interface Props {
  recommendation: SpecRecommendation
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; file: ProductsFile; matches: MatchResult[] }

function specChips(match: MatchResult): string[] {
  const chips: string[] = []
  if (match.specs.ramGB) chips.push(`${match.specs.ramGB}GB RAM`)
  if (match.specs.storageGB) chips.push(formatStorage(match.specs.storageGB))
  if (match.specs.cpu) chips.push(match.specs.cpu)
  if (match.specs.gpu) chips.push(match.specs.gpu)
  return chips
}

export default function Results({ recommendation }: Props) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}products.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<ProductsFile>
      })
      .then((file) => {
        if (cancelled) return
        const matches = matchProducts(
          file.products,
          recommendation.spec,
          recommendation.maxBudget,
        )
        setState({ status: 'ready', file, matches })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [recommendation])

  if (state.status === 'loading') {
    return (
      <div className="results">
        <h3>Matching machines</h3>
        <p className="results-status">Searching the catalog…</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="results">
        <h3>Matching machines</h3>
        <p className="results-status">
          Couldn't load the product catalog. Try reloading the page.
        </p>
      </div>
    )
  }

  const { file, matches } = state

  return (
    <div className="results">
      <h3>Matching machines</h3>
      {file.sampleData && (
        <p className="sample-banner">
          Showing a sample catalog while live retailer feeds are being
          connected — prices and links are illustrative, not live offers.
        </p>
      )}
      {matches.length === 0 ? (
        <p className="results-status">
          No machines in the catalog meet this spec within $
          {recommendation.maxBudget.toLocaleString()}. Try raising the budget —
          or check back after the next catalog refresh.
        </p>
      ) : (
        <ul className="result-list">
          {matches.map((m) => (
            <li key={m.product.id} className="result-card">
              <div className="result-main">
                <a
                  className="result-title"
                  href={m.product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {m.product.title}
                </a>
                <div className="result-badges">
                  <span
                    className={
                      m.product.sellerType === 'direct'
                        ? 'badge badge-direct'
                        : 'badge badge-refurb'
                    }
                  >
                    {m.product.sellerType === 'direct'
                      ? `Sold by ${RETAILER_LABELS[m.product.retailer]}`
                      : 'Certified refurbished'}
                  </span>
                  <span className="badge badge-retailer">
                    {RETAILER_LABELS[m.product.retailer]}
                  </span>
                  {m.unknowns.length > 0 && (
                    <span
                      className="badge badge-unverified"
                      title={`Listing doesn't state: ${m.unknowns.join(', ')}`}
                    >
                      {m.unknowns.join('/')} unverified
                    </span>
                  )}
                </div>
                {specChips(m).length > 0 && (
                  <div className="result-specs">
                    {specChips(m).map((c) => (
                      <span key={c} className="spec-chip">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="result-side">
                <div className="result-price">
                  ${m.product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <a
                  className="result-link"
                  href={m.product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View →
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="results-updated">
        Catalog updated {new Date(file.generatedAt).toLocaleString()} · every
        result is sold directly by the retailer or manufacturer-certified
        refurbished.
      </p>
    </div>
  )
}
