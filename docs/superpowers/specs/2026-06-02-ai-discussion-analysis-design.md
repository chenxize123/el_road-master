# AI讨论分析功能设计文档

**日期：** 2026-06-02
**版本：** V2.0.0
**状态：** 设计中

## 概述

1. **V1.0**：为班级讨论模块增加AI分析功能，支持对单条讨论内容进行分析，以及对整个讨论的全部内容进行总结。
2. **V2.0新增**：将AI助手生成的分析内容按照 `quoted_content_id` 字段关联到对应的原始讨论内容下，实现可折叠的AI分析展示区域。

## 目标用户

- 老师（已登录）
- 管理员（已登录）
- 学生（已登录）
- *游客不可使用*

## 功能需求

### 1. AI总结全部讨论内容

在每个讨论展开后的详情区域顶部，添加"AI总结"按钮。点击后调用AI接口，生成该讨论全部内容的总结。

### 2. AI分析单条讨论内容

在每条讨论内容卡片上添加"AI分析"按钮。点击后弹出输入框，用户通过自然语言描述具体需求（如"分析这个观点"、"补充这个论点"等），然后调用AI接口获取分析结果。

## 技术设计

### API层

**文件：** `src/api/discussion.js`

新增API函数：

```javascript
/**
 * AI分析讨论内容
 * @param {Object} data
 * @param {string | number} data.discussion_id - 讨论ID
 * @param {string} data.intent - 用户需求/意图
 * @param {string} [data.discussion_content] - 讨论内容（单条分析时需要）
 * @param {string | number} [data.discussion_content_id] - 讨论内容ID（单条分析时需要）
 */
export function analyzeDiscussionContent(data) {
  return api.post('/discussion/content/llm', {
    discussion_id: String(data.discussion_id),
    intent: data.intent,
    ...(data.discussion_content !== undefined && { discussion_content: data.discussion_content }),
    ...(data.discussion_content_id !== undefined && { discussion_content_id: String(data.discussion_content_id) })
  })
}
```

### UI层

**文件：** `src/components/class/modules/ClassDiscussionModule.vue`

#### 改动一：讨论详情区域顶部

在 `discussion-summary` 区域右侧添加"AI总结"按钮：

```vue
<div class="discussion-summary">
  <div class="summary-header">
    <h3>{{ record.topic || '-' }}</h3>
    <a-button
      v-if="canUseAIFeature"
      type="primary"
      size="small"
      :loading="summaryLoading"
      @click="handleSummaryDiscussion"
    >
      <template #icon><thunderbolt-outlined /></template>
      AI总结
    </a-button>
  </div>
  <div class="summary-meta">
    <a-tag v-if="record.zl_class" color="blue">
      {{ record.zl_class }}
    </a-tag>
    <a-tag v-if="record.create_by" color="default">
      创建人：{{ record.create_by }}
    </a-tag>
  </div>
</div>
```

#### 改动二：每条讨论内容卡片

在 `content-meta` 区域添加"AI分析"按钮：

```vue
<div class="content-meta">
  <span>{{ formatDateTime(item.create_time) }}</span>
  <a-button
    v-if="canUseAIFeature"
    type="link"
    size="small"
    @click="handleAnalyzeContent(item)"
  >
    AI分析
  </a-button>
  <a-popconfirm
    v-if="canDeleteContent(item)"
    title="确定要删除这条讨论内容吗？"
    ok-text="确定"
    cancel-text="取消"
    @confirm="handleDeleteContent(item.id)"
  >
    <a-button
      type="link"
      size="small"
      danger
      class="content-delete"
      :loading="deletingContentId === item.id"
    >
      删除
    </a-button>
  </a-popconfirm>
</div>
```

#### 改动三：新增模态框1 - 输入分析需求

