import api from './index'

function normalizeId(id) {
  return id === undefined || id === null ? '' : String(id)
}

export function createExperiment(data) {
  return api.post('/experiment/', {
    ...(data.course_id !== undefined ? { course_id: normalizeId(data.course_id) } : {}),
    ...(data.class_id !== undefined ? { class_id: normalizeId(data.class_id) || null } : {}),
    title: data.title,
    explanation: data.explanation,
    explanation_file: data.explanation_file || null,
    explanation_file_name: data.explanation_file_name || null,
    question_config: data.question_config ?? null,
    score: Number(data.score || 0),
    start_time: data.start_time,
    end_time: data.end_time
  })
}

export function deleteExperiment(experimentId) {
  return api.delete(`/experiment/?experiment_id=${encodeURIComponent(normalizeId(experimentId))}`)
}

export function updateExperiment(data) {
  const payload = {
    id: normalizeId(data.id),
    ...(data.course_id !== undefined ? { course_id: normalizeId(data.course_id) } : {}),
    ...(data.class_id !== undefined ? { class_id: normalizeId(data.class_id) || null } : {}),
    title: data.title,
    explanation: data.explanation,
    explanation_file: data.explanation_file || null,
    explanation_file_name: data.explanation_file_name || null,
    question_config: data.question_config ?? null,
    score: Number(data.score || 0),
    start_time: data.start_time,
    end_time: data.end_time
  }

  if (data.deleted_at !== undefined) {
    payload.deleted_at = data.deleted_at
  }

  return api.put('/experiment/', payload)
}

export function getExperimentById(experimentId) {
  return api.get(`/experiment/id?experiment_id=${encodeURIComponent(normalizeId(experimentId))}`)
}

export function getExperimentsByClassId(classId) {
  return api.get(`/experiment/class_published/${encodeURIComponent(normalizeId(classId))}`)
}

export function getExperimentsByCourseId(courseId) {
  return api.get(`/experiment/course/${encodeURIComponent(normalizeId(courseId))}`)
}

export function publishExperiment(data) {
  return api.post('/experiment/publish', {
    experiment_id: normalizeId(data.experiment_id),
    class_ids: (data.class_ids || []).map(normalizeId),
    publish_time: data.publish_time || null
  })
}

export function unpublishExperiment(data) {
  return api.post('/experiment/unpublish', {
    experiment_id: normalizeId(data.experiment_id),
    class_id: normalizeId(data.class_id)
  })
}

export function getExperimentPublishes(experimentId) {
  return api.get(`/experiment/publishes/${encodeURIComponent(normalizeId(experimentId))}`)
}

export function createExperimentResult(data) {
  return api.post('/experiment/result/', {
    experiment_id: normalizeId(data.experiment_id),
    code: data.code,
    code_file: data.code_file || null,
    code_file_name: data.code_file_name || null
  })
}

export function deleteExperimentResult(experimentResultId) {
  return api.delete(`/experiment/result/?experiment_result_id=${encodeURIComponent(normalizeId(experimentResultId))}`)
}

export function getExperimentResultById(experimentResultId) {
  return api.get(`/experiment/result/id?experiment_result_id=${encodeURIComponent(normalizeId(experimentResultId))}`)
}

export function getExperimentResultsByExperimentId(experimentId) {
  return api.get(`/experiment/result/experiment_id?experiment_id=${encodeURIComponent(normalizeId(experimentId))}`)
}

export function getExperimentResultsByUserId(userId) {
  return api.get(`/experiment/result/user_id?user_id=${encodeURIComponent(normalizeId(userId))}`)
}

export function submitExperimentAnalysis(data) {
  return api.post('/llm/experiment/analysis', {
    question: data.question || {},
    experiment_result_id: normalizeId(data.experiment_result_id)
  })
}
