/*
 * @Date: 2026-05-18
 * @Description: 文件相关 API
 * @FilePath: src/api/file.js
 */
import api from './index'

/**
 * 上传用户头像
 * @param {File} file - 图片文件
 * @returns {Promise}
 */
export function uploadAvatarApi(file) {
  const formData = new FormData()
  formData.append('avatar', file)
  return api.postForm('/file/user/avatar', formData)
}

/**
 * 获取头像临时 URL
 * @param {string} objectName - 文件对象名称
 * @param {number} expires - 有效期（分钟），默认 10
 * @returns {Promise<string>}
 */
export function getAvatarUrlApi(objectName, expires = 10) {
  if (!objectName) return Promise.resolve('')
  return api.get(`/file/user/avatar?object_name=${objectName}&expires=${expires}`)
    .then(res => res.data || '')
}

/**
 * 上传课程封面
 * @param {File} file - 图片文件
 * @param {number|string} courseId - 课程ID
 * @returns {Promise}
 */
export function uploadCourseCoverApi(file, courseId) {
  const formData = new FormData()
  formData.append('cover', file)
  return api.postForm(`/file/course/cover?course_id=${courseId}`, formData)
}

/**
 * 获取课程封面临时 URL
 * @param {string} objectName - 文件对象名称
 * @param {number} expires - 有效期（分钟），默认 10
 * @returns {Promise<string>}
 */
export function getCourseCoverUrlApi(objectName, expires = 10) {
  if (!objectName) return Promise.resolve('')
  console.log(api)
  return api.get(`/file/course/cover?object_name=${objectName}&expires=${expires}`)
    .then(res => res.data || '')
}
