# 简答题 AI 生成功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在题库详情页面的 AI 智能出题功能中新增"简答题"类型，支持通过知识点自动生成简答题，并提供完整的编辑和保存流程。

**Architecture:** 遵循现有代码结构，在 API 层添加新函数，在 UI 层添加新题型支持，保持与现有题型一致的交互模式。

**Tech Stack:** Vue 3, Ant Design Vue, Vite

---

## 修改文件清单

1. `src/api/course.js` - 新增 API 函数
2. `src/views/question-bank/QuestionBankDetail.vue` - 多项 UI 和逻辑修改

---

## Task 1: 添加 API 函数

**Files:**
- Modify: `src/api/course.js`

- [ ] **Step 1: 在 course.js 中添加 generateShortAnswerQuestion 函数**

在 `generateMultipleChoiceQuestion` 函数后添加：

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

- [ ] **Step 2: 验证文件语法**

检查文件末尾确保没有语法错误，确认函数位置正确。

- [ ] **Step 3: 提交**

```bash
git add src/api/course.js
git commit -m "feat: add generateShortAnswerQuestion API function"
```

---

## Task 2: 导入 API 函数并更新基础配置

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:470-475`

- [ ] **Step 1: 在 import 语句中添加 generateShortAnswerQuestion**

修改导入语句：

```javascript
import {
  generateGapFillQuestion,
  generateTrueFalseQuestion,
  generateSingleChoiceQuestion,
  generateMultipleChoiceQuestion,
  generateShortAnswerQuestion
} from '@/api/course.js'
```

- [ ] **Step 2: 更新 QUESTION_TYPE_MAP**

找到 QUESTION_TYPE_MAP 定义（约第510-516行），修改为：

```javascript
const QUESTION_TYPE_MAP = {
  gap_fill: { label: '填空题', typeCode: 0 },
  true_or_false: { label: '判断题', typeCode: 1 },
  single_choice: { label: '单选题', typeCode: 2 },
  multiple_choice: { label: '多选题', typeCode: 3 },
  short_answer: { label: '简答题', typeCode: 4 }
}
```

- [ ] **Step 3: 扩展 essayForm**

找到 essayForm 定义（约第590-594行），修改为：

```javascript
// 简答题表单
const essayForm = reactive({
  stem: '',
  referenceAnswer: '',
  scoringPoints: []
})
```

- [ ] **Step 4: 提交**

```bash
git add src/views/question-bank/QuestionBankDetail.vue
git commit -m "feat: add import and update base config for short answer"
```

---

## Task 3: 添加题型选择器选项

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:87-96`

- [ ] **Step 1: 在题型选择器中添加简答题选项**

找到题型选择器（约第87-96行），添加：

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

- [ ] **Step 2: 提交**

```bash
git add src/views/question-bank/QuestionBankDetail.vue
git commit -m "feat: add short answer option to type selector"
```

---

## Task 4: 更新 generateQuestion 函数

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:705-773`

- [ ] **Step 1: 在 generateQuestion 函数中添加 short_answer 分支**

找到 switch 语句（约第740行），添加：

```javascript
case 'short_answer':
  res = await generateShortAnswerQuestion(selectedKnowledgePoints)
  break
```

- [ ] **Step 2: 提交**

```bash
git add src/views/question-bank/QuestionBankDetail.vue
git commit -m "feat: add short answer branch to generateQuestion"
```

---

## Task 5: 添加简答题结果展示模板

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:109-209`

- [ ] **Step 1: 在填空题模板后添加简答题展示模板**

找到填空题展示模板结束位置（约第187行后），在解析显示之前添加：

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
```

注意：确保解析显示部分（`<a-collapse v-if="generatedQuestion.analysis">`）在所有题型展示之后。

- [ ] **Step 2: 添加评分要点辅助函数**

在合适的位置（如其他辅助函数附近）添加：

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

- [ ] **Step 3: 提交**

```bash
git add src/views/question-bank/QuestionBankDetail.vue
git commit -m "feat: add short answer result display template"
```

---

## Task 6: 更新 addGeneratedToQuestionBank 函数

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:798-838`

- [ ] **Step 1: 添加简答题数据填充分支**

找到 addGeneratedToQuestionBank 函数，在填空题处理分支后添加：

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

同时保存 analysis：
```javascript
// 保存分析内容到组件状态，以便在构建题目数据时使用
currentQuestionAnalysis.value = q.analysis || ''
```

确认这行代码在所有题型分支之外，靠近函数末尾。

- [ ] **Step 2: 提交**

```bash
git add src/views/question-bank/QuestionBankDetail.vue
git commit -m "feat: add short answer data handling to addGeneratedToQuestionBank"
```

