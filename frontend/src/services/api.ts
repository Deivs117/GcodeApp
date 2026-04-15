const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface ProcessResult {
  output: string
  totalLines: number
  filteredLines: number
  fileName: string
}

export async function processFiles(
  files: File[],
  order: string[],
  filterM0M6: boolean
): Promise<ProcessResult> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files[]', file))
  formData.append('order', JSON.stringify(order))
  formData.append('filter_m0m6', filterM0M6.toString())

  const response = await fetch(`${API_BASE}/api/process`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Processing failed')
  }

  return response.json()
}
