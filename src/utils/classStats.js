/*
 * @Date         : 2026-05-18
 * @Description  : 班级统计数据工具函数
 * @FilePath     : classStats.js
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 */

import { getClassStudentsApi } from '@/api/class'
import { getExamListByClassId } from '@/api/exam'
import { getCourseByClassIdApi } from '@/api/course'

/**
 * 统一处理各种 API 返回格式，提取数组数据
 * @param {*} response - API 响应对象
 * @returns {Array} - 标准化后的数组
 */
export function normalizeListResponse(response) {
  const data = response?.data ?? response

  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.list)) return data.list
  if (Array.isArray(data?.records)) return data.records
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.data?.list)) return data.data.list
  if (Array.isArray(data?.data?.records)) return data.data.records
  if (Array.isArray(data?.data?.items)) return data.data.items

  return []
}

/**
 * 从各种 API 返回格式中提取数量
 * @param {*} response - API 响应对象
 * @returns {number} - 提取的数量
 */
export function getCountFromResponse(response) {
  const data = response?.data ?? response

  if (typeof data?.total === 'number') return data.total
  if (typeof data?.count === 'number') return data.count
  if (typeof data?.data?.total === 'number') return data.data.total
  if (typeof data?.data?.count === 'number') return data.data.count

  const list = normalizeListResponse(response)
  return list.length
}

/**
 * 为单个班级对象补充统计数据
 * @param {Object} classItem - 原始班级对象
 * @returns {Promise<Object>} - 补充了统计数据的班级对象
 */
export async function enrichClassStats(classItem) {
  const classId = classItem.id || classItem.class_id || classItem.classId

  const result = {
    ...classItem,
    studentCount: 0,
    student_count: 0,
    examCount: 0,
    exam_count: 0,
    courseCount: 0,
    course_count: 0
  }

  if (!classId) return result

  // 并行请求三个统计接口
  const [studentsResult, examsResult, courseResult] = await Promise.allSettled([
    getClassStudentsApi(classId),
    getExamListByClassId(classId),
    getCourseByClassIdApi(classId)
  ])

  // 处理学生数量
  if (studentsResult.status === 'fulfilled') {
    const count = getCountFromResponse(studentsResult.value)
    result.studentCount = count
    result.student_count = count
  } else {
    console.warn('[ClassList] 获取学生数失败:', classId, studentsResult.reason)
  }

  // 处理考试数量
  if (examsResult.status === 'fulfilled') {
    const count = getCountFromResponse(examsResult.value)
    result.examCount = count
    result.exam_count = count
  } else {
    console.warn('[ClassList] 获取考试数失败:', classId, examsResult.reason)
  }

  // 处理课程数量
  if (courseResult.status === 'fulfilled') {
    const courseList = normalizeListResponse(courseResult.value)
    const courseData = courseResult.value?.data?.data ?? courseResult.value?.data ?? courseResult.value

    let count = 0
    if (courseList.length > 0) {
      count = courseList.length
    } else if (courseData && typeof courseData === 'object' && Object.keys(courseData).length > 0 && !Array.isArray(courseData)) {
      // 如果返回单个对象且不为空，则计为 1
      count = 1
    }

    result.courseCount = count
    result.course_count = count
  } else {
    console.warn('[ClassList] 获取课程数失败:', classId, courseResult.reason)
  }

  return result
}

/**
 * 为班级列表批量补充统计数据
 * @param {Array} classList - 原始班级列表
 * @returns {Promise<Array>} - 补充了统计数据的班级列表
 */
export async function enrichClassListStats(classList) {
  if (!Array.isArray(classList) || classList.length === 0) {
    return []
  }

  return Promise.all(classList.map(item => enrichClassStats(item)))
}

/**
 * 从班级列表 API 响应中提取总数
 * @param {*} response - API 响应对象
 * @param {Array} enrichedList - 已补充的班级列表（兜底）
 * @returns {number} - 总数
 */
export function extractTotalFromResponse(response, enrichedList = []) {
  return (
    response?.data?.total ??
    response?.data?.data?.total ??
    response?.data?.count ??
    response?.data?.data?.count ??
    enrichedList.length
  )
}

/**
 * 从班级列表 API 响应中提取原始班级数组
 * @param {*} response - API 响应对象
 * @returns {Array} - 班级数组
 */
export function extractClassListFromResponse(response) {
  return normalizeListResponse(response)
}
