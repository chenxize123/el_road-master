# 简答题 AI 评分功能设计文档

**日期:** 2026-06-05
**版本:** V1.0.0
**作者:** Claude Code

## 1. 概述

### 1.1 功能目标
在考试系统中实现简答题的 AI 自动评分功能。学生提交考试时，对简答题调用 LLM 接口进行评分，根据评分要点的命中情况计算得分，并在结果页展示详细的评分信息。

### 1.2 背景
- 题库已支持简答题创建（包含 referenceAnswer 和 scoring_points）
- 考试答题页 ExamTake.vue 缺少简答题的渲染和评分分支
- 后端新增 /llm/short_answer/judge 端点用于 AI 评分
- 现有评分逻辑在前端完成，本次保持一致

## 2. API 设计

### 2.1 新增 API 函数

**文件位置:** src/api/examTake.js

**函数名:** judgeShortAnswer(data)

\`\`\`javascript
// AI 评判简答题
export function judgeShortAnswer(data) {
  return courseService.request('/llm/short_answer/judge', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}
\`\`\`

需要从 @/api/course.js 引入 courseService。

### 2.2 请求格式
\`\`\`javascript
POST /llm/short_answer/judge
{
  "question": "题干文本",
  "standard_answer": "参考答案",
  "scoring_points": ["要点1", "要点2", "要点3"],
  "user_answer": "学生答案"
}
\`\`\`

### 2.3 响应格式
\`\`\`javascript
{
  "code": 200,
  "message": "success",
  "data": {
    "matched_points": ["人工智能"],
    "unmatched_points": ["数据驱动", "算法支持"],
    "total_points": 3,
    "matched_count": 1,
    "feedback": "学生答案仅提及了机器学习是人工智能的分支..."
  }
}
\`\`\`

### 2.4 评分计算公式
\`\`\`javascript
score = Math.round((matched_count / total_points) * questionScore)
\`\`\`

如果 total_points 为 0，则 score = 0。

## 3. 考试答题页（ExamTake.vue）设计

### 3.1 简答题输入区
在 ExamTake.vue:129 判断题分支之后添加简答题渲染分支：

\`\`\`vue
<!-- 简答题 -->
<div v-else-if="currentQuestion?.type_ === '简答题'" class="question-options">
  <div class="short-answer-hint">
    <info-circle-outlined /> 简答题将由 AI 自动评分，请尽量详细作答
  </div>
  <a-textarea
    v-model:value="answers[currentQuestion.question_id]"
    placeholder="请在此输入你的答案"
    :rows="6"
  />
</div>
\`\`\`

### 3.2 顶部进入考试提示
在 ExamTake.vue 考试内容区域顶部（试卷信息卡片之前）添加：

\`\`\`vue
<a-alert
  v-if="hasShortAnswer"
  type="info"
  show-icon
  message="本试卷包含简答题"
  description="简答题将在交卷时通过 AI 自动评分，提交后请等待评分完成，期间请勿关闭浏览器。"
  class="short-answer-tip"
/>
\`\`\`

### 3.3 计算属性
新增 hasShortAnswer 计算属性：

\`\`\`javascript
const hasShortAnswer = computed(() => {
  return questionList.value.some(q => q.type_ === '简答题')
})
\`\`\`

### 3.4 交卷确认弹窗（含警告）
修改现有 ExamTake.vue:152-163 的交卷确认弹窗：

\`\`\`vue
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
  <a-alert
    v-if="hasShortAnswer"
    type="warning"
    show-icon
    message="交卷后将进行 AI 评分"
    description="试卷包含简答题，提交后系统将调用 AI 进行自动评分。评分期间请勿关闭浏览器，否则简答题可能得 0 分。"
    style="margin-top: 12px"
  />
</a-modal>
\`\`\`

### 3.5 AI 评分进度弹窗
新增评分等待弹窗（在交卷确认弹窗之后）：

\`\`\`vue
<!-- AI 评分弹窗 -->
<a-modal
  v-model:open="aiGradingVisible"
  :footer="null"
  :closable="false"
  :maskClosable="false"
  :keyboard="false"
  centered
  width="420px"
>
  <div class="ai-grading-modal">
    <loading-outlined class="grading-icon" spin />
    <h3>AI 评分中...</h3>
    <p class="grading-desc">正在为简答题进行 AI 自动评分，请耐心等待</p>
    <a-progress
      :percent="gradingProgress"
      :show-info="true"
      status="active"
    />
    <p class="grading-status">已完成 {{ gradingCompleted }} / {{ gradingTotal }} 题</p>
    <a-alert
      v-if="gradingErrors.length > 0"
      type="warning"
      show-icon
      :message="\`\${gradingErrors.length} 道题评分失败\`"
      description="评分失败的题目将标记为「待人工评分」，不影响您其他题目的得分。"
      style="margin-top: 12px"
    />
    <a-alert
      type="error"
      show-icon
      message="请勿关闭浏览器"
      description="关闭浏览器将导致简答题无法得到 AI 评分。"
      style="margin-top: 12px"
    />
  </div>
</a-modal>
\`\`\`

### 3.6 评分相关状态
新增状态：

\`\`\`javascript
// AI 评分相关状态
const aiGradingVisible = ref(false)
const gradingTotal = ref(0)
const gradingCompleted = ref(0)
const gradingErrors = ref([])

const gradingProgress = computed(() => {
  if (gradingTotal.value === 0) return 0
  return Math.round((gradingCompleted.value / gradingTotal.value) * 100)
})
\`\`\`

### 3.7 提交流程改造

修改 ExamTake.vue:508-614 的 handleSubmit 函数：

\`\`\`javascript
const handleSubmit = async (isAuto = false) => {
  if (submitting.value) return
  submitting.value = true
  try {
    // 清理计时器
    if (timerRef.value) {
      clearInterval(timerRef.value)
      timerRef.value = null
    }
    if (examEndTimerRef.value) {
      clearInterval(examEndTimerRef.value)
      examEndTimerRef.value = null
    }

    // 收集简答题
    const shortAnswerQuestions = questionList.value.filter(q => q.type_ === '简答题')
    const aiGradeResults = {}

    // 如果有简答题，并行调用 AI 评分
    if (shortAnswerQuestions.length > 0) {
      gradingTotal.value = shortAnswerQuestions.length
      gradingCompleted.value = 0
      gradingErrors.value = []
      aiGradingVisible.value = true

      // 启用 beforeunload 拦截
      window.addEventListener('beforeunload', handleBeforeUnload)

      const gradingPromises = shortAnswerQuestions.map(async (q) => {
        const userAnswer = answers.value[q.question_id] || ''
        try {
          const res = await judgeShortAnswer({
            question: q.question?.question || '',
            standard_answer: q.question?.referenceAnswer || '',
            scoring_points: q.question?.scoring_points || [],
            user_answer: userAnswer
          })
          gradingCompleted.value++
          if (res.code === 200 && res.data) {
            const totalPoints = res.data.total_points || 0
            const matchedCount = res.data.matched_count || 0
            const questionScore = totalPoints > 0
              ? Math.round((matchedCount / totalPoints) * q.score)
              : 0
            aiGradeResults[q.question_id] = {
              score: questionScore,
              aiResult: res.data,
              graded: true
            }
          } else {
            throw new Error(res.message || '评分失败')
          }
        } catch (e) {
          console.error('简答题 AI 评分失败:', q.question_id, e)
          gradingCompleted.value++
          gradingErrors.value.push(q.question_id)
          aiGradeResults[q.question_id] = {
            score: 0,
            aiResult: null,
            graded: false
          }
        }
      })

      await Promise.all(gradingPromises)

      // 关闭评分弹窗、移除拦截
      aiGradingVisible.value = false
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }

    // 计算总分（含简答题 AI 评分结果）
    const { totalScore, isPassing } = calculateScore(aiGradeResults)

    // 组装提交数据
    const question_result_list = questionList.value.map(q => {
      const userAnswer = answers.value[q.question_id]
      let questionScore = 0
      let user_response

      if (q.type_ === '简答题') {
        // 简答题：使用 AI 评分结果
        const aiResult = aiGradeResults[q.question_id]
        questionScore = aiResult?.score || 0
        user_response = {
          user_response: userAnswer || '',
          ai_judge_result: aiResult?.aiResult || null,
          graded: aiResult?.graded || false
        }
      } else {
        // 其他题型：保持现有逻辑（按计算结果）
        questionScore = computeOtherQuestionScore(q, userAnswer)
        if (q.type_ === '判断题') {
          const boolAnswer = userAnswer === true || userAnswer === 'true' || userAnswer === 'True'
          user_response = { user_response: boolAnswer }
        } else if (q.type_ === '多选题') {
          user_response = { user_response: Array.isArray(userAnswer) ? userAnswer : [] }
        } else {
          user_response = { user_response: userAnswer !== undefined && userAnswer !== null ? String(userAnswer) : '' }
        }
      }

      return {
        question_id: String(q.question_id),
        user_response,
        score: questionScore
      }
    })

    // 时间计算（保持现有逻辑）
    let actualDuration
    if (examStartTime.value) {
      const usedMs = Date.now() - examStartTime.value
      actualDuration = Math.max(1, Math.ceil(usedMs / 1000 / 60))
    } else {
      const totalExamSeconds = (examDetail.value?.total_duration || 0) * 60
      const usedSeconds = totalExamSeconds - timeLeft.value
      actualDuration = Math.max(1, Math.ceil(usedSeconds / 60))
    }

    const now = new Date()
    const localISOTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString()

    const submitData = {
      student_id: String(userStore.userInfo?.id),
      exam_id: String(examId.value),
      score: totalScore,
      duration: actualDuration,
      submission_deadline: localISOTime,
      status: isAuto ? 0 : 1,
      is_passing: isPassing,
      question_result_list
    }

    const res = await submitExam(submitData)
    if (res.code === 200) {
      message.success('考试提交成功')
      clearExamState()
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
    aiGradingVisible.value = false
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
}
\`\`\`

### 3.8 评分计算抽取

将原 calculateScore 函数 (ExamTake.vue:453-505) 改造，接收 aiGradeResults 参数：

\`\`\`javascript
// 计算单题得分（仅限非简答题）
const computeOtherQuestionScore = (q, userAnswer) => {
  if (userAnswer === undefined || userAnswer === null || userAnswer === '') return 0
  const correctAnswer = q.question?.answer

  if (q.type_ === '多选题') {
    if (!Array.isArray(userAnswer)) return 0
    if (Array.isArray(correctAnswer)) {
      if (userAnswer.sort().join(',') === correctAnswer.sort().join(',')) {
        return q.score
      }
    } else {
      if (userAnswer.length === 1 && userAnswer[0] === correctAnswer) {
        return q.score
      }
    }
    return 0
  }

  if (q.type_ === '判断题') {
    if (userAnswer === correctAnswer ||
        String(userAnswer) === String(correctAnswer) ||
        (userAnswer === true && correctAnswer === 'true') ||
        (userAnswer === false && correctAnswer === 'false')) {
      return q.score
    }
    return 0
  }

  // 单选题、填空题
  if (String(userAnswer) === String(correctAnswer)) {
    return q.score
  }
  return 0
}

// 计算总分
const calculateScore = (aiGradeResults = {}) => {
  let totalScore = 0
  questionList.value.forEach(q => {
    if (q.type_ === '简答题') {
      totalScore += aiGradeResults[q.question_id]?.score || 0
    } else {
      const userAnswer = answers.value[q.question_id]
      totalScore += computeOtherQuestionScore(q, userAnswer)
    }
  })

  const passingScore = Number(examDetail.value?.passing_score || 0)
  const score = Number(totalScore)
  let isPassing = false
  if (score > passingScore || Math.abs(score - passingScore) < 1e-8) {
    isPassing = true
  }

  return { totalScore: score, isPassing }
}
\`\`\`

### 3.9 beforeunload 拦截

\`\`\`javascript
const handleBeforeUnload = (e) => {
  e.preventDefault()
  e.returnValue = 'AI 评分正在进行中，关闭后简答题可能无法获得分数。确定要离开吗？'
  return e.returnValue
}
\`\`\`

### 3.10 onBeforeUnmount 添加清理

确保在组件销毁时移除 beforeunload 拦截：

\`\`\`javascript
onBeforeUnmount(() => {
  // ... existing cleanup ...
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
\`\`\`

### 3.11 样式新增

\`\`\`css
.short-answer-tip {
  margin-bottom: 16px;
}

.short-answer-hint {
  color: #1890ff;
  font-size: 13px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #e6f7ff;
  border-radius: 4px;
}

.ai-grading-modal {
  text-align: center;
  padding: 16px 8px;
}

.grading-icon {
  font-size: 48px;
  color: #1890ff;
  margin-bottom: 16px;
}

.grading-desc {
  color: #666;
  margin-bottom: 16px;
}

.grading-status {
  margin-top: 12px;
  color: #666;
  font-size: 14px;
}
\`\`\`

## 4. 考试结果页（ExamResult.vue）设计

### 4.1 简答题展示
在 ExamResult.vue:104-116 选项展示区域之后，添加简答题特有的评分详情展示：

\`\`\`vue
<!-- 简答题：参考答案 -->
<div v-if="item.question?.referenceAnswer" class="reference-answer">
  <div class="answer-label">参考答案：</div>
  <div class="reference-answer-content">{{ item.question.referenceAnswer }}</div>
</div>

<!-- 简答题 AI 评分详情 -->
<div v-if="item.question?.ai_judge_result" class="ai-grading-detail">
  <a-divider style="margin: 12px 0;" />
  <div class="grading-title">AI 评分详情</div>

  <div class="grading-points-list">
    <div class="points-summary">
      命中评分要点：{{ item.question.ai_judge_result.matched_count }} / {{ item.question.ai_judge_result.total_points }}
    </div>

    <div v-if="item.question.ai_judge_result.matched_points?.length" class="points-group">
      <div class="points-group-title matched">✓ 命中要点</div>
      <div v-for="(point, pIdx) in item.question.ai_judge_result.matched_points" :key="pIdx" class="point-item matched">
        <check-circle-outlined /> {{ point }}
      </div>
    </div>

    <div v-if="item.question.ai_judge_result.unmatched_points?.length" class="points-group">
      <div class="points-group-title unmatched">✗ 未命中要点</div>
      <div v-for="(point, pIdx) in item.question.ai_judge_result.unmatched_points" :key="pIdx" class="point-item unmatched">
        <close-circle-outlined /> {{ point }}
      </div>
    </div>
  </div>

  <div v-if="item.question.ai_judge_result.feedback" class="grading-feedback">
    <div class="feedback-title">AI 评语</div>
    <div class="feedback-content">{{ item.question.ai_judge_result.feedback }}</div>
  </div>
</div>

<!-- 简答题待人工评分 -->
<div v-else-if="isShortAnswer(item) && item.question?.graded === false" class="ai-grading-pending">
  <a-divider style="margin: 12px 0;" />
  <a-alert
    type="warning"
    show-icon
    message="待人工评分"
    description="该简答题暂未完成 AI 评分，请联系教师手动评分。"
  />
</div>
\`\`\`

### 4.2 辅助函数
新增判断是否为简答题的函数：

\`\`\`javascript
const isShortAnswer = (item) => {
  // 通过 question 数据结构判断（简答题没有 choose 选项，但有 referenceAnswer 或 ai_judge_result）
  return !!(item.question?.referenceAnswer || item.question?.ai_judge_result)
}
\`\`\`

### 4.3 学生答案展示兼容
ExamResult.vue:124-129 的"你的答案"已能显示文本，但需修改避免 Object 渲染：

\`\`\`vue
<div class="answer-row">
  <span class="answer-label">你的答案：</span>
  <span class="answer-value" :class="item.score > 0 ? 'correct' : 'wrong'">
    {{ formatUserResponse(item.question?.user_response) }}
  </span>
</div>
\`\`\`

\`\`\`javascript
const formatUserResponse = (response) => {
  if (response === undefined || response === null) return '-'
  if (Array.isArray(response)) return response.join(', ')
  return String(response)
}
\`\`\`

### 4.4 教师视图同步
ExamResult.vue:210-263 的教师视图区域也需要应用相同的简答题展示逻辑。

### 4.5 样式新增

\`\`\`css
.reference-answer {
  margin-top: 12px;
  padding: 12px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 4px;
}

.reference-answer-content {
  color: #333;
  line-height: 1.6;
  margin-top: 4px;
}

.ai-grading-detail {
  margin-top: 12px;
}

.grading-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 12px;
  color: #333;
}

.points-summary {
  margin-bottom: 12px;
  color: #595959;
  font-size: 13px;
}

.points-group {
  margin-bottom: 12px;
}

.points-group-title {
  font-weight: 500;
  margin-bottom: 6px;
  font-size: 13px;
}

.points-group-title.matched {
  color: #52c41a;
}

.points-group-title.unmatched {
  color: #ff4d4f;
}

.point-item {
  padding: 4px 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  font-size: 13px;
}

.point-item.matched {
  background: #f6ffed;
  color: #389e0d;
}

.point-item.unmatched {
  background: #fff1f0;
  color: #cf1322;
}

.grading-feedback {
  margin-top: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.feedback-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
}

.feedback-content {
  color: #595959;
  line-height: 1.6;
}
\`\`\`

## 5. 数据流

\`\`\`
学生点击"交卷"
   ↓
弹出确认弹窗（含简答题警告）
   ↓
学生确认 → handleSubmit
   ↓
清理计时器
   ↓
是否含简答题？
   ├─ 否 → 直接计算分数 → 提交
   └─ 是 → 弹出 AI 评分进度弹窗（全屏遮罩，不可关闭）
           ↓
           启用 beforeunload 拦截
           ↓
           并行调用 Promise.all(judgeShortAnswer × N)
           ↓ 每完成一题更新进度
           评分完成（失败的题目标记 graded: false）
           ↓
           关闭遮罩、移除 beforeunload 拦截
           ↓
计算总分（其他题型 + 简答题 AI 分数）
   ↓
组装 submitData（简答题 user_response 含 ai_judge_result）
   ↓
submitExam(submitData)
   ↓
跳转到 /student
\`\`\`

## 6. 数据结构

### 6.1 简答题提交数据
\`\`\`javascript
{
  question_id: "123",
  user_response: {
    user_response: "学生答案文本",
    ai_judge_result: {
      matched_points: ["要点1"],
      unmatched_points: ["要点2", "要点3"],
      total_points: 3,
      matched_count: 1,
      feedback: "AI 评语"
    },
    graded: true
  },
  score: 3
}
\`\`\`

### 6.2 评分失败时的数据
\`\`\`javascript
{
  question_id: "123",
  user_response: {
    user_response: "学生答案文本",
    ai_judge_result: null,
    graded: false
  },
  score: 0
}
\`\`\`

## 7. 异常处理

| 场景 | 处理 |
|------|------|
| AI 评分单题失败 | 该题 graded=false, score=0，添加到 gradingErrors，继续其他题 |
| AI 评分全部失败 | 所有简答题 score=0，仍正常提交，结果页显示"待人工评分" |
| 用户关闭浏览器 | beforeunload 弹窗提醒；若强行关闭，未完成的请求中止，已收到的不丢失 |
| 提交接口失败 | message.error 提示，submitting 重置，允许重试 |
| AI 接口响应超时 | fetch 默认超时由浏览器控制，失败后走单题失败逻辑 |

## 8. 兼容性说明

- 保持现有 4 种题型评分逻辑不变
- 简答题为新增分支，不影响存量数据
- ExamResult.vue 通过判断 question.ai_judge_result 是否存在决定是否展示评分详情
- 已提交的旧考试结果（无简答题）不受影响

## 9. 修改文件清单

1. `src/api/examTake.js` - 新增 judgeShortAnswer 函数（含 courseService 引入）
2. `src/views/exam/ExamTake.vue` - 新增简答题渲染分支、提交流程改造、AI 评分弹窗
3. `src/views/exam/ExamResult.vue` - 新增简答题评分详情展示（学生 + 教师视图）

## 10. 风险与限制

1. **客户端评分仍可被篡改**：submit 时前端组装的 score 仍可被改包，本次设计保持现状（不在范围内）
2. **AI 接口耗时**：评分时长依赖后端 LLM 响应速度，多题情况下等待时间累加（已通过并行调用缓解）
3. **网络不稳定**：若用户网络断开，评分会失败 → 走"待人工评分"流程
4. **scoring_points 数据依赖**：题库中简答题必须配置 scoring_points，否则 total_points=0，得分始终为 0
