<!--
 * @Date         : 2026-05-19
 * @Description  : 课程视频模块
 * @FilePath     : VideoModule.vue
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="video-module">
    <a-spin v-if="loading || props.loading" size="large" class="loading-spin">
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
      <!-- 标签页导航 -->
      <a-tabs v-model:activeKey="activeTab" class="video-tabs">
        <a-tab-pane key="list" tab="视频列表" />
        <a-tab-pane v-if="canUpload" key="upload" tab="上传视频" />
      </a-tabs>

      <!-- 视频列表视图 -->
      <div v-if="activeTab === 'list'" class="tab-content">
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
              </template>
            </div>

            <div v-else class="empty-player">
              <Empty description="请从左侧选择视频播放" />
            </div>
          </div>
        </div>
      </div>

      <!-- 上传视频视图 -->
      <div v-if="canUpload && activeTab === 'upload'" class="tab-content">
        <VideoUploadForm
          :course-id="courseId"
          @success="handleUploadSuccess"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message, Empty } from 'ant-design-vue'
import { PlayCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/store'
import { useCourseVideos } from '@/composables/useCourseVideos'
import VideoUploadForm from './VideoUploadForm.vue'

const props = defineProps({
  courseId: {
    type: [String, Number],
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const videoRef = ref(null)
const activeTab = ref('list')
const userStore = useUserStore()
const canUpload = computed(() => userStore.userInfo?.user_type !== 'visitor')
const { loading, error, videos, currentVideo, fetchVideos, setCurrentVideo } = useCourseVideos()

function handleSelectVideo(video) {
  if (video.error) {
    message.warning('该视频暂时无法播放')
  }
  setCurrentVideo(video)
}

function handleRetry() {
  fetchVideos(props.courseId)
}

function handleVideoError(e) {
  console.error('视频播放失败:', e)
  message.error('视频播放失败，请稍后重试')
}

function handleUploadSuccess() {
  activeTab.value = 'list'
  handleRetry()  // 刷新视频列表
}

watch(() => props.courseId, (newCourseId) => {
  if (newCourseId) {
    fetchVideos(newCourseId)
  }
}, { immediate: true })

watch(() => props.loading, (newLoading) => {
  if (newLoading && props.courseId) {
    fetchVideos(props.courseId)
  }
})
</script>

<style scoped>
.video-module {
  height: calc(100vh - 130px);
  min-height: 550px;
  display: flex;
  flex-direction: column;
}

.loading-spin {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 180px);
  min-height: 550px;
}

.loading-placeholder {
  width: 100%;
  height: 100%;
}

.video-tabs {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.video-layout {
  display: flex;
  flex: 1;
  gap: 16px;
  overflow: hidden;
  min-height: 0;
}

.video-sidebar {
  width: 35%;
  max-width: 420px;
  flex-shrink: 0;
  align-self: flex-start;
  height: min(704px, calc(100vh - 100px));
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
  flex-shrink: 0;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: -0.2px;
}

.video-count {
  font-size: 12px;
  color: #8c8c8c;
  font-variant-numeric: tabular-nums;
}

.video-list {
  flex: 1 1 auto;
  max-height: 651px;
  min-height: 0;
  overflow-y: scroll;
  overflow-x: hidden;
  position: relative;
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
  height: min(704px, calc(100vh - 100px));
  box-sizing: border-box;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
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
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 8px;
  overflow: hidden;
  min-height: 0;
}

.video-element {
  width: 100%;
  height: 100%;
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
  .video-module {
    height: auto;
    min-height: 700px;
  }

  .video-layout {
    flex-direction: column;
    min-height: 700px;
  }

  .video-sidebar {
    width: 100%;
    height: 320px;
  }

  .video-main {
    width: 100%;
    height: auto;
    min-height: 380px;
  }

  .video-wrapper {
    min-height: 320px;
  }
}

@media screen and (max-width: 768px) {
  .video-module {
    min-height: 600px;
  }

  .video-layout {
    min-height: 600px;
  }

  .video-sidebar {
    width: 100%;
    height: 260px;
  }

  .video-wrapper {
    min-height: 240px;
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
