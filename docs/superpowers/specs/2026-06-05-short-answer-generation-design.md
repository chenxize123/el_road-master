# 简答题 AI 生成功能设计文档

**日期:** 2026-06-05
**版本:** V1.0.0
**作者:** Claude Code

## 1. 概述

### 1.1 功能目标
在题库详情页面的 AI 智能出题功能中新增"简答题"类型，支持通过知识点自动生成简答题，并提供完整的编辑和保存流程。

### 1.2 背景
- 现有 AI 智能出题已支持：单选题、多选题、判断题、填空题
- 新增 API 端点：`/llm/short_answer` 用于生成简答题
- 题目表单已支持简答题类型（typeCode: 4）

## 2. API 设计

### 2.1 新增 API 函数

**文件位置:** `src/api/course.js`

**函数名:** `generateShortAnswerQuestion(pointList)`

**实现方式:**
```javascript
// 生成简答题
export function generateShortAnswerQuestion(pointList) {
  const pointIds = pointList.map(point => typeof point === 'string' ? point : "label:" + point.label + "content:" + point.content)
  return courseService.request('/llm/short_answer', {
    method: 'POST',
    body: JSON.stringify({
      point_list: pointIds,
      knowledge_points: pointList
    })
  })
}
```

**位置:** 在 `generateMultipleChoiceQuestion` 函数之后添加

### 2.2 请求格式
```javascript
POST /llm/short_answer
{
  "point_list": ["label:xxxcontent:xxx", ...],
  "knowledge_points": [
    { "id": "...", "label": "...", "content": "..." },
    ...
  ]
}
```

### 2.3 响应格式
```javascript
{
  "code": 200,
  "message": "success",
  "data": {
    "question": "请阐述过拟合的主要特点及其典型表现。",
    "answer": "过拟合的特点主要体现在以下几个方面：...",
    "analysis": "本题考查对过拟合核心特征的理解...",
    "scoring_points": [
      "准确指出模型在训练数据上误差极小或在测试数据上误差显著增大",
      "说明过拟合导致模型泛化能力下降",
      ...
    ]
  }
}
```

## 3. UI 设计

### 3.1 题型选择器

**文件位置:** `src/views/question-bank/QuestionBankDetail.vue` (第87-96行)

**修改内容:**
```vue
<a-select
  v-model:value="selectedQuestionType"
  style="width: 200px; margin-right: 12px"
  placeholder="选择题型"
>
  <a-select-option value="single_choice">单选题</a-select-option>
  <a-select-option value="multiple_choice">多选题</a-select-option>
  <a-select-option value="true_or_false">判断题</a-select-option>
  <a-select-option value="gap_fill">填空题</a-select-option>
  <a-select-option value="short_answer">简答题</a-select-option>
</a-select>
```

### 3.2 QUESTION_TYPE_MAP

**位置:** 第510-516行

**修改内容:**
```javascript
const QUESTION_TYPE_MAP = {
  gap_fill: { label: '填空题', typeCode: 0 },
  true_or_false: { label: '判断题', typeCode: 1 },
  single_choice: { label: '单选题', typeCode: 2 },
  multiple_choice: { label: '多选题', typeCode: 3 },
  short_answer: { label: '简答题', typeCode: 4 }
}
```

### 3.3 简答题结果展示模板

**位置:** 第109-209行，在填空题模板之后添加

**结构:**
```vue
<!-- 简答题显示 -->
<div v-else-if="generatedQuestion.type === 'short_answer'">
  <a-form layout="vertical">
    <a-form-item label="题干">
      <a-textarea
        v-model:value="generatedQuestion.question"
        :rows="3"
      />
    </a-form-item>
    <a-form-item label="参考答案">
      <a-textarea
        v-model:value="generatedQuestion.answer"
        :rows="5"
      />
    </a-form-item>
    <a-form-item label="评分要点">
      <div class="scoring-points-list">
        <div
          v-for="(point, index) in generatedQuestion.scoring_points"
          :key="index"
          class="scoring-point-item"
        >
          <a-tag>{{ index + 1 }}</a-tag>
          <a-textarea
            v-model:value="generatedQuestion.scoring_points[index]"
            :rows="1"
            auto-size
            style="flex: 1"
          />
          <a-button
            type="text"
            danger
            @click="removeScoringPoint(index)"
            v-if="generatedQuestion.scoring_points.length > 1"
          >
            <delete-outlined />
          </a-button>
        </div>
        <a-button type="dashed" block @click="addScoringPoint">
          <plus-outlined /> 添加评分要点
        </a-button>
      </div>
    </a-form-item>
  </a-form>
</div>

<!-- 解析显示（所有题型共用） -->
<a-collapse v-if="generatedQuestion.analysis">
  <a-collapse-panel header="查看解析">
    <p style="color: #666; margin: 0">{{ generatedQuestion.analysis }}</p>
  </a-collapse-panel>
</a-collapse>
```

### 3.4 评分要点辅助函数

**新增函数:**
```javascript
// 添加评分要点
const addScoringPoint = () => {
  if (generatedQuestion.value?.scoring_points) {
    generatedQuestion.value.scoring_points.push('')
  }
}

// 删除评分要点
const removeScoringPoint = (index) => {
  if (generatedQuestion.value?.scoring_points) {
    generatedQuestion.value.scoring_points.splice(index, 1)
  }
}
```

### 3.5 generateQuestion 函数修改

**位置:** 第705-773行

