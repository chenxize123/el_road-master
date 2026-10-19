<!--
 * @Date         : 2026-06-09
 * @Description  : 班级课程赋能课题模块
 * @FilePath     : ClassLiteratureModule.vue
 * @Version      : V1.0.0
-->
<template>
  <div class="class-literature-module">
    <!-- 头部工具栏 -->
    <div class="literature-toolbar">
      <div class="toolbar-title">
        <h3>课程赋能课题</h3>
        <span v-if="courseName">课程：{{ courseName }}</span>
      </div>
      <div class="toolbar-actions" v-if="resultContent">
        <a-button @click="showNewResearch" v-if="hasExistingContent">
          新建课程赋能课题
        </a-button>
        <a-button @click="handleExportMarkdown">
          <template #icon><FileTextOutlined /></template>
          导出 .md
        </a-button>
        <a-button type="primary" @click="handleExportPdf">
          <template #icon><FilePdfOutlined /></template>
          导出 .pdf
        </a-button>
      </div>
    </div>

    <!-- 研究记录列表 -->
    <div v-if="researchList.length > 0 && !showNewForm" class="research-list-section">
      <a-card title="历史研究记录" :bordered="false" class="research-list-card">
        <a-list
          :data-source="researchList"
          :loading="loadingList"
          item-layout="horizontal"
          size="large"
        >
          <template #renderItem="{ item }">
            <a-list-item
              :class="{ 'research-list-item-active': currentResearchId === item.id }"
              @click="loadResearchDetail(item)"
            >
              <a-list-item-meta>
                <template #title>
                  <a-space>
                    <span class="research-topic">{{ item.topic || item.research_topic || '无主题' }}</span>
                    <a-tag v-if="currentResearchId === item.id" color="blue">当前查看</a-tag>
                  </a-space>
                </template>
                <template #description>
                  <a-space size="small">
                    <span v-if="item.user">用户：{{ item.user.real_name || item.user.username || '未知' }}</span>
                    <span v-if="item.created_at || item.createdAt">创建时间：{{ formatDate(item.created_at || item.createdAt) }}</span>
                  </a-space>
                </template>
              </a-list-item-meta>
              <template #extra>
                <a-button type="link" size="small">查看详情</a-button>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </a-card>
    </div>

    <!-- 已有内容提示 -->
    <a-alert
      v-if="hasExistingContent && resultContent && !showNewForm"
      message="已加载研究内容"
      type="success"
      show-icon
      style="margin-bottom: 16px;"
    >
      <template #description>
        您可以查看历史研究记录，或点击"新建课程赋能课题"创建新的研究。
      </template>
    </a-alert>

    <!-- 数据保存提示 -->
    <a-alert
      message="提示"
      type="info"
      show-icon
      style="margin-bottom: 16px;"
    >
      <template #description>
        生成的课程赋能课题会自动保存，您也可以导出保存为 .md 或 .pdf 文件备份。
      </template>
    </a-alert>

    <!-- 错误提示 -->
    <a-alert
      v-if="error"
      class="literature-alert"
      message="出错了"
      :description="error"
      type="error"
      show-icon
    >
      <template #action>
        <a-button size="small" danger @click="error = ''">关闭</a-button>
      </template>
    </a-alert>

    <!-- 生成中提示 -->
    <a-alert
      v-if="searching"
      message="正在生成课程赋能课题中..."
      type="info"
      show-icon
      style="margin-bottom: 16px;"
    >
      <template #description>
        <div style="display: flex; align-items: center; gap: 8px;">
          <a-spin size="small" />
          <span>正在调查中，已等待 {{ formatSearchElapsed(searchElapsedSeconds) }}。检索可能需要数分钟，请保持页面打开并等待接口返回。</span>
        </div>
      </template>
    </a-alert>

    <!-- 加载详情提示 -->
    <a-alert
      v-if="loadingDetail"
      message="正在加载研究详情..."
      type="info"
      show-icon
      style="margin-bottom: 16px;"
    />

    <!-- 检索输入区 -->
    <div v-if="showNewForm || researchList.length === 0" class="search-section">
      <a-textarea
        v-model:value="researchTopic"
        placeholder="请输入您的研究主题..."
        :rows="3"
        :maxlength="500"
        show-count
        @press-enter="handleSearch"
      />
      <div class="search-actions">
        <a-button
          type="primary"
          size="large"
          :loading="searching || props.loading"
          :disabled="searching || props.loading"
          @click="handleSearch"
        >
          <template #icon><SearchOutlined /></template>
          {{ searching ? `调查中 ${formatSearchElapsed(searchElapsedSeconds)}` : '检索文献' }}
        </a-button>
        <a-button
          v-if="researchList.length > 0"
          size="large"
          @click="cancelNewResearch"
        >
          取消
        </a-button>
      </div>
    </div>

    <!-- 结果展示区 -->
    <div v-if="resultContent" class="result-section">
      <div class="result-header">
        <h4>{{ currentResearchTopic || '研究结果' }}</h4>
      </div>
      <div
        class="literature-content markdown-body"
        v-html="renderMarkdown(resultContent)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, FileTextOutlined, FilePdfOutlined } from '@ant-design/icons-vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import html2pdf from 'html2pdf.js'
