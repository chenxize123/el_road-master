# AI讨论分析内容关联展示实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将AI助手生成的分析内容按照 `quoted_content_id` 字段关联到对应的原始讨论内容下，实现可折叠的AI分析展示区域。

**Architecture:** 更新讨论模块的数据处理逻辑，将扁平列表重组为主内容+AI分析的层级结构；修改UI模板支持AI分析区域的展开/折叠展示；添加相应的样式区分AI内容。

**Tech Stack:** Vue 3, Composition API, Ant Design Vue, Pinia

---

## 文件结构

**主要修改文件：**
- `src/components/class/modules/ClassDiscussionModule.vue` - 讨论模块主组件

---

### Task 1: 更新数据规范化和分组函数

**Files:**
- Modify: `src/components/class/modules/ClassDiscussionModule.vue`

- [ ] **Step 1: 更新 normalizeDiscussionContent 函数**

找到 `normalizeDiscussionContent` 函数（约第417行），更新为：

```javascript
function normalizeDiscussionContent(item) {
  return {
    id: item?.id === undefined || item?.id === null ? '' : String(item.id),
    avatar: item?.avatar || '',
    user: item?.user || '',
    discussion: item?.discussion || '',
    content: item?.content || '',
    create_time: item?.create_time || '',
    quoted_content_id: item?.quoted_content_id === undefined || item?.quoted_content_id === null
      ? null
      : String(item.quoted_content_id)
  }
}
```

- [ ] **Step 2: 添加 groupDiscussionContents 分组函数**

在 `normalizeDiscussionContent` 函数后面添加：

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

- [ ] **Step 3: 提交**

```bash
git add src/components/class/modules/ClassDiscussionModule.vue
git commit -m "feat: update content normalization and add grouping function"
```

---

### Task 2: 添加新的响应式状态和辅助方法

**Files:**
- Modify: `src/components/class/modules/ClassDiscussionModule.vue`

- [ ] **Step 1: 添加新的响应式状态**

找到状态定义区域（约第332行），在 `replyForm` 后面添加：

```javascript
// AI分析分组数据
const mainContents = ref([])
const aiAnalysesMap = ref(new Map())

// AI分析展开状态
const expandedAiAnalyses = ref(new Set())
```

- [ ] **Step 2: 添加AI分析相关辅助方法**

在 `normalizeDiscussionContent` 和 `groupDiscussionContents` 后面添加：

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

- [ ] **Step 3: 提交**

```bash
git add src/components/class/modules/ClassDiscussionModule.vue
git commit -m "feat: add reactive state and helper methods for AI analyses"
```

---

### Task 3: 更新 fetchDiscussionContents 使用分组逻辑

**Files:**
- Modify: `src/components/class/modules/ClassDiscussionModule.vue`

- [ ] **Step 1: 更新 fetchDiscussionContents 函数**

找到 `fetchDiscussionContents` 函数（约第514行），更新数据处理部分：

```javascript
async function fetchDiscussionContents() {
  if (!selectedDiscussion.value?.id) {
    discussionContents.value = []
    mainContents.value = []
    aiAnalysesMap.value = new Map()
    return
  }

  contentLoading.value = true
  contentError.value = ''

  try {
    const res = await getDiscussionContentsByDiscussionId(selectedDiscussion.value.id)
    if (res.code === 200) {
      const contents = Array.isArray(res.data)
        ? res.data.map(normalizeDiscussionContent)
        : []
      discussionContents.value = contents
      // 使用分组函数处理数据
      const { mainContents: groupedMain, aiAnalysesMap: groupedAi } = groupDiscussionContents(contents)
      mainContents.value = groupedMain
      aiAnalysesMap.value = groupedAi
      fetchContentAvatars(contents)
      return
    }

    throw new Error(res.message || '获取讨论内容失败')
  } catch (err) {
    console.error('获取讨论内容失败:', err)
    contentError.value = err.message || '获取讨论内容失败'
    message.error(contentError.value)
    discussionContents.value = []
    mainContents.value = []
    aiAnalysesMap.value = new Map()
  } finally {
    contentLoading.value = false
  }
}
```

- [ ] **Step 2: 更新 closeExpandedDiscussion 函数**

找到 `closeExpandedDiscussion` 函数（约第641行），添加重置分组数据的逻辑：

```javascript
function closeExpandedDiscussion() {
  expandedRowKeys.value = []
  selectedDiscussion.value = null
  contentError.value = ''
  discussionContents.value = []
  mainContents.value = []
  aiAnalysesMap.value = new Map()
  expandedAiAnalyses.value = new Set()
  replyForm.value.content = ''
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/class/modules/ClassDiscussionModule.vue
git commit -m "feat: update fetchDiscussionContents to use grouping logic"
```

