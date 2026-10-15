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

// 获取班级列表 - 根据用户角色决定是否需要分页参数
export async function getClassListApi(params = {}) {
  let url = `/class/user_id`

  // 只有当提供了分页参数时才添加查询字符串
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
  return api.get(`/class/course_id?course_id=${courseId}`)
}

// 获取班级总数
export async function getClassCountApi() {
  return api.get('/class/count')
}

// 删除班级
export async function deleteClassApi(classId) {
  return api.delete(`/class/?class_id=${classId}`)
}

