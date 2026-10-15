# 班级文献检索模块设计文档

**日期**: 2026-06-09
**版本**: V1.0.0

## 概述

在班级详情页添加文献检索模块，用户可以输入研究主题，结合课程名称获取相关的学术文献推荐，支持 Markdown 格式展示和导出为 .md/.pdf 文件。

## 目标

- 在 ClassTabs 中添加新的"文献检索"标签页
- 从 classInfo 获取课程名称传递给模块
- 调用后端 API `/api/v1/llm/search` 进行文献检索
- 使用 marked + DOMPurify 渲染返回的 Markdown 内容
- 支持导出为 Markdown 文件和 PDF 文件
- 遵循项目现有代码风格和架构模式

## 项目现有架构参考

### API层
- `src/api/index.js` - 统一 ApiService 类，处理 token 注入、请求超时、响应解析等
- 其他 API 模块（如 `class.js`, `discussion.js`）使用此 service
- 已有 `marked` 和 `DOMPurify` 依赖用于 Markdown 渲染

### 组件结构
- `src/components/class/ClassTabs.vue` - 标签页导航组件
- `src/components/class/modules/` - 各功能模块存放位置
- `src/views/class/ClassDetail.vue` - 班级详情主页面

### 数据流
- `ClassDetail` 通过 `useClassDetail` composable 获取 `classInfo`
- `ClassDetail` 将数据通过 props 传递给各模块组件

## 设计方案

### 1. 新建 `src/api/literature.js`

封装文献检索 API 接口，复用项目统一 ApiService：

```javascript
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

### 2. 新建 `src/components/class/modules/ClassLiteratureModule.vue`

#### Props
```javascript
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
```

#### 状态管理
```javascript
const researchTopic = ref('')        // 用户输入的研究主题
const resultContent = ref('')        // API 返回的 markdown 内容
const searching = ref(false)         // 检索中状态
const error = ref('')                // 错误信息
```

#### 主要功能

##### 2.1 文献检索
```javascript
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
```

##### 2.2 Markdown 渲染
复用项目已有的 `marked` 和 `DOMPurify`：
```javascript
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const renderMarkdown = (content) => {
  if (!content) return ''
  return DOMPurify.sanitize(marked.parse(content))
}
```

##### 2.3 导出 Markdown 文件
```javascript
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
```

##### 2.4 导出 PDF 文件
使用 `html2pdf.js` 库：
```javascript
import html2pdf from 'html2pdf.js'

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
```

#### UI 布局
```vue
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
```

#### 样式
- 复用项目现有的 `.markdown-body` 样式（参考 ClassDiscussionModule）
- 响应式设计，适配手机/平板/桌面端

### 3. 修改 `src/components/class/ClassTabs.vue`

在 `defaultTabs` 数组中添加新标签页（放在 discussion 之前）：

```javascript
import {
  InfoCircleOutlined,
  TeamOutlined,
  ProjectOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  BookOutlined,    // 新增：书本图标
  CommentOutlined
} from '@ant-design/icons-vue'

const defaultTabs = [
  { key: 'basic', label: '基本信息', icon: InfoCircleOutlined, visible: true },
  { key: 'students', label: '学生管理', icon: TeamOutlined, visible: (props) => props.isTeacherOrAdmin },
  { key: 'knowledge', label: '知识图谱', icon: ProjectOutlined, visible: true },
  { key: 'video', label: '数字人视频', icon: VideoCameraOutlined, visible: true },
  { key: 'exam', label: '考试管理', icon: FileTextOutlined, visible: true },
  { key: 'literature', label: '文献检索', icon: BookOutlined, visible: true },  // 新增
  { key: 'discussion', label: '讨论区', icon: CommentOutlined, visible: true }
]
```

### 4. 修改 `src/views/class/ClassDetail.vue`

引入并添加新模块的插槽：

```javascript
import ClassLiteratureModule from '@/components/class/modules/ClassLiteratureModule.vue'
```

```vue
<template #literature>
  <ClassLiteratureModule
    :class-id="classId"
    :course-name="classInfo?.course_name || classInfo?.courseName || ''"
    :loading="loading"
  />
</template>
```

### 5. 新增依赖

安装 `html2pdf.js`：
```bash
npm install html2pdf.js
```

## 数据流

```
ClassDetail (提供 classId, classInfo)
    ↓
ClassTabs (新增 literature 标签)
    ↓
ClassLiteratureModule (接收 courseName, 管理检索状态)
    ↓
literature.js (API 封装)
    ↓
api/index.js (统一请求处理)
    ↓
后端接口 /api/v1/llm/search
    ↓
返回 Markdown 内容 → 渲染展示 → 导出文件
```

## 文件清单

### 新增/修改文件
1. **新建** `src/api/literature.js` - 文献检索 API 封装
2. **新建** `src/components/class/modules/ClassLiteratureModule.vue` - 文献检索模块组件
3. **修改** `src/components/class/ClassTabs.vue` - 添加文献检索标签页
4. **修改** `src/views/class/ClassDetail.vue` - 集成新模块
5. **新增依赖** `html2pdf.js` - PDF 导出功能

### 不修改文件
- 其他现有组件、API、Store 保持不变

## 依赖项

### 新增依赖
- `html2pdf.js` - 用于将 HTML 转换为 PDF

### 已存在依赖（无需新增）
- `vue` 3.x
- `ant-design-vue` 4.x
- `marked` - Markdown 解析
- `dompurify` - XSS 防护

## 待确定事项

- [x] 课程名称从 `classInfo` 传递（确认）
- [x] 标签页位置放在讨论区之前（确认）
- [x] 导出格式支持 .md 和 .pdf（确认）
- [x] 研究主题为自由输入文本框（确认）

## 后续优化方向

1. 可考虑添加检索历史记录功能（localStorage 保存）
2. 可添加一键复制内容功能
3. 可添加章节折叠/展开功能
4. 可支持再次检索（修改主题重新检索）
5. 可添加检索结果的缓存机制
