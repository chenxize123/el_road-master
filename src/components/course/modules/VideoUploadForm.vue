<!--
 * @Date         : 2026-05-19
 * @Description  : 课程视频上传表单组件
 * @FilePath     : VideoUploadForm.vue
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="video-upload-form">
    <a-card title="上传视频" :bordered="false">
      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        :disabled="uploading"
      >
        <!-- 视频标题 -->
        <a-form-item label="视频标题" name="title">
          <a-input
            v-model:value="formState.title"
            placeholder="请输入视频标题"
            :maxlength="100"
            show-count
          />
        </a-form-item>

        <!-- 关联课程 -->
        <a-form-item label="关联课程" name="course_id">
          <a-select
            v-model:value="formState.course_id"
            placeholder="请选择关联课程"
            :loading="coursesLoading"
            show-search
            :filter-option="(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            "
            style="width: 100%"
          >
            <a-select-option
              v-for="course in courseList"
              :key="course.id"
              :value="course.id"
              :label="course.title"
            >
              {{ course.title }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <!-- 视频文件 -->
        <a-form-item label="视频文件" name="video">
          <a-upload-dragger
            v-model:file-list="fileList"
            :before-upload="beforeUpload"
            :show-upload-list="false"
            accept=".mp4,.mov,.avi,.mkv,.wmv,.flv,.webm"
            :max-count="1"
            :disabled="uploading"
          >
            <p class="ant-upload-drag-icon">
              <video-camera-outlined :style="{ fontSize: '48px', color: '#1890ff' }" />
            </p>
            <p class="ant-upload-text">点击或拖拽视频到此区域上传</p>
            <p class="ant-upload-hint">
              支持格式：MP4, MOV, AVI, MKV, WMV, FLV, WEBM
            </p>
          </a-upload-dragger>

          <!-- 已选择文件显示 -->
          <div v-if="selectedFile" class="selected-file">
            <file-text-outlined style="margin-right: 8px" />
            <span class="file-name">{{ selectedFile.name }}</span>
            <span class="file-size">({{ formatFileSize(selectedFile.size) }})</span>
            <a-button
              v-if="!uploading"
              type="text"
              danger
              size="small"
              style="margin-left: 8px"
              @click="removeFile"
            >
              移除
            </a-button>
          </div>
        </a-form-item>

        <!-- 上传进度条 -->
        <a-form-item v-if="uploading" label="上传进度">
          <a-progress :percent="uploadProgress" :status="uploadProgress === 100 ? 'success' : 'active'" />
          <div class="progress-text">{{ uploadStatusText }}</div>
        </a-form-item>

        <!-- 提交按钮 -->
        <a-form-item>
          <div style="margin-bottom: 8px; color: #8c8c8c; font-size: 12px;">
            请先：1. 填写视频标题 2. 选择关联课程 3. 选择视频文件
          </div>
          <a-button
            type="primary"
            size="large"
            :loading="uploading"
            :disabled="!canSubmit"
            style="width: 100%"
            @click="handleSubmit"
          >
            {{ uploading ? '上传中...' : '开始上传' }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { message, Upload } from 'ant-design-vue'
import { VideoCameraOutlined, FileTextOutlined } from '@ant-design/icons-vue'
import { getAllCourses, uploadCourseVideoApi } from '@/api/course'

const props = defineProps({
  courseId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['success'])

// 表单引用
const formRef = ref(null)

// 表单状态
const formState = ref({
  title: '',
  course_id: null,
  video: null
})

// 文件列表
const fileList = ref([])
const selectedFile = ref(null)

// 上传状态
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadStatusText = ref('')

// 课程列表
const courseList = ref([])
const coursesLoading = ref(false)

// 接受的视频格式
const ACCEPTED_VIDEO_TYPES = [
  'video/mp4', 'video/quicktime', 'video/x-msvideo',
  'video/x-matroska', 'video/x-ms-wmv', 'video/x-flv',
  'video/webm'
]
const ACCEPTED_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm']

// 验证规则
const rules = {
  title: [
    { required: true, message: '请输入视频标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度应在2-100个字符之间', trigger: 'blur' }
  ],
  course_id: [
    { required: true, message: '请选择关联课程', trigger: 'change' }
  ],
  video: [
    { required: true, message: '请选择视频文件', trigger: 'change' }
  ]
}

// 是否可以提交
const canSubmit = computed(() => {
  const result = !uploading.value && selectedFile.value

  console.log('canSubmit 检查:', {
    uploading: uploading.value,
    hasTitle: !!formState.value.title,
    hasCourseId: !!formState.value.course_id,
    hasFile: !!selectedFile.value,
    result
  })

  return result
})

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 验证视频格式
function validateVideoFormat(file) {
  const extension = '.' + file.name.split('.').pop().toLowerCase()
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    message.error(`不支持的视频格式，请选择 ${ACCEPTED_EXTENSIONS.join(', ')} 格式的文件`)
    return false
  }
  return true
}

// 上传前处理
function beforeUpload(file) {
  if (!validateVideoFormat(file)) {
    return Upload.LIST_IGNORE
  }
  selectedFile.value = file
  formState.value.video = file
  fileList.value = [file]
  return false  // 阻止自动上传，手动控制
}

// 移除文件
function removeFile() {
  selectedFile.value = null
  formState.value.video = null
  fileList.value = []
}

// 获取课程列表
async function fetchCourses() {
  try {
    coursesLoading.value = true
    const response = await getAllCourses()
    console.log('获取课程列表响应:', response)

    if (response.code === 200 && Array.isArray(response.data)) {
      courseList.value = response.data
    } else if (Array.isArray(response)) {
      courseList.value = response
    } else if (response.data && Array.isArray(response.data)) {
      courseList.value = response.data
    } else {
      console.warn('课程数据格式不符合预期:', response)
    }

    console.log('最终课程列表:', courseList.value)
  } catch (error) {
    // console.error('获取课程列表失败:', error)
    // message.error('获取课程列表失败')
  } finally {
    coursesLoading.value = false
  }
}

// 处理提交
async function handleSubmit() {
  console.log('点击上传按钮')
  console.log('表单状态:', formState.value)
  console.log('选择的文件:', selectedFile.value)

  try {
    // 表单验证
    await formRef.value.validate()
    console.log('表单验证通过')

    // 构建 FormData
    const formData = new FormData()
    formData.append('title', formState.value.title.trim())
    formData.append('course_id', String(formState.value.course_id))
    formData.append('video', selectedFile.value)

    console.log('FormData 构建完成，开始上传...')

    // 开始上传
    uploading.value = true
    uploadProgress.value = 0
    uploadStatusText.value = '正在上传...'

    // 执行上传
    await new Promise((resolve, reject) => {
      uploadCourseVideoApi(
        formData,
        (percent) => {
          console.log('上传进度:', percent + '%')
          uploadProgress.value = percent
          if (percent === 100) {
            uploadStatusText.value = '上传完成，正在处理...'
          }
        },
        (response) => {
          console.log('上传成功响应:', response)
          if (response.code === 200) {
            resolve(response)
          } else {
            reject(new Error(response.message || '上传失败'))
          }
        },
        (error) => {
          console.error('上传错误:', error)
          reject(error)
        }
      )
    })

    // 上传成功
    message.success('视频上传成功')
    emit('success')
    resetForm()

  } catch (error) {
    if (error?.name !== 'ValidationError') {
      console.error('上传失败:', error)
      message.error(error.message || '上传失败，请稍后重试')
    }
  } finally {
    uploading.value = false
  }
}

// 重置表单
function resetForm() {
  formState.value = {
    title: '',
    course_id: props.courseId || null,
    video: null
  }
  selectedFile.value = null
  fileList.value = []
  uploadProgress.value = 0
  uploadStatusText.value = ''
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 初始化
onMounted(() => {
  fetchCourses()
  if (props.courseId) {
    formState.value.course_id = props.courseId
  }
})

// 监听 courseId 变化
watch(() => props.courseId, (newId) => {
  if (newId) {
    formState.value.course_id = newId
  }
}, { immediate: true })
</script>

<style scoped>
.video-upload-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px 0;
}

.selected-file {
  margin-top: 16px;
  padding: 12px 16px;
  background-color: #f5f5f5;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.file-name {
  font-weight: 500;
  color: #262626;
}

.file-size {
  color: #8c8c8c;
  margin-left: 8px;
}

.progress-text {
  text-align: center;
  margin-top: 8px;
  color: #8c8c8c;
  font-size: 14px;
}
</style>
