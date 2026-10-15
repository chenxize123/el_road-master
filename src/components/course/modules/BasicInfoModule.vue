<!--
 * @Date         : 2026-05-13 14:30:00
 * @Description  : 课程基本信息模块 - 教师和管理员使用（可编辑版本）
 * @FilePath     : BasicInfoModule.vue
 * @LastEditTime : 2026-05-14
 * @Version      : V2.1.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="basic-info-module">
    <!-- 错误提示 -->
    <a-alert
      v-if="error"
      message="加载失败"
      :description="error"
      type="error"
      show-icon
      closable
      @close="error = null"
      style="margin-bottom: 16px;"
    />

    <!-- 加载状态 -->
    <a-spin v-if="loading" tip="正在加载课程信息..." size="large">
      <div class="loading-placeholder"></div>
    </a-spin>

    <!-- 课程信息编辑表单 -->
    <template v-else-if="courseInfo">
      <a-card title="课程基本信息" class="info-card">
        <a-form layout="vertical">
          <!-- 课程封面 -->
          <a-form-item label="课程封面">
            <div class="cover-upload-section">
              <a-upload
                name="cover"
                :showUploadList="false"
                :beforeUpload="beforeUpload"
                :customRequest="customUpload"
                :disabled="uploading"
                class="cover-uploader"
              >
                <div class="cover-upload-area">
                  <div v-if="!coverUrl" class="cover-placeholder">
                    <div class="placeholder-content">
                      <CameraOutlined class="placeholder-icon" />
                      <span>点击上传封面</span>
                    </div>
                  </div>
                  <div v-else class="cover-preview">
                    <img :src="coverUrl" alt="课程封面" class="cover-image" />
                    <div class="cover-overlay">
                      <div class="overlay-content">
                        <CameraOutlined />
                        <span>更换封面</span>
                      </div>
                    </div>
                  </div>
                </div>
              </a-upload>
              <div class="cover-tips">
                <p>支持 JPG/PNG 格式，文件大小不超过 5MB</p>
              </div>
            </div>
          </a-form-item>

          <!-- 课程ID -->
          <a-form-item label="课程ID">
            <a-input
              v-model:value="formData.id"
              disabled
              placeholder="课程ID"
            />
          </a-form-item>

          <!-- 课程名称 -->
          <a-form-item label="课程名称" required>
            <a-input
              v-model:value="formData.title"
              disabled
              placeholder="请输入课程名称"
              :maxlength="100"
              show-count
            />
          </a-form-item>

          <!-- 课程描述 -->
          <a-form-item label="课程描述">
            <a-textarea
              v-model:value="formData.description"
              disabled
              placeholder="请输入课程描述"
              :rows="4"
              :maxlength="500"
              show-count
            />
          </a-form-item>

          <!-- 任课教师 -->
          <a-form-item label="任课教师">
            <a-input
              :value="courseInfo.teacher || '未设置'"
              disabled
              placeholder="任课教师"
            />
          </a-form-item>

          <!-- 学时 -->
          <a-form-item label="学时">
            <a-input-number
              v-model:value="formData.class_hour"
              disabled
              :min="0"
              :max="9999"
              placeholder="请输入学时"
              style="width: 100%;"
            />
          </a-form-item>


<!-- 按钮区域 
          <a-form-item>
            <div class="button-group">
              <a-button @click="handleCancel" :disabled="saving">
                取消
              </a-button>
              <a-button
                type="primary"
                @click="handleSave"
                :loading="saving"
              >
                保存
              </a-button>
            </div>
          </a-form-item>
-->
        </a-form>
      </a-card>
    </template>


    <!-- 空数据状态 -->
    <a-empty v-else description="暂无课程信息" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { getCourseBasicInfoApi, updateCourseBasicInfoApi } from '@/api/course'
import { getCourseCoverUrlApi, uploadCourseCoverApi } from '@/api/file'
import { CameraOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  courseId: {
    type: [String, Number],
    required: true
  }
})

const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const error = ref(null)
const courseInfo = ref(null)
const coverUrl = ref('')

// 表单数据
const formData = ref({
  id: null,
  title: '',
  description: '',
  teacher_id: null,
  class_hour: 0
})

// 原始数据备份（用于取消操作）
const originalData = ref(null)

// 获取临时封面 URL
const fetchCoverUrl = async () => {
  const objectName = courseInfo.value?.cover
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
    await uploadCourseCoverApi(file, props.courseId)
    message.success('封面上传成功')
    // 重新获取课程信息以更新封面
    await fetchCourseInfo()
  } catch (error) {
    message.error('封面上传失败: ' + (error.message || '未知错误'))
  } finally {
    uploading.value = false
  }
}