import { searchLiteratureApi, getResearchRecordsApi, getResearchDetailApi } from '@/api/literature'
import { getCourseByClassIdApi } from '@/api/course'
import { useUserStore } from '@/store'

const props = defineProps({
  classId: {
    type: [String, Number],
    required: true
  },
  courseId: {
    type: [String, Number],
    default: null
  },
  courseName: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const userStore = useUserStore()
const userId = computed(() => userStore.userInfo?.id || '')

const researchTopic = ref('')
const resultContent = ref('')
const searching = ref(false)
const searchElapsedSeconds = ref(0)
const loadingList = ref(false)
const loadingDetail = ref(false)
const error = ref('')
const hasExistingContent = ref(false)
const showNewForm = ref(false)
const researchList = ref([])
const currentResearchId = ref(null)
const currentResearchTopic = ref('')

// 本地课程ID状态
const localCourseId = ref(null)
const loadingCourse = ref(false)
let searchElapsedTimer = null

const formatSearchElapsed = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

// 根据班级ID获取课程信息
const fetchCourseByClassId = async () => {
  if (!props.classId) {
    console.log('⚠️ fetchCourseByClassId: classId不存在')
    return
  }

  loadingCourse.value = true
  try {
    console.log('🔍 调用 getCourseByClassIdApi, classId:', props.classId)
    const res = await getCourseByClassIdApi(props.classId)
    console.log('✅ getCourseByClassIdApi 返回:', res)

    if (res.code === 200 && res.data) {
      localCourseId.value = res.data.id
      console.log('🎯 获取到课程ID:', localCourseId.value)

      // 获取到课程ID后，加载研究记录
      await loadExistingContent()
    } else {
      console.error('❌ 获取课程信息失败:', res)
    }
  } catch (error) {
    console.error('❌ 调用 getCourseByClassIdApi 失败:', error)
  } finally {
    loadingCourse.value = false
  }
}

// 监听 props 变化
watch(
  () => props.courseId,
  (newCourseId) => {
    console.log('📊 ClassLiteratureModule: courseId 变化:', newCourseId)
    if (newCourseId) {
      localCourseId.value = newCourseId
    }
  },
  { immediate: true }
)

watch(
  () => props.classId,
  (newClassId) => {
    console.log('📊 ClassLiteratureModule: classId 变化:', newClassId)
  },
  { immediate: true }
)

const renderMarkdown = (content) => {
  if (!content) return ''
  return DOMPurify.sanitize(marked.parse(content))
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const loadExistingContent = async () => {
  const courseId = localCourseId.value || props.courseId
  console.log('📥 loadExistingContent 被调用, courseId:', courseId)
  if (!courseId) {
    console.log('⚠️ loadExistingContent: courseId 不存在，跳过加载')
    return
  }

  loadingList.value = true
  try {
    const res = await getResearchRecordsApi(courseId)
    if (res.code === 200 && res.data) {
      researchList.value = Array.isArray(res.data) ? res.data : [res.data]

      // 如果有记录，自动加载第一条的详情（如果需要）
      if (researchList.value.length > 0) {
        const firstRecord = researchList.value[0]
        if (firstRecord.report) {
          // 如果列表中已有 report，直接显示
          resultContent.value = firstRecord.report
          currentResearchTopic.value = firstRecord.topic || firstRecord.research_topic || ''
          currentResearchId.value = firstRecord.id
          hasExistingContent.value = true
        } else {
          // 否则加载第一条详情
          loadResearchDetail(firstRecord)
        }
      } else {
        // 没有记录时显示新建表单
        showNewForm.value = true
      }
    }
  } catch (error) {
    console.warn('获取研究记录失败，尝试从本地加载:', error)
    // 降级方案：从 localStorage 加载
    loadFromLocalStorage()
  } finally {
    loadingList.value = false
  }
}

const loadResearchDetail = async (record) => {
  if (!record.id) return

  loadingDetail.value = true
  currentResearchId.value = record.id
  currentResearchTopic.value = record.topic || record.research_topic || ''

  try {
    const res = await getResearchDetailApi(record.id)
    if (res.code === 200 && res.data) {
      const detail = res.data
      resultContent.value = detail.report || detail.content || ''
      currentResearchTopic.value = detail.topic || detail.research_topic || currentResearchTopic.value
      hasExistingContent.value = true
      showNewForm.value = false
    }
  } catch (error) {
    console.error('加载研究详情失败:', error)
    message.error('加载研究详情失败')
  } finally {
    loadingDetail.value = false
  }
}

const loadFromLocalStorage = () => {
  if (!props.classId || !userId.value) return

  const keys = Object.keys(localStorage)
  const classKeys = keys.filter(key => key.startsWith(`literature_${userId.value}_${props.classId}_`))

  if (classKeys.length > 0) {
    classKeys.sort((a, b) => {
      const aTime = parseInt(a.split('_').pop() || '0')
      const bTime = parseInt(b.split('_').pop() || '0')
      return bTime - aTime
    })

    const latestKey = classKeys[0]
    const data = JSON.parse(localStorage.getItem(latestKey) || '{}')

    if (data && data.content) {
      resultContent.value = data.content
      researchTopic.value = data.researchTopic || ''
      currentResearchTopic.value = data.researchTopic || ''
      hasExistingContent.value = true
    }
  } else {
    showNewForm.value = true
  }
}

const showNewResearch = () => {
  showNewForm.value = true
  researchTopic.value = ''
  currentResearchId.value = null
}

const cancelNewResearch = () => {
  showNewForm.value = false
  researchTopic.value = currentResearchTopic.value || ''
}

const handleSearch = async () => {
  console.log('🔍 点击生成课程赋能课题按钮')
  console.log('📚 props.courseId:', props.courseId)
  console.log('💾 localCourseId:', localCourseId.value)
  console.log('📦 classId:', props.classId)
  console.log('🎯 完整props:', props)

  if (!researchTopic.value.trim()) {
    message.warning('请输入研究主题')
    return
  }

  // 如果没有课程ID，先获取
  let courseId = localCourseId.value || props.courseId
  if (!courseId) {
    console.log('⚠️ 没有课程ID，先根据班级ID获取...')
    await fetchCourseByClassId()
    courseId = localCourseId.value
  }

  if (!courseId) {
    console.error('❌ courseId仍然为空或不存在')
    message.warning('课程ID不存在')
    return
  }

  console.log('✅ 最终使用的 courseId:', courseId)

  searching.value = true
  searchElapsedSeconds.value = 0
  clearInterval(searchElapsedTimer)
  searchElapsedTimer = setInterval(() => {
    searchElapsedSeconds.value += 1
  }, 1000)
  error.value = ''
  try {
    const res = await searchLiteratureApi(courseId, researchTopic.value.trim())
    if (res.code === 200) {
      resultContent.value = res.data || ''
      currentResearchTopic.value = researchTopic.value.trim()
      hasExistingContent.value = false
      showNewForm.value = false

      // 保存到 localStorage
      if (resultContent.value) {
        const storageKey = `literature_${userId.value}_${props.classId}_${Date.now()}`
        const storageData = {
          userId: userId.value,
          courseId: courseId,
          course: props.courseName,
          researchTopic: researchTopic.value.trim(),
          content: resultContent.value,
          timestamp: new Date().toISOString()
        }
        localStorage.setItem(storageKey, JSON.stringify(storageData))

        hasExistingContent.value = true

        // 提示用户
        message.success('课程赋能课题已生成并保存', 3)

        // 重新加载列表
        loadExistingContent()
      }
    } else {
      throw new Error(res.message || '检索失败')
    }
  } catch (err) {
    console.error('课程赋能课题失败:', err)
    error.value = err.message || '检索失败，请稍后重试'
    message.error(error.value)
  } finally {
    searching.value = false
    clearInterval(searchElapsedTimer)
    searchElapsedTimer = null
  }
}

const handleExportMarkdown = () => {
  if (!resultContent.value) {
    message.warning('暂无内容可导出')
    return
  }

  const topic = researchTopic.value.trim().substring(0, 20) || '文献'
  const course = props.courseName.substring(0, 20) || '课程'
  const filename = `${course}_${topic}_文献推荐.md`

  const blob = new Blob([resultContent.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  message.success('导出成功')
}

const handleExportPdf = () => {
  if (!resultContent.value) {
    message.warning('暂无内容可导出')
    return
  }

  const topic = researchTopic.value.trim().substring(0, 20) || '文献'
  const course = props.courseName.substring(0, 20) || '课程'
  const filename = `${course}_${topic}_文献推荐.pdf`

  const element = document.querySelector('.literature-content')
  const opt = {
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }

  html2pdf().set(opt).from(element).save()
  message.success('导出成功')
}

const handleBeforeUnload = (e) => {
  if (searching.value) {
    e.preventDefault()
    e.returnValue = '课程赋能课题正在生成中，离开页面将导致生成失败，确定要离开吗？'
    return e.returnValue
  }
}

onMounted(async () => {
  console.log('🚀 ClassLiteratureModule 组件挂载')
  console.log('📄 初始化 props:', {
    classId: props.classId,
    courseId: props.courseId,
    courseName: props.courseName
  })
  window.addEventListener('beforeunload', handleBeforeUnload)

  // 如果有 courseId，直接使用；否则根据 classId 获取
  if (props.courseId) {
    localCourseId.value = props.courseId
    loadExistingContent()
  } else {
    console.log('🔄 props.courseId 不存在，根据 classId 获取...')
    await fetchCourseByClassId()
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  clearInterval(searchElapsedTimer)
})
</script>

<style scoped>
.class-literature-module {
  min-height: 400px;
}

.literature-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.toolbar-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.toolbar-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.toolbar-title span {
  font-size: 13px;
  color: #8c8c8c;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.literature-alert {
  margin-bottom: 16px;
}

.research-list-section {
  margin-bottom: 24px;
}

.research-list-card {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02);
}

.research-list-item {
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 8px;
}

.research-list-item:hover {
  background: #f5f7fa;
}

.research-list-item-active {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
}

.research-topic {
  font-weight: 500;
  font-size: 15px;
}

.search-section {
  margin-bottom: 24px;
}

.search-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 12px;
}

.result-section {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.result-header {
  margin-bottom: 16px;
}

.result-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.literature-content {
  background: #fafafa;
  padding: 20px;
  border-radius: 8px;
  min-height: 200px;
}

/* Markdown 样式 - 复用项目现有样式模式 */
.markdown-body {
  font-size: 14px;
  line-height: 1.75;
  color: #262626;
}

.markdown-body :deep(p) {
  margin: 0 0 12px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 12px 0;
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
  padding-left: 4px;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 16px 0 8px 0;
  font-weight: 600;
  line-height: 1.4;
}

.markdown-body :deep(h1) {
  font-size: 24px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.markdown-body :deep(h2) {
  font-size: 20px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 6px;
}

.markdown-body :deep(h3) {
  font-size: 18px;
}

.markdown-body :deep(h4) {
  font-size: 16px;
}

.markdown-body :deep(em) {
  font-style: italic;
}

.markdown-body :deep(del) {
  text-decoration: line-through;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid #1890ff;
  padding-left: 12px;
  margin: 12px 0;
  color: #595959;
  font-style: italic;
}

.markdown-body :deep(a) {
  color: #1890ff;
  text-decoration: underline;
}

.markdown-body :deep(code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
}

.markdown-body :deep(pre) {
  background: #262626;
  color: #f0f0f0;
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
  font-size: 13px;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #f0f0f0;
  padding: 8px 12px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: #fafafa;
  font-weight: 600;
}

/* 响应式设计 */
@media screen and (max-width: 768px) {
  .literature-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-actions {
    width: 100%;
  }

  .toolbar-actions .ant-btn {
    flex: 1;
  }

  .literature-content {
    padding: 16px;
  }
}

@media screen and (max-width: 480px) {
  .literature-content {
    padding: 12px;
  }
}
</style>
