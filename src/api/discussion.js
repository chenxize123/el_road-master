/*
 * @Date         : 2026-05-26
 * @Description  : 班级讨论区 API
 * @FilePath     : discussion.js
 * @Version      : V1.1.0
 */

import api from './index'

/**
 * @typedef {Object} Discussion
 * @property {string} id 讨论 ID，后端大整数按字符串处理
 * @property {string} zl_class 所属班级
 * @property {string} topic 讨论主题
 * @property {string} create_by 创建人
 */

/**
 * @typedef {Object} DiscussionContent
 * @property {string} id 讨论内容 ID，后端大整数按字符串处理
 * @property {string} avatar 发表人头像对象名
 * @property {string} user 发表人
 * @property {string} discussion 讨论主题
 * @property {string} content 内容
 * @property {string} create_time 发布时间
 */

/**
 * @typedef {Object} CreateDiscussionContentParams
 * @property {string | number} discussion_id 讨论 ID
 * @property {string} content 内容
 */

/**
 * 创建讨论
 * @param {{ class_id: string | number, topic: string }} data
 */
export function createDiscussion(data) {
  return api.post('/discussion/', {
    class_id: String(data.class_id),
    topic: data.topic
  })
}

/**
 * 逻辑删除讨论
 * @param {string | number} discussionId
 */
export function deleteDiscussion(discussionId) {
  return api.delete(`/discussion/?discussion_id=${encodeURIComponent(String(discussionId))}`)
}

/**
 * 查询班级所有讨论
 * @param {string | number} classId
 */
export function getDiscussionsByClassId(classId) {
  return api.get(`/discussion/class_id?class_id=${encodeURIComponent(String(classId))}`)
}

/**
 * 添加讨论内容
 * @param {CreateDiscussionContentParams} data
 */
export function createDiscussionContent(data) {
  return api.post('/discussion/content/', {
    discussion_id: String(data.discussion_id),
    content: data.content
  })
}

/**
 * 逻辑删除讨论内容
 * @param {string | number} discussionContentId
 */
export function deleteDiscussionContent(discussionContentId) {
  return api.delete(`/discussion/content/?discussion_content_id=${encodeURIComponent(String(discussionContentId))}`)
}

/**
 * 查看某个讨论下的所有讨论内容
 * @param {string | number} discussionId
 */
export function getDiscussionContentsByDiscussionId(discussionId) {
  return api.get(`/discussion/content/discussion_id?discussion_id=${encodeURIComponent(String(discussionId))}`)
}

/**
 * @typedef {Object} DiscussionEvaluation
 * @property {string} id 评价 ID，后端大整数按字符串处理
 * @property {string} discussion 讨论主题
 * @property {string} user 学生姓名
 * @property {number} engagement_score 参与度评分
 * @property {number} quality_score 内容质量评分
 * @property {number} cognitive_score 认知深度评分
 * @property {number} total_score 总评分
 */

/**
 * 根据讨论 ID 查询每个同学讨论过程的评分/评价
 * @param {string | number} discussionId
 * @returns {Promise<{code: number, message: string, data: DiscussionEvaluation[]}>}
 */
export function getDiscussionEvaluationByDiscussionId(discussionId) {
  return api.get(`/discussion/evaluation/discussion_id?discussion_id=${encodeURIComponent(String(discussionId))}`)
}

/**
 * AI分析讨论内容
 * @param {Object} data
 * @param {string | number} data.discussion_id - 讨论ID
 * @param {string} data.intent - 用户需求/意图
 * @param {string} [data.discussion_content] - 讨论内容（单条分析时需要）
 * @param {string | number} [data.discussion_content_id] - 讨论内容ID（单条分析时需要）
 */
export function analyzeDiscussionContent(data) {
  console.log(data)
  return api.request('/discussion/content/llm', {
    method: 'POST',
    body: JSON.stringify({
      discussion_id: String(data.discussion_id),
      intent: data.intent,
      ...(data.discussion_content !== undefined && { discussion_content: data.discussion_content }),
      ...(data.discussion_content_id !== undefined && { discussion_content_id: String(data.discussion_content_id) })
    }),
    timeout: 600000
  })
}
