import api from '@/api'

// 按课程查询资料列表
export function getCourseResources(courseId) {
  return api.get(`/course/resource/course_id?course_id=${courseId}`)
}

// 上传资料（单个文件一次请求）
export function uploadCourseResource(courseId, file) {
  const formData = new FormData()
  formData.append('course_id', String(courseId))
  formData.append('resource', file)
  return api.postForm('/course/resource/', formData)
}

// 重命名
export function renameCourseResource(id, name) {
  return api.put(
    `/course/resource/?course_resource_id=${id}&name=${encodeURIComponent(name)}`
  )
}

// 删除（逻辑删除）
export function deleteCourseResource(id) {
  return api.delete(`/course/resource/?course_resource_id=${id}`)
}

// 获取临时下载地址
export function getCourseResourceDownloadUrl(objectName) {
  return api.get(
    `/file/course/resource/download?object_name=${encodeURIComponent(objectName)}&expires=10`
  )
}
