export const EMPLOYMENT_RECOMMENDATION_ORIGIN = 'http://10.21.22.111:5174'
export const EMPLOYMENT_RECOMMENDATION_URL = `${EMPLOYMENT_RECOMMENDATION_ORIGIN}/employment`
export const CAMPUS_NETWORK_ONLY_MESSAGE = '只有在燕山大学校园网环境下才可使用此功能'
export const DEFAULT_EMPLOYMENT_RECOMMENDATION_TIMEOUT_MS = 5000

export const buildEmploymentRecommendationUrl = studentId => {
  const params = new URLSearchParams()
  params.set('student_id', studentId || '')
  return `${EMPLOYMENT_RECOMMENDATION_URL}?${params.toString()}`
}

export const openEmploymentRecommendation = ({
  openWindow = globalThis.open,
  studentId
} = {}) => {
  openWindow?.(buildEmploymentRecommendationUrl(studentId), '_blank', 'noopener')
  return true
}
