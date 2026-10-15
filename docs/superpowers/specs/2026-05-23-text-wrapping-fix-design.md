# 题目文本换行修复设计文档

**日期：** 2026-05-23  
**作者：** AI Assistant  
**状态：** 待审核

---

## 1. 问题概述

在出题、题库、答题过程中，题目内容超出边框但不换行，导致用户体验不佳。

### 1.1 影响范围

- 学生考试页面 (`ExamTake.vue`)
- 题库详情页面 (`QuestionBankDetail.vue`)
- 新建试卷组件 (`CreatePaper.vue`)

### 1.2 根本原因

- 缺少正确的文本换行 CSS 属性
- 部分地方设置了 `white-space: nowrap;` 强制不换行
- 没有处理长单词/长数字的断词问题

---

## 2. 修复方案

采用**方案2：全面优化方案**

### 2.1 修复原则

- 确保所有题目文本在容器内正确换行
- 优化行高提升阅读体验
- 处理长单词/长数字的断词
- 保持现有布局和功能不变

---

## 3. 详细修改内容

### 3.1 文件1：`src/views/exam/ExamTake.vue`

#### 修改位置
`<style scoped>` 部分

#### 样式修改

**`.question-stem` 修改：**
```css
.question-stem {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 24px;
  color: #333;
  /* 新增以下样式 */
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: normal;
}
```

**`.question-options` 新增样式：**
```css
.question-options {
  padding-left: 8px;
  margin-bottom: 24px;
  /* 新增以下样式 */
  word-wrap: break-word;
  overflow-wrap: break-word;
}
```

**`.options-group` 新增样式：**
```css
.options-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* 新增以下样式 */
  word-wrap: break-word;
  overflow-wrap: break-word;
}
```

**为 Radio/Checkbox 内的文本新增样式：**
```css
/* 新增 */
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

---

### 3.2 文件2：`src/views/question-bank/QuestionBankDetail.vue`

#### 修改位置
`<style scoped>` 部分

#### 样式修改

**`.question-stem` 修改（关键修复）：**
```css
.question-stem {
  display: inline-block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  /* 移除 white-space: nowrap; */
  /* 新增以下样式 */
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

**`.option-item` 新增样式：**
```css
.option-item {
  padding: 4px 0;
  color: #595959;
  font-size: 14px;
  /* 新增以下样式 */
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

**`.answer-item` 新增样式：**
```css
.answer-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
  /* 新增以下样式 */
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

**`.selected-question-content` 新增样式：**
```css
.selected-question-content {
  margin-bottom: 8px;
  color: #262626;
  font-size: 14px;
  /* 新增以下样式 */
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

---

### 3.3 文件3：`src/components/course/modules/CreatePaper.vue`

#### 修改位置
`<style scoped>` 部分

#### 样式修改

**`.question-text` 新增样式：**
```css
.question-text {
  font-weight: 500;
  margin-bottom: 8px;
  color: #262626;
  /* 新增以下样式 */
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

**`.option-item` 新增样式：**
```css
.option-item {
  padding: 4px 0;
  color: #595959;
  font-size: 14px;
  /* 新增以下样式 */
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

**`.question-answer` 和 `.question-analysis` 新增样式：**
```css
.question-answer,
.question-analysis {
  margin-top: 8px;
  padding: 8px;
  background: #f6ffed;
  border-radius: 4px;
  font-size: 14px;
  /* 新增以下样式 */
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}

.question-analysis {
  background: #fff7e6;
}
```

**`.selected-question-content` 新增样式：**
```css
.selected-question-content {
  margin-bottom: 8px;
  color: #262626;
  font-size: 14px;
  /* 新增以下样式 */
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
```

---

## 4. CSS 属性说明

### 4.1 使用的 CSS 属性

| 属性 | 说明 |
|------|------|
| `word-wrap: break-word;` | 允许长单词在任意点断行 |
| `overflow-wrap: break-word;` | `word-wrap` 的标准别名，功能相同 |
| `word-break: break-word;` | 在单词内部断行，防止长单词溢出 |
| `white-space: normal;` | 允许文本正常换行（覆盖 nowrap） |
| `line-height: 1.6;` | 优化行高，提升阅读体验 |
| `hyphens: auto;` | 启用连字符断字（可选，本方案暂不添加） |

---

## 5. 兼容性考虑

### 5.1 浏览器兼容性

- 所有现代浏览器都支持以上 CSS 属性
- IE 11 支持 `word-wrap` 和 `word-break`
- 不影响现有功能

### 5.2 响应式考虑

- 保持现有的媒体查询不变
- 换行样式在所有屏幕尺寸下都生效
- 提升移动端体验

---

## 6. 验收标准

- [ ] 题目题干在所有页面都能正确换行
- [ ] 选项内容在所有页面都能正确换行
- [ ] 长单词/长数字能正确断词不溢出
- [ ] 文本行高适中，阅读体验良好
- [ ] 不影响现有功能和布局
- [ ] 在不同屏幕尺寸下都显示正常

---

## 7. 后续优化建议（可选）

- 考虑添加 `hyphens: auto;` 支持英文连字符断字
- 可以为超长文本添加"展开/收起"功能
- 考虑添加最大高度限制，超出部分用 ellipsis 并添加 tooltip

---

**文档结束**
