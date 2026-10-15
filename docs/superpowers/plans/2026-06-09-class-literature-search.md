# 班级文献检索模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在班级详情页添加文献检索模块，用户可以输入研究主题获取相关学术文献推荐，支持 Markdown 展示和导出为 .md/.pdf 文件。

**Architecture:** 遵循项目现有架构，新建 API 封装模块，新建 Vue 组件，在现有 ClassTabs 和 ClassDetail 中集成。

**Tech Stack:** Vue 3.x, Ant Design Vue 4.x, marked, DOMPurify, html2pdf.js

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/api/literature.js` | 新建 | 文献检索 API 封装 |
| `src/components/class/modules/ClassLiteratureModule.vue` | 新建 | 文献检索模块组件 |
| `src/components/class/ClassTabs.vue` | 修改 | 添加文献检索标签页 |
| `src/views/class/ClassDetail.vue` | 修改 | 集成新模块组件 |
| `package.json` | 修改 | 添加 html2pdf.js 依赖 |

---

### Task 1: 安装 html2pdf.js 依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install html2pdf.js**

Run:
```bash
npm install html2pdf.js
```

Expected: 安装成功，更新 package.json 和 package-lock.json

- [ ] **Step 2: Verify installation**

Check `package.json` has `"html2pdf.js"` in dependencies

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add html2pdf.js dependency for PDF export"
```

---

### Task 2: 创建文献检索 API 模块

**Files:**
- Create: `src/api/literature.js`

- [ ] **Step 1: Create the API file**

```javascript
/*
 * @Date         : 2026-06-09
 * @Description  : 文献检索相关 API
 * @FilePath     : literature.js
 * @Version      : V1.0.0
 */
import api from './index'

/**
 * 文献检索
 * POST /api/v1/llm/search
 * @param {string} course - 课程名称
 * @param {string} researchTopic - 研究主题
 */
export async function searchLiteratureApi(course, researchTopic) {
  return api.post('/v1/llm/search', {
    course,
    research_topic: researchTopic
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/literature.js
git commit -m "feat: add literature search API module"
```

---

### Task 3: 创建 ClassLiteratureModule 组件

**Files:**
- Create: `src/components/class/modules/ClassLiteratureModule.vue`

- [ ] **Step 1: Create the component file with template and script**

