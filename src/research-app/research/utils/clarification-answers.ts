import type { ClarificationAnswerValue, ClarificationQuestion, ResearchClarification } from '@moderta/api-contracts/gaia'

interface ClarificationQA {
  question: string
  answer: string
}

function answerToText(value: ClarificationAnswerValue, question: ClarificationQuestion): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'number') {
    const unit = question.answerType === 'number' ? question.unit : undefined
    return unit ? `${value} ${unit}` : String(value)
  }
  return value
}

export function toClarificationAnswers(clarification: ResearchClarification | null): ClarificationQA[] {
  if (!clarification) return []

  const result: ClarificationQA[] = []

  for (const question of clarification.questions) {
    const value = clarification.answers[question.questionId]
    if (value === undefined) continue

    const answer = answerToText(value, question).trim()
    if (answer === '') continue

    result.push({ question: question.text, answer })
  }

  return result
}
