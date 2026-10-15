<!--
 * @Date         : 2026-05-14
 * @Description  : 试卷详情页面
 * @FilePath     : PaperDetail.vue
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="paper-detail">
    <!-- 返回按钮 -->
    <div class="back-action">
      <a-button @click="goBack" class="back-button">
        <template #icon><arrow-left-outlined /></template>
        返回试卷列表
      </a-button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <a-spin tip="正在加载试卷详情..." />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <a-result
        status="error"
        title="加载失败"
        :sub-title="error"
      >
        <template #extra>
          <a-button type="primary" @click="fetchPaperDetail">
            重新加载
          </a-button>
          <a-button @click="goBack">
            返回列表
          </a-button>
        </template>
      </a-result>
    </div>

    <!-- 试卷详情内容 -->
    <div v-else-if="paperInfo" class="paper-content">
      <!-- 试卷基本信息 -->
      <a-card class="paper-info-card" :bordered="false">
        <div class="paper-header">
          <h1 class="paper-title">{{ paperInfo.title }}</h1>
          <div class="paper-meta">
            <a-descriptions :column="2" size="small">
              <a-descriptions-item label="试题数量">
                {{ paperInfo.total_question }} 题
              </a-descriptions-item>
              <a-descriptions-item label="总分">
                {{ paperInfo.total_score }} 分
              </a-descriptions-item>
              <a-descriptions-item label="创建人">
                {{ paperInfo.create_by }}
              </a-descriptions-item>
              <a-descriptions-item label="所属课程">
                {{ paperInfo.course }}
              </a-descriptions-item>
              <a-descriptions-item label="所有者" :span="2">
                {{ paperInfo.owner }}
              </a-descriptions-item>
            </a-descriptions>
          </div>
        </div>
      </a-card>

      <!-- 题目列表 -->
      <div class="questions-section">
        <div class="questions-header">
          <h2>题目列表</h2>
          <span class="question-count">共 {{ questions.length }} 题</span>
        </div>

        <!-- 空题目提示 -->
        <div v-if="!questions.length" class="empty-questions">
          <a-empty description="该试卷暂无题目" />
        </div>

        <!-- 题目列表 -->
        <div v-else class="questions-list">
          <div
            v-for="(question, index) in questions"
            :key="question.id"
            class="question-item"
          >
            <a-card :bordered="true" class="question-card">
              <!-- 题目标题 -->
              <div class="question-header">
                <div class="question-number">
                  第 {{ index + 1 }} 题
                </div>
                <div class="question-type-score">
                  <a-tag color="blue">{{ question.type_ }}</a-tag>
                  <span class="score">{{ question.score }} 分</span>
                </div>
              </div>

              <!-- 题干 -->
              <div class="question-stem">
                <h4>题目：</h4>
                <p>{{ question.question.question }}</p>
              </div>

              <!-- 选项 -->
              <div v-if="question.question.choose && question.question.choose.length" class="question-options">
                <h4>选项：</h4>
                <div class="options-list">
                  <div
                    v-for="(option, optIndex) in question.question.choose"
                    :key="optIndex"
                    class="option-item"
                  >
                    <span class="option-label">{{ String.fromCharCode(65 + optIndex) }}.</span>
                    <span class="option-content">{{ cleanOptionLabel(option, optIndex) }}</span>
                  </div>
                </div>
              </div>

              <!-- 答案 -->
              <div class="question-answer">
                <h4>答案：</h4>
                <div class="answer-content">
                  {{ formatAnswer(question.question.answer, question.type_, question.question.choose) }}
                </div>
              </div>

              <!-- 解析 -->
              <div v-if="question.question.analysis" class="question-analysis">
                <h4>解析：</h4>
                <p>{{ question.question.analysis }}</p>
              </div>
            </a-card>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { getPaperDetail, getPaperQuestions } from '@/api/paperDetail'

const route = useRoute()
const router = useRouter()

// 状态管理
const loading = ref(false)
const error = ref(null)
const paperInfo = ref(null)
const questions = ref([])

/**
 * 获取试卷详情
 */
const fetchPaperDetail = async () => {
  loading.value = true
  error.value = null

  try {
    const paperId = route.params.paperId

    // 并行请求试卷基本信息和题目列表
    const [paperRes, questionsRes] = await Promise.all([
      getPaperDetail(paperId),
      getPaperQuestions(paperId)
    ])

    // 处理试卷基本信息
    if (paperRes.code === 200) {
      paperInfo.value = paperRes.data
    } else {
      throw new Error(paperRes.message || '获取试卷信息失败')
    }

    // 处理题目列表
    if (questionsRes.code === 200) {
      questions.value = Array.isArray(questionsRes.data) ? questionsRes.data : []
    } else {
      throw new Error(questionsRes.message || '获取题目列表失败')
    }

  } catch (err) {
    console.error('获取试卷详情失败:', err)
    error.value = err.message || '网络请求失败，请检查网络连接'
    message.error(error.value)
  } finally {
    loading.value = false
  }
}

/**
 * 清理选项中的 A.、B.、C. 等标签
 */
const cleanOptionLabel = (option, index) => {
  if (!option || typeof option !== 'string') return option

  const expectedLabel = String.fromCharCode(65 + index) // A、B、C...

  // 匹配 "A."、"A、"、"A "、"A) " 等格式
  const patterns = [
    new RegExp(`^${expectedLabel}\\.\\s*`, 'i'),
    new RegExp(`^${expectedLabel}\\、\\s*`, 'i'),
    new RegExp(`^${expectedLabel}\\)\\s*`, 'i'),
    new RegExp(`^${expectedLabel}\\s+`, 'i'),
  ]

  for (const pattern of patterns) {
    if (pattern.test(option)) {
      return option.replace(pattern, '')
    }
  }

  return option
}

