# 题目文本换行修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复出题、题库、答题过程中题目文本超出边框不换行的问题

**Architecture:** 通过修改三个文件中的 CSS 样式，添加文本换行和断词属性来解决溢出问题

**Tech Stack:** Vue 3, CSS, Ant Design Vue

---

## 文件修改清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/views/exam/ExamTake.vue` | 修改 | 考试页面样式 |
| `src/views/question-bank/QuestionBankDetail.vue` | 修改 | 题库详情页样式 |
| `src/components/course/modules/CreatePaper.vue` | 修改 | 新建试卷组件样式 |

---

## Task 1: 修复 ExamTake.vue 中的文本换行问题

**Files:**
- Modify: `src/views/exam/ExamTake.vue`

- [ ] **Step 1: 修改 `.question-stem` 样式**

找到 `ExamTake.vue` 中的 `.question-stem` 样式（大约在 760-766 行），修改为：

```css
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
```

- [ ] **Step 2: 修改 `.question-options` 样式**

找到 `.question-options` 样式（大约在 768-772 行），修改为：

```css
.question-options {
  padding-left: 8px;
  margin-bottom: 24px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
```

- [ ] **Step 3: 修改 `.options-group` 样式**

找到 `.options-group` 样式（大约在 774-778 行），修改为：

```css
.options-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
```

- [ ] **Step 4: 添加 Radio/Checkbox 文本换行样式**

在 `.options-group` 样式后添加以下新样式：

```css
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
```

- [ ] **Step 5: 验证修改**

检查文件是否正确保存，确认样式已添加。

- [ ] **Step 6: 提交更改**

```bash
git add src/views/exam/ExamTake.vue
git commit -m "fix: add text wrapping styles to ExamTake page"
```

---

## Task 2: 修复 QuestionBankDetail.vue 中的文本换行问题

**Files:**
- Modify: `src/views/question-bank/QuestionBankDetail.vue`

- [ ] **Step 1: 修改 `.question-stem` 样式（关键修复）**

找到 `QuestionBankDetail.vue` 中的 `.question-stem` 样式（大约在 1259-1266 行），修改为：

```css
.question-stem {
  display: inline-block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

- [ ] **Step 2: 修改 `.option-item` 样式**

找到 `.option-item` 样式（大约在 1283-1289 行），修改为：

```css
.option-item {
  padding: 4px 0;
  color: #595959;
  font-size: 14px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

- [ ] **Step 3: 修改 `.answer-item` 样式**

找到 `.answer-item` 样式（大约在 1291-1298 行），修改为：

```css
.answer-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

- [ ] **Step 4: 添加 `.selected-question-content` 样式**

找到 `.selected-question-content` 样式（大约在 1300-1305 行），修改为：

```css
.selected-question-content {
  margin-bottom: 8px;
  color: #262626;
  font-size: 14px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

- [ ] **Step 5: 验证修改**

检查文件是否正确保存，确认样式已修改/添加。

- [ ] **Step 6: 提交更改**

```bash
git add src/views/question-bank/QuestionBankDetail.vue
git commit -m "fix: add text wrapping styles to QuestionBankDetail page"
```

---

## Task 3: 修复 CreatePaper.vue 中的文本换行问题

**Files:**
- Modify: `src/components/course/modules/CreatePaper.vue`

- [ ] **Step 1: 修改 `.question-text` 样式**

找到 `CreatePaper.vue` 中的 `.question-text` 样式（大约在 602-608 行），修改为：

```css
.question-text {
  font-weight: 500;
  margin-bottom: 8px;
  color: #262626;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

- [ ] **Step 2: 修改 `.option-item` 样式**

找到 `.option-item` 样式（大约在 610-616 行），修改为：

```css
.option-item {
  padding: 4px 0;
  color: #595959;
  font-size: 14px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

- [ ] **Step 3: 修改 `.question-answer` 和 `.question-analysis` 样式**

找到 `.question-answer, .question-analysis` 样式（大约在 618-629 行），修改为：

```css
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
```

- [ ] **Step 4: 修改 `.selected-question-content` 样式**

找到 `.selected-question-content` 样式（大约在 668-674 行），修改为：

```css
.selected-question-content {
  margin-bottom: 8px;
  color: #262626;
  font-size: 14px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

- [ ] **Step 5: 验证修改**

检查文件是否正确保存，确认样式已修改。

- [ ] **Step 6: 提交更改**

```bash
git add src/components/course/modules/CreatePaper.vue
git commit -m "fix: add text wrapping styles to CreatePaper component"
```

---

## Task 4: 最终验证与测试

**Files:**
- N/A（仅运行测试）

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 手动测试各个页面**

1. 访问考试页面，验证题目文本是否正确换行
2. 访问题库详情页，验证题目列表和弹窗中的文本是否正确换行
3. 访问新建试卷页面，验证题目文本是否正确换行

- [ ] **Step 3: 运行 lint 检查（可选）**

```bash
npm run lint
```

- [ ] **Step 4: 创建最终总结 commit（如果需要）**

```bash
git status
# 确认所有更改已提交
```

---

## 验收检查清单

- [ ] ExamTake.vue 中题目题干正确换行
- [ ] ExamTake.vue 中选项内容正确换行
- [ ] QuestionBankDetail.vue 中题目列表文本正确换行
- [ ] QuestionBankDetail.vue 中弹窗里的题目内容正确换行
- [ ] CreatePaper.vue 中题目列表文本正确换行
- [ ] CreatePaper.vue 中已选题目内容正确换行
- [ ] 长单词/长数字能正确断词不溢出
- [ ] 所有现有功能正常工作

---

## 回滚计划

如果发现问题，可以通过以下命令回滚：

```bash
# 回滚最后一个提交
git revert HEAD

# 或者回滚到修复前的状态
git log --oneline
git reset --hard <commit-hash>
```
