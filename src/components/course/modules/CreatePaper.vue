<!--
 * @Date         : 2026-05-14
 * @Description  : 新建试卷组件
 * @FilePath     : CreatePaper.vue
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="create-paper">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>新建试卷</h2>
    </div>

    <!-- 主要内容区域 -->
    <div class="content-wrapper">
      <!-- 左侧：试卷信息和题库选择 -->
      <div class="left-panel">
        <!-- 试卷基本信息 -->
        <a-card title="试卷信息" class="paper-info-card">
          <a-form layout="vertical">
            <a-form-item label="试卷标题" required>
              <a-input
                v-model:value="paperInfo.title"
                placeholder="请输入试卷标题"
                :maxLength="100"
              />
            </a-form-item>

            <a-form-item label="课程ID">
              <a-input
                v-model:value="paperInfo.course_id"
                disabled
                placeholder="从路由参数获取"
              />
            </a-form-item>

            <a-form-item label="统计信息">
              <div class="stats-info">
                <span>题目总数：{{ selectedQuestions.length }}</span>
                <span>总分：{{ totalScore }}</span>
              </div>
            </a-form-item>
          </a-form>
        </a-card>

        <!-- 题库选择 -->
        <a-card title="选择题库" class="question-bank-card">
          <div v-if="bankLoading" class="loading-container">
            <a-spin />
          </div>

          <div v-else-if="questionBanks.length === 0" class="empty-container">
            <a-empty description="暂无题库数据" />
          </div>

          <div v-else class="bank-list">
            <a-radio-group v-model:value="selectedBankId" class="bank-radio-group">
              <a-radio
                v-for="bank in questionBanks"
                :key="bank.id"
                :value="bank.id"
                class="bank-radio-item"
              >
                <div class="bank-info">
                  <div class="bank-title">{{ bank.title }}</div>
                  <div class="bank-meta">
                    <span>课程：{{ bank.course }}</span>
                    <span>创建者：{{ bank.create_by }}</span>
                  </div>
                </div>
              </a-radio>
            </a-radio-group>
          </div>
        </a-card>
      </div>

      <!-- 右侧：题目选择和已选题目 -->
      <div class="right-panel">
        <!-- 题目列表 -->
        <a-card title="题目列表" class="question-list-card">
          <template #extra>
            <a-button
              type="primary"
              :disabled="!selectedBankId || questionLoading"
              @click="loadQuestions"
            >
              加载题目
            </a-button>
          </template>

          <div v-if="questionLoading" class="loading-container">
            <a-spin />
          </div>

          <div v-else-if="questions.length === 0" class="empty-container">
            <a-empty description="暂无题目数据" />
          </div>

          <div v-else class="question-list">
            <div
              v-for="question in questions"
              :key="question.id"
              class="question-item"
            >
              <div class="question-header">
                <a-checkbox
                  v-model:checked="question.selected"
                  @change="handleQuestionSelect(question)"
                >
                  <span class="question-type">{{ question.type_ }}</span>
                </a-checkbox>
              </div>

              <div class="question-content">
                <div class="question-text">
                  {{ question.question.question }}
                </div>

                <div v-if="question.question.choose" class="question-options">
                  <div
                    v-for="(option, index) in question.question.choose"
                    :key="index"
                    class="option-item"
                  >
                    {{ String.fromCharCode(65 + index) }}. {{ option }}
                  </div>
                </div>

                <div v-if="question.question.answer" class="question-answer">
                  <strong>答案：</strong>{{ question.question.answer }}
                </div>

                <div v-if="question.question.analysis" class="question-analysis">
                  <strong>解析：</strong>{{ question.question.analysis }}
                </div>
              </div>
            </div>
          </div>
        </a-card>

        <!-- 已选题目 -->
        <a-card title="已选题目" class="selected-questions-card">
          <div v-if="selectedQuestions.length === 0" class="empty-container">
            <a-empty description="暂未选择任何题目" />
          </div>

          <div v-else class="selected-questions-list">
            <div
              v-for="(question, index) in selectedQuestions"
              :key="question.id"
              class="selected-question-item"
            >
              <div class="selected-question-header">
                <span class="question-number">{{ index + 1 }}</span>
                <span class="question-type">{{ question.type_ }}</span>
                <a-button
                  type="text"
                  danger
                  size="small"
                  @click="removeQuestion(question.id)"
                >
                  移除
                </a-button>
              </div>

              <div class="selected-question-content">
                {{ question.question.question }}
              </div>

              <div class="score-setting">
                <span>分值：</span>
                <a-input-number
                  v-model:value="question.score"
                  :min="1"
                  :max="100"
                  :defaultValue="10"
                  @change="updateTotalScore"
                />
                <span>分</span>
              </div>
            </div>
          </div>
        </a-card>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="action-footer">
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button
          type="primary"
          :loading="saving"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          创建试卷
        </a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getQuestionBankList,
  getQuestionList
} from '@/api/questionBank'
import { createExamPaper } from '@/api/examPaper'

