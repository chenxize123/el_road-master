<!--
 * @Date         : 2026-05-13 14:30:00
 * @Description  : 课程信息头部组件
 * @FilePath     : CourseHeader.vue
 * @LastEditTime : 2026-05-13 14:30:00
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <a-card class="course-header" :loading="loading">
    <!-- 封面图 -->
    <div class="cover-section">
      <a-upload
        name="cover"
        :showUploadList="false"
        :beforeUpload="beforeUpload"
        :customRequest="customUpload"
        :disabled="uploading"
        class="cover-uploader"
      >
        <div class="cover-image" :style="{ backgroundImage: coverUrl ? `url(${coverUrl})` : 'none' }">
          <div v-if="!coverUrl" class="cover-placeholder">
            <div class="placeholder-content">
              <CameraOutlined />
              <span>点击上传封面</span>
            </div>
          </div>
          <div v-if="coverUrl" class="cover-overlay">
            <div class="overlay-content">
              <CameraOutlined />
              <span>更换封面</span>
            </div>
          </div>
        </div>
      </a-upload>

      <div class="header-info">
        <div class="info-main">
          <h1 class="course-title">{{ courseInfo.title }}</h1>
          <p class="course-desc">{{ courseInfo.description }}</p>

          <div class="meta-info">
            <a-space size="large">
              <div class="meta-item">
                <user-outlined />
                <span>{{ courseInfo.teacher_name || '未设置教师' }}</span>
              </div>
              <div class="meta-item">
                <calendar-outlined />
                <span>创建于 {{ formatDate(courseInfo.create_time) }}</span>
              </div>
              <div class="meta-item">
                <clock-circle-outlined />
                <span>{{ courseInfo.class_hour }}课时</span>
              </div>
              <div class="meta-item">
                <team-outlined />
                <span>{{ courseInfo.student_count || 0 }}名学生</span>
              </div>
            </a-space>
          </div>

          <div class="status-tags">
            <a-tag color="blue" v-if="courseInfo.status === 'published'">已发布</a-tag>
            <a-tag color="orange" v-else-if="courseInfo.status === 'draft'">草稿</a-tag>
            <a-tag color="green">
              难度：{{ courseInfo.difficulty_level || '未设置' }}
            </a-tag>
            <a-tag color="purple">
              {{ courseInfo.knowledge_point_count || 0 }}个知识点
            </a-tag>
          </div>
        </div>

        <div class="action-buttons">
          <a-button-group>
            <a-button type="primary" @click="handleEdit">
              <template #icon><edit-outlined /></template>
              编辑课程
            </a-button>
            <a-button @click="$emit('preview')">
              <template #icon><eye-outlined /></template>
              预览
            </a-button>
            <a-button @click="$emit('share')">
              <template #icon><share-alt-outlined /></template>
              分享
            </a-button>
          </a-button-group>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <a-row :gutter="16">
        <a-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-number">{{ courseInfo.student_count || 0 }}</div>
            <div class="stat-label">学习学生</div>
          </div>
        </a-col>
        <a-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-number">{{ courseInfo.knowledge_point_count || 0 }}</div>
            <div class="stat-label">知识点</div>
          </div>
        </a-col>
        <a-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-number">{{ courseInfo.completion_rate || 0 }}%</div>
            <div class="stat-label">完成率</div>
          </div>
        </a-col>
        <a-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-number">{{ courseInfo.video_count || 0 }}</div>
            <div class="stat-label">视频数</div>
          </div>
        </a-col>
      </a-row>
    </div>
  </a-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  EditOutlined,
  EyeOutlined,
  ShareAltOutlined,
  CameraOutlined
} from '@ant-design/icons-vue'
import { getCourseCoverUrlApi, uploadCourseCoverApi } from '@/api/file'

const props = defineProps({
  courseInfo: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'preview', 'share', 'cover-uploaded'])

const uploading = ref(false)
const coverUrl = ref('')

// 获取临时封面 URL
const fetchCoverUrl = async () => {
  const objectName = props.courseInfo?.cover
  if (!objectName) {
    coverUrl.value = ''
    return
  }
  try {
    coverUrl.value = await getCourseCoverUrlApi(objectName, 10)
  } catch (error) {
    console.error('获取封面URL失败:', error)
    coverUrl.value = ''
  }
}

// 监听 courseInfo.cover 变化
watch(() => props.courseInfo?.cover, () => {
  fetchCoverUrl()
}, { immediate: true })

onMounted(() => {
  fetchCoverUrl()
})

// 文件上传前验证
const beforeUpload = (file) => {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
  if (!isJpgOrPng) {
    message.error('只支持 JPG/PNG 格式图片!')
    return false
  }
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    message.error('图片大小不能超过 5MB!')
    return false
  }
  return true
}

// 自定义上传
const customUpload = async ({ file }) => {
  if (uploading.value) return
  uploading.value = true

  try {
    await uploadCourseCoverApi(file, props.courseInfo.id)
    message.success('封面上传成功')
    emit('cover-uploaded')
  } catch (error) {
    message.error('封面上传失败: ' + (error.message || '未知错误'))
  } finally {
    uploading.value = false
  }
}

// 处理编辑按钮点击
const handleEdit = () => {
  // TODO: 跳转到课程编辑页面
  // router.push(`/course/${props.courseInfo.id}/edit`)
  emit('edit')
}
</script>

<style scoped>
.course-header {
  border-radius: 16px;
  margin-bottom: 24px;
}

/* 封面和信息区域 */
.cover-section {
  display: flex;
  gap: 32px;
  margin-bottom: 32px;
}

.cover-uploader {
  display: block;
  cursor: pointer;
}

.cover-image {
  width: 280px;
  height: 160px;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
  background-color: #f0f2f5;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  transition: all 0.3s ease;
}

.cover-uploader:hover .cover-image {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e6f7ff, #d9f7be);
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #1890ff;
}

.placeholder-content .anticon {
  font-size: 32px;
}

.placeholder-content span {
  font-size: 14px;
  color: #1890ff;
  font-weight: 500;
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cover-image:hover .cover-overlay {
  opacity: 1;
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: white;
}

.overlay-content .anticon {
  font-size: 32px;
}

.overlay-content span {
  font-size: 14px;
  font-weight: 500;
}

.header-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.course-title {
  margin: 0 0 12px;
  font-size: 28px;
  font-weight: 700;
  color: #262626;
  line-height: 1.2;
}

.course-desc {
  margin: 0 0 20px;
  font-size: 16px;
  color: #595959;
  line-height: 1.6;
}

.meta-info {
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #8c8c8c;
  font-size: 14px;
}

.status-tags {
  margin-top: 12px;
}

.action-buttons {
  margin-top: auto;
}

/* 统计数据区域 */
.stats-section {
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.stat-card {
  text-align: center;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #1890ff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #8c8c8c;
}

/* 响应式设计 */
@media screen and (max-width: 768px) {
  .cover-section {
    flex-direction: column;
    gap: 20px;
  }

  .cover-image {
    width: 100%;
    height: 180px;
  }

  .header-info {
    text-align: center;
  }

  .course-title {
    font-size: 24px;
  }

  .meta-info {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .action-buttons {
    display: flex;
    justify-content: center;
  }
}

@media screen and (max-width: 480px) {
  .cover-image {
    height: 140px;
  }

  .course-title {
    font-size: 20px;
  }

  .meta-info {
    grid-template-columns: 1fr;
  }

  .stats-section {
    .ant-row {
      .ant-col {
        margin-bottom: 12px;
      }
    }
  }
}
</style>