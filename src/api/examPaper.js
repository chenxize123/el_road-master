/*
 * @Date         : 2026-05-14
 * @Description  : 试卷 API 接口
 * @FilePath     : examPaper.js
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 */

import { courseService } from './course.js'

// 获取课程试卷列表
export function getExamPaperList(courseId) {
  return courseService.request(`/paper/course_id?course_id=${courseId}`, {
    method: 'GET'
  })
}

// 创建试卷
export function createExamPaper(data) {
  console.log(data)
  return courseService.request('/paper/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// 一键组卷
export function createOneClickExamPaper(data) {
  return courseService.request('/paper/one_click', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// 更新试卷
export function updateExamPaper(id, data) {
  return courseService.request(`/exam-paper/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

/**
 * 删除试卷（逻辑删除）
 * curl -X 'DELETE' \
 *   'http://111.63.183.17:9000/api/v1/paper/?paper_id=1111' \
 *   -H 'accept: application/json'
 */
export function deleteExamPaper(paperId) {
  return courseService.request(`/paper/?paper_id=${paperId}`, {
    method: 'DELETE'
  })
}