---

### Task 4: 更新AI分析结果关闭时的刷新逻辑

**Files:**
- Modify: `src/components/class/modules/ClassDiscussionModule.vue`

- [ ] **Step 1: 更新 handleCopyResult 函数**

找到 `handleCopyResult` 函数（约第812行），添加刷新逻辑：

```javascript
// 复制结果
function handleCopyResult() {
  if (!aiResult.value) return

  navigator.clipboard.writeText(aiResult.value).then(() => {
    message.success('复制成功')
    // 复制成功后刷新讨论内容
    fetchDiscussionContents()
  }).catch(() => {
    message.error('复制失败')
  })
}
```

- [ ] **Step 2: 更新 handleCloseResult 函数**

找到 `handleCloseResult` 函数（约第823行），添加刷新逻辑：

```javascript
// 关闭结果框
function handleCloseResult() {
  resultModalVisible.value = false
  resultLoading.value = false
  aiResult.value = ''
  renderedResult.value = ''
  // 关闭后刷新讨论内容
  fetchDiscussionContents()
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/class/modules/ClassDiscussionModule.vue
git commit -m "feat: refresh discussion contents after AI result modal closes"
```

---

### Task 5: 更新模板结构 - 内容列表部分

**Files:**
- Modify: `src/components/class/modules/ClassDiscussionModule.vue`

- [ ] **Step 1: 替换内容列表遍历**

找到模板中 `content-list` div 内的 a-list（约第124行），将 `discussionContents` 替换为 `mainContents`，并添加AI分析区域：

```vue
<a-list v-else :data-source="mainContents" item-layout="vertical">
  <template #renderItem="{ item }">
    <a-list-item class="content-item">
      <div class="content-card">
        <div class="content-header">
          <div class="content-user">
            <a-avatar
              :src="getContentAvatarUrl(item)"
              :size="36"
              class="content-avatar"
            >
              {{ getUserInitial(item.user) }}
            </a-avatar>
            <div class="content-author">{{ item.user || '未知用户' }}</div>
          </div>
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
        </div>
        <div class="content-text">{{ item.content || '-' }}</div>
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
                  <div class="content-header">
                    <div class="content-user">
                      <a-avatar
                        :src="getContentAvatarUrl(aiItem)"
                        :size="32"
                        class="content-avatar"
                      >
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

- [ ] **Step 2: 提交**

```bash
git add src/components/class/modules/ClassDiscussionModule.vue
git commit -m "feat: update template to support AI analyses section"
```

---

### Task 6: 添加AI分析区域样式

**Files:**
- Modify: `src/components/class/modules/ClassDiscussionModule.vue`

- [ ] **Step 1: 添加AI分析样式**

在样式部分的最后（约第1188行）添加：

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

- [ ] **Step 2: 提交**

```bash
git add src/components/class/modules/ClassDiscussionModule.vue
git commit -m "feat: add styles for AI analyses section"
```

---

### Task 7: 测试验证

**Files:**
- N/A (手动测试)

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 手动测试以下场景**

1. 打开一个有讨论内容的班级页面
2. 展开某个讨论，确认讨论内容正常显示
3. 点击某条内容的"AI分析"，输入需求并确认
4. 关闭结果模态框，确认讨论内容自动刷新
5. 确认对应内容下方出现"查看X条AI分析"按钮
6. 点击展开，确认AI分析内容正确显示
7. 确认AI分析内容有特殊的视觉样式（浅蓝色背景、左边框）
8. 点击"收起"，确认AI分析内容隐藏
9. 尝试对同一条内容生成多条AI分析，确认都能正确显示

- [ ] **Step 3: 提交（如果有修复）**

```bash
# 如有bug修复，提交相应改动
```

---

## 计划自我检查

**1. Spec 覆盖检查：**
- ✅ 数据规范化更新 - Task 1
- ✅ 内容分组逻辑 - Task 1
- ✅ 状态管理 - Task 2
- ✅ 数据获取更新 - Task 3
- ✅ 刷新逻辑 - Task 4
- ✅ UI模板更新 - Task 5
- ✅ 样式设计 - Task 6
- ✅ 测试验证 - Task 7

**2. 占位符扫描：** 无TBD/TODO，所有步骤都有具体代码

**3. 一致性检查：** 函数名、变量名在各任务中保持一致

---

计划已完成并保存到 `docs/superpowers/plans/2026-06-02-ai-discussion-analysis-display.md`。两个执行选项：

**1. Subagent-Driven (recommended)** - 我为每个任务分发一个新的子代理，任务之间进行审查，快速迭代

**2. Inline Execution** - 在当前会话中使用 executing-plans 执行任务，带检查点的批量执行以便审查

选择哪个方式？
