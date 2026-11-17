/*
 * @Date         : 2026-05-08 19:47:04
 * @Description  : 班级相关API
 * @FilePath     : class.js
 * @LastEditTime : 2026-05-14 10:50:36
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 * 2026-05-08 19:47:04
 */
// src/api/class.js
import JSONbig from 'json-bigint'
import api from './index'

/**
 * curl 请求示例:
 *
 * 学生/教师获取班级列表:
 * curl -X GET "{API_BASE_URL}/class/user_id" \
 *   -H "accept: application/json" \
 *   -H "Authorization: Bearer {token}"
 *
 * 管理员获取班级列表（带分页）:
 * curl -X GET "{API_BASE_URL}/class/user_id?page=1&page_size=10" \
 *   -H "accept: application/json" \
 *   -H "Authorization: Bearer {token}"
 */

// 获取班级列表，可按课程筛选并保留现有分页参数
export function getClassList(params = {}) {
  const queryParams = new URLSearchParams()
  if (params.course_id !== undefined && params.course_id !== null && params.course_id !== '') {
    queryParams.set('course_id', String(params.course_id))
  }
  if (params.page !== undefined) {
    queryParams.set('page', String(params.page))
  }
  if (params.page_size !== undefined) {
    queryParams.set('page_size', String(params.page_size))
  }

  const queryString = queryParams.toString()
  return api.get(`/class/user_id${queryString ? `?${queryString}` : ''}`)
}

// 保留旧接口名，避免影响班级管理等已有调用方
export function getClassListApi(params = {}) {
  return getClassList(params)
}

// 创建班级
export async function createClassApi(data) {
  console.log('createClassApi', data)
  return api.post('/class/', data)
}

// 获取班级详情
export async function getClassDetailApi(classId) {
  return api.get(`/class/class_id?class_id=${classId}`)
}

// 获取班级学生列表
export async function getClassStudentsApi(classId) {
  return api.get(`/user/class_id?class_id=${classId}`)
}

// 添加学生到班级
export async function addStudentToClassApi(classId, studentId) {
  return api.post(`/class/student?class_id=${classId}&student_id=${studentId}`)
}

// 学生获取自己加入的班级列表
export async function getStudentClassListApi(params = {}) {
  let url = `/class/user_id`

  const queryParams = []
  if (params.page !== undefined) {
    queryParams.push(`page=${params.page}`)
  }
  if (params.page_size !== undefined) {
    queryParams.push(`page_size=${params.page_size}`)
  }
  if (queryParams.length > 0) {
    url += `?${queryParams.join('&')}`
  }

  return api.get(url)
}

// 根据课程ID获取班级列表
export async function getClassListByCourseId(courseId) {
  return api.get(`/class/course_id?course_id=${encodeURIComponent(String(courseId))}`)
}

// 获取班级总数
export async function getClassCountApi() {
  return api.get('/class/count')
}

// 删除班级
export async function deleteClassApi(classId) {
  return api.delete(`/class/?class_id=${classId}`)
}
