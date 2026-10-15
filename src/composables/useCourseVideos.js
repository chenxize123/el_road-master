/*
 * @Date         : 2026-05-19
 * @Description  : 课程视频管理 composable
 * @FilePath     : useCourseVideos.js
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 */

import { ref } from 'vue'
import { getCourseVideosWithUrlsApi, uploadCourseVideoApi } from '@/api/course'

export function useCourseVideos() {
  const loading = ref(false)
  const error = ref(null)
  const videos = ref([])
  const currentVideo = ref(null)
  const uploading = ref(false)
  const uploadProgress = ref(0)

  async function fetchVideos(courseId) {
    if (!courseId) {
      videos.value = []
      currentVideo.value = null
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await getCourseVideosWithUrlsApi(courseId)
      if (response.code === 200 && Array.isArray(response.data)) {
        videos.value = response.data
        if (response.data.length > 0) {
          const firstPlayable = response.data.find(v => !v.error && v.playUrl)
          currentVideo.value = firstPlayable || response.data[0]
        } else {
          currentVideo.value = null
        }
      } else {
        error.value = response.message || '获取视频列表失败'
        videos.value = []
        currentVideo.value = null
      }
    } catch (err) {
      console.error('获取视频列表失败:', err)
      error.value = err.message || '网络请求失败，请稍后重试'
      videos.value = []
      currentVideo.value = null
    } finally {
      loading.value = false
    }
  }

  function setCurrentVideo(video) {
    currentVideo.value = video
  }

  async function uploadVideo(formData) {
    uploading.value = true
    uploadProgress.value = 0

    return new Promise((resolve, reject) => {
      uploadCourseVideoApi(
        formData,
        (percent) => {
          uploadProgress.value = percent
        },
        (response) => {
          uploading.value = false
          if (response.code === 200) {
            resolve(response)
          } else {
            reject(new Error(response.message || '上传失败'))
          }
        },
        (error) => {
          uploading.value = false
          reject(error)
        }
      )
    })
  }

  return {
    loading,
    error,
    videos,
    currentVideo,
    uploading,
    uploadProgress,
    fetchVideos,
    setCurrentVideo,
    uploadVideo
  }
}