```vue
<a-modal
  v-model:open="analyzeModalVisible"
  title="AI分析"
  :confirm-loading="analyzeSubmitting"
  @ok="handleConfirmAnalyze"
  @cancel="handleCancelAnalyze"
  destroy-on-close
>
  <div class="selected-content-preview">
    <div class="preview-label">选中的讨论内容：</div>
    <div class="preview-text">{{ selectedContentForAnalyze?.content }}</div>
  </div>
  <a-form layout="vertical" style="margin-top: 16px;">
    <a-form-item label="请输入你的需求">
      <a-textarea
        v-model:value="analyzeIntent"
        placeholder="例如：分析这个观点的合理性，或者补充相关的内容..."
        :rows="4"
        :maxlength="500"
        show-count
      />
    </a-form-item>
  </a-form>
</a-modal>
```

#### 改动四：新增模态框2 - 展示AI结果

```vue
<a-modal
  v-model:open="resultModalVisible"
  :title="resultModalTitle"
  :confirm-loading="resultLoading"
  @ok="handleCopyResult"
  @cancel="handleCloseResult"
  ok-text="复制内容"
  cancel-text="关闭"
  width="600px"
>
  <div v-if="resultLoading" class="result-loading">
    <a-spin size="large" />
    <div class="loading-text">AI思考中...</div>
  </div>
  <div v-else class="result-content">
    <div class="markdown-body" v-html="renderedResult"></div>
  </div>
</a-modal>
```

### 状态管理

新增响应式状态：

```javascript
// AI功能相关状态
const canUseAIFeature = computed(() => {
  // 已登录用户可用，游客不可用
  return userStore.isAuthenticated === true
})

const summaryLoading = ref(false)
const analyzeModalVisible = ref(false)
const analyzeSubmitting = ref(false)
const selectedContentForAnalyze = ref(null)
const analyzeIntent = ref('')
const resultModalVisible = ref(false)
const resultModalTitle = ref('AI分析结果')
const resultLoading = ref(false)
const aiResult = ref('')
const renderedResult = ref('')
```

### 方法实现

```javascript
// 总结当前讨论
async function handleSummaryDiscussion() {
  if (!selectedDiscussion.value?.id) return

  resultModalTitle.value = 'AI总结结果'
  resultModalVisible.value = true
  resultLoading.value = true
  aiResult.value = ''
  renderedResult.value = ''

  try {
    const res = await analyzeDiscussionContent({
      discussion_id: selectedDiscussion.value.id,
      intent: '总结本讨论的全部内容'
    })

    if (res.code === 200) {
      aiResult.value = res.data?.result || res.data || '暂无结果'
      renderedResult.value = renderMarkdown(aiResult.value)
    } else {
      message.error(res.message || '获取AI总结失败')
      resultModalVisible.value = false
    }
  } catch (err) {
    console.error('AI总结失败:', err)
    message.error(err.message || '获取AI总结失败')
    resultModalVisible.value = false
  } finally {
    resultLoading.value = false
  }
}

// 打开分析单条内容的模态框
function handleAnalyzeContent(item) {
  selectedContentForAnalyze.value = item
  analyzeIntent.value = ''
  analyzeModalVisible.value = true
}

// 取消分析
function handleCancelAnalyze() {
  analyzeModalVisible.value = false
  selectedContentForAnalyze.value = null
  analyzeIntent.value = ''
}

// 确认分析并发送请求
async function handleConfirmAnalyze() {
  const intent = analyzeIntent.value.trim()
  if (!intent) {
    message.warning('请输入你的需求')
    return
  }

  analyzeSubmitting.value = true

  try {
    // 先关闭输入框，再打开结果框
    analyzeModalVisible.value = false

    resultModalTitle.value = 'AI分析结果'
    resultModalVisible.value = true
    resultLoading.value = true
    aiResult.value = ''
    renderedResult.value = ''

    const res = await analyzeDiscussionContent({
      discussion_id: selectedDiscussion.value.id,
      intent: intent,
      discussion_content: selectedContentForAnalyze.value.content,
      discussion_content_id: selectedContentForAnalyze.value.id
    })

    if (res.code === 200) {
      aiResult.value = res.data?.result || res.data || '暂无结果'
      renderedResult.value = renderMarkdown(aiResult.value)
    } else {
      message.error(res.message || '获取AI分析失败')
      resultModalVisible.value = false
    }
  } catch (err) {
    console.error('AI分析失败:', err)
    message.error(err.message || '获取AI分析失败')
    resultModalVisible.value = false
  } finally {
    analyzeSubmitting.value = false
    resultLoading.value = false
    selectedContentForAnalyze.value = null
    analyzeIntent.value = ''
  }
}

// 渲染Markdown（复用ChatWidget逻辑）
function renderMarkdown(text) {
  if (!text) return ''
  return DOMPurify.sanitize(marked.parse(text))
}

// 复制结果
function handleCopyResult() {
  if (!aiResult.value) return

  navigator.clipboard.writeText(aiResult.value).then(() => {
    message.success('复制成功')
  }).catch(() => {
    message.error('复制失败')
  })
}

// 关闭结果框
function handleCloseResult() {
  resultModalVisible.value = false
  resultLoading.value = false
  aiResult.value = ''
  renderedResult.value = ''
}
```