---

## Task 7: 更新编辑弹窗表单

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:399-415`

- [ ] **Step 1: 扩展简答题表单**

找到简答题表单部分（约第399-415行），替换为：

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

- [ ] **Step 2: 添加弹窗表单辅助函数**

在合适位置添加：

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

- [ ] **Step 3: 提交**

```bash
git add src/views/question-bank/QuestionBankDetail.vue
git commit -m "feat: extend edit modal form with scoring points"
```

---

## Task 8: 更新表单重置和数据加载函数

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:1069-1082, 979-1046`

- [ ] **Step 1: 更新 resetQuestionForms 函数**

找到 resetQuestionForms 函数，添加：

```javascript
essayForm.scoringPoints = []
```

确保在其他表单重置语句附近。

- [ ] **Step 2: 更新 handleEditQuestion 函数**

找到 handleEditQuestion 函数中的简答题分支（约第1039-1041行），替换为：

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

- [ ] **Step 3: 提交**

```bash
git add src/views/question-bank/QuestionBankDetail.vue
git commit -m "feat: update form reset and edit data loading for scoring points"
```

---

## Task 9: 更新 buildQuestionData 函数

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:1112-1146`

- [ ] **Step 1: 在简答题分支添加 scoring_points 字段**

找到 buildQuestionData 函数中的简答题分支（约第1136-1139行），替换为：

```javascript
else if (questionForm.type_ === 4) {
  question = {
    question: essayForm.stem,
    referenceAnswer: essayForm.referenceAnswer,
    scoring_points: essayForm.scoringPoints,
    analysis: currentQuestionAnalysis.value || ''
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/views/question-bank/QuestionBankDetail.vue
git commit -m "feat: add scoring_points to buildQuestionData"
```

---

## Task 10: 添加样式

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:1218-1428`

- [ ] **Step 1: 在 `<style scoped>` 中添加评分要点样式**

在样式标签末尾添加：

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

- [ ] **Step 2: 提交**

```bash
git add src/views/question-bank/QuestionBankDetail.vue
git commit -m "feat: add styles for scoring points"
```

---

## Task 11: 检查缺失的 loadDemoKnowledgeData 函数

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue`

- [ ] **Step 1: 检查是否存在 loadDemoKnowledgeData 函数**

搜索文件中是否定义了 `loadDemoKnowledgeData` 函数。如果没有被定义但被调用，添加一个简单实现：

```javascript
// 加载演示知识点数据（备用方案）
function loadDemoKnowledgeData() {
  knowledgeTreeData.value = [
    {
      key: 'demo-chapter-1',
      title: '演示章节',
      disabled: true,
      isLeaf: false,
      children: [
        {
          key: 'demo-point-1',
          title: '演示知识点',
          disabled: false,
          isLeaf: true
        }
      ]
    }
  ]
  knowledgePointsMap.value = {
    'demo-point-1': {
      id: 'demo-point-1',
      label: '演示知识点',
      content: '这是一个演示知识点的内容'
    }
  }
}
```

- [ ] **Step 2: 如果添加了函数，提交**

```bash
git add src/views/question-bank/QuestionBankDetail.vue
git commit -m "fix: add missing loadDemoKnowledgeData function"
```

---

## Task 12: 完整测试

**Files:** None - testing only

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 手动测试功能**

1. 进入题库详情页面
2. 选择知识点
3. 在题型选择器中选择"简答题"
4. 点击"生成题目"
5. 验证生成的题目、参考答案、评分要点、解析是否正确显示
6. 编辑评分要点（添加、删除、修改）
7. 点击"添加到题库"
8. 验证弹窗中数据是否正确填充
9. 保存题目
10. 在题目列表中找到该题目，点击编辑
11. 验证评分要点是否正确加载

- [ ] **Step 3: 验证其他题型仍然正常工作**

测试单选题、多选题、判断题、填空题的生成流程没有被破坏。

---

## 自我检查

**Spec 覆盖:**
- ✅ API 层：添加 generateShortAnswerQuestion 函数 - Task 1
- ✅ 题型选择器：添加简答题选项 - Task 3
- ✅ 生成逻辑：添加 short_answer 分支 - Task 4
- ✅ 结果展示：添加简答题展示模板 - Task 5
- ✅ 数据填充：添加简答题数据处理 - Task 6
- ✅ 编辑表单：扩展简答题表单 - Task 7
- ✅ 数据保存：添加 scoring_points 字段 - Task 9
- ✅ 样式：添加评分要点样式 - Task 10

**Placeholder 检查:** 无占位内容，所有代码都是可执行的。

**类型一致性:** 所有函数名、字段名与设计文档一致。
