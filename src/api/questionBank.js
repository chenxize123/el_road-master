/*
 * @Date         : 2026-05-14
 * @Description  : 题库 API 接口
 * @FilePath     : questionBank.js
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 */

import { courseService } from './course.js'

// 题目类型枚举
export const QUESTION_TYPES = {
  FILL_BLANK: 0,       // 填空题
  JUDGMENT: 1,         // 判断题
  SINGLE_CHOICE: 2,    // 单选题
  MULTIPLE_CHOICE: 3,  // 多选题
  ESSAY: 4             // 简答题
}

// 题目类型标签映射
export const QUESTION_TYPE_LABELS = {
  0: '填空题',
  1: '判断题',
  2: '单选题',
  3: '多选题',
  4: '简答题'
}

// 获取课程题库列表
export function getQuestionBankList(courseId) {
  return courseService.request(`/repo/course_id?course_id=${courseId}`, {
    method: 'GET'
  }).then(response => {
    // 确保返回的数据格式正确
    if (response.code === 200 && Array.isArray(response.data)) {
      return response
    }
    return {
      code: 200,
      message: 'success',
      data: []
    }
  })
}

// 获取题库详情
export function getQuestionBankDetail(id) {
  return courseService.request(`/repo/repo_id?repo_id=${id}`, {
    method: 'GET'
  })
}

// 创建题库
export function createQuestionBank(data) {
  console.log(data)
  return courseService.request('/repo/', {
    method: 'POST',
    body: JSON.stringify({
      title: data.title,
      description: data.description,
      is_open: data.is_open !== undefined ? Boolean(data.is_open) : true,
      course_id: data.courseId
    })
  })
}

// 更新题库
export function updateQuestionBank(id, data) {
  return courseService.request('/repo/', {
    method: 'PUT',
    body: JSON.stringify({
      id: id,
      title: data.title,
      description: data.description,
      is_open: data.is_open !== undefined ? Boolean(data.is_open) : true,
      course_id: data.courseId
    })
  })
}

// 逻辑删除题库
export function deleteQuestionBank(id) {
  return courseService.request(`/repo/?repo_id=${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
}

// ==================== 题目相关 API ====================

// 获取题库的题目列表
export function getQuestionList(repoId) {
  return courseService.request(`/question/repo_id?repo_id=${repoId}`, {
    method: 'GET'
  }).then(response => {
    if (response.code === 200 && Array.isArray(response.data)) {
      return response
    }
    return {
      code: 200,
      message: 'success',
      data: []
    }
  })
}

// 创建题目
export function createQuestion(data) {
  console.log(data)
  return courseService.request('/question/', {
    method: 'POST',
    body: JSON.stringify({
      question: data.question,
      type_: data.type_,
      repo_id: data.repo_id
    })
  })
}

// 更新题目
export function updateQuestion(data) {
  return courseService.request('/question/', {
    method: 'PUT',
    body: JSON.stringify({
      id: data.id,
      question: data.question,
      repo_id: data.repo_id
    })
  })
}

// 逻辑删除题目
export function deleteQuestion(questionId) {
  return courseService.request(`/question/?question_id=${questionId}`, {
    method: 'DELETE'
  })
}
