import type { SpecRecommendation } from '../engine/types.ts'
import {
  CPU_TIER_LABELS,
  FORM_FACTOR_LABELS,
  GPU_TIER_LABELS,
  formatStorage,
} from '../engine/labels.ts'
import Results from './Results.tsx'

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

      <Results recommendation={recommendation} />
    </section>
  )
}
