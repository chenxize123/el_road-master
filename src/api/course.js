/*
 * @Date         : 2026-05-13 14:30:00
 * @Description  : 课程相关API接口 - 统一管理服务
 * @FilePath     : course.js
 * @LastEditTime : 2026-06-08 15:54:33
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 */

import { ref } from 'vue'
import JSONbig from 'json-bigint'

// 全局状态管理
const courseState = {
  // 缓存数据
  cachedData: {},
  // 加载状态
  loadingStates: {},
  // 错误信息
  errors: {}
}

// 创建响应式状态
export const useCourseState = () => {
  const courses = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref(null)

  return {
    courses,
    total,
    loading,
    error,
    // 重置状态
    reset() {
      courses.value = []
      total.value = 0
      loading.value = false
      error.value = null
    }
  }
}

// 课程API服务
export class CourseService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL 
  }

  // 获取认证token（支持多种key）
  getToken() {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('token') ||           // 主要key
        localStorage.getItem('auth_token') ||      // 备用key
        document.cookie.match(/token=([^;]+)/)?.[1] || // Cookie
        ''
      )
    }
    return ''
  }

  // 统一API请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const token = this.getToken()

    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    }

    const config = { ...defaultOptions, ...options }

    // 如果有 body 且是对象，JSON.stringify 它一次
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body)
    }

    try {
      console.log(`📡 发起API请求:`, { url, method: config.method, body: config.body })

      const response = await fetch(url, config)

      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`)
      }

      // 使用 JSONbig 处理大整数
      const text = await response.text()
      const data = text ? JSONbig({ storeAsString: true }).parse(text) : {}
      console.log(`✅ API响应成功:`, data)

      return data

    } catch (error) {
      console.error(`❌ API请求失败:`, error)
      throw error
    }
  }

  // multipart/form-data 请求方法，上传文件时由浏览器自动生成 Content-Type 边界
  async requestForm(endpoint, formData, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const token = this.getToken()

    try {
      console.log(`📡 发起表单API请求:`, { url, method: options.method || 'POST' })

      const response = await fetch(url, {
        method: options.method || 'POST',
        body: formData,
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...(options.headers || {})
        }
      })

      const text = await response.text()
      const data = text ? JSONbig({ storeAsString: true }).parse(text) : {}

      if (!response.ok) {
        const error = new Error(data?.msg || data?.message || `HTTP错误! 状态: ${response.status}`)
        error.data = data
        error.status = response.status
        throw error
      }

      console.log(`✅ 表单API响应成功:`, data)

      return data
    } catch (error) {
      console.error(`❌ 表单API请求失败:`, error)
      throw error
    }
  }

  // 获取教师课程
  async getTeacherCourses(teacherIdOrParams) {
    console.log(`📚 获取教师课程:`, teacherIdOrParams)
    let params = {}
    let key = 'teacher_all'

    // 检查参数类型
    if (typeof teacherIdOrParams === 'object' && teacherIdOrParams !== null) {
      params = teacherIdOrParams
      key = `teacher_${params.teacher_id || 'all'}_page_${params.page || 1}`
    } else {
      // 旧的调用方式，保持向后兼容
      params.teacher_id = teacherIdOrParams
      key = `teacher_${teacherIdOrParams || 'all'}`
    }

    const cacheKey = `${key}_data`

    // 检查缓存
    // if (courseState.cachedData[cacheKey]) {
    //   console.log(`♻️ 使用缓存的课程数据:`, cacheKey)
    //   return courseState.cachedData[cacheKey]
    // }

    try {
      // 构建查询参数
      const queryParams = new URLSearchParams()
      if (params.teacher_id) queryParams.append('teacher_id', params.teacher_id)
      if (params.page) queryParams.append('page', params.page)
      if (params.page_size) queryParams.append('page_size', params.page_size)

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''
      const endpoint = `/course/teacher_id/${queryString}`

      const result = await this.request(endpoint, {
        method: 'GET'
      })

      // 缓存结果
      courseState.cachedData[cacheKey] = result
      console.log(`✅ 获取课程数据成功:`, cacheKey)
      return result

    } catch (error) {
      courseState.errors[key.replace(/_page_\d+/, '')] = error.message
      throw error
    }
  }

  // 获取所有课程
  async getAllCourses() {
    const key = 'admin_all_courses'
    const cacheKey = `${key}_data`

    if (courseState.cachedData[cacheKey]) {
      console.log(`♻️ 使用缓存的管理员课程数据`)
      return courseState.cachedData[cacheKey]
    }

    try {
      const result = await this.request('/course/', {
        method: 'GET'
      })

      courseState.cachedData[cacheKey] = result
      return result

    } catch (error) {
      courseState.errors[key] = error.message
      throw error
    }
  }

  // 刷新指定用户的课程数据
  async refreshUserCourses(userRole, teacherId = null) {
    const key = userRole === 'teacher' ? `teacher_${teacherId}` : 'admin_all'

    // 清除缓存
    delete courseState.cachedData[`${key}_data`]
    delete courseState.errors[key]

    // 重新获取数据
    if (userRole === 'teacher') {
      return await this.getTeacherCourses(teacherId)
    } else {
      return await this.getAllCourses()
    }
  }

  // 清空所有缓存
  clearCache() {
    Object.keys(courseState.cachedData).forEach(key => {
      delete courseState.cachedData[key]
    })
    console.log('🗑️ 已清空课程数据缓存')
  }

  // 获取缓存统计信息
  getCacheStats() {
    return {
      cachedItems: Object.keys(courseState.cachedData).length,
      errors: Object.keys(courseState.errors).length,
      cachedKeys: Object.keys(courseState.cachedData),
      errorKeys: Object.keys(courseState.errors)
    }
  }
}

// 创建单例实例
export const courseService = new CourseService()

// 导出便捷函数
export const getTeacherCourses = (teacherId) => courseService.getTeacherCourses(teacherId)
export const getAllCourses = () => courseService.getAllCourses()
export const refreshUserCourses = (userRole, teacherId) => courseService.refreshUserCourses(userRole, teacherId)

// 导出其他API函数以保持向后兼容
export function getCourseListApi(params = {}) {
  return courseService.getTeacherCourses(params.teacherId)
}

export function createCourseApi(data) {
  return courseService.request('/course/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export function getCourseDetailApi(courseId) {
  return courseService.request(`/course/${courseId}`)
}

export function updateCourseApi(courseId, data) {
  return courseService.request(`/course/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export function deleteCourseApi(courseId) {
  return courseService.request(`/course/?course_id=${courseId}`, {
    method: 'DELETE'
  })
}

// 获取知识图谱数据
export function getKnowledgeGraphApi(courseId) {
  return courseService.request(`/course/${courseId}/knowledge-graph`)
}

// 获取课程统计数据
export function getCourseStatsApi(courseId) {
  return courseService.request(`/course/${courseId}/stats`)
}

// 获取课程班级列表
export function getCourseClassesApi(courseId) {
  return courseService.request(`/course/${courseId}/classes`)
}

// 获取课程视频列表
export function getCourseVideosApi(courseId) {
  return courseService.request(`/course/${courseId}/videos`)
}

/**
 * curl 请求示例:
 * curl -X GET "{API_BASE_URL}/course/course_id?course_id=121" \
 *   -H "accept: application/json" \
 *   -H "Authorization: Bearer {token}"
 */
// 获取课程基本信息
export function getCourseBasicInfoApi(courseId) {
  return courseService.request(`/course/course_id?course_id=${courseId}`)
}

/**
 * curl 请求示例:
 * curl -X GET "{API_BASE_URL}/course/class_id?class_id=7460609788280479744" \
 *   -H "accept: application/json"
 */
// 根据班级获取课程
export function getCourseByClassIdApi(classId) {
  return courseService.request(`/course/class_id?class_id=${classId}`)
}

// 获取知识图谱数据
export function getKnowledgePointApi(courseId) {
  console.log(`获取课程基本信息:`, courseId)
  return courseService.request(`/course/point/course_id?course_id=${courseId}`)
}

// 更新知识图谱知识点
export function updateKnowledgePointApi(data) {
  return courseService.request('/course/point/', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

// 上传教材文档进行知识点抽取
export function extractKnowledgePointApi(file, courseId) {
  const formData = new FormData()
  formData.append('file', file)
  return courseService.requestForm(`/knowledge_point/extract?course_id=${encodeURIComponent(courseId)}`, formData)
}

// 查询知识点抽取任务状态
export function getKnowledgePointExtractStatusApi(taskId) {
  return courseService.request(`/knowledge_point/status/${taskId}`)
}

// 更新课程基本信息
export function updateCourseBasicInfoApi(data) {
  return courseService.request('/course/', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

// 创建课程教案
export function createLessonPlanApi(data) {
  return courseService.request('/lesson_plan/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// 根据课程 ID 获取教案列表
export function getLessonPlanListByCourseIdApi(courseId) {
  return courseService.request(`/lesson_plan/course_id?course_id=${courseId}`, {
    method: 'GET'
  })
}

// 根据教案 ID 获取教案详情
export function getLessonPlanByIdApi(lessonPlanId) {
  return courseService.request(`/lesson_plan/id?lesson_plan_id=${lessonPlanId}`, {
    method: 'GET'
  })
}

// 更新课程教案
export function updateLessonPlanApi(data) {
  return courseService.request('/lesson_plan/', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

// 删除课程教案
export function deleteLessonPlanApi(lessonPlanId) {
  return courseService.request(`/lesson_plan/?lesson_plan_id=${lessonPlanId}`, {
    method: 'DELETE'
  })
}

// 生成填空题
export function generateGapFillQuestion(pointList) {
  // pointList 现在是包含完整信息的对象数组，我们需要提取 ID 用于向后兼容
  const pointIds = pointList.map(point => typeof point === 'string' ? point : "label:" + point.label + "content:" + point.content)
  return courseService.request('/llm/gap_fill', {
    method: 'POST',
    body: JSON.stringify({
      point_list: pointIds,
      knowledge_points: pointList  // 同时传递完整信息给 AI
    })
  })
}

// 生成判断题
export function generateTrueFalseQuestion(pointList) {
  const pointIds = pointList.map(point => typeof point === 'string' ? point : "label:" + point.label + "content:" + point.content)
  return courseService.request('/llm/true_or_false', {
    method: 'POST',
    body: JSON.stringify({
      point_list: pointIds,
      knowledge_points: pointList
    })
  })
}

// 生成单选题
export function generateSingleChoiceQuestion(pointList) {
  console.log(`生成单选题:`, pointList)
  const pointIds = pointList.map(point => typeof point === 'string' ? point : "label:" + point.label + "content:" + point.content)
  console.log(`pointIds:`, pointIds)
  return courseService.request('/llm/single_choice', {
    method: 'POST',
    body: JSON.stringify({
      point_list: pointIds,
      knowledge_points: pointList
    })
  })
}

// 生成多选题
export function generateMultipleChoiceQuestion(pointList) {
  const pointIds = pointList.map(point => typeof point === 'string' ? point : "label:" + point.label + "content:" + point.content)
  return courseService.request('/llm/multiple_choice', {
    method: 'POST',
    body: JSON.stringify({
      point_list: pointIds,
      knowledge_points: pointList
    })
  })
}

// 生成简答题
export function generateShortAnswerQuestion(pointList) {
  const pointIds = pointList.map(point => typeof point === 'string' ? point : "label:" + point.label + "content:" + point.content)
  return courseService.request('/llm/short_answer', {
    method: 'POST',
    body: JSON.stringify({
      point_list: pointIds,
      knowledge_points: pointList
    })
  })
}

function buildPointList(pointList) {
  return pointList.map(point => typeof point === 'string' ? point : "label:" + point.label + "content:" + point.content)
}

function generateQuestionToRepo(endpoint, pointList, repoId) {
  return courseService.request(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      point_list: buildPointList(pointList),
      repo_id: String(repoId)
    })
  })
}

export function generateGapFillQuestionToRepo(pointList, repoId) {
  return generateQuestionToRepo('/llm/gap_fill/background', pointList, repoId)
}

export function generateTrueFalseQuestionToRepo(pointList, repoId) {
  return generateQuestionToRepo('/llm/true_or_false/background', pointList, repoId)
}

export function generateSingleChoiceQuestionToRepo(pointList, repoId) {
  return generateQuestionToRepo('/llm/single_choice/background', pointList, repoId)
}

export function generateMultipleChoiceQuestionToRepo(pointList, repoId) {
  return generateQuestionToRepo('/llm/multiple_choice/background', pointList, repoId)
}

export function generateShortAnswerQuestionToRepo(pointList, repoId) {
  return generateQuestionToRepo('/llm/short_answer/background', pointList, repoId)
}

/**
 * 获取班级用户列表
 * curl -X GET "{API_BASE_URL}/user/class_id?class_id={classId}" \
 *   -H "accept: application/json"
 */
export function getUsersByClassId(classId) {
  return courseService.request(`/user/class_id?class_id=${classId}`, {
    method: 'GET'
  })
}

// ==================== 视频相关 API ====================

/**
 * 获取课程视频列表
 * curl -X GET "{API_BASE_URL}/course/video/course_id?course_id={courseId}" \
 *   -H "accept: application/json"
 */
export function getCourseVideoListApi(courseId) {
  return courseService.request(`/course/video/course_id?course_id=${courseId}`, {
    method: 'GET'
  })
}

/**
 * 获取视频临时播放 URL
 * curl -X GET "{API_BASE_URL}/file/course/video?object_name={objectName}&expires=216000" \
 *   -H "accept: application/json"
 */
export function getVideoPlayUrlApi(objectName) {
  return courseService.request(`/file/course/video?object_name=${encodeURIComponent(objectName)}&expires=60`, {
    method: 'GET'
  }).then(res => {
    console.log('[getVideoPlayUrlApi] API 响应:', res)
    if (res.data) {
      let url = res.data
      console.log('[getVideoPlayUrlApi] 返回的原始 URL:', url)

      // 临时修复：将本地地址替换为公网地址
      if (url && url.includes('127.0.0.1:9003')) {
        url = url.replace('http://127.0.0.1:9003', 'http://111.63.183.17:9000')
        console.log('[getVideoPlayUrlApi] 替换后的 URL:', url)
        res.data = url
      }
      if (url && url.includes('localhost:9003')) {
        url = url.replace('http://localhost:9003', 'http://111.63.183.17:9000')
        console.log('[getVideoPlayUrlApi] 替换后的 URL:', url)
        res.data = url
      }
    }
    return res
  })
}

/**
 * 并发获取视频列表及所有播放 URL
 */
export async function getCourseVideosWithUrlsApi(courseId) {
  // 先获取列表
  const listResponse = await getCourseVideoListApi(courseId)
  if (listResponse.code !== 200 || !Array.isArray(listResponse.data)) {
    return listResponse
  }

  const videos = listResponse.data

  // 并发获取所有视频的播放 URL
  const urlPromises = videos.map(async (video) => {
    try {
      const urlResponse = await getVideoPlayUrlApi(video.video)
      if (urlResponse.code === 200 && urlResponse.data) {
        return { ...video, playUrl: urlResponse.data, error: false }
      }
      return { ...video, playUrl: null, error: true, errorMessage: urlResponse.message || '获取播放地址失败' }
    } catch (err) {
      return { ...video, playUrl: null, error: true, errorMessage: err.message || '网络请求失败' }
    }
  })

  const videosWithUrls = await Promise.all(urlPromises)

  return {
    code: 200,
    message: 'success',
    data: videosWithUrls
  }
}

/**
 * 上传课程视频（支持进度显示）
 * @param {FormData} formData - 表单数据（包含 title, course_id, video）
 * @param {Function} onProgress - 进度回调 (percent) => void
 * @param {Function} onSuccess - 成功回调 (response) => void
 * @param {Function} onError - 失败回调 (error) => void
 * @returns {Function} 取消上传的函数
 */
export function uploadCourseVideoApi(formData, onProgress, onSuccess, onError) {
  console.log('uploadCourseVideoApi 被调用')
  const xhr = new XMLHttpRequest()
  const baseUrl = import.meta.env.VITE_API_BASE_URL 
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || ''

  console.log('上传地址:', baseUrl + '/course/video/')
  console.log('Token:', token ? '存在' : '不存在')

  // 进度监听
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100)
      console.log('XHR 进度:', e.loaded, '/', e.total, '=', percent + '%')
      onProgress && onProgress(percent)
    }
  }

  // 完成监听
  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const data = xhr.responseText
          ? JSONbig({ storeAsString: true }).parse(xhr.responseText)
          : {}
        onSuccess && onSuccess(data)
      } catch (e) {
        onError && onError(new Error('解析响应失败'))
      }
    } else {
      let errorMsg = `上传失败: ${xhr.status}`
      try {
        const errData = xhr.responseText
          ? JSONbig({ storeAsString: true }).parse(xhr.responseText)
          : {}
        errorMsg = errData.message || errorMsg
      } catch (e) {
        // 忽略解析错误
      }
      onError && onError(new Error(errorMsg))
    }
  }

  // 错误监听
  xhr.onerror = () => {
    onError && onError(new Error('网络错误，请稍后重试'))
  }

  // 打开连接
  xhr.open('POST', `${baseUrl}/course/video/`)

  // 设置 headers
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
  }

  // 发送请求
  xhr.send(formData)

  // 返回取消函数
  return () => xhr.abort()
}

// 获取课程总数
export async function getCourseCountApi() {
  return courseService.request('/course/count', {
    method: 'GET'
  })
}