/**
 * 清理选项列表
 */
const getCleanChooseList = (chooseList) => {
  if (!chooseList || !Array.isArray(chooseList)) return []
  return chooseList.map((opt, idx) => cleanOptionLabel(opt, idx))
}

/**
 * 格式化答案显示
 */
const formatAnswer = (answer, type, chooseList) => {
  if (!answer && answer !== false && answer !== 0) return '暂无答案'

  const cleanList = getCleanChooseList(chooseList)

  // 判断题
  if (type === '判断题') {
    const boolAnswer = answer === true || answer === 'true' || answer === 'True' || answer === 1 || answer === '1'
    return boolAnswer ? '是' : '否'
  }

  // 多选题
  if (type === '多选题') {
    let answerArray
    if (Array.isArray(answer)) {
      answerArray = answer
    } else if (typeof answer === 'string') {
      // 尝试解析字符串格式的数组
      try {
        answerArray = JSON.parse(answer)
        if (!Array.isArray(answerArray)) {
          answerArray = [answer]
        }
      } catch {
        answerArray = [answer]
      }
    } else {
      answerArray = [answer]
    }

    if (answerArray.length === 0) return '暂无答案'

    return answerArray.map(item => {
      // 如果是数字索引，转换为字母 + 内容
      const numIndex = parseInt(item)
      if (!isNaN(numIndex) && numIndex >= 0 && cleanList && cleanList[numIndex]) {
        return `${String.fromCharCode(65 + numIndex)}. ${cleanList[numIndex]}`
      }
      // 如果是选项内容，查找对应的索引（先在原始列表找，再在清理后的列表找）
      if (chooseList && chooseList.length > 0) {
        let idx = chooseList.indexOf(item)
        if (idx === -1) {
          idx = cleanList.indexOf(item)
        }
        if (idx !== -1) {
          return `${String.fromCharCode(65 + idx)}. ${cleanList[idx]}`
        }
      }
      return item
    }).filter(Boolean).join('； ')
  }

  // 单选题
  if (type === '单选题') {
    // 如果是数字索引，转换为字母 + 内容
    const numIndex = parseInt(answer)
    if (!isNaN(numIndex) && numIndex >= 0 && cleanList && cleanList[numIndex]) {
      return `${String.fromCharCode(65 + numIndex)}. ${cleanList[numIndex]}`
    }
    // 如果是选项内容，查找对应的索引（先在原始列表找，再在清理后的列表找）
    if (chooseList && chooseList.length > 0) {
      let idx = chooseList.indexOf(answer)
      if (idx === -1) {
        idx = cleanList.indexOf(answer)
      }
      if (idx !== -1) {
        return `${String.fromCharCode(65 + idx)}. ${cleanList[idx]}`
      }
    }
    return answer
  }

  // 填空题和其他类型
  if (typeof answer === 'string') {
    return answer
  }

  // 其他类型转换为字符串
  return String(answer)
}

/**
 * 返回试卷列表
 */
const goBack = () => {
  router.back()
}

// 初始化加载
onMounted(() => {
  fetchPaperDetail()
})
</script>

<style scoped>
.paper-detail {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.back-action {
  margin-bottom: 24px;
}

.back-button {
  font-size: 14px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.error-container {
  min-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.paper-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.paper-info-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.paper-header {
  padding: 24px;
}

.paper-title {
  font-size: 24px;
  font-weight: 600;
  color: #1890ff;
  margin-bottom: 16px;
  text-align: center;
}

.paper-meta {
  margin-top: 16px;
}

.questions-section {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.questions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.questions-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #262626;
  margin: 0;
}

.question-count {
  color: #8c8c8c;
  font-size: 14px;
}

.empty-questions {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.question-item {
  margin-bottom: 16px;
}

.question-card {
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f5f5f5;
}

.question-number {
  font-size: 16px;
  font-weight: 600;
  color: #1890ff;
}

.question-type-score {
  display: flex;
  align-items: center;
  gap: 12px;
}

.score {
  font-size: 14px;
  color: #52c41a;
  font-weight: 500;
}

.question-stem,
.question-options,
.question-answer,
.question-analysis {
  margin-bottom: 16px;
}

.question-stem h4,
.question-options h4,
.question-answer h4,
.question-analysis h4 {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 8px;
}

.question-stem p {
  font-size: 15px;
  line-height: 1.6;
  color: #262626;
  margin: 0;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 16px;
}

.option-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.option-label {
  font-weight: 500;
  color: #1890ff;
  min-width: 24px;
}

.option-content {
  flex: 1;
  color: #595959;
}

.answer-content {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 4px;
  padding: 12px;
  font-size: 14px;
  color: #52c41a;
  font-weight: 500;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.question-analysis p {
  background: #f0f5ff;
  border: 1px solid #d6e4ff;
  border-radius: 4px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #2f54eb;
  margin: 0;
}

/* 响应式适配 */
@media screen and (max-width: 768px) {
  .paper-detail {
    padding: 16px;
  }

  .paper-title {
    font-size: 20px;
  }

  .questions-section {
    padding: 16px;
  }

  .question-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .options-list {
    margin-left: 8px;
  }
}
</style>
