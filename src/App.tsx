import { useState } from 'react'
import Questionnaire from './components/Questionnaire.tsx'
import SpecResult from './components/SpecResult.tsx'
import { recommendSpec } from './engine/specEngine.ts'
import type { QuestionnaireAnswers, SpecRecommendation } from './engine/types.ts'

export default function App() {
  const [recommendation, setRecommendation] =
    useState<SpecRecommendation | null>(null)

  const handleSubmit = (answers: QuestionnaireAnswers) => {
    setRecommendation(recommendSpec(answers))
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Compufind</h1>
        <p>
          Tell us how you'll use your next computer and your budget — we'll
          work out the spec you actually need, then find it from trusted
          retailers and manufacturer-certified refurbished stores.
        </p>
      </header>
      <main>
        {recommendation ? (
          <SpecResult
            recommendation={recommendation}
            onReset={() => setRecommendation(null)}
          />
        ) : (
          <Questionnaire onSubmit={handleSubmit} />
        )}
      </main>
      <footer className="app-footer">
        <p>
          Results will only ever include machines sold directly by the
          retailer/manufacturer or manufacturer-certified refurbished — never
          third-party marketplace sellers.
        </p>
      </footer>
    </div>
  )
}