/**
 * JSON 返回数据处理逻辑:
 *
 * 后端实际返回格式:
 * {
 *   code: 200,
 *   message: "success",
 *   data: {
 *     id: 7460206176496689152,
 *     title: "机器学习",
 *     description: "这是机器学习",
 *     teacher: "冯建周",
 *     class_hour: 24,
 *     create_by: "冯建周"
 *   }
 * }
 */
const fetchCourseInfo = async () => {
  if (!props.courseId) {
    error.value = '缺少课程ID参数'
    return
  }

  loading.value = true
  error.value = null

  try {
    const res = await getCourseBasicInfoApi(props.courseId)

    if (res.code === 200) {
      courseInfo.value = res.data
      console.log('课程信息:', res.data)
      // 获取封面URL
      await fetchCoverUrl()
      // 填充表单数据
      formData.value = {
        id: res.data.id,
        title: res.data.title || '',
        description: res.data.description || '',
        teacher_id: res.data.teacher_id || res.data.teacherId || null,
        class_hour: res.data.class_hour || 0
      }
      // 备份原始数据
      originalData.value = { ...formData.value }
    } else {
      error.value = res.message || '获取课程信息失败'
      message.error(error.value)
    }
  } catch (err) {
    console.error('获取课程信息异常:', err)
    error.value = err.message || '网络请求失败，请稍后重试'
    message.error(error.value)
  } finally {
    loading.value = false
  }
}

// 保存修改
const handleSave = async () => {
  if (!formData.value.title.trim()) {
    message.warning('请输入课程名称')
    return
  }

  if (formData.value.class_hour < 0) {
    message.warning('学时不能为负数')
    return
  }

  // 构建请求数据
  const requestData = {
    id: formData.value.id,
    title: formData.value.title,
    description: formData.value.description,
    class_hour: formData.value.class_hour
  }

  // 只有 teacher_id 存在时才添加到请求中
  if (formData.value.teacher_id !== null && formData.value.teacher_id !== undefined) {
    requestData.teacher_id = formData.value.teacher_id
  }

  console.log('保存请求数据:', requestData)

  saving.value = true
  try {
    const res = await updateCourseBasicInfoApi(requestData)

    if (res.code === 200) {
      message.success('修改成功')
      // 更新原始数据备份
      originalData.value = { ...formData.value }
      // 刷新课程信息展示
      if (courseInfo.value) {
        courseInfo.value.title = formData.value.title
        courseInfo.value.description = formData.value.description
        courseInfo.value.class_hour = formData.value.class_hour
      }
    } else {
      message.error(res.message || '修改失败')
    }
  } catch (err) {
    console.error('保存失败:', err)
    message.error(err.message || '网络请求失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

// 取消编辑，恢复原始数据
const handleCancel = () => {
  if (originalData.value) {
    formData.value = { ...originalData.value }
    message.info('已重置')
  }
}

// 监听 courseId 变化重新获取数据
watch(() => props.courseId, (newCourseId) => {
  if (newCourseId) {
    fetchCourseInfo()
  }
}, { immediate: true })

onMounted(() => {
  if (props.courseId) {
    fetchCourseInfo()
  }
})
</script>

<style scoped>
.basic-info-module {
  min-height: 200px;
}

.info-card {
  border-radius: 12px;
}

.loading-placeholder {
  min-height: 300px;
}

.button-group {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}

.button-group .ant-btn {
  min-width: 80px;
}

/* 封面上传样式 */
.cover-upload-section {
  width: 100%;
}

.cover-uploader {
  display: block;
  cursor: pointer;
}

.cover-upload-area {
  width: 320px;
  height: 180px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  background-color: #fafafa;
  border: 2px dashed #d9d9d9;
  transition: all 0.3s ease;
}

.cover-upload-area:hover {
  border-color: #1890ff;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #8c8c8c;
}

.placeholder-icon {
  font-size: 36px;
}

.cover-preview {
  width: 100%;
  height: 100%;
  position: relative;
}

.cover-preview .cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.cover-preview:hover .cover-overlay {
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
  font-size: 28px;
}

.cover-tips {
  margin-top: 8px;
  color: #8c8c8c;
  font-size: 12px;
}

.cover-tips p {
  margin: 0;
}

/* 响应式设计 */
@media screen and (max-width: 768px) {
  .basic-info-module {
    padding: 0 8px;
  }

  .cover-upload-area {
    width: 100%;
    height: 160px;
  }
}
</style>
