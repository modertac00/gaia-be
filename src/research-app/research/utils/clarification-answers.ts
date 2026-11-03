import type { ClarificationAnswerValue, ResearchClarification } from '@moderta/api-contracts/gaia'

interface ClarificationQA {
  question: string
  answer: string
}

function answerToText(value: ClarificationAnswerValue): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  return value
}

/** The clarification questions the user answered, as question and answer text. Unanswered ones are left out. */
export function toClarificationAnswers(clarification: ResearchClarification | null): ClarificationQA[] {
  if (!clarification) return []

  const result: ClarificationQA[] = []

  for (const question of clarification.questions) {
    const value = clarification.answers[question.questionId]
    if (value === undefined) continue

    const answer = answerToText(value).trim()
    if (answer === '') continue

    result.push({ question: question.text, answer })
  }

  return result
}
