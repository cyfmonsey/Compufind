import type { SpecRecommendation } from '../engine/types.ts'
import {
  CPU_TIER_LABELS,
  FORM_FACTOR_LABELS,
  GPU_TIER_LABELS,
  formatStorage,
} from '../engine/labels.ts'

interface Props {
  recommendation: SpecRecommendation
  onReset: () => void
}

export default function SpecResult({ recommendation, onReset }: Props) {
  const { spec, maxBudget, warnings } = recommendation

  const ram =
    spec.ramRecommendedGB > spec.ramGB
      ? `${spec.ramGB}GB (${spec.ramRecommendedGB}GB if budget allows)`
      : `${spec.ramGB}GB`

  const storage =
    spec.storageRecommendedGB > spec.storageGB
      ? `${formatStorage(spec.storageGB)} (${formatStorage(spec.storageRecommendedGB)} if budget allows)`
      : formatStorage(spec.storageGB)

  const gpu = spec.gpuPreferredNotRequired
    ? `${GPU_TIER_LABELS[spec.gpu]} — dedicated GPU helpful but not required`
    : GPU_TIER_LABELS[spec.gpu]

  return (
    <section className="spec-result">
      <div className="spec-card">
        <h2>Your target spec</h2>
        <p className="budget-line">
          Max budget: <strong>${maxBudget.toLocaleString()}</strong>
        </p>
        <dl className="spec-grid">
          <div>
            <dt>RAM</dt>
            <dd>{ram}</dd>
          </div>
          <div>
            <dt>CPU</dt>
            <dd>{CPU_TIER_LABELS[spec.cpuTier]}</dd>
          </div>
          <div>
            <dt>Graphics</dt>
            <dd>{gpu}</dd>
          </div>
          <div>
            <dt>Storage</dt>
            <dd>{storage}</dd>
          </div>
          <div>
            <dt>Form factor</dt>
            <dd>{FORM_FACTOR_LABELS[spec.formFactor]}</dd>
          </div>
          <div>
            <dt>Portability</dt>
            <dd>
              {spec.prioritizePortability
                ? 'Prioritize weight & battery life'
                : 'Standard'}
            </dd>
          </div>
        </dl>

        {warnings.map((w) => (
          <p key={w} className="warning">
            ⚠️ {w}
          </p>
        ))}

        {spec.notes.length > 0 && (
          <ul className="notes">
            {spec.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}

        <button type="button" className="reset-btn" onClick={onReset}>
          Start over
        </button>
      </div>

      <div className="results-placeholder">
        <h3>Matching machines</h3>
        <p>
          Live pricing is coming next: this is where in-budget matches from
          Best Buy, eBay Certified Refurbished, and manufacturer/outlet stores
          will appear — every result sold directly by the retailer or
          manufacturer-certified refurbished, with a badge showing which.
        </p>
        <div className="badge-examples" aria-hidden="true">
          <span className="badge badge-direct">Sold by retailer</span>
          <span className="badge badge-refurb">Certified refurbished</span>
        </div>
      </div>
    </section>
  )
}
