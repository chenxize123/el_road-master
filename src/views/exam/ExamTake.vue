<!--
 * @Date         : 2026-05-14
 * @Description  : 学生考试页面
 * @FilePath     : ExamTake.vue
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 -->
<template>
  <div
    class="exam-take-page"
    @copy.prevent
    @cut.prevent
    @paste.prevent
    @contextmenu.prevent
    @selectstart.prevent
  >
    <!-- 顶部导航栏 -->
    <div class="exam-header">
      <a-button type="link" @click="handleBack">
        <template #icon><left-outlined /></template>
        返回
      </a-button>
      <h2 class="exam-title">{{ paperInfo?.title || examDetail?.title || '考试中' }}</h2>
      <div class="exam-timers">
        <div class="exam-timer" :class="{ warning: timeLeft <= 300 }">
          <clock-circle-outlined />
          <span>{{ formatTime(timeLeft) }}</span>
        </div>
        <div v-if="examDetail?.end_time" class="exam-end-time">
          结束时间: {{ formatEndTime(examDetail.end_time) }}
        </div>
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
    <a-result v-else-if="questionList.length === 0" status="warning" title="暂无题目">
      <template #extra>
        <a-button type="primary" @click="handleBack">返回</a-button>
      </template>
    </a-result>

    <!-- 考试内容 -->
    <div v-else class="exam-content">
      <!-- 试卷信息卡片 -->
      <a-card class="paper-info-card">
        <a-descriptions :column="3" bordered size="small">
          <a-descriptions-item label="试卷标题">{{ paperInfo?.title || '-' }}</a-descriptions-item>
          <a-descriptions-item label="题目数量">{{ paperInfo?.total_question || 0 }}</a-descriptions-item>
          <a-descriptions-item label="试卷总分">{{ paperInfo?.total_score || 0 }}</a-descriptions-item>
          <a-descriptions-item label="创建人">{{ paperInfo?.create_by || '-' }}</a-descriptions-item>
          <a-descriptions-item label="所属课程">{{ paperInfo?.course || '-' }}</a-descriptions-item>
          <a-descriptions-item label="所有者">{{ paperInfo?.owner || '-' }}</a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 题目导航 -->
      <div class="question-nav">
        <div class="nav-title">题目导航</div>
        <div class="nav-buttons">
          <a-button
            v-for="(q, idx) in questionList"
            :key="idx"
            :type="currentIndex === idx ? 'primary' : 'default'"
            :class="{ answered: isAnswered(idx) }"
            @click="goToQuestion(idx)"
          >
            {{ idx + 1 }}
          </a-button>
        </div>
      </div>

      <!-- 当前题目 -->
      <a-card class="question-card">
        <div class="question-header">
          <span class="question-number">第 {{ currentIndex + 1 }} 题 / 共 {{ questionList.length }} 题</span>
          <a-tag color="blue">{{ currentQuestion?.type_ }}</a-tag>
          <span class="question-score">分值：{{ currentQuestion?.score }} 分</span>
        </div>

        <div class="question-stem">
          {{ currentQuestion?.question?.question }}
        </div>

        <!-- 单选题 -->
        <div v-if="currentQuestion?.type_ === '单选题'" class="question-options">
          <a-radio-group v-model:value="answers[currentQuestion.question_id]" class="options-group">
            <a-radio v-for="(option, optIndex) in currentQuestion?.question?.choose" :key="optIndex" :value="option">
              {{ option }}
            </a-radio>
          </a-radio-group>
        </div>

        <!-- 多选题 -->
        <div v-else-if="currentQuestion?.type_ === '多选题'" class="question-options">
          <a-checkbox-group v-model:value="answers[currentQuestion.question_id]" class="options-group">
            <a-checkbox v-for="(option, optIndex) in currentQuestion?.question?.choose" :key="optIndex" :value="option">
              {{ option }}
            </a-checkbox>
          </a-checkbox-group>
        </div>

        <!-- 填空题 -->
        <div v-else-if="currentQuestion?.type_ === '填空题'" class="question-options">
          <div class="fill-blank-answers">
            <a-input
              v-for="(_, blankIndex) in getFillBlankInputs(currentQuestion)"
              :key="blankIndex"
              v-model:value="answers[currentQuestion.question_id][blankIndex]"
              :placeholder="`请输入第 ${blankIndex + 1} 空答案`"
              class="fill-blank-input"
            >
              <template #prefix>
                <span class="fill-blank-index">{{ blankIndex + 1 }}</span>
              </template>
            </a-input>
          </div>
        </div>

        <!-- 简答题 -->
        <div v-else-if="currentQuestion?.type_ === '简答题'" class="question-options">
          <a-textarea
            v-model:value="answers[currentQuestion.question_id]"
            placeholder="请输入简答题答案"
            :rows="8"
            show-count
          />
        </div>

        <!-- 判断题 -->
        <div v-else-if="currentQuestion?.type_ === '判断题'" class="question-options">
          <a-radio-group v-model:value="answers[currentQuestion.question_id]" class="options-group">
            <a-radio :value="true">是</a-radio>
            <a-radio :value="false">否</a-radio>
          </a-radio-group>
        </div>

        <!-- 上一题/下一题按钮 -->
        <div class="question-navigation">
          <a-button @click="prevQuestion" :disabled="currentIndex === 0">
            <template #icon><left-outlined /></template>
            上一题
          </a-button>
          <a-button type="primary" @click="nextQuestion" :disabled="currentIndex === questionList.length - 1">
            下一题
            <template #icon><right-outlined /></template>
          </a-button>
        </div>
      </a-card>

      <!-- 底部交卷区域 -->
      <div class="submit-area">
        <a-button type="primary" size="large" :loading="submitting" @click="handleManualSubmit">
          交卷
        </a-button>
      </div>
    </div>

    <!-- 交卷确认弹窗 -->
    <a-modal
      v-model:open="submitConfirmVisible"
      title="确认交卷"
      ok-text="确认交卷"
      cancel-text="继续答题"
      @ok="handleSubmitConfirm"
      @cancel="submitConfirmVisible = false"
    >
      <p>您已完成 {{ answeredCount }} / {{ questionList.length }} 道题目</p>
      <p>确定要交卷吗？</p>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { LeftOutlined, ClockCircleOutlined, RightOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/store/user'
import { getExamDetail, getExamQuestions, getExamPaper, submitExam } from '@/api/examTake'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// localStorage key
const getStorageKey = (id) => `exam_${id}_state`

// 状态
const loading = ref(true)
const submitting = ref(false)
const error = ref(null)
const submitConfirmVisible = ref(false)
const currentIndex = ref(0)

// 数据
const examId = ref('')
const examDetail = ref(null)
const questionList = ref([])
const paperInfo = ref(null)

// 用户答案: { [questionId]: answerValue }
const answers = ref({})

// 计时相关
const timeLeft = ref(0)
const examStartTime = ref(null)
const timerRef = ref(null)
const examEndTimerRef = ref(null) // 考试结束时间计时器

// 当前题目
const currentQuestion = computed(() => questionList.value[currentIndex.value])

const hasAnswer = (answer) => {
  if (answer === undefined || answer === null || answer === '') return false
  if (Array.isArray(answer)) return answer.some(item => item !== undefined && item !== null && String(item).trim() !== '')
  return true
}

const getFillBlankCount = (question) => {
  const stem = question?.question?.question || ''
  const answer = question?.question?.answer
  const blankCount = (stem.match(/_{3,}|＿{3,}/g) || []).length
  const answerCount = Array.isArray(answer) ? answer.length : 0
  return Math.max(blankCount, answerCount, 1)
}

const getFillBlankInputs = (question) => {
  return Array.from({ length: getFillBlankCount(question) })
}

const normalizeFillBlankAnswer = (question, value) => {
  const count = getFillBlankCount(question)
  const values = Array.isArray(value) ? value : (value ? [value] : [])
  return Array.from({ length: count }, (_, index) => values[index] ?? '')
}

// 计算已答题数量
const answeredCount = computed(() => {
  return Object.values(answers.value).filter(hasAnswer).length
})

// 判断某题是否已答
const isAnswered = (index) => {
  const q = questionList.value[index]
  if (!q) return false
  const a = answers.value[q.question_id]
  return hasAnswer(a)
}

// 跳转到指定题目
const goToQuestion = (index) => {
  currentIndex.value = index
}

// 上一题
const prevQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

// 下一题
const nextQuestion = () => {
  if (currentIndex.value < questionList.value.length - 1) {
    currentIndex.value++
  }
}

// 格式化时间
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// 格式化考试结束时间
const formatEndTime = (endTime) => {
  if (!endTime) return ''
  const d = new Date(endTime)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// 返回
const handleBack = () => {
  router.push('/student')
}

// 保存考试状态到 localStorage
const saveExamState = () => {
  const state = {
    answers: answers.value,
    currentIndex: currentIndex.value,
    timeLeft: timeLeft.value,
    savedAt: Date.now()
  }
  localStorage.setItem(getStorageKey(examId.value), JSON.stringify(state))
}

// 从 localStorage 恢复考试状态
const restoreExamState = () => {
  const savedState = localStorage.getItem(getStorageKey(examId.value))
  if (!savedState) return false

  try {
    const state = JSON.parse(savedState)

    // 计算经过的时间
    const elapsed = Math.floor((Date.now() - state.savedAt) / 1000)
    const remaining = Math.max(0, state.timeLeft - elapsed)

    // 恢复状态
    answers.value = state.answers || {}
    questionList.value.forEach(q => {
      if (q.type_ === '填空题') {
        answers.value[q.question_id] = normalizeFillBlankAnswer(q, answers.value[q.question_id])
      }
    })
    currentIndex.value = state.currentIndex || 0
    timeLeft.value = remaining
    // 恢复考试开始时间：用当前时间减去已用时间
    if (examDetail.value?.total_duration) {
      const totalSeconds = examDetail.value.total_duration * 60
      const usedSeconds = totalSeconds - remaining
      examStartTime.value = Date.now() - (usedSeconds * 1000)
    }

    // 如果还有时间，启动定时器
    if (remaining > 0) {
      startTimer()
    } else {
      // 时间到了，自动交卷
      handleSubmit(true)
    }

    // 启动考试结束时间检查
    startExamEndTimer()
    return true
  } catch (e) {
    console.error('恢复考试状态失败:', e)
    return false
  }
}

// 清除考试状态
const clearExamState = () => {
  localStorage.removeItem(getStorageKey(examId.value))
}

// 获取数据
const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const [examRes, questionRes, paperRes] = await Promise.all([
      getExamDetail(examId.value),
      getExamQuestions(examId.value),
      getExamPaper(examId.value)
    ])

    if (examRes.code === 200) {
      examDetail.value = examRes.data
    }
    if (questionRes.code === 200) {
      questionList.value = Array.isArray(questionRes.data) ? questionRes.data : []
    }
    if (paperRes.code === 200) {
      paperInfo.value = paperRes.data
    }

    // 先尝试恢复状态
    const restored = restoreExamState()

    if (!restored) {
      // 没有保存的状态，初始化新考试
      if (examDetail.value?.total_duration) {
        timeLeft.value = examDetail.value.total_duration * 60
        examStartTime.value = Date.now()
        startTimer()
      }
      initAnswers()
    }

    // 启动考试结束时间检查
    startExamEndTimer()
  } catch (err) {
    console.error('加载失败:', err)
    error.value = err.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

// 初始化答案对象
const initAnswers = () => {
  const initialAnswers = {}
  questionList.value.forEach(q => {
    if (q.type_ === '多选题') {
      initialAnswers[q.question_id] = []
    } else if (q.type_ === '填空题') {
      initialAnswers[q.question_id] = normalizeFillBlankAnswer(q)
    } else if (q.type_ === '判断题') {
      initialAnswers[q.question_id] = null
    } else {
      initialAnswers[q.question_id] = ''
    }
  })
  answers.value = initialAnswers
}

// 检查考试结束时间
const checkExamEndTime = () => {
  if (!examDetail.value?.end_time) return

  const endTime = new Date(examDetail.value.end_time).getTime()
  const now = Date.now()

  if (now >= endTime) {
    // 考试结束时间已到，自动交卷
    message.warning('考试已到结束时间，正在自动交卷...')
    handleSubmit(true)
    return true
  }
  return false
}

// 启动考试结束时间检查
const startExamEndTimer = () => {
  if (!examDetail.value?.end_time) return

  if (examEndTimerRef.value) {
    clearInterval(examEndTimerRef.value)
  }

  // 先检查一次
  if (checkExamEndTime()) return

  examEndTimerRef.value = setInterval(() => {
    checkExamEndTime()
  }, 1000)
}

// 启动计时器
const startTimer = () => {
  if (timerRef.value) {
    clearInterval(timerRef.value)
  }
  timerRef.value = setInterval(() => {
    timeLeft.value--
    saveExamState()
    if (timeLeft.value <= 0) {
      // 时间到，自动交卷
      handleSubmit(true)
    }
  }, 1000)
}

// 手动交卷
const handleManualSubmit = () => {
  submitConfirmVisible.value = true
}

// 确认交卷
const handleSubmitConfirm = () => {
  submitConfirmVisible.value = false
  handleSubmit(false)
}

// 计算单题得分
const calculateQuestionScore = (question, userAnswer) => {
  const correctAnswer = question.question?.answer
  if (!hasAnswer(userAnswer)) {
    return 0
  }

  if (question.type_ === '多选题') {
    if (!Array.isArray(userAnswer)) return 0
    if (Array.isArray(correctAnswer)) {
      return [...userAnswer].sort().join(',') === [...correctAnswer].sort().join(',') ? question.score : 0
    }
    return userAnswer.length === 1 && userAnswer[0] === correctAnswer ? question.score : 0
  }

  if (question.type_ === '填空题') {
    return 0
  }

  if (question.type_ === '判断题') {
    if (userAnswer === correctAnswer ||
        String(userAnswer) === String(correctAnswer) ||
        (userAnswer === true && correctAnswer === 'true') ||
        (userAnswer === false && correctAnswer === 'false')) {
      return question.score
    }
    return 0
  }

  return String(userAnswer) === String(correctAnswer) ? question.score : 0
}

// 计算总分
const calculateScore = () => {
  let totalScore = 0
  questionList.value.forEach(q => {
    const userAnswer = answers.value[q.question_id]
    const questionScore = calculateQuestionScore(q, userAnswer)
    totalScore += questionScore
  })
  console.log("及格分数："+examDetail.value?.passing_score)
  console.log("总分："+totalScore)
  console.log(`是否通过：${totalScore >= (examDetail.value?.passing_score || 0)}`);
  console.log(typeof totalScore, typeof examDetail.value?.passing_score);
  
  let isPassing = false;
  const passingScore = Number(examDetail.value?.passing_score || 0);
  const score = Number(totalScore);

  // 用 if 判断，不用 >=
  if (score > passingScore || Math.abs(score - passingScore) < 1e-8) {
    isPassing = true;
  }

  return {
    totalScore: score,
    isPassing
  };
}

// 提交考试
const handleSubmit = async (isAuto = false) => {
  if (submitting.value) return
  submitting.value = true
  try {
    if (timerRef.value) {
      clearInterval(timerRef.value)
      timerRef.value = null
    }
    if (examEndTimerRef.value) {
      clearInterval(examEndTimerRef.value)
      examEndTimerRef.value = null
    }
    const { totalScore, isPassing } = calculateScore()
    const question_result_list = questionList.value.map(q => {
      const userAnswer = answers.value[q.question_id]
      const questionScore = calculateQuestionScore(q, userAnswer)
      let user_response
      if (q.type_ === '判断题') {
        // 确保判断题的答案是布尔值
        const boolAnswer = userAnswer === true || userAnswer === 'true' || userAnswer === 'True'
        user_response = { user_response: boolAnswer }
      } else if (q.type_ === '多选题') {
        // 多选题是数组
        user_response = { user_response: Array.isArray(userAnswer) ? userAnswer : [] }
      } else if (q.type_ === '填空题') {
        // 填空题按空位提交数组
        user_response = { user_response: normalizeFillBlankAnswer(q, userAnswer) }
      } else {
        // 单选题和简答题是字符串
        user_response = { user_response: userAnswer !== undefined && userAnswer !== null ? String(userAnswer) : '' }
      }
      return {
        question_id: String(q.question_id),  // 字符串
        user_response,
        score: questionScore
      }
    })
    // 计算学生实际用时（分钟）- 使用 examStartTime 精确计算
    let actualDuration
    if (examStartTime.value) {
      // 使用实际开始时间计算更准确
      const usedMs = Date.now() - examStartTime.value
      actualDuration = Math.max(1, Math.ceil(usedMs / 1000 / 60)) // 至少1分钟
    } else {
      // 降级方案：通过剩余时间计算
      const totalExamSeconds = (examDetail.value?.total_duration || 0) * 60
      const usedSeconds = totalExamSeconds - timeLeft.value
      actualDuration = Math.max(1, Math.ceil(usedSeconds / 60))
    }

    // 生成本地时区的 ISO 格式时间字符串（避免 UTC 的 8 小时时差）
    const now = new Date()
    const localISOTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString()

    const submitData = {
      student_id: String(userStore.userInfo?.id),  // 字符串
      exam_id: String(examId.value),  // 字符串
      score: totalScore,
      duration: actualDuration,
      submission_deadline: localISOTime,  // 学生实际交卷时间（本地时区）
      status: isAuto ? 0 : 1,
      is_passing: isPassing,
      question_result_list
    }
    console.log('📤 提交的完整数据:', JSON.stringify(submitData, null, 2))
    const res = await submitExam(submitData)
    if (res.code === 200) {
      message.success('考试提交成功')
      clearExamState() // 清除状态
      setTimeout(() => {
        router.push('/student')
      }, 1500)
    } else {
      message.error(res.message || '提交失败')
      submitting.value = false
    }
  } catch (err) {
    console.error('提交失败:', err)
    message.error('提交失败，请重试')
    submitting.value = false
  }
}

// 防截屏检测
const handleVisibilityChange = () => {
  if (document.hidden) {
    message.warning('检测到页面隐藏，请回到考试页面！')
  }
}

const handleKeyDown = (e) => {
  // 禁用常见的截屏快捷键
  if (
    (e.key === 'PrintScreen') ||
    (e.ctrlKey && e.key === 'p') ||
    (e.ctrlKey && e.shiftKey && e.key === 's') ||
    (e.ctrlKey && e.shiftKey && e.key === 'S')
  ) {
    e.preventDefault()
    e.stopPropagation()
    message.warning('考试期间不允许截屏！')
  }
}

// 组件挂载
onMounted(() => {
  examId.value = route.params.examId
  fetchData()

  // 添加防截屏监听
  document.addEventListener('visibilitychange', handleVisibilityChange)
  document.addEventListener('keydown', handleKeyDown, { capture: true })
})

// 监听答案变化，自动保存
watch([answers, currentIndex], () => {
  if (!loading.value && examId.value) {
    saveExamState()
  }
}, { deep: true })

onBeforeUnmount(() => {
  if (timerRef.value) {
    clearInterval(timerRef.value)
  }
  if (examEndTimerRef.value) {
    clearInterval(examEndTimerRef.value)
  }
  if (!submitting.value && examId.value && timeLeft.value > 0) {
    saveExamState() // 离开页面时保存状态
  }
  // 移除防截屏监听
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  document.removeEventListener('keydown', handleKeyDown, { capture: true })
})
</script>

<style scoped>
.exam-take-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 100px;
  /* 禁用文本选择 */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  /* 水印效果 */
  position: relative;
}

.exam-take-page::before {
  content: '正在考试中，请勿截屏';
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  font-size: 60px;
  color: rgba(255, 0, 0, 0.08);
  pointer-events: none;
  z-index: 9999;
  white-space: nowrap;
  letter-spacing: 10px;
  font-weight: bold;
  user-select: none;
}

/* 禁用输入框外的选择，但允许输入框内可以选择 */
.exam-take-page :deep(input),
.exam-take-page :deep(textarea) {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

.exam-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.exam-title {
  flex: 1;
  margin: 0 16px;
  font-size: 18px;
  font-weight: 500;
}

.exam-timers {
  display: flex;
  align-items: center;
  gap: 12px;
}

.exam-timer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1890ff;
  padding: 8px 16px;
  background: #e6f7ff;
  border-radius: 4px;
}

.exam-timer.warning {
  color: #ff4d4f;
  background: #fff1f0;
}

.exam-end-time {
  font-size: 14px;
  color: #666;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.exam-content {
  max-width: 1000px;
  margin: 24px auto;
  padding: 0 16px;
}

.paper-info-card {
  margin-bottom: 16px;
}

.question-nav {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.nav-title {
  font-weight: 500;
  margin-bottom: 12px;
  color: #333;
}

.nav-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.nav-buttons .ant-btn {
  min-width: 40px;
}

.nav-buttons .ant-btn.answered {
  border-color: #52c41a;
  color: #52c41a;
}

.nav-buttons .ant-btn.answered.ant-btn-primary {
  background-color: #52c41a;
  border-color: #52c41a;
  color: #fff;
}

.question-card {
  border-radius: 8px;
  margin-bottom: 16px;
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

.question-score {
  color: #666;
  margin-left: auto;
}

.question-stem {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 24px;
  color: #333;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: normal;
}

.question-options {
  padding-left: 8px;
  margin-bottom: 24px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.options-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.options-group :deep(.ant-radio-wrapper),
.options-group :deep(.ant-checkbox-wrapper) {
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  line-height: 1.6;
}

.options-group :deep(.ant-radio),
.options-group :deep(.ant-checkbox) {
  align-self: flex-start;
  margin-top: 3px;
}

.fill-blank-answers {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fill-blank-input {
  max-width: 720px;
}

.fill-blank-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e6f4ff;
  color: #1677ff;
  font-size: 12px;
  font-weight: 600;
}

.question-navigation {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.submit-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 16px 24px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: center;
}

@media screen and (max-width: 768px) {
  .exam-header {
    padding: 12px 16px;
  }

  .exam-title {
    font-size: 16px;
  }

  .exam-timers {
    flex-direction: column;
    gap: 4px;
  }

  .exam-timer {
    font-size: 16px;
    padding: 6px 12px;
  }

  .exam-end-time {
    font-size: 12px;
    padding: 4px 8px;
  }

  .exam-content {
    margin: 16px auto;
  }

  .nav-buttons {
    gap: 6px;
  }

  .nav-buttons .ant-btn {
    min-width: 36px;
    height: 32px;
    padding: 0 8px;
    font-size: 14px;
  }
}
</style>
