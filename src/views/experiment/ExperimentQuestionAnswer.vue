<template>
  <div
    class="experiment-qa-page"
    @copy.prevent
    @cut.prevent
    @paste.prevent
    @contextmenu.prevent
    @selectstart.prevent
  >
    <div class="qa-header">
      <a-button type="link" @click="handleBack">
        <template #icon><LeftOutlined /></template>
        返回
      </a-button>
      <div class="qa-title-block">
        <h2>代码问答</h2>
        <span>{{ resultDetail.experiment_title || resultDetail.experiment || '实验提交' }}</span>
      </div>
      <a-tag v-if="isQuestionAnswered" color="green">已完成 · 问答得分 {{ totalQuestionScore }}</a-tag>
      <a-tag v-else :color="answeredCount === questionList.length ? 'green' : 'blue'">
        已答 {{ answeredCount }} / {{ questionList.length }}
      </a-tag>
    </div>

    <a-spin v-if="loading" tip="加载问答题目中..." class="loading-container" />

    <a-result v-else-if="error" status="error" title="加载失败" :sub-title="error">
      <template #extra>
        <a-button type="primary" @click="fetchResultDetail">重试</a-button>
      </template>
    </a-result>

    <a-result v-else-if="questionList.length === 0" status="warning" title="暂无代码问答题目">
      <template #extra>
        <a-button type="primary" @click="handleBack">返回</a-button>
      </template>
    </a-result>

    <div v-else class="qa-content">
      <a-card class="qa-info-card">
        <a-descriptions :column="descriptionColumns" bordered size="small">
          <a-descriptions-item label="提交ID">{{ resultId }}</a-descriptions-item>
          <a-descriptions-item label="实验">{{ resultDetail.experiment_title || resultDetail.experiment || '-' }}</a-descriptions-item>
          <a-descriptions-item label="代码得分">{{ formatScore(resultDetail.analysis?.score) }}</a-descriptions-item>
          <a-descriptions-item v-if="isQuestionAnswered" label="问答得分">{{ totalQuestionScore }}</a-descriptions-item>
          <a-descriptions-item v-if="isQuestionAnswered && resultDetail.final_score != null" label="最终得分">{{ formatScore(resultDetail.final_score) }}</a-descriptions-item>
          <a-descriptions-item v-if="isQuestionAnswered" label="问答状态">
            <a-tag color="green">{{ resultDetail.question_state || '已回答' }}</a-tag>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <a-card v-if="isQuestionAnswered" class="result-card" title="问答得分汇总">
        <div class="score-summary">
          <div class="score-summary-total">
            <span class="score-label">问答总分</span>
            <span class="score-value">{{ totalQuestionScore }}</span>
          </div>
          <div class="score-summary-items">
            <span
              v-for="(q, idx) in questionList"
              :key="idx"
              class="score-chip"
              :class="{ 'score-chip-good': getQuestionScore(q) >= 60, 'score-chip-bad': getQuestionScore(q) < 60 }"
            >
              第{{ idx + 1 }}题：{{ getQuestionScore(q) }}分
            </span>
          </div>
        </div>
      </a-card>

      <div class="question-nav">
        <div class="nav-title">题目导航</div>
        <div class="nav-buttons">
          <a-button
            v-for="(q, index) in questionList"
            :key="index"
            :type="currentIndex === index ? 'primary' : 'default'"
            :class="{
              answered: isAnswered(index),
              'score-pass': isQuestionAnswered && getQuestionScore(q) >= 60,
              'score-fail': isQuestionAnswered && getQuestionScore(q) < 60
            }"
            @click="currentIndex = index"
          >
            <template v-if="isQuestionAnswered">{{ getQuestionScore(q) }}</template>
            <template v-else>{{ index + 1 }}</template>
          </a-button>
        </div>
      </div>

      <a-card class="question-card">
        <div class="question-header">
          <span class="question-number">第 {{ currentIndex + 1 }} 题 / 共 {{ questionList.length }} 题</span>
          <a-tag :color="getQuestionTypeColor(currentQuestion)">{{ getQuestionLabel(currentQuestion) }}</a-tag>
        </div>

        <div class="question-stem">{{ getQuestionText(currentQuestion) }}</div>

        <div v-if="getQuestionType(currentQuestion) === 'single_choice'" class="question-options">
          <a-radio-group v-model:value="answers[currentIndex]" :disabled="isQuestionAnswered" class="options-group">
            <a-radio v-for="(option, optIndex) in getQuestionOptions(currentQuestion)" :key="optIndex" :value="option">
              {{ option }}
            </a-radio>
          </a-radio-group>
        </div>

        <div v-else-if="getQuestionType(currentQuestion) === 'true_or_false'" class="question-options">
          <a-radio-group v-model:value="answers[currentIndex]" :disabled="isQuestionAnswered" class="options-group">
            <a-radio :value="true">正确</a-radio>
            <a-radio :value="false">错误</a-radio>
          </a-radio-group>
        </div>

        <div v-else class="question-options">
          <a-textarea
            v-model:value="answers[currentIndex]"
            placeholder="请输入你的回答"
            :rows="8"
            :maxlength="5000"
            :disabled="isQuestionAnswered"
            show-count
          />
        </div>

        <div v-if="isQuestionAnswered" class="question-evaluation">
          <div class="eval-header">
            <span class="eval-label">本题得分</span>
            <span class="eval-score" :class="{ 'score-good': getQuestionScore(currentQuestion) >= 60, 'score-bad': getQuestionScore(currentQuestion) < 60 }">
              {{ getQuestionScore(currentQuestion) }}
            </span>
          </div>
          <div v-if="getQuestionReferenceAnswer(currentQuestion) || getQuestionAnswer(currentQuestion)" class="eval-reason">
            <div class="eval-reason-label">正确答案</div>
            <div class="eval-reason-text">{{ formatAnswerForDisplay(getQuestionReferenceAnswer(currentQuestion) || getQuestionAnswer(currentQuestion)) }}</div>
          </div>
          <div v-if="getQuestionReason(currentQuestion)" class="eval-reason">
            <div class="eval-reason-label">AI 评价</div>
            <div class="eval-reason-text">{{ getQuestionReason(currentQuestion) }}</div>
          </div>
        </div>

        <div class="question-navigation" style="margin-top: 16px">
          <a-button :disabled="currentIndex === 0" @click="currentIndex--">
            <template #icon><LeftOutlined /></template>
            上一题
          </a-button>
          <a-button type="primary" :disabled="currentIndex === questionList.length - 1" @click="currentIndex++">
            下一题
            <template #icon><RightOutlined /></template>
          </a-button>
        </div>
      </a-card>

      <div v-if="!isQuestionAnswered" class="submit-area">
        <a-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
          <template #icon><CheckCircleOutlined /></template>
          提交问答
        </a-button>
      </div>
      <div v-else class="submit-area">
        <a-button type="primary" size="large" @click="handleBack">返回实验</a-button>
      </div>
    </div>

    <a-modal
      v-model:open="submitConfirmVisible"
      title="确认提交代码问答"
      ok-text="确认提交"
      cancel-text="继续作答"
      :confirm-loading="submitting"
      @ok="submitAnswers"
    >
      <p>您已完成 {{ answeredCount }} / {{ questionList.length }} 道题目。</p>
      <p>提交后将由大模型进行评价，确定提交吗？</p>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { CheckCircleOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import { getExperimentResultById, submitExperimentAnalysis } from '@/api/experiment'

const route = useRoute()
const router = useRouter()

const resultId = computed(() => String(route.params.resultId || ''))
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const submitConfirmVisible = ref(false)
const resultDetail = ref({})
const questionObject = ref({})
const questionList = ref([])
const answers = ref({})
const currentIndex = ref(0)
const viewportWidth = ref(typeof window === 'undefined' ? 1200 : window.innerWidth)

const currentQuestion = computed(() => questionList.value[currentIndex.value] || {})
const answeredCount = computed(() => questionList.value.filter((_item, index) => hasAnswer(answers.value[index])).length)
const descriptionColumns = computed(() => viewportWidth.value < 768 ? 1 : 3)
const isQuestionAnswered = computed(() => resultDetail.value?.question_state === '已回答' || resultDetail.value?.question_state === '已批改')
const totalQuestionScore = computed(() => {
  return questionList.value.reduce((sum, q) => sum + getQuestionScore(q), 0)
})

function normalizeQuestionPayload(value) {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (err) {
      return {}
    }
  }
  if (Array.isArray(value)) {
    return { questions: value }
  }
  return value
}

