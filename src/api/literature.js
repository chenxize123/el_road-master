/*
 * @Date         : 2026-06-09
 * @Description  : 课程赋能课题相关 API
 * @FilePath     : literature.js
 * @Version      : V1.0.0
 */
import api from './index'

/**
 * 课程赋能课题
 * POST /api/v1/llm/search
 * @param {number} courseId - 课程ID
 * @param {string} researchTopic - 研究主题
 */
export async function searchLiteratureApi(courseId, researchTopic) {
  return api.request('/llm/search', {
    method: 'POST',
    body: JSON.stringify({
      course_id: courseId,
      research_topic: researchTopic
    }),
    timeout: 600000
  })
}

/**
 * 获取研究记录
 * GET /api/v1/research/course
 * @param {number} courseId - 课程ID
 */
export async function getResearchRecordsApi(courseId) {
  return api.get(`/research/course?course_id=${courseId}`)
}

/**
 * 获取研究详情
 * GET /api/v1/research/id
 * @param {number} researchId - 研究记录ID
 */
export async function getResearchDetailApi(researchId) {
  return api.get(`/research/id?research_id=${researchId}`)
}
