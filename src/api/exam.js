/*
 * @Date         : 2026-05-14
 * @Description  : 考试 API 接口
 * @FilePath     : exam.js
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 */

import { courseService } from './course.js'

// 获取课程考试列表
export function getExamList(courseId) {
  return courseService.request(`/exam?courseId=${courseId}`, {
    method: 'GET'
  })
}

// 获取班级考试列表
export function getExamListByClassId(classId) {
  return courseService.request(`/exam/class_id?class_id=${classId}`, {
    method: 'GET'
  })
}

// 创建考试
export function createExam(data) {
  console.log(data)
  return courseService.request('/exam/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// 更新考试
export function updateExam(data) {
  return courseService.request('/exam/', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

// 删除考试
export function deleteExam(id) {
  return courseService.request(`/exam/?exam_id=${id}`, {
    method: 'DELETE'
  })
}

// 获取学生考试结果
export function getExamResultMe(examId) {
  return courseService.request(`/exam/result/me?exam_id=${examId}`, {
    method: 'GET'
  })
}

// 获取所有学生考试结果（教师/管理员）
export function getExamResultAll(examId) {
  return courseService.request(`/exam/result/all?exam_id=${examId}`, {
    method: 'GET'
  })
}

// 获取考试详情
export function getExamDetail(examId) {
  return courseService.request(`/exam/${examId}`, {
    method: 'GET'
  })
}