function getQuestions(question) {
  if (Array.isArray(question?.questions)) return question.questions
  if (Array.isArray(question?.question_list)) return question.question_list
  if (Array.isArray(question?.list)) return question.list
  if (question && Object.keys(question).length > 0) return [question]
  return []
}

function getQuestionType(question = {}) {
  const value = question?.type || question?.question_type || question?.type_ || 'short_answer'
  return String(value || 'short_answer')
}

function getQuestionLabel(question = {}) {
  const questionType = getQuestionType(question)
  const map = {
    single_choice: '单选题',
    true_or_false: '判断题',
    short_answer: '简答题'
  }
  return map[questionType] || '简答题'
}

function getQuestionTypeColor(question = {}) {
  const questionType = getQuestionType(question)
  const map = {
    single_choice: 'blue',
    true_or_false: 'orange',
    short_answer: 'green'
  }
  return map[questionType] || 'blue'
}

function getQuestionOptions(question = {}) {
  if (Array.isArray(question?.choose)) return question.choose
  if (Array.isArray(question?.options)) return question.options
  return []
}

function getQuestionReferenceAnswer(question = {}) {
  return question?.reference_answer ?? question?.correct_answer ?? question?.answer ?? ''
}

function getQuestionAnswer(question = {}) {
  return question?.answer ?? question?.user_response ?? question?.response ?? ''
}

