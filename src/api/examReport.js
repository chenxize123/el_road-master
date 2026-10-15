import api from './index'

function normalizeId(id) {
  return id === undefined || id === null ? '' : String(id)
}

export function getExamReportById(examReportId) {
  return api.request(`/exam_report/id?exam_report_id=${encodeURIComponent(normalizeId(examReportId))}`, {
    method: 'GET',
    timeout: 600000
  })
}

export function getExamReportByExamAndClass(examId, classId) {
  return api.request(
    `/exam_report/exam_id_and_class_id?exam_id=${encodeURIComponent(normalizeId(examId))}&class_id=${encodeURIComponent(normalizeId(classId))}`,
    {
      method: 'GET',
      timeout: 600000
    }
  )
}

export function getExamReportByExamAndUser(examId, userId) {
  return api.request(
    `/exam_report/exam_id_and_user_id?exam_id=${encodeURIComponent(normalizeId(examId))}&user_id=${encodeURIComponent(normalizeId(userId))}`,
    {
      method: 'GET',
      timeout: 600000
    }
  )
}
