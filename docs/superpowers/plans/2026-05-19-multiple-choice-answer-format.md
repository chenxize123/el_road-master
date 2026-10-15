# 多选题答案格式修改 - 保存完整选项文本

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修改单选题和多选题的答案保存格式，从保存索引改为保存完整选项文本

**Architecture:** 修改 QuestionBankDetail.vue 中的数据处理逻辑，包括 AI 生成题目处理、表单交互、数据保存、编辑回显等模块，同时保持对旧数据格式的向后兼容

**Tech Stack:** Vue 3 + Ant Design Vue + Composition API

---

## File Structure

**Files to Modify:**
- `src/views/question-bank/QuestionBankDetail.vue` - 主要修改文件，包含所有题目相关逻辑

---

### Task 1: 修改 AI 生成题目处理逻辑

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:790-824` (addGeneratedToQuestionBank function)

**Goal:** 修改 `addGeneratedToQuestionBank` 函数，直接保存答案文本而不是转换成索引

- [ ] **Step 1: 修改 addGeneratedToQuestionBank 函数**

找到函数中的这段代码：
```javascript
// 根据题型填充数据
if (q.type === 'single_choice' || q.type === 'multiple_choice') {
  choiceForm.stem = q.question || ''
  choiceForm.options = (q.choose || []).map(opt => extractOptionText(opt))

  // 查找答案索引
  const answerIndices = findAnswerIndices(q.choose, q.answer)
  choiceForm.answer = answerIndices
}
```

替换为：
```javascript
// 根据题型填充数据
if (q.type === 'single_choice' || q.type === 'multiple_choice') {
  choiceForm.stem = q.question || ''
  choiceForm.options = (q.choose || []).map(opt => extractOptionText(opt))

  // 直接保存答案文本（去掉 "A." 前缀）
  if (Array.isArray(q.answer)) {
    // 多选题
    choiceForm.answer = q.answer.map(ans => extractOptionText(ans))
  } else {
    // 单选题
    choiceForm.answer = extractOptionText(q.answer)
  }
}
```

- [ ] **Step 2: 验证修改**

确认代码变更正确，无需删除 `findAnswerIndices` 函数（可能在其他地方有用）

---

### Task 2: 修改答案表单绑定 - Checkbox 值绑定

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:327-336` (多选题 checkbox group)

**Goal:** 修改 checkbox 的 value 绑定从索引改为选项文本

- [ ] **Step 1: 修改 checkbox group 模板**

找到这段模板代码：
```html
<a-form-item label="正确答案" required>
  <a-checkbox-group v-model:value="choiceForm.answer">
    <a-checkbox
      v-for="(opt, index) in choiceForm.options"
      :key="index"
      :value="index"
    >
      {{ String.fromCharCode(65 + index) }}
    </a-checkbox>
  </a-checkbox-group>
</a-form-item>
```

替换为：
```html
<a-form-item label="正确答案" required>
  <a-checkbox-group v-model:value="choiceForm.answer" v-if="questionForm.type_ === 3">
    <a-checkbox
      v-for="(opt, index) in choiceForm.options"
      :key="index"
      :value="opt"
    >
      {{ String.fromCharCode(65 + index) }}
    </a-checkbox>
  </a-checkbox-group>
  <a-radio-group v-model:value="choiceForm.answer" v-else-if="questionForm.type_ === 2">
    <a-radio
      v-for="(opt, index) in choiceForm.options"
      :key="index"
      :value="opt"
    >
      {{ String.fromCharCode(65 + index) }}
    </a-radio>
  </a-radio-group>
</a-form-item>
```

---