function formatAnswerForDisplay(value) {
  if (typeof value === 'boolean') return value ? '正确' : '错误'
  if (Array.isArray(value)) return value.join(', ')
  if (value === undefined || value === null || value === '') return '—'
  return String(value)
}

function normalizeAnswerValue(answer, type) {
  if (type === 'true_or_false') {
    return answer === true || answer === 'true' || answer === 'True' || answer === '正确'
  }
  if (type === 'single_choice') {
    return answer === undefined || answer === null ? '' : String(answer)
  }
  if (Array.isArray(answer)) {
    return answer.join(',')
  }
  return answer === undefined || answer === null ? '' : String(answer)
}

function initAnswers() {
  const initialAnswers = {}
  questionList.value.forEach((question, index) => {
    const type = getQuestionType(question)
    const sourceValue = getQuestionAnswer(question)
    if (type === 'true_or_false') {
      initialAnswers[index] = sourceValue === true || sourceValue === 'true' || sourceValue === 'True' || sourceValue === '正确'
      return
    }
    initialAnswers[index] = sourceValue ?? ''
  })
  answers.value = initialAnswers
}

function extractResponseData(res) {
  const data = res?.data?.data ?? res?.data ?? res ?? {}
  return Array.isArray(data) ? (data[0] || {}) : data
}

function hasAnswer(answer) {
  if (answer === undefined || answer === null || answer === '') return false
  if (Array.isArray(answer)) return answer.some(item => item !== undefined && item !== null && String(item).trim() !== '')
  return String(answer).trim() !== ''
}

function isAnswered(index) {
  return hasAnswer(answers.value[index])
}

function getQuestionText(question) {
  return question?.question || question?.stem || question?.title || question?.content || '-'
}

function getQuestionScore(question) {
  const val = question?.score ?? question?.question_score ?? question?.grade ?? question?.total_score
  if (val === undefined || val === null || val === '') return 0
  return Number.isFinite(Number(val)) ? Number(val) : 0
}

function getQuestionReason(question) {
  return question?.reason || question?.analysis || ''
}

function formatScore(value) {
  if (value === undefined || value === null || value === '') return '-'
  return Number.isFinite(Number(value)) ? Number(value) : value
}

function buildAnsweredQuestion() {
  return {
    ...questionObject.value,
    questions: questionList.value.map((question, index) => ({
      ...question,
      type: getQuestionType(question),
      question: getQuestionText(question),
      choose: getQuestionOptions(question),
      reference_answer: getQuestionReferenceAnswer(question) || '',
      analysis: getQuestionReason(question) || '',
      answer: normalizeAnswerValue(answers.value[index], getQuestionType(question))
    }))
  }
}

function prepareSubmitData() {
  return {
    experiment_result_id: resultId.value,
    question: buildAnsweredQuestion()
  }
}

async function fetchResultDetail() {
  if (!resultId.value) {
    error.value = '缺少实验提交ID'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const res = await getExperimentResultById(resultId.value)
    applyResultDetail(extractResponseData(res))
  } catch (err) {
    console.error('加载代码问答失败:', err)
    error.value = err.message || '加载代码问答失败'
  } finally {
    loading.value = false
  }
}

function applyResultDetail(detail) {
  resultDetail.value = {
    ...detail,
    id: String(detail?.id ?? resultId.value),
    experiment_result_id: String(detail?.experiment_result_id ?? detail?.id ?? resultId.value)
  }
  questionObject.value = normalizeQuestionPayload(detail?.question)
  questionList.value = getQuestions(questionObject.value)
  currentIndex.value = 0
  initAnswers()
}