```vue
<!--
 * @Date         : 2026-06-09
 * @Description  : 班级文献检索模块
 * @FilePath     : ClassLiteratureModule.vue
 * @Version      : V1.0.0
-->
<template>
  <div class="class-literature-module">
    <!-- 头部工具栏 -->
    <div class="literature-toolbar">
      <div class="toolbar-title">
        <h3>文献检索</h3>
        <span v-if="courseName">课程：{{ courseName }}</span>
      </div>
      <div class="toolbar-actions" v-if="resultContent">
        <a-button @click="handleExportMarkdown">
          <template #icon><FileTextOutlined /></template>
          导出 .md
        </a-button>
        <a-button type="primary" @click="handleExportPdf">
          <template #icon><FilePdfOutlined /></template>
          导出 .pdf
        </a-button>
      </div>
    </div>

    <!-- 错误提示 -->
    <a-alert
      v-if="error"
      class="literature-alert"
      message="检索出错"
      :description="error"
      type="error"
      show-icon
    >
      <template #action>
        <a-button size="small" danger @click="error = ''">关闭</a-button>
      </template>
    </a-alert>

    <!-- 检索输入区 -->
    <div class="search-section">
      <a-textarea
        v-model:value="researchTopic"
        placeholder="请输入您的研究主题..."
        :rows="3"
        :maxlength="500"
        show-count
        @press-enter="handleSearch"
      />
      <div class="search-actions">
        <a-button
          type="primary"
          size="large"
          :loading="searching || props.loading"
          @click="handleSearch"
        >
          <template #icon><SearchOutlined /></template>
          检索文献
        </a-button>
      </div>
    </div>

    <!-- 结果展示区 -->
    <div v-if="resultContent" class="result-section">
      <div class="result-header">
        <h4>检索结果</h4>
      </div>
      <div
        class="literature-content markdown-body"
        v-html="renderMarkdown(resultContent)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, FileTextOutlined, FilePdfOutlined } from '@ant-design/icons-vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import html2pdf from 'html2pdf.js'
import { searchLiteratureApi } from '@/api/literature'

const props = defineProps({
  classId: {
    type: [String, Number],
    required: true
  },
  courseName: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const researchTopic = ref('')
const resultContent = ref('')
const searching = ref(false)
const error = ref('')

const renderMarkdown = (content) => {
  if (!content) return ''
  return DOMPurify.sanitize(marked.parse(content))
}

const handleSearch = async () => {
  if (!researchTopic.value.trim()) {
    message.warning('请输入研究主题')
    return
  }
  if (!props.courseName) {
    message.warning('课程名称不存在')
    return
  }

  searching.value = true
  error.value = ''
  try {
    const res = await searchLiteratureApi(props.courseName, researchTopic.value.trim())
    if (res.code === 200) {
      resultContent.value = res.data || ''
    } else {
      throw new Error(res.message || '检索失败')
    }
  } catch (err) {
    console.error('文献检索失败:', err)
    error.value = err.message || '检索失败，请稍后重试'
    message.error(error.value)
  } finally {
    searching.value = false
  }
}

const handleExportMarkdown = () => {
  if (!resultContent.value) {
    message.warning('暂无内容可导出')
    return
  }

  const topic = researchTopic.value.trim().substring(0, 20) || '文献'
  const course = props.courseName.substring(0, 20) || '课程'
  const filename = `${course}_${topic}_文献推荐.md`

  const blob = new Blob([resultContent.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  message.success('导出成功')
}

const handleExportPdf = () => {
  if (!resultContent.value) {
    message.warning('暂无内容可导出')
    return
  }

  const topic = researchTopic.value.trim().substring(0, 20) || '文献'
  const course = props.courseName.substring(0, 20) || '课程'
  const filename = `${course}_${topic}_文献推荐.pdf`

  const element = document.querySelector('.literature-content')
  const opt = {
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }

  html2pdf().set(opt).from(element).save()
  message.success('导出成功')
}
</script>

<style scoped>
.class-literature-module {
  min-height: 400px;
}

.literature-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.toolbar-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.toolbar-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.toolbar-title span {
  font-size: 13px;
  color: #8c8c8c;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.literature-alert {
  margin-bottom: 16px;
}

.search-section {
  margin-bottom: 24px;
}

.search-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 12px;
}

.result-section {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.result-header {
  margin-bottom: 16px;
}

.result-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.literature-content {
  background: #fafafa;
  padding: 20px;
  border-radius: 8px;
  min-height: 200px;
}

/* Markdown 样式 - 复用项目现有样式模式 */
.markdown-body {
  font-size: 14px;
  line-height: 1.75;
  color: #262626;
}

.markdown-body :deep(p) {
  margin: 0 0 12px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 12px 0;
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
  padding-left: 4px;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 16px 0 8px 0;
  font-weight: 600;
  line-height: 1.4;
}

.markdown-body :deep(h1) {
  font-size: 24px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.markdown-body :deep(h2) {
  font-size: 20px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 6px;
}

.markdown-body :deep(h3) {
  font-size: 18px;
}

.markdown-body :deep(h4) {
  font-size: 16px;
}

.markdown-body :deep(em) {
  font-style: italic;
}

.markdown-body :deep(del) {
  text-decoration: line-through;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid #1890ff;
  padding-left: 12px;
  margin: 12px 0;
  color: #595959;
  font-style: italic;
}

.markdown-body :deep(a) {
  color: #1890ff;
  text-decoration: underline;
}

.markdown-body :deep(code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
}

.markdown-body :deep(pre) {
  background: #262626;
  color: #f0f0f0;
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
  font-size: 13px;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #f0f0f0;
  padding: 8px 12px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: #fafafa;
  font-weight: 600;
}

/* 响应式设计 */
@media screen and (max-width: 768px) {
  .literature-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-actions {
    width: 100%;
  }

  .toolbar-actions .ant-btn {
    flex: 1;
  }

  .literature-content {
    padding: 16px;
  }
}

@media screen and (max-width: 480px) {
  .literature-content {
    padding: 12px;
  }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/class/modules/ClassLiteratureModule.vue
git commit -m "feat: add ClassLiteratureModule component"
```