**添加分支:**
```javascript
case 'short_answer':
  res = await generateShortAnswerQuestion(selectedKnowledgePoints)
  break
```

### 3.6 addGeneratedToQuestionBank 函数修改

**位置:** 第798-838行

**添加分支:**
```javascript
else if (q.type === 'short_answer') {
  essayForm.stem = q.question || ''
  essayForm.referenceAnswer = q.answer || ''
  // 处理评分要点 - 深拷贝避免引用问题
  if (q.scoring_points && Array.isArray(q.scoring_points)) {
    essayForm.scoringPoints = [...q.scoring_points]
  } else {
    essayForm.scoringPoints = []
  }
}
```

### 3.7 essayForm 扩展

**位置:** 第590-594行

**修改内容:**
```javascript
// 简答题表单
const essayForm = reactive({
  stem: '',
  referenceAnswer: '',
  scoringPoints: []  // 新增字段
})
```

### 3.8 buildQuestionData 函数修改

**位置:** 第1112-1146行

**修改简答题分支:**
```javascript
else if (questionForm.type_ === 4) {
  question = {
    question: essayForm.stem,
    referenceAnswer: essayForm.referenceAnswer,
    scoring_points: essayForm.scoringPoints,  // 新增字段
    analysis: currentQuestionAnalysis.value || ''
  }
}
```

### 3.9 编辑弹窗表单扩展

**位置:** 第399-415行

**修改内容:**
```vue
<!-- 简答题表单 -->
<template v-else-if="questionForm.type_ === 4">
  <a-form-item label="题干" required>
    <a-textarea
      v-model:value="essayForm.stem"
      placeholder="请输入题目题干"
      :rows="3"
    />
  </a-form-item>
  <a-form-item label="参考答案">
    <a-textarea
      v-model:value="essayForm.referenceAnswer"
      placeholder="请输入参考答案（可选）"
      :rows="5"
    />
  </a-form-item>
  <a-form-item label="评分要点">
    <div class="scoring-points-list">
      <div
        v-for="(point, index) in essayForm.scoringPoints"
        :key="index"
        class="scoring-point-item"
      >
        <a-tag>{{ index + 1 }}</a-tag>
        <a-textarea
          v-model:value="essayForm.scoringPoints[index]"
          :rows="1"
          auto-size
          placeholder="评分要点"
          style="flex: 1"
        />
        <a-button
          type="text"
          danger
          @click="removeEssayScoringPoint(index)"
          v-if="essayForm.scoringPoints.length > 1"
        >
          <delete-outlined />
        </a-button>
      </div>
      <a-button type="dashed" block @click="addEssayScoringPoint">
        <plus-outlined /> 添加评分要点
      </a-button>
    </div>
  </a-form-item>
</template>
```

### 3.10 弹窗表单辅助函数

**新增函数:**
```javascript
// 添加简答题评分要点
const addEssayScoringPoint = () => {
  essayForm.scoringPoints.push('')
}

// 删除简答题评分要点
const removeEssayScoringPoint = (index) => {
  essayForm.scoringPoints.splice(index, 1)
}
```

### 3.11 resetQuestionForms 函数修改

**位置:** 第1069-1082行

**添加重置:**
```javascript
essayForm.scoringPoints = []
```

### 3.12 handleEditQuestion 函数修改

**位置:** 第979-1046行

**在简答题分支添加:**
```javascript
else if (record.type_ === 4) {
  // 简答题
  essayForm.stem = q.question || q.stem || ''
  essayForm.referenceAnswer = q.referenceAnswer || ''
  // 加载评分要点
  essayForm.scoringPoints = q.scoring_points && Array.isArray(q.scoring_points)
    ? [...q.scoring_points]
    : []
}
```

### 3.13 样式添加

**在 `<style scoped>` 中添加:**
```css
.scoring-points-list {
  width: 100%;
}

.scoring-point-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: flex-start;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

## 4. 数据流

```
用户选择知识点 + 选择题型 "简答题"
    ↓
点击 "生成题目"
    ↓
generateShortAnswerQuestion(pointList)
    ↓
API 返回 { question, answer, analysis, scoring_points }
    ↓
展示在结果区域（可编辑）
    ↓
点击 "添加到题库"
    ↓
填充到弹窗表单（包含 scoring_points）
    ↓
用户确认保存
    ↓
buildQuestionData() 构建数据
    ↓
保存到数据库（包含 scoring_points 字段）
```

## 5. 数据结构

### 5.1 生成的题目数据
```javascript
{
  type: 'short_answer',
  question: '题目题干',
  answer: '参考答案',
  analysis: '解析内容',
  scoring_points: ['要点1', '要点2', ...]
}
```

### 5.2 保存到数据库的题目数据
```javascript
{
  question: {
    question: '题目题干',
    referenceAnswer: '参考答案',
    scoring_points: ['要点1', '要点2', ...],
    analysis: '解析内容'
  },
  type_: 4,
  repo_id: '题库ID'
}
```

## 6. 兼容性说明

- 保持与现有 API 函数一致的参数格式
- 保持与现有题型一致的 UI 交互模式
- 评分要点字段使用 `scoring_points`（下划线命名，与大模型返回一致）
- 已有简答题题目数据不受影响，编辑时评分要点为空数组

## 7. 修改文件清单

1. `src/api/course.js` - 新增 generateShortAnswerQuestion 函数
2. `src/views/question-bank/QuestionBankDetail.vue` - 多项 UI 和逻辑修改