### 样式

新增样式类：

```css
.summary-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.selected-content-preview {
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.preview-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 4px;
}

.preview-text {
  font-size: 14px;
  color: #262626;
  line-height: 1.6;
}

.result-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 16px;
}

.loading-text {
  color: #595959;
  font-size: 14px;
}

.result-content {
  min-height: 120px;
}

.markdown-body {
  font-size: 14px;
  line-height: 1.75;
  color: #262626;
}

.markdown-body :deep(p) {
  margin-bottom: 12px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin-bottom: 12px;
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin-bottom: 4px;
}

.markdown-body :deep(h4) {
  margin-bottom: 8px;
  font-weight: 600;
}
```

## 数据流

### AI总结流程

```
1. 用户点击"AI总结"按钮
   ↓
2. 检查用户权限（已登录）
   ↓
3. 打开结果模态框，显示加载状态
   ↓
4. 调用API：{ discussion_id, intent: "总结本讨论的全部内容" }
   ↓
5. 收到响应
   - 成功：渲染并展示Markdown结果
   - 失败：显示错误提示，关闭模态框
```

### AI单条分析流程

```
1. 用户点击某条讨论的"AI分析"按钮
   ↓
2. 打开输入需求模态框，展示选中内容
   ↓
3. 用户输入需求并点击"确定"
   ↓
4. 检查用户权限（已登录）
   ↓
5. 关闭输入框，打开结果框，显示加载状态
   ↓
6. 调用API：{ discussion_id, intent, discussion_content, discussion_content_id }
   ↓
7. 收到响应
   - 成功：渲染并展示Markdown结果
   - 失败：显示错误提示，关闭模态框
```

## 权限控制

- 使用 `userStore` 检查用户是否已登录
- 游客（未登录）：按钮不显示
- 已登录用户（老师/管理员/学生）：按钮正常显示

## 错误处理

1. **API调用失败：** 使用 `message.error()` 显示错误信息
2. **网络错误：** 显示通用错误提示
3. **空结果：** 显示"暂无结果"
4. **复制失败：** 提示用户复制失败

## 依赖项

- `marked` - Markdown解析（项目已存在）
- `dompurify` - XSS防护（项目已存在）
- `@ant-design/icons-vue` - 图标组件（项目已存在，需要 `ThunderboltOutlined`）

## 注意事项

1. 复用项目中已有的ChatWidget组件的Markdown渲染逻辑
2. 保持与现有UI风格一致
3. 确保大整数ID正确转换为字符串
4. 添加适当的防抖/节流，避免频繁调用API

---

## V2.0 新增设计：AI分析内容关联展示

### 背景

