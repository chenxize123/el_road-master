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

/**
 * 上传实验附件。上传可能耗时较长，因此不使用默认请求超时。
 * @param {File} file
 * @param {string|number} experimentId
 * @returns {Promise}
 */
export function uploadExperimentAttachmentApi(file, experimentId) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('experiment_id', String(experimentId))
  return api.request('/experiment/file/upload', {
    method: 'POST',
    body: formData,
    skipContentType: true,
    timeout: 0
  })
}

/**
 * 获取实验附件列表
 * @param {string|number} experimentId
 * @returns {Promise}
 */
export function getExperimentAttachmentsApi(experimentId) {
  return api.get(`/experiment/file/list?experiment_id=${encodeURIComponent(experimentId)}`)
}

/**
 * 删除实验说明附件
 * @param {string|number} objectName
 * @param {string|number} experimentId
 * @returns {Promise}
 */
export function deleteExperimentAttachmentApi(objectName, experimentId) {
  const params = new URLSearchParams({
    object_name: String(objectName),
    experiment_id: String(experimentId)
  })
  return api.delete(`/experiment/file/delete?${params.toString()}`)
}

/**
 * Upload an attachment for an experiment submission.
 * @param {File} file
 * @param {string|number} experimentResultId
 * @returns {Promise}
 */
export function uploadExperimentResultAttachmentApi(file, experimentResultId) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('result_id', String(experimentResultId))
  return api.request('/experiment/result/file/upload', {
    method: 'POST',
    body: formData,
    skipContentType: true,
    timeout: 0
  })
}

/**
 * Get attachments for an experiment submission.
 * @param {string|number} experimentResultId
 * @returns {Promise}
 */
export function getExperimentResultAttachmentsApi(experimentResultId) {
  return api.get(`/experiment/result/file/list?result_id=${encodeURIComponent(experimentResultId)}`)
}

/**
 * 删除实验提交附件
 * @param {string|number} objectName
 * @param {string|number} experimentResultId
 * @returns {Promise}
 */
export function deleteExperimentResultAttachmentApi(objectName, experimentResultId) {
  const params = new URLSearchParams({
    object_name: String(objectName),
    result_id: String(experimentResultId)
  })
  return api.delete(`/experiment/result/file/delete?${params.toString()}`)
}

/**
 * 获取实验附件临时下载地址
 * @param {string} objectName
 * @returns {Promise<string>}
 */
export function getExperimentAttachmentUrlApi(objectName) {
  if (!objectName) return Promise.resolve('')
  const params = new URLSearchParams({ object_name: objectName })
  return api.get(`/experiment/file/download?${params.toString()}`)
    .then(res => res.data || '')
}

/**
 * 获取实验提交附件的临时下载地址
 * @param {string} objectName
 * @returns {Promise<string>}
 */
export function getExperimentResultAttachmentUrlApi(objectName) {
  if (!objectName) return Promise.resolve('')
  const params = new URLSearchParams({ object_name: objectName })
  return api.get(`/experiment/result/file/download?${params.toString()}`)
    .then(res => res.data || '')
}
