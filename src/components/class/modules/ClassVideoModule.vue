<!--
 * @Date         : 2026-05-19
 * @Description  : 班级课程视频模块
 * @FilePath     : ClassVideoModule.vue
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="class-video-module">
    <a-spin v-if="loadingState || props.loading" size="large" class="loading-spin">
      <div class="loading-placeholder"></div>
    </a-spin>

    <a-alert
      v-else-if="error"
      message="加载失败"
      :description="error"
      type="error"
      show-icon
      :closable="false"
    >
      <template #action>
        <a-button size="small" danger @click="handleRetry">重试</a-button>
      </template>
    </a-alert>

    <template v-else>
      <div class="video-layout">
        <div class="video-sidebar">
          <div class="sidebar-header">
            <h3>视频列表</h3>
            <span class="video-count">{{ videos.length }} 个视频</span>
          </div>
          <div class="video-list">
            <a-list
              :data-source="videos"
              :locale="{ emptyText: '暂无视频' }"
            >
              <template #renderItem="{ item }">
                <a-list-item
                  class="video-list-item"
                  :class="{ active: currentVideo?.id === item.id, error: item.error }"
                  @click="handleSelectVideo(item)"
                >
                  <div class="item-thumbnail">
                    <div class="thumbnail-placeholder"></div>
                    <div v-if="!item.error" class="play-icon">
                      <PlayCircleOutlined />
                    </div>
                    <div v-else class="error-icon">
                      <ExclamationCircleOutlined />
                    </div>
                  </div>
                  <a-list-item-meta class="item-meta">
                    <template #title>
                      <div class="item-title">
                        {{ item.title }}
                        <a-tag v-if="item.error" color="error" class="error-tag">
                          {{ item.errorMessage || '无法播放' }}
                        </a-tag>
                      </div>
                    </template>
                    <template #description>
                      <div class="item-description">
                        <span v-if="item.duration">时长: {{ item.duration }}</span>
                        <span v-if="item.size">大小: {{ item.size }}</span>
                        <span v-if="item.create_by">创建人: {{ item.create_by }}</span>
                      </div>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </div>
        </div>

        <div class="video-main">
          <div v-if="currentVideo" class="player-container">
            <div v-if="currentVideo.error" class="video-error">
              <a-result status="error" title="该视频暂时无法播放" :sub-title="currentVideo.errorMessage" />
            </div>
            <template v-else>
              <div class="video-wrapper">
                <video
                  ref="videoRef"
                  class="video-element"
                  :src="currentVideo.playUrl"
                  controls
                  @error="handleVideoError"
                ></video>
              </div>
              <div class="video-details">
                <h3 class="detail-title">{{ currentVideo.title }}</h3>
                <div class="detail-meta">
                  <a-tag v-if="currentVideo.duration" color="blue">时长：{{ currentVideo.duration }}</a-tag>
                  <a-tag v-if="currentVideo.size" color="cyan">大小：{{ currentVideo.size }}</a-tag>
                  <a-tag v-if="currentVideo.create_by" color="default">创建人：{{ currentVideo.create_by }}</a-tag>
                  <a-tag v-if="currentVideo.course" color="purple">课程：{{ currentVideo.course }}</a-tag>
                </div>
              </div>
            </template>
          </div>

          <div v-else class="empty-player">
            <Empty description="请从左侧选择视频播放" />
          </div>
        </div>
      </div>
    </template>

    <!-- AI 答疑助手 -->
    <ChatWidget
      :course-id="courseId"
      :current-video="currentVideo"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { message, Empty } from 'ant-design-vue'
import { PlayCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { getCourseByClassIdApi } from '@/api/course'
import { useCourseVideos } from '@/composables/useCourseVideos'
import ChatWidget from '@/components/common/ChatWidget.vue'

const props = defineProps({
  classId: {
    type: [String, Number],
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const videoRef = ref(null)
const loadingState = ref(false)
const error = ref(null)
const courseId = ref(null)
const { loading: videosLoading, error: videosError, videos, currentVideo, fetchVideos, setCurrentVideo } = useCourseVideos()

async function fetchCourseId() {
  if (!props.classId) {
    return null
  }

  try {
    const response = await getCourseByClassIdApi(props.classId)
    if (response.code === 200 && response.data) {
      courseId.value = response.data.id
      return courseId.value
    }
    error.value = '无法获取课程信息'
    return null
  } catch (err) {
    console.error('获取课程信息失败:', err)
    error.value = '无法获取课程信息'
    return null
  }
}

async function fetchData() {
  if (!props.classId) {
    return
  }

  loadingState.value = true
  error.value = null

  try {
    const cid = await fetchCourseId()
    if (cid) {
      await fetchVideos(cid)
    }
  } catch (err) {
    console.error('获取数据失败:', err)
    error.value = err.message || '获取数据失败'
  } finally {
    loadingState.value = false
  }
}

function handleSelectVideo(video) {
  if (video.error) {
    message.warning('该视频暂时无法播放')
  }
  setCurrentVideo(video)
}

function handleRetry() {
  fetchData()
}

function handleVideoError(e) {
  console.error('视频播放失败:', e)
  message.error('视频播放失败，请稍后重试')
}

watch(() => props.classId, (newClassId) => {
  if (newClassId) {
    fetchData()
  }
}, { immediate: true })

watch(() => props.loading, (newLoading) => {
  if (newLoading) {
    fetchData()
  }
})
</script>

<style scoped>
.class-video-module {
  height: min(704px, calc(100vh - 100px));
  min-height: 550px;
  display: flex;
  flex-direction: column;
}

.loading-spin {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 600px;
}

.loading-placeholder {
  width: 100%;
  height: 600px;
}

.video-layout {
  display: flex;
  flex: 1;
  height: 100%;
  min-height: 0;
  gap: 16px;
  overflow: hidden;
}

.video-sidebar {
  width: 35%;
  max-width: 420px;
  flex-shrink: 0;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.video-count {
  font-size: 12px;
  color: #8c8c8c;
}

.video-list {
  flex: 1;
  max-height: 651px;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
}

.video-list::-webkit-scrollbar {
  width: 6px;
}

.video-list::-webkit-scrollbar-track {
  background: transparent;
}

.video-list::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.video-list::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}

.video-list :deep(.ant-list-item) {
  cursor: pointer;
  min-height: 93px;
  box-sizing: border-box;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.3s ease;
}

.video-list :deep(.ant-list-item:hover) {
  background-color: #fafafa;
}

.video-list-item.active {
  background-color: #e6f7ff;
  border-left: 3px solid #1890ff;
}

.video-list-item.error {
  background-color: #fff2f0;
}

.item-thumbnail {
  position: relative;
  width: clamp(110px, 10vw, 132px);
  aspect-ratio: 16 / 9;
  height: auto;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 12px;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.play-icon,
.error-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 28px;
  color: white;
  opacity: 0.9;
}

.error-icon {
  color: #ff4d4f;
}

.item-meta {
  flex: 1;
}

.item-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  line-height: 1.4;
}

.error-tag {
  font-size: 12px;
  line-height: 1.5;
}

.item-description {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
}

.item-description span::after {
  content: '';
  display: inline-block;
  width: 1px;
  height: 12px;
  background-color: #e8e8e8;
  margin-left: 12px;
  vertical-align: middle;
}

.item-description span:last-child::after {
  display: none;
}

.video-main {
  flex: 1 1 auto;
  height: 100%;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.player-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.video-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  min-height: 0;
}

.video-element {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  outline: none;
  object-fit: contain;
}

.video-error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-details {
  padding-top: 20px;
}

.detail-title {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 600;
  color: #262626;
}

.detail-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.empty-player {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media screen and (max-width: 1024px) {
  .class-video-module {
    height: auto;
    min-height: 0;
  }

  .video-layout {
    flex-direction: column;
    height: auto;
    min-height: 700px;
    overflow: visible;
  }

  .video-sidebar {
    width: 100%;
    height: 320px;
    flex: 0 0 320px;
  }

  .video-main {
    width: 100%;
    height: auto;
    min-height: 380px;
  }

  .video-wrapper {
    min-height: 300px;
  }
}

@media screen and (max-width: 768px) {
  .video-layout {
    min-height: 600px;
  }

  .video-sidebar {
    height: 260px;
    flex-basis: 260px;
  }

  .video-main {
    min-height: 360px;
  }

  .video-wrapper {
    min-height: 250px;
  }

  .detail-meta {
    flex-direction: column;
    gap: 8px;
  }

  .item-description {
    flex-direction: column;
    gap: 4px;
  }

  .item-description span::after {
    display: none;
  }
}
</style>