原API返回的讨论内容是扁平列表，AI生成的内容与用户内容混在一起显示。新API增加了 `quoted_content_id` 字段，可以将AI回复与对应的原始内容关联起来。

### 需求说明

#### 功能需求
1. **内容分组**：将AI分析内容按照 `quoted_content_id` 归类到对应的原始内容下
2. **可折叠展示**：
   - 只有当内容有AI分析时才显示展开按钮
   - 按钮显示为"查看X条AI分析"（X为分析数量）
   - 点击展开后按时间顺序显示所有AI分析
3. **视觉区分**：
   - AI分析有特殊的视觉样式（背景色、边框）
   - AI分析卡片在原始内容下方缩进显示
4. **交互保持**：
   - "AI分析"按钮的模态框流程保持不变
   - AI总结功能保持现状，继续用模态框展示

#### 数据结构变化

##### 讨论内容对象
```javascript
{
  id: string,
  avatar: string,
  user: string,
  discussion: string,
  content: string,
  create_time: string,
  quoted_content_id: string | null  // 新增字段
}
```

##### 分组数据结构
```javascript
// 主内容列表
mainContents: ContentItem[]

// AI分析映射表
aiAnalysesMap: Map<string, ContentItem[]>
```

### 设计方案

#### 1. 数据处理层

##### 更新 normalizeDiscussionContent
保留 `quoted_content_id` 字段，确保正确转换为字符串或null。

##### 新增分组函数
```javascript
function groupDiscussionContents(contents) {
  const mainContents = []
  const aiAnalysesMap = new Map()

  contents.forEach(item => {
    if (!item.quoted_content_id) {
      mainContents.push(item)
    } else {
      const quotedId = item.quoted_content_id
      if (!aiAnalysesMap.has(quotedId)) {
        aiAnalysesMap.set(quotedId, [])
      }
      aiAnalysesMap.get(quotedId).push(item)
    }
  })

  // 对每个内容的AI分析按时间排序
  aiAnalysesMap.forEach((analyses, id) => {
    analyses.sort((a, b) => new Date(a.create_time) - new Date(b.create_time))
  })

  return { mainContents, aiAnalysesMap }
}
```

#### 2. UI组件层

##### 模板结构变化
```vue
<!-- 内容列表遍历 -->
<a-list v-else :data-source="mainContents" item-layout="vertical">
  <template #renderItem="{ item }">
    <a-list-item class="content-item">
      <!-- 主内容卡片 -->
      <div class="content-card">
        <!-- ... 现有主内容结构 ... -->
      </div>

      <!-- AI分析区域 -->
      <div v-if="hasAiAnalyses(item.id)" class="ai-analyses-section">
        <a-button
          type="link"
          size="small"
          class="ai-analyses-toggle"
          @click="toggleAiAnalyses(item.id)"
        >
          {{ isAiAnalysesExpanded(item.id) ? '收起' : `查看${getAiAnalysesCount(item.id)}条AI分析` }}
        </a-button>

        <div v-if="isAiAnalysesExpanded(item.id)" class="ai-analyses-panel">
          <a-list :data-source="getAiAnalyses(item.id)" item-layout="vertical">
            <template #renderItem="{ aiItem }">
              <a-list-item class="ai-analysis-item">
                <div class="ai-analysis-card">
                  <!-- AI分析内容展示 -->
                  <div class="content-header">
                    <div class="content-user">
                      <a-avatar :src="getContentAvatarUrl(aiItem)" :size="32" class="content-avatar">
                        {{ getUserInitial(aiItem.user) }}
                      </a-avatar>
                      <div class="content-author">{{ aiItem.user || 'AI助手' }}</div>
                    </div>
                    <div class="content-meta">
                      <span>{{ formatDateTime(aiItem.create_time) }}</span>
                    </div>
                  </div>
                  <div class="content-text markdown-body" v-html="renderMarkdown(aiItem.content)"></div>
                </div>
              </a-list-item>
            </template>
          </a-list>
        </div>
      </div>
    </a-list-item>
  </template>
</a-list>
```