// 作为独立页面使用时，不需要 props 和 emit
const props = defineProps({
  courseId: {
    type: [String, Number],
    required: false
  }
})

const emit = defineEmits(['cancel', 'created'])

const route = useRoute()
const router = useRouter()

// 响应式数据
const paperInfo = ref({
  title: '',
  course_id: null
})

const questionBanks = ref([])
const selectedBankId = ref(null)
const questions = ref([])
const selectedQuestions = ref([])

// 加载状态
const bankLoading = ref(false)
const questionLoading = ref(false)
const saving = ref(false)

// 计算属性
const totalScore = computed(() => {
  return selectedQuestions.value.reduce((sum, question) => {
    return sum + (question.score || 0)
  }, 0)
})

const canSubmit = computed(() => {
  return paperInfo.value.title.trim() &&
         selectedQuestions.value.length > 0 &&
         totalScore.value > 0
})

// 方法定义
const loadQuestionBanks = async () => {
  if (!paperInfo.value.course_id) {
    message.warning('请先获取课程ID')
    return
  }

  bankLoading.value = true
  try {
    const res = await getQuestionBankList(paperInfo.value.course_id)
    if (res.code === 200) {
      questionBanks.value = res.data || []
      message.success(`加载到 ${questionBanks.value.length} 个题库`)
    } else {
      message.error(res.message || '获取题库列表失败')
    }
  } catch (error) {
    console.error('获取题库列表失败:', error)
    message.error('获取题库列表失败')
  } finally {
    bankLoading.value = false
  }
}

const loadQuestions = async () => {
  if (!selectedBankId.value) {
    message.warning('请先选择题库')
    return
  }

  questionLoading.value = true
  try {
    const res = await getQuestionList(selectedBankId.value)
    if (res.code === 200) {
      questions.value = (res.data || []).map(q => ({
        ...q,
        selected: false,
        score: 10 // 默认分值
      }))
      message.success(`加载到 ${questions.value.length} 道题目`)
    } else {
      message.error(res.message || '获取题目列表失败')
    }
  } catch (error) {
    console.error('获取题目列表失败:', error)
    message.error('获取题目列表失败')
  } finally {
    questionLoading.value = false
  }
}

const handleQuestionSelect = (question) => {
  if (question.selected) {
    // 添加到已选列表
    const exists = selectedQuestions.value.find(q => q.id === question.id)
    if (!exists) {
      selectedQuestions.value.push({ ...question })
    }
  } else {
    // 从已选列表移除
    const index = selectedQuestions.value.findIndex(q => q.id === question.id)
    if (index > -1) {
      selectedQuestions.value.splice(index, 1)
    }
  }
}

const removeQuestion = (questionId) => {
  // 从已选列表移除
  const selectedIndex = selectedQuestions.value.findIndex(q => q.id === questionId)
  if (selectedIndex > -1) {
    selectedQuestions.value.splice(selectedIndex, 1)
  }

  // 取消题目列表中的选中状态
  const questionIndex = questions.value.findIndex(q => q.id === questionId)
  if (questionIndex > -1) {
    questions.value[questionIndex].selected = false
  }

  updateTotalScore()
}

const updateTotalScore = () => {
  // 触发计算属性重新计算
}