### Task 3: 修改删除选项时的答案处理逻辑

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:1057-1062` (removeOption function)

**Goal:** 更新 `removeOption` 函数，使其能正确处理文本格式的答案

- [ ] **Step 1: 修改 removeOption 函数**

找到这段代码：
```javascript
const removeOption = (index) => {
  choiceForm.options.splice(index, 1)
  // 同时移除答案中的对应索引
  choiceForm.answer = choiceForm.answer.filter(a => a !== index)
    .map(a => a > index ? a - 1 : a)
}
```

替换为：
```javascript
const removeOption = (index) => {
  const removedOption = choiceForm.options[index]
  choiceForm.options.splice(index, 1)
  // 同时移除答案中的对应选项
  if (Array.isArray(choiceForm.answer)) {
    // 多选题：过滤掉被删除的选项
    choiceForm.answer = choiceForm.answer.filter(a => a !== removedOption)
  } else if (choiceForm.answer === removedOption) {
    // 单选题：如果被删除的是选中的答案，清空答案
    choiceForm.answer = ''
  }
}
```

---

### Task 4: 修改编辑回显逻辑 - handleEditQuestion

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:965-1013` (handleEditQuestion function)

**Goal:** 更新 `handleEditQuestion` 函数，支持新旧数据格式的兼容读取

- [ ] **Step 1: 修改选择题数据回显逻辑**

找到这段代码：
```javascript
if (record.type_ === 2 || record.type_ === 3) {
  // 选择题：单选题和多选题
  choiceForm.stem = q.question || q.stem || ''
  choiceForm.options = q.choose || q.options || ['', '']

  // 处理答案格式：可能是字符串或数组
  if (Array.isArray(q.answer)) {
    choiceForm.answer = q.answer
  } else if (typeof q.answer === 'string') {
    // 如果是字符串答案如"B. xxx"，需要找到对应的选项索引
    const answerIndex = (q.choose || []).findIndex(option =>
      option.includes(q.answer) || option === q.answer
    )
    choiceForm.answer = answerIndex >= 0 ? [answerIndex] : []
  } else {
    choiceForm.answer = q.answer || []
  }
}
```

替换为：
```javascript
if (record.type_ === 2 || record.type_ === 3) {
  // 选择题：单选题和多选题
  choiceForm.stem = q.question || q.stem || ''
  choiceForm.options = q.choose || q.options || ['', '']

  // 处理答案格式：兼容新旧格式
  if (Array.isArray(q.answer)) {
    if (q.answer.length > 0 && typeof q.answer[0] === 'number') {
      // 旧格式：索引数组，转换成文本数组
      choiceForm.answer = q.answer
        .map(idx => choiceForm.options[idx])
        .filter(Boolean)
    } else {
      // 新格式：文本数组
      choiceForm.answer = q.answer
    }
  } else if (typeof q.answer === 'number') {
    // 旧格式：单个索引，转换成文本
    choiceForm.answer = choiceForm.options[q.answer] || ''
  } else if (typeof q.answer === 'string') {
    // 新格式：单个文本，或者带"A."前缀的文本
    const cleanAnswer = extractOptionText(q.answer)
    // 检查是否在选项中，如果不在，尝试通过包含关系匹配
    if (choiceForm.options.includes(cleanAnswer)) {
      choiceForm.answer = cleanAnswer
    } else {
      // 尝试模糊匹配
      const matchedOption = choiceForm.options.find(opt =>
        opt.includes(cleanAnswer) || cleanAnswer.includes(opt)
      )
      choiceForm.answer = matchedOption || ''
    }
  } else {
    choiceForm.answer = record.type_ === 3 ? [] : ''
  }
}
```

---