#### 3. 状态管理

##### 新增响应式状态
```javascript
// 分组后的数据
const mainContents = ref([])
const aiAnalysesMap = ref(new Map())

// AI分析展开状态
const expandedAiAnalyses = ref(new Set())
```

##### 新增计算属性和方法
```javascript
// 检查内容是否有AI分析
function hasAiAnalyses(contentId) {
  return aiAnalysesMap.value.has(contentId) && aiAnalysesMap.value.get(contentId).length > 0
}

// 获取AI分析数量
function getAiAnalysesCount(contentId) {
  return aiAnalysesMap.value.get(contentId)?.length || 0
}

// 获取AI分析列表
function getAiAnalyses(contentId) {
  return aiAnalysesMap.value.get(contentId) || []
}

// 切换AI分析展开状态
function toggleAiAnalyses(contentId) {
  if (expandedAiAnalyses.value.has(contentId)) {
    expandedAiAnalyses.value.delete(contentId)
  } else {
    expandedAiAnalyses.value.add(contentId)
  }
}

// 检查是否展开
function isAiAnalysesExpanded(contentId) {
  return expandedAiAnalyses.value.has(contentId)
}
```

#### 4. 样式设计

##### AI分析区域样式
```css
.ai-analyses-section {
  margin-top: 8px;
  padding-left: 24px;
}

.ai-analyses-toggle {
  padding-left: 0;
  color: #1677ff;
  font-size: 13px;
}

.ai-analyses-panel {
  padding: 8px 0 0 0;
}

.ai-analysis-item {
  padding: 6px 0;
}

.ai-analysis-card {
  width: 100%;
  padding: 12px 14px;
  background: #f0f7ff;
  border-left: 3px solid #1677ff;
  border-radius: 4px;
}

.ai-analysis-card .content-author {
  font-size: 14px;
  color: #1677ff;
}

.ai-analysis-card .content-meta {
  color: #8c8c8c;
  font-size: 11px;
}

.ai-analysis-card .content-text {
  font-size: 13px;
  color: #3a3a3a;
}
```

#### 5. 交互流程

##### AI分析按钮点击流程
1. 用户点击某条内容的"AI分析"按钮
2. 显示需求输入模态框
3. 用户输入需求并确认
4. 关闭输入框，显示结果加载模态框
5. 显示AI分析结果
6. 用户关闭结果模态框
7. **自动刷新讨论内容列表**
8. 新的AI分析自动显示在对应内容下方（可展开查看）

##### 数据刷新策略
- `handleCopyResult` 和 `handleCloseResult` 函数中调用 `fetchDiscussionContents()` 刷新数据
- 刷新后自动保持当前展开的讨论状态

### V2.0 变更清单

#### 修改文件
1. `src/components/class/modules/ClassDiscussionModule.vue` - 主要实现文件

#### 主要变更点
1. 更新 `normalizeDiscussionContent` 函数，保留 `quoted_content_id`
2. 新增 `groupDiscussionContents` 分组函数
3. 更新 `fetchDiscussionContents` 中的数据处理逻辑
4. 新增AI分析相关状态和方法
5. 更新模板结构，支持AI分析区域展示
6. 新增AI分析相关样式
7. 更新AI分析结果关闭后的刷新逻辑

### 兼容性

- 保持向后兼容：如果API返回的旧数据没有 `quoted_content_id`，所有内容都作为主内容显示
- AI总结功能保持不变，继续使用模态框展示

### 风险评估

- **无明显风险**：此变更主要是前端展示逻辑调整，不涉及核心业务逻辑变更

---

## 变更记录

| 版本 | 日期 | 说明 | 作者 |
|------|------|------|------|
| V1.0.0 | 2026-06-02 | 初始版本 - AI分析功能 | AI |
| V2.0.0 | 2026-06-02 | 新增AI分析内容关联展示 | AI |
