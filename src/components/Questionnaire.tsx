import { useState } from 'react'
import type {
  PortabilityPriority,
  ProgrammingStack,
  QuestionnaireAnswers,
  TabHabit,
  UseCase,
} from '../engine/types.ts'
import { USE_CASE_LABELS } from '../engine/labels.ts'

const USE_CASES = Object.keys(USE_CASE_LABELS) as UseCase[]

const TAB_HABITS: { value: TabHabit; label: string }[] = [
  { value: 'light', label: 'Light — fewer than 8 tabs' },
  { value: 'moderate', label: 'Moderate — 8 to 15 tabs' },
  { value: 'heavy', label: 'Heavy — 15+ tabs' },
]

const STACKS: { value: ProgrammingStack; label: string }[] = [
  { value: 'web-light', label: 'Web / light scripting' },
  { value: 'ml-docker-vm', label: 'ML / Docker / VM-heavy' },
  { value: 'mobile-native', label: 'Mobile / native development' },
]

const PORTABILITY: { value: PortabilityPriority; label: string }[] = [
  { value: 'not-important', label: 'Not important' },
  { value: 'somewhat', label: 'Somewhat important' },
  { value: 'very', label: 'Very important — battery & weight over raw power' },
]

interface Props {
  onSubmit: (answers: QuestionnaireAnswers) => void
}

export default function Questionnaire({ onSubmit }: Props) {
  const [budget, setBudget] = useState('')
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [tabHabit, setTabHabit] = useState<TabHabit>('moderate')
  const [heavyMultitasking, setHeavyMultitasking] = useState(false)
  const [stack, setStack] = useState<ProgrammingStack>('web-light')
  const [portability, setPortability] = useState<PortabilityPriority>('somewhat')
  const [error, setError] = useState<string | null>(null)

  const toggleUseCase = (uc: UseCase) => {
    setUseCases((prev) =>
      prev.includes(uc) ? prev.filter((x) => x !== uc) : [...prev, uc],
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const maxBudget = Number(budget)
    if (!Number.isFinite(maxBudget) || maxBudget <= 0) {
      setError('Please enter your maximum budget in dollars.')
      return
    }
    if (useCases.length === 0) {
      setError('Please pick at least one way you plan to use the machine.')
      return
    }
    setError(null)
    onSubmit({
      maxBudget,
      useCases,
      tabHabit: useCases.includes('basic-office') ? tabHabit : undefined,
      heavyMultitasking: useCases.includes('basic-office')
        ? heavyMultitasking
        : undefined,
      programmingStack: useCases.includes('programming') ? stack : undefined,
      portability,
    })
  }

  return (
    <form className="questionnaire" onSubmit={handleSubmit}>
      <fieldset>
        <legend>1. What's your maximum budget?</legend>
        <div className="budget-input">
          <span aria-hidden="true">$</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="any"
            placeholder="1500"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            aria-label="Maximum budget in US dollars"
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>2. How will you use it? (pick all that apply)</legend>
        {USE_CASES.map((uc) => (
          <label key={uc} className="option">
            <input
              type="checkbox"
              checked={useCases.includes(uc)}
              onChange={() => toggleUseCase(uc)}
            />
            {USE_CASE_LABELS[uc]}
          </label>
        ))}
      </fieldset>

      {useCases.includes('basic-office') && (
        <fieldset>
          <legend>3. How many browser tabs do you usually keep open?</legend>
          {TAB_HABITS.map((t) => (
            <label key={t.value} className="option">
              <input
                type="radio"
                name="tabHabit"
                checked={tabHabit === t.value}
                onChange={() => setTabHabit(t.value)}
              />
              {t.label}
            </label>
          ))}
          <label className="option option-followup">
            <input
              type="checkbox"
              checked={heavyMultitasking}
              onChange={(e) => setHeavyMultitasking(e.target.checked)}
            />
            I also keep several heavy apps open alongside the browser
          </label>
        </fieldset>
      )}

      {useCases.includes('programming') && (
        <fieldset>
          <legend>What does your development stack look like?</legend>
          {STACKS.map((s) => (
            <label key={s.value} className="option">
              <input
                type="radio"
                name="stack"
                checked={stack === s.value}
                onChange={() => setStack(s.value)}
              />
              {s.label}
            </label>
          ))}
        </fieldset>
      )}

      <fieldset>
        <legend>How important is portability?</legend>
        {PORTABILITY.map((p) => (
          <label key={p.value} className="option">
            <input
              type="radio"
              name="portability"
              checked={portability === p.value}
              onChange={() => setPortability(p.value)}
            />
            {p.label}
          </label>
        ))}
      </fieldset>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button type="submit" className="submit-btn">
        Get my recommended spec
      </button>
    </form>
  )
}
