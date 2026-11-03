/** The AI sends printed pages as strings. Keep the whole positive numbers and drop the rest ("iv", "12-14", ""). */
export function toPageNumbers(pages: string[]): number[] {
  const numbers: number[] = []

  for (const page of pages) {
    const value = Number(page.trim())
    if (page.trim() !== '' && Number.isInteger(value) && value > 0) {
      numbers.push(value)
    }
  }

  return numbers
}
