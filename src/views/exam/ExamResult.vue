<!--
 * @Date         : 2026-05-14
 * @Description  : 考试结果查看页面
 * @FilePath     : ExamResult.vue
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 -->
<template>
  <div class="exam-result-page">
    <!-- 顶部导航栏 -->
    <div class="result-header">
      <a-button type="link" @click="handleBack">
        <template #icon><left-outlined /></template>
        返回
      </a-button>
      <h2 class="result-title">{{ examInfo?.title || '考试结果' }}</h2>
      <div class="result-role">
        <a-tag :color="isTeacherOrAdmin ? 'blue' : 'green'">
          {{ isTeacherOrAdmin ? '教师/管理员视图' : '学生视图' }}
        </a-tag>
      </div>
    </div>

    <!-- 加载状态 -->
    <a-spin v-if="loading" tip="加载中..." class="loading-container">
      <div class="loading-content"></div>
    </a-spin>

    <!-- 错误提示 -->
    <a-result v-else-if="error" status="error" title="加载失败" :sub-title="error">
      <template #extra>
        <a-button type="primary" @click="fetchData">重试</a-button>
      </template>
    </a-result>

    <!-- 空状态 -->
    <a-result v-else-if="isEmpty" status="warning" title="暂无考试结果数据">
      <template #extra>
        <a-button type="primary" @click="handleBack">返回</a-button>
      </template>
    </a-result>

    <!-- 学生视图：显示自己的答题结果 -->
    <div v-else-if="!isTeacherOrAdmin" class="result-content">
      <!-- 成绩概览卡片 -->
      <a-card class="overview-card">
        <template #extra>
          <a-button type="primary" ghost @click="handleOpenMyReport">
            考试分析报告
          </a-button>
        </template>
        <div class="score-display">
          <div class="score-circle" :class="{ pass: isPassing }">
            <div class="score-number">{{ studentResult?.score ?? 0 }}</div>
            <div class="score-label">得分</div>
          </div>
          <div class="score-details">
            <a-descriptions :column="2" bordered size="small">
              <a-descriptions-item label="考试用时">
                <template v-if="studentResult?.duration">{{ formatDuration(studentResult.duration) }}</template>
                <template v-else>-</template>
              </a-descriptions-item>
              <a-descriptions-item label="提交时间">
                <template v-if="studentResult?.submission_deadline">
                  {{ formatDate(studentResult.submission_deadline) }}
                </template>
                <template v-else>-</template>
              </a-descriptions-item>
              <a-descriptions-item label="状态">
                <a-tag :color="studentResult?.status === '已交卷' ? 'green' : 'default'">
                  {{ studentResult?.status || '-' }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="是否及格">
                <a-tag :color="isPassing ? 'success' : 'error'">
                  {{ isPassing ? '及格' : '未及格' }}
                </a-tag>
              </a-descriptions-item>
            </a-descriptions>
          </div>
        </div>
      </a-card>

      <!-- 题目详情 -->
      <div class="questions-section">
        <a-divider orientation="left">
          <span class="section-title">题目详情</span>
        </a-divider>
        <!-- 直接渲染题目，不使用子组件 -->
        <a-card
          v-for="(item, idx) in studentResult?.question_result_list || []"
          :key="idx"
          class="question-card"
          :class="{ correct: item.score > 0 }"
        >
          <div class="question-header">
            <span class="question-number">第 {{ idx + 1 }} 题</span>
            <a-tag :color="item.score > 0 ? 'success' : 'error'" class="question-result">
              {{ item.score > 0 ? '答对' : '答错' }}
            </a-tag>
            <span class="question-score">得分：{{ item.score }} 分</span>
          </div>

          <div class="question-stem">
            {{ item.question?.question || '' }}
          </div>

          <!-- 选项展示 -->
          <div v-if="item.question?.choose && item.question.choose.length > 0" class="question-options">
            <div
              v-for="(option, optIdx) in item.question.choose"
              :key="optIdx"
              class="option-item"
              :class="getOptionClasses(option, item.question)"
            >
              <span class="option-label">{{ String.fromCharCode(65 + optIdx) }}.</span>
              <span class="option-text">{{ option }}</span>
              <span v-if="option === item.question.answer" class="option-icon correct">✓</span>
              <span v-else-if="option === item.question.user_response && item.question.user_response !== item.question.answer" class="option-icon wrong">✗</span>
            </div>
          </div>

          <!-- 答案信息 -->
          <div class="answer-info">
            <div class="answer-row">
              <span class="answer-label">正确答案：</span>
              <span class="answer-value correct">{{ item.question?.answer || '-' }}</span>
            </div>
            <div class="answer-row">
              <span class="answer-label">你的答案：</span>
              <span class="answer-value" :class="item.score > 0 ? 'correct' : 'wrong'">
                {{ String(item.question?.user_response || '-') }}
              </span>
            </div>
          </div>

          <!-- 解析 -->
          <div v-if="item.question?.analysis" class="question-analysis">
            <a-divider style="margin: 12px 0;" />
            <div class="analysis-label">解析：</div>
            <div class="analysis-content">{{ item.question.analysis }}</div>
          </div>
        </a-card>
      </div>
    </div>

    <!-- 教师/管理员视图：显示所有学生答题情况 -->
    <div v-else class="result-content">
      <!-- 班级成绩统计 -->
      <a-card class="overview-card">
        <template #title>班级成绩统计</template>
        <template #extra>
          <a-button
            type="primary"
            ghost
            :disabled="!resolvedClassId"
            @click="handleOpenClassReport"
          >
            班级分析报告
          </a-button>
        </template>
        <a-row :gutter="16">
          <a-col :xs="12" :sm="6">
            <a-statistic title="参加人数" :value="allResults?.length || 0" />
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-statistic title="及格人数" :value="passCount" />
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-statistic title="平均分" :value="avgScore" :precision="1" />
          </a-col>
          <a-col :xs="12" :sm="6">
            <a-statistic title="最高分" :value="maxScore" />
          </a-col>
        </a-row>
      </a-card>

      <!-- 学生列表 -->
      <div class="students-section">
        <a-divider orientation="left">
          <span class="section-title">学生答题情况</span>
        </a-divider>
        <a-collapse v-model:activeKeys="activeKeys" accordion>
          <a-collapse-panel
            v-for="(result, idx) in allResults || []"
            :key="idx"
          >
            <template #header>
              <div class="panel-header">
                <span class="student-name">{{ result.student_name || `学生 ${idx + 1}` }}</span>
                <a-tag :color="isStudentPassing(result) ? 'success' : 'error'" class="student-score">
                  {{ result.score }} 分
                </a-tag>
              </div>
            </template>

            <!-- 该学生的成绩概览 -->
            <a-descriptions :column="2" bordered size="small" class="student-overview">
              <a-descriptions-item label="考试用时">
                <template v-if="result.duration">{{ formatDuration(result.duration) }}</template>
                <template v-else>-</template>
              </a-descriptions-item>
              <a-descriptions-item label="提交时间">
                <template v-if="result.submission_deadline">
                  {{ formatDate(result.submission_deadline) }}
                </template>
                <template v-else>-</template>
              </a-descriptions-item>
              <a-descriptions-item label="状态">
                <a-tag :color="result.status === '已交卷' ? 'green' : 'default'">
                  {{ result.status || '-' }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="是否及格">
                <a-tag :color="isStudentPassing(result) ? 'success' : 'error'">
                  {{ isStudentPassing(result) ? '及格' : '未及格' }}
                </a-tag>
              </a-descriptions-item>
            </a-descriptions>

            <div class="student-report-actions">
              <a-button
                type="primary"
                ghost
                size="small"
                :disabled="!extractUserId(result)"
                @click="handleOpenStudentReport(result)"
              >
                查看个人分析报告
              </a-button>
            </div>

            <!-- 该学生的题目详情 -->
            <a-divider orientation="left" style="font-size: 14px; margin: 16px 0;">
              题目详情
            </a-divider>
            <a-card
              v-for="(item, qIdx) in result.question_result_list || []"
              :key="qIdx"
              class="question-card"
              :class="{ correct: item.score > 0 }"
            >
              <div class="question-header">
                <span class="question-number">第 {{ qIdx + 1 }} 题</span>
                <a-tag :color="item.score > 0 ? 'success' : 'error'" class="question-result">
                  {{ item.score > 0 ? '答对' : '答错' }}
                </a-tag>
                <span class="question-score">得分：{{ item.score }} 分</span>
              </div>

              <div class="question-stem">
                {{ item.question?.question || '' }}
              </div>

              <!-- 选项展示 -->
              <div v-if="item.question?.choose && item.question.choose.length > 0" class="question-options">
                <div
                  v-for="(option, optIdx) in item.question.choose"
                  :key="optIdx"
                  class="option-item"
                  :class="getOptionClasses(option, item.question)"
                >
                  <span class="option-label">{{ String.fromCharCode(65 + optIdx) }}.</span>
                  <span class="option-text">{{ option }}</span>
                  <span v-if="option === item.question.answer" class="option-icon correct">✓</span>
                  <span v-else-if="option === item.question.user_response && item.question.user_response !== item.question.answer" class="option-icon wrong">✗</span>
                </div>
              </div>

              <!-- 答案信息 -->
              <div class="answer-info">
                <div class="answer-row">
                  <span class="answer-label">正确答案：</span>
                  <span class="answer-value correct">{{ item.question?.answer || '-' }}</span>
                </div>
                <div class="answer-row">
                  <span class="answer-label">学生答案：</span>
                  <span class="answer-value" :class="item.score > 0 ? 'correct' : 'wrong'">
                    {{ String(item.question?.user_response || '-') }}
                  </span>
                </div>
              </div>

              <!-- 解析 -->
              <div v-if="item.question?.analysis" class="question-analysis">
                <a-divider style="margin: 12px 0;" />
                <div class="analysis-label">解析：</div>
                <div class="analysis-content">{{ item.question.analysis }}</div>
              </div>
            </a-card>
          </a-collapse-panel>
        </a-collapse>
      </div>
    </div>

    <a-drawer
      v-model:open="reportDrawerVisible"
      :title="reportTitle"
      :width="reportDrawerWidth"
      :z-index="3000"
      :root-style="{ zIndex: 3000 }"
      :closable="true"
      @close="reportDrawerVisible = false"
    >
      <template #extra>
        <a-button type="primary" :disabled="!reportContent" @click="downloadReportWord">
          下载 Word
        </a-button>
      </template>
      <div v-if="reportLoading" class="loading-container">
        <a-spin tip="正在获取考试分析报告，首次生成可能需要较长时间..." />
      </div>
      <a-result v-else-if="reportError" status="error" title="报告加载失败" :sub-title="reportError">
        <template #extra>
          <a-button type="primary" @click="retryReportRequest">重试</a-button>
        </template>
      </a-result>
      <div v-else-if="reportContent" class="report-content markdown-body" v-html="renderedReportContent"></div>
      <a-empty v-else description="暂无报告内容" />
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { LeftOutlined } from '@ant-design/icons-vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useUserStore } from '@/store/user'
import { getExamResultMe, getExamResultAll, getExamDetail } from '@/api/exam'
import {
  getExamReportByExamAndClass,
  getExamReportByExamAndUser
} from '@/api/examReport'

// 工具函数：获取选项的样式类
const getOptionClasses = (option, question) => {
  const classes = ['option-item']
  const correctAnswer = question?.answer || ''
  const userResponse = question?.user_response || ''

  if (option === correctAnswer) {
    classes.push('option-correct')
  }
  if (option === userResponse) {
    classes.push('option-user')
    if (userResponse !== correctAnswer) {
      classes.push('option-wrong')
    }
  }
  return classes.join(' ')
}

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 状态
const loading = ref(true)
const error = ref(null)
const examInfo = ref(null)
const studentResult = ref(null)
const allResults = ref([])
const activeKeys = ref([])
const reportDrawerVisible = ref(false)
const reportLoading = ref(false)
const reportError = ref('')
const reportContent = ref(null)
const reportTitle = ref('考试分析报告')
const lastReportRequest = ref(null)

const reportDrawerWidth = computed(() => {
  if (typeof window !== 'undefined' && window.innerWidth <= 480) return '100%'
  if (typeof window !== 'undefined' && window.innerWidth <= 768) return '92%'
  return 820
})

// 权限判断
const isTeacherOrAdmin = computed(() => {
  const role = userStore.userInfo?.user_type
  return role === 'teacher' || role === 'admin'
})

// 计算属性
const isEmpty = computed(() => {
  if (isTeacherOrAdmin.value) {
    return !allResults.value || allResults.value.length === 0
  } else {
    return !studentResult.value
  }
})

const resolvedClassId = computed(() => {
  return normalizeId(
    route.query.classId ??
    route.query.class_id ??
    examInfo.value?.class_id ??
    examInfo.value?.zl_class ??
    ''
  )
})

const isPassing = computed(() => {
  const p = studentResult.value?.is_passing
  return p === '已通过' || p === true || p === '及格'
})

const passCount = computed(() => {
  if (!allResults.value) return 0
  return allResults.value.filter(r => {
    const p = r.is_passing
    return p === '已通过' || p === true || p === '及格'
  }).length
})

const avgScore = computed(() => {
  if (!allResults.value || allResults.value.length === 0) return 0
  const total = allResults.value.reduce((sum, r) => sum + (r.score || 0), 0)
  return total / allResults.value.length
})

const maxScore = computed(() => {
  if (!allResults.value || allResults.value.length === 0) return 0
  return Math.max(...allResults.value.map(r => r.score || 0))
})

const reportContentText = computed(() => {
  const content = reportContent.value
  if (content === null || content === undefined || content === '') return ''
  if (typeof content === 'string') return content
  return JSON.stringify(content, null, 2)
})

const renderedReportContent = computed(() => renderMarkdown(reportContentText.value))

// 工具函数
const formatDuration = (seconds) => {
  if (!seconds) return '-'
  return `${seconds} 分钟`
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return dateStr
  }
}

const isStudentPassing = (result) => {
  const p = result?.is_passing
  return p === '已通过' || p === true || p === '及格'
}

function normalizeId(id) {
  if (id === null || id === undefined) return ''
  return String(id)
}

function extractUserId(record) {
  return normalizeId(
    record?.student_id ??
    record?.studentId ??
    record?.user_id ??
    record?.userId ??
    record?.student?.id ??
    record?.user?.id ??
    ''
  )
}

function unwrapReportData(response) {
  const data = response?.data ?? response
  if (data && typeof data === 'object') {
    return data.content ?? data.report_content ?? data.report ?? data.analysis ?? data
  }
  return data
}

function renderMarkdown(content) {
  if (!content) return ''
  return DOMPurify.sanitize(marked.parse(content))
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeFilename(value) {
  return String(value || '考试分析报告')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 80)
}

function downloadReportWord() {
  if (!reportContentText.value) {
    message.warning('暂无可下载的报告内容')
    return
  }

  try {
    const title = reportTitle.value || '考试分析报告'
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.8; color: #262626; padding: 24px; }
    h1 { font-size: 26px; border-bottom: 2px solid #1677ff; padding-bottom: 10px; }
    h2 { font-size: 22px; margin-top: 28px; color: #1677ff; }
    h3 { font-size: 18px; margin-top: 22px; color: #13a8a8; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    th, td { border: 1px solid #d9d9d9; padding: 8px; }
    th { background: #f5f5f5; }
    blockquote { margin: 12px 0; padding: 8px 12px; border-left: 4px solid #91caff; background: #f6f8fa; }
    code { font-family: Consolas, monospace; background: #f6f8fa; padding: 2px 4px; }
    pre { background: #f6f8fa; padding: 12px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${renderedReportContent.value}
</body>
</html>`
    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sanitizeFilename(title)}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success('Word 文档下载成功')
  } catch (error) {
    console.error('下载 Word 失败:', error)
    message.error(error.message || '下载 Word 失败')
  }
}

async function loadReport(requestConfig) {
  lastReportRequest.value = requestConfig
  reportDrawerVisible.value = true
  reportLoading.value = true
  reportError.value = ''
  reportContent.value = null

  try {
    const res = requestConfig.type === 'class'
      ? await getExamReportByExamAndClass(requestConfig.examId, requestConfig.classId)
      : await getExamReportByExamAndUser(requestConfig.examId, requestConfig.userId)

    if (res?.code && res.code !== 200) {
      reportError.value = res.message || '获取考试分析报告失败'
      return
    }

    reportContent.value = unwrapReportData(res)
  } catch (err) {
    console.error('获取考试分析报告失败:', err)
    reportError.value = err.message || '获取考试分析报告失败'
  } finally {
    reportLoading.value = false
  }
}

function handleOpenMyReport() {
  const examId = normalizeId(route.params.examId)
  const userId = normalizeId(userStore.userInfo?.id ?? userStore.userInfo?.user_id)
  if (!examId || !userId) {
    message.warning('缺少考试或用户信息')
    return
  }

  reportTitle.value = '个人考试分析报告'
  loadReport({ type: 'student', examId, userId })
}

function handleOpenClassReport() {
  const examId = normalizeId(route.params.examId)
  const classId = resolvedClassId.value
  if (!examId || !classId) {
    message.warning('缺少考试或班级信息')
    return
  }

  reportTitle.value = '班级考试分析报告'
  loadReport({ type: 'class', examId, classId })
}

function handleOpenStudentReport(result) {
  const examId = normalizeId(route.params.examId)
  const userId = extractUserId(result)
  if (!examId || !userId) {
    message.warning('缺少考试或学生信息')
    return
  }

  reportTitle.value = `个人考试分析报告 - ${result?.student_name || result?.real_name || result?.username || ''}`
  loadReport({ type: 'student', examId, userId })
}

function retryReportRequest() {
  if (lastReportRequest.value) {
    loadReport(lastReportRequest.value)
  }
}

// 返回
const handleBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    if (isTeacherOrAdmin.value) {
      router.push('/teacher')
    } else {
      router.push('/student')
    }
  }
}

// 获取数据
const fetchData = async () => {
  loading.value = true
  error.value = null

  const examId = route.params.examId
  if (!examId) {
    error.value = '缺少考试ID'
    loading.value = false
    return
  }

  try {
    // 先获取考试详情
    try {
      const examRes = await getExamDetail(examId)
      if (examRes.code === 200) {
        examInfo.value = examRes.data
      }
    } catch (e) {
      console.warn('获取考试详情失败:', e)
    }

    if (isTeacherOrAdmin.value) {
      // 教师/管理员：获取所有学生结果
      const res = await getExamResultAll(examId)
      if (res.code === 200) {
        allResults.value = Array.isArray(res.data) ? res.data : []
      } else {
        error.value = res.message || '获取考试结果失败'
      }
    } else {
      // 学生：获取自己的结果
      const res = await getExamResultMe(examId)
      console.log('考试结果数据:', res)
      if (res.code === 200) {
        studentResult.value = res.data
        console.log('学生结果:', studentResult.value)
      } else {
        error.value = res.message || '获取考试结果失败'
      }
    }
  } catch (err) {
    console.error('加载失败:', err)
    error.value = err.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.exam-result-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 40px;
}

.result-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.result-title {
  flex: 1;
  margin: 0 16px;
  font-size: 18px;
  font-weight: 500;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.result-content {
  max-width: 1000px;
  margin: 24px auto;
  padding: 0 16px;
}

/* 成绩概览卡片 - 学生视图 */
.overview-card {
  margin-bottom: 24px;
}

.score-display {
  display: flex;
  gap: 32px;
  align-items: center;
}

.score-circle {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9c6e 0%, #ff7a45 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #fff;
  flex-shrink: 0;
}

.score-circle.pass {
  background: linear-gradient(135deg, #95de64 0%, #52c41a 100%);
}

.score-number {
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
}

.score-label {
  font-size: 16px;
  margin-top: 4px;
}

.score-details {
  flex: 1;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

/* 题目卡片 */
.question-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.question-card.correct {
  border-left: 4px solid #52c41a;
}

.question-card:not(.correct) {
  border-left: 4px solid #ff4d4f;
}

.question-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.question-number {
  font-weight: 600;
  font-size: 16px;
}

.question-result {
  margin-right: auto;
}

.question-score {
  color: #666;
}

.question-stem {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 20px;
  color: #333;
}

.question-options {
  margin-bottom: 20px;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: #fafafa;
}

.option-item.option-correct {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.option-item.option-user.option-wrong {
  background: #fff2f0;
  border: 1px solid #ffa39e;
}

.option-item.option-user:not(.option-wrong) {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
}

.option-label {
  font-weight: 600;
  color: #666;
  width: 28px;
}

.option-text {
  flex: 1;
}

.option-icon {
  font-size: 18px;
}

.option-icon.correct {
  color: #52c41a;
}

.option-icon.wrong {
  color: #ff4d4f;
}

.answer-info {
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 6px;
}

.answer-row {
  display: flex;
  margin-bottom: 8px;
}

.answer-row:last-child {
  margin-bottom: 0;
}

.answer-label {
  color: #666;
  width: 80px;
  flex-shrink: 0;
}

.answer-value {
  flex: 1;
  font-weight: 500;
}

.answer-value.correct {
  color: #52c41a;
}

.answer-value.wrong {
  color: #ff4d4f;
}

.question-analysis {
  margin-top: 12px;
}

.analysis-label {
  font-weight: 500;
  color: #666;
  margin-bottom: 8px;
}

.analysis-content {
  color: #333;
  line-height: 1.6;
  padding: 12px;
  background: #fff7e6;
  border-radius: 6px;
}

/* 教师/管理员视图 */
.panel-header {
  display: flex;
  align-items: center;
  width: 100%;
}

.student-name {
  font-weight: 500;
  flex: 1;
}

.student-score {
  font-weight: 600;
}

.student-overview {
  margin-bottom: 16px;
}

.student-report-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.report-content {
  word-break: break-word;
  line-height: 1.8;
  color: #262626;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
}

.report-content :deep(h1),
.report-content :deep(h2),
.report-content :deep(h3) {
  margin-top: 20px;
  margin-bottom: 12px;
  font-weight: 600;
}

.report-content :deep(h1) {
  font-size: 24px;
}

.report-content :deep(h2) {
  font-size: 20px;
  color: #1677ff;
}

.report-content :deep(h3) {
  font-size: 17px;
  color: #13a8a8;
}

.report-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.report-content :deep(th),
.report-content :deep(td) {
  border: 1px solid #d9d9d9;
  padding: 8px;
}

.report-content :deep(th) {
  background: #f5f5f5;
}

.report-content :deep(blockquote) {
  margin: 12px 0;
  padding: 8px 12px;
  border-left: 4px solid #91caff;
  background: #f6f8fa;
}

.report-content :deep(pre) {
  overflow-x: auto;
  background: #f6f8fa;
  padding: 12px;
  border-radius: 6px;
}

.report-content :deep(code) {
  font-family: Consolas, monospace;
  background: #f6f8fa;
  padding: 2px 4px;
  border-radius: 4px;
}

/* 响应式设计 */
@media screen and (max-width: 768px) {
  .result-header {
    padding: 12px 16px;
  }

  .result-title {
    font-size: 16px;
  }

  .result-content {
    margin: 16px auto;
  }

  .score-display {
    flex-direction: column;
    gap: 20px;
  }

  .score-circle {
    width: 120px;
    height: 120px;
  }

  .score-number {
    font-size: 40px;
  }

  .question-header {
    flex-wrap: wrap;
  }

  .question-result {
    order: 3;
    width: 100%;
    margin-top: 8px;
    margin-right: 0;
  }

  .option-item {
    padding: 8px 12px;
  }
}
</style>
