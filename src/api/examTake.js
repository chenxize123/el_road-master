/*
 * @Date         : 2026-05-14
 * @Description  : 学生考试相关API接口
 * @FilePath     : examTake.js
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 */

import { courseService } from './course.js'

// 获取考试详情
export function getExamDetail(examId) {
  return courseService.request(`/exam/exam_id?exam_id=${examId}`, {
    method: 'GET'
  })
}

// 获取考试题目
export function getExamQuestions(examId) {
  return courseService.request(`/question/exam_id?exam_id=${examId}`, {
    method: 'GET'
  })
}

// 获取试卷信息
export function getExamPaper(examId) {
  return courseService.request(`/paper/exam_id?exam_id=${examId}`, {
    method: 'GET'
  })
}

// 提交考试
export function submitExam(data) {
  return courseService.request('/exam/submit', {
    method: 'POST',
    body: data
  })
}