const handleSubmit = async () => {
  if (!paperInfo.value.title.trim()) {
    message.warning('请输入试卷标题')
    return
  }

  if (selectedQuestions.value.length === 0) {
    message.warning('请至少选择一道题目')
    return
  }

  const hasInvalidScore = selectedQuestions.value.some(q => !q.score || q.score <= 0)
  if (hasInvalidScore) {
    message.warning('请为所有题目设置有效的分值')
    return
  }

  saving.value = true
  try {
    const requestData = {
      title: paperInfo.value.title.trim(),
      total_question: selectedQuestions.value.length,
      total_score: totalScore.value,
      course_id: paperInfo.value.course_id,
      question_list: selectedQuestions.value.map(item => ({
        question_id: item.id,
        score: item.score
      }))
    }

    const res = await createExamPaper(requestData)

    if (res.code === 200) {
      message.success('试卷创建成功')
      emit('created')
      // 作为独立页面使用时，创建成功后跳转回课程详情页的试卷模块
      const courseId = paperInfo.value.course_id
      if (courseId) {
        router.push(`/course/${courseId}?tab=exam-paper`)
      } else {
        router.push('/teacher')
      }
    } else {
      message.error(res.message || '创建试卷失败')
    }
  } catch (error) {
    console.error('创建试卷失败:', error)
    message.error('创建试卷失败')
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  // 作为独立页面使用时，直接返回上一页
  if (window.history.length > 1) {
    router.back()
  } else {
    // 如果没有历史记录，跳转到教师首页
    router.push('/teacher')
  }
  emit('cancel')
}

// 监听题库选择变化，清空题目列表
watch(selectedBankId, () => {
  questions.value = []
  selectedQuestions.value = []
})

// 生命周期
onMounted(() => {
  // 从props获取课程ID
  if (props.courseId) {
    paperInfo.value.course_id = props.courseId
    loadQuestionBanks()
  } else {
    // 回退到从路由参数获取
    const courseId = route.query.course_id || route.query.courseId || route.params.courseId
    if (courseId) {
      paperInfo.value.course_id = courseId
      loadQuestionBanks()
    } else {
      message.error('未获取到课程ID')
    }
  }
})
</script>

<style scoped>
.create-paper {
  padding: 24px;
  min-height: calc(100vh - 120px);
  background: #f5f5f5;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  color: #1a1a1a;
  font-size: 24px;
  font-weight: 600;
}

.content-wrapper {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.right-panel {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.paper-info-card,
.question-bank-card,
.question-list-card,
.selected-questions-card {
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
}

.stats-info {
  display: flex;
  gap: 24px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  font-weight: 500;
}

.stats-info span {
  color: #1890ff;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}

.empty-container {
  padding: 40px;
  text-align: center;
}

.bank-radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bank-radio-item {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  transition: all 0.3s;
}

.bank-radio-item:hover {
  border-color: #1890ff;
  background: #f6f8fa;
}

.bank-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bank-title {
  font-weight: 600;
  color: #1a1a1a;
}

.bank-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #8c8c8c;
}

.question-list {
  max-height: 400px;
  overflow-y: auto;
}

.question-item {
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  margin-bottom: 12px;
  transition: all 0.3s;
}

.question-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.question-header {
  margin-bottom: 8px;
}

.question-type {
  margin-left: 8px;
  padding: 2px 8px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 4px;
  font-size: 12px;
}

.question-content {
  margin-left: 24px;
  margin-bottom: 8px;
}

.question-text {
  font-weight: 500;
  margin-bottom: 8px;
  color: #262626;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}

.question-options {
  margin-bottom: 8px;
}

.option-item {
  padding: 4px 0;
  color: #595959;
  font-size: 14px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}

.question-answer,
.question-analysis {
  margin-top: 8px;
  padding: 8px;
  background: #f6ffed;
  border-radius: 4px;
  font-size: 14px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}

.question-analysis {
  background: #fff7e6;
}

.selected-questions-list {
  max-height: 300px;
  overflow-y: auto;
}

.selected-question-item {
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  margin-bottom: 12px;
  background: #fafafa;
}

.selected-question-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.question-number {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  background: #1890ff;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.selected-question-content {
  margin-bottom: 8px;
  color: #262626;
  font-size: 14px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}

.score-setting {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-setting span {
  color: #8c8c8c;
}

.action-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: center;
  z-index: 10;
}

/* 响应式设计 */
@media screen and (max-width: 1200px) {
  .content-wrapper {
    flex-direction: column;
  }

  .left-panel,
  .right-panel {
    flex: none;
  }
}

@media screen and (max-width: 768px) {
  .create-paper {
    padding: 16px;
  }

  .content-wrapper {
    gap: 16px;
  }

  .left-panel,
  .right-panel {
    gap: 16px;
  }

  .action-footer {
    padding: 12px 16px;
  }
}
</style>