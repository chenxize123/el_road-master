/*
 * @Date         : 2026-05-14
 * @Description  : 试卷详情 API 接口
 * @FilePath     : paperDetail.js
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 */

import { courseService } from './course.js'

// 根据试卷 ID 获取试卷基本信息
export function getPaperDetail(paperId) {
  return courseService.request(`/paper/paper_id?paper_id=${paperId}`, {
    method: 'GET'
  })
}

// 根据试卷 ID 获取试卷题目列表
export function getPaperQuestions(paperId) {
  return courseService.request(`/question/paper_id?paper_id=${paperId}`, {
    method: 'GET'
  })
}