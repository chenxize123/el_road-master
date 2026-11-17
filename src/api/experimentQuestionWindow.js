import api from './index'

function normalizeId(id) {
  return id === undefined || id === null ? '' : String(id)
}

export function getExperimentQuestionWindowApi(experimentId) {
  const params = new URLSearchParams({ experiment_id: normalizeId(experimentId) })
  return api.get(`/experiment/question-status?${params.toString()}`)
}

export function openExperimentQuestionWindowApi(experimentId, durationMin) {
  const params = new URLSearchParams({
    experiment_id: normalizeId(experimentId),
    duration_min: String(durationMin)
  })
  return api.request(`/experiment/question-open?${params.toString()}`, { method: 'POST' })
}

export function closeExperimentQuestionWindowApi(experimentId) {
  const params = new URLSearchParams({ experiment_id: normalizeId(experimentId) })
  return api.request(`/experiment/question-close?${params.toString()}`, { method: 'POST' })
}