### Task 5: 修改重置表单逻辑 - resetQuestionForms

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:1036-1049` (resetQuestionForms function)

**Goal:** 更新 `resetQuestionForms` 函数，根据题型设置正确的答案初始值

- [ ] **Step 1: 修改 resetQuestionForms 函数**

找到这段代码：
```javascript
const resetQuestionForms = () => {
  questionForm.type_ = editingQuestion.value ? editingQuestion.value.type_ : 0
  choiceForm.stem = ''
  choiceForm.options = ['', '']
  choiceForm.answer = []
  judgmentForm.stem = ''
  judgmentForm.answer = true
  fillBlankForm.stem = ''
  fillBlankForm.answers = ['']
  essayForm.stem = ''
  essayForm.referenceAnswer = ''
  currentQuestionAnalysis.value = ''
}
```

替换为：
```javascript
const resetQuestionForms = () => {
  questionForm.type_ = editingQuestion.value ? editingQuestion.value.type_ : 0
  choiceForm.stem = ''
  choiceForm.options = ['', '']
  // 根据题型设置答案初始值：多选题用数组，单选题用字符串
  choiceForm.answer = questionForm.type_ === 3 ? [] : ''
  judgmentForm.stem = ''
  judgmentForm.answer = true
  fillBlankForm.stem = ''
  fillBlankForm.answers = ['']
  essayForm.stem = ''
  essayForm.referenceAnswer = ''
  currentQuestionAnalysis.value = ''
}
```

---

### Task 6: 修改题型切换逻辑 - handleTypeChange

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue:1031-1034` (handleTypeChange function)

**Goal:** 确保题型切换时答案格式正确重置

- [ ] **Step 1: 确认 handleTypeChange 函数**

当前代码已经调用 `resetQuestionForms()`，无需额外修改：
```javascript
const handleTypeChange = () => {
  resetQuestionForms()
}
```

---

### Task 7: 测试验证

**Files:**
- Test: Manual testing in browser

**Goal:** 验证所有功能正常工作

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 测试 AI 生成单选题**

1. 进入题库详情页
2. 选择知识点，选择题型"单选题"
3. 点击"生成题目"
4. 查看正确答案显示的是选项文本而不是索引
5. 点击"添加到题库"
6. 保存题目

- [ ] **Step 3: 测试 AI 生成多选题**

1. 选择知识点，选择题型"多选题"
2. 点击"生成题目"
3. 查看正确答案显示的是选项文本数组而不是索引数组
4. 点击"添加到题库"
5. 保存题目

- [ ] **Step 4: 测试手动创建单选题**

1. 点击"新增题目"
2. 选择"单选题"
3. 填写题干和选项
4. 勾选正确答案
5. 保存题目
6. 编辑该题目，验证答案正确回显

- [ ] **Step 5: 测试手动创建多选题**

1. 点击"新增题目"
2. 选择"多选题"
3. 填写题干和选项
4. 勾选多个正确答案
5. 保存题目
6. 编辑该题目，验证答案正确回显

- [ ] **Step 6: 测试删除选项**

1. 编辑一个有答案的选择题
2. 删除一个未选中的选项，验证答案不受影响
3. 删除一个已选中的选项，验证答案被正确移除

- [ ] **Step 7: 测试向后兼容（如果有旧数据）**

1. 如果有旧的索引格式数据，编辑验证能正确回显

---

### Task 8: 提交代码

**Files:**
- All modified files

- [ ] **Step 1: 查看变更**

```bash
git status
git diff
```

- [ ] **Step 2: 提交代码**

```bash
git add src/views/question-bank/QuestionBankDetail.vue
git commit -m "feat: 多选题答案保存完整选项文本而非索引

- 修改 AI 生成题目处理逻辑，直接保存答案文本
- 修改表单绑定，checkbox/radio 绑定选项文本而非索引
- 更新删除选项逻辑，正确处理文本格式答案
- 增强编辑回显逻辑，支持新旧格式兼容
- 根据题型设置正确的答案初始值格式"
```

---

## Self-Review

**1. Spec coverage:** 
- ✅ AI 生成题目处理 - Task 1
- ✅ 表单交互绑定 - Task 2  
- ✅ 删除选项处理 - Task 3
- ✅ 编辑回显兼容 - Task 4
- ✅ 表单重置 - Task 5
- ✅ 测试验证 - Task 7
- ✅ 代码提交 - Task 8

**2. Placeholder scan:** No placeholders found - all code and commands are complete

**3. Type consistency:** 
- Answer format: single choice = string, multiple choice = array
- Function names and property names consistent throughout

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-19-multiple-choice-answer-format.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