function handleBack() {
  router.back()
}

function handleSubmit() {
  if (isQuestionAnswered.value) return

  if (answeredCount.value < questionList.value.length) {
    message.warning('请完成所有题目后再提交')
    return
  }
  submitConfirmVisible.value = true
}

async function submitAnswers() {
  if (isQuestionAnswered.value) return

  submitting.value = true
  try {
    const res = await submitExperimentAnalysis(prepareSubmitData())
    const detail = extractResponseData(res)
    if (detail?.id || detail?.question || detail?.question_state) {
      applyResultDetail(detail)
    } else {
      await fetchResultDetail()
    }
    submitConfirmVisible.value = false
    message.success('代码问答提交成功')
  } catch (err) {
    console.error('提交代码问答失败:', err)
    message.error(err.message || '提交代码问答失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchResultDetail()
  if (typeof window !== 'undefined') {
    viewportWidth.value = window.innerWidth
  }
})
</script>

<style scoped>
.experiment-qa-page {
  min-height: 100vh;
  padding: 24px;
  background: #f5f7fb;
}

.qa-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 8px;
}

.qa-title-block {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.qa-title-block h2 {
  margin: 0;
  color: #1f2937;
  font-size: 22px;
  font-weight: 650;
}

.qa-title-block span {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: #6b7280;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
}

.qa-content {
  max-width: 1040px;
  margin: 0 auto;
}

.qa-info-card,
.result-card,
.question-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.result-reason {
  white-space: pre-wrap;
  word-break: break-word;
  color: #374151;
  line-height: 1.8;
}

.score-summary {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.score-summary-total {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.score-label {
  color: #6b7280;
  font-size: 14px;
}

.score-value {
  color: #1677ff;
  font-size: 28px;
  font-weight: 700;
}

.score-summary-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.score-chip {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.score-chip-good {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.score-chip-bad {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.question-evaluation {
  margin-top: 16px;
  padding: 16px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.eval-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.eval-label {
  color: #6b7280;
  font-size: 14px;
}

.eval-score {
  font-size: 24px;
  font-weight: 700;
}

.eval-score.score-good {
  color: #16a34a;
}

.eval-score.score-bad {
  color: #dc2626;
}

.eval-reason {
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.eval-reason-label {
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 6px;
  font-weight: 500;
}

.eval-reason-text {
  white-space: pre-wrap;
  word-break: break-word;
  color: #374151;
  line-height: 1.8;
  font-size: 14px;
}

.question-nav {
  margin-bottom: 16px;
  padding: 16px;
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 8px;
}

.nav-title {
  margin-bottom: 12px;
  color: #374151;
  font-weight: 600;
}

.nav-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.nav-buttons .ant-btn {
  width: 38px;
  height: 38px;
  padding: 0;
}

.nav-buttons .answered:not(.ant-btn-primary) {
  color: #1677ff;
  border-color: #91caff;
  background: #e6f4ff;
}

.nav-buttons .score-pass:not(.ant-btn-primary) {
  color: #16a34a;
  border-color: #86efac;
  background: #f0fdf4;
}

.nav-buttons .score-fail:not(.ant-btn-primary) {
  color: #dc2626;
  border-color: #fca5a5;
  background: #fef2f2;
}

.question-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.question-number {
  color: #111827;
  font-size: 16px;
  font-weight: 650;
}

.question-stem {
  margin-bottom: 20px;
  padding: 16px;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f9fafb;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  color: #1f2937;
  font-size: 16px;
  line-height: 1.7;
}

.question-options {
  margin-bottom: 22px;
}

.question-navigation,
.submit-area {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.submit-area {
  justify-content: center;
  padding: 18px 0 4px;
}

.submit-summary {
  line-height: 1.8;
}

@media (max-width: 768px) {
  .experiment-qa-page {
    padding: 12px;
  }

  .qa-header {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
  }

  .qa-title-block {
    text-align: left;
  }

  .qa-title-block h2 {
    font-size: 20px;
  }

  .question-card :deep(.ant-card-body),
  .qa-info-card :deep(.ant-card-body) {
    padding: 14px;
  }

  .question-navigation {
    flex-direction: column;
  }

  .question-navigation .ant-btn,
  .submit-area .ant-btn {
    width: 100%;
  }
}
</style>