---

### Task 4: 更新 ClassTabs 添加文献检索标签页

**Files:**
- Modify: `src/components/class/ClassTabs.vue`

- [ ] **Step 1: Read the current file to see exact content**

(Already read, proceed)

- [ ] **Step 2: Add BookOutlined import**

Find the import line and add BookOutlined:
```javascript
import {
  InfoCircleOutlined,
  TeamOutlined,
  ProjectOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  BookOutlined,
  CommentOutlined
} from '@ant-design/icons-vue'
```

- [ ] **Step 3: Add literature tab in defaultTabs array before discussion**

Update defaultTabs:
```javascript
const defaultTabs = [
  { key: 'basic', label: '基本信息', icon: InfoCircleOutlined, visible: true },
  { key: 'students', label: '学生管理', icon: TeamOutlined, visible: (props) => props.isTeacherOrAdmin },
  { key: 'knowledge', label: '知识图谱', icon: ProjectOutlined, visible: true },
  { key: 'video', label: '数字人视频', icon: VideoCameraOutlined, visible: true },
  { key: 'exam', label: '考试管理', icon: FileTextOutlined, visible: true },
  { key: 'literature', label: '文献检索', icon: BookOutlined, visible: true },
  { key: 'discussion', label: '讨论区', icon: CommentOutlined, visible: true }
]
```

- [ ] **Step 4: Commit**

```bash
git add src/components/class/ClassTabs.vue
git commit -m "feat: add literature tab to ClassTabs"
```

---

### Task 5: 在 ClassDetail 中集成新模块

**Files:**
- Modify: `src/views/class/ClassDetail.vue`

- [ ] **Step 1: Read the current file to see exact content**

(Already read, proceed)

- [ ] **Step 2: Add import for ClassLiteratureModule**

Add this import with other component imports:
```javascript
import ClassLiteratureModule from '@/components/class/modules/ClassLiteratureModule.vue'
```

- [ ] **Step 3: Add the literature slot in ClassTabs**

Add this slot after exam slot and before discussion slot:
```vue
<template #literature>
  <ClassLiteratureModule
    :class-id="classId"
    :course-name="classInfo?.course_name || classInfo?.courseName || ''"
    :loading="loading"
  />
</template>
```

- [ ] **Step 4: Commit**

```bash
git add src/views/class/ClassDetail.vue
git commit -m "feat: integrate ClassLiteratureModule in ClassDetail"
```

---

### Task 6: 测试验证功能

**Files:**
- 无文件修改 - 测试任务

- [ ] **Step 1: Start the dev server**

Run:
```bash
npm run dev
```

Expected: 服务正常启动，无编译错误

- [ ] **Step 2: Navigate to a class detail page**

Visit: `http://localhost:5173/class/detail/<class-id>`

- [ ] **Step 3: Verify the new tab exists**

Check that "文献检索" tab appears in the tab list, between "考试管理" and "讨论区"

- [ ] **Step 4: Test the search functionality**

1. Enter a research topic in the textarea
2. Click "检索文献" button
3. Verify loading state appears
4. Verify Markdown content is rendered when results come back

- [ ] **Step 5: Test export functions**

1. With search results displayed, click "导出 .md"
2. Verify a .md file downloads
3. Click "导出 .pdf"
4. Verify a .pdf file downloads

- [ ] **Step 6: Test responsive design**

Resize browser to mobile/tablet sizes, verify layout adapts

---

## 计划自我审查

**✓ Spec Coverage:**
- [x] API 封装 - Task 2
- [x] 组件创建 - Task 3
- [x] 标签页添加 - Task 4
- [x] 模块集成 - Task 5
- [x] 依赖安装 - Task 1
- [x] Markdown 渲染 - Task 3 (uses marked + DOMPurify)
- [x] 导出功能 - Task 3 (.md and .pdf)
- [x] 测试验证 - Task 6

**✓ Placeholder Scan:** 没有占位符内容，所有步骤都有完整代码和命令

**✓ Type Consistency:**
- API 函数名 `searchLiteratureApi` 一致
- Props 名称 `classId`, `courseName`, `loading` 一致
- 标签页 key `literature` 一致
