# ChatWidget Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate ChatWidget AI assistant into the ClassVideoModule for students watching course videos.

**Architecture:** Create conversation API layer, refactor ChatWidget to use project conventions, integrate into video module.

**Tech Stack:** Vue 3, Vite, Ant Design Vue, Pinia, Fetch API

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/api/conversation.js` | Create | Conversation API wrapper functions |
| `src/components/ChatWidget.vue` | Move + Modify | Move from dayi-fronted, refactor API calls |
| `src/components/class/modules/ClassVideoModule.vue` | Modify | Add ChatWidget component |

---

### Task 1: Create Conversation API Module

**Files:**
- Create: `src/api/conversation.js`

- [ ] **Step 1: Create the API file with all 5 conversation endpoints**

```javascript
/*
 * @Date         : 2026-05-25
 * @Description  : 对话相关API接口 - 统一管理服务
 * @FilePath     : conversation.js
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 */

import api from '@/api'

/**
 * 创建对话
 * POST /api/v1/conversation/
 * curl -X 'POST' 'http://111.63.183.17:9000/api/v1/conversation/' \
 *   -H 'accept: application/json' \
 *   -H 'Content-Type: application/json' \
 *   -d '{ "title": "string" }'
 */
export function createConversationApi(data) {
  return api.post('/v1/conversation/', data)
}

/**
 * 逻辑删除对话
 * DELETE /api/v1/conversation/?conversation_id={id}
 * curl -X 'DELETE' 'http://111.63.183.17:9000/api/v1/conversation/?conversation_id=1' \
 *   -H 'accept: application/json'
 */
export function deleteConversationApi(conversationId) {
  return api.delete(`/v1/conversation/?conversation_id=${conversationId}`)
}

/**
 * 修改对话
 * PUT /api/v1/conversation/
 * curl -X 'PUT' 'http://111.63.183.17:9000/api/v1/conversation/' \
 *   -H 'accept: application/json' \
 *   -H 'Content-Type: application/json' \
 *   -d '{ "id": 0, "title": "string" }'
 */
export function updateConversationApi(data) {
  return api.put('/v1/conversation/', data)
}

/**
 * 根据用户id获取对话列表
 * GET /api/v1/conversation/user_id?page={page}&page_size={pageSize}
 * curl -X 'GET' 'http://111.63.183.17:9000/api/v1/conversation/user_id?page=12&page_size=12' \
 *   -H 'accept: application/json'
 */
export function getConversationListApi(params) {
  const query = new URLSearchParams(params).toString()
  return api.get(`/v1/conversation/user_id?${query}`)
}

/**
 * 根据对话id获取对话详情
 * GET /api/v1/conversation/id?conversation_id={id}
 * curl -X 'GET' 'http://111.63.183.17:9000/api/v1/conversation/id?conversation_id=2121' \
 *   -H 'accept: application/json'
 */
export function getConversationByIdApi(conversationId) {
  return api.get(`/v1/conversation/id?conversation_id=${conversationId}`)
}

/**
 * TODO: 发送消息接口 - 待后端提供
 * 占位实现，等待接口确定后完善
 */
export function sendMessageApi(conversationId, content, context = {}) {
  console.warn('发送消息接口尚未实现', { conversationId, content, context })
  return Promise.reject(new Error('发送消息接口待后端提供'))
}
```

- [ ] **Step 2: Verify file is created at correct path**

Check: `src/api/conversation.js` should exist with the above content

- [ ] **Step 3: Commit**

```bash
git add src/api/conversation.js
git commit -m "feat: add conversation API module"
```

---

### Task 2: Move and Refactor ChatWidget.vue

**Files:**
- Move: `src/dayi-fronted/src/components/ChatWidget.vue` → `src/components/ChatWidget.vue`
- Modify: `src/components/ChatWidget.vue`

- [ ] **Step 1: Copy the original ChatWidget.vue to new location**

Read original, write to `src/components/ChatWidget.vue` (we'll modify in next steps)

- [ ] **Step 2: Replace script setup with refactored version**

```vue
<script setup>
import { ref, nextTick, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { useUserStore } from '@/store'
import {
  createConversationApi,
  deleteConversationApi,
  updateConversationApi,
  getConversationListApi,
  getConversationByIdApi,
  sendMessageApi
} from '@/api/conversation'

// Props - 接收课程上下文
const props = defineProps({
  courseId: {
    type: [String, Number],
    default: null
  },
  currentVideo: {
    type: Object,
    default: null
  }
})

// State
const isOpen = ref(false)
const showSidebar = ref(true)
const conversations = ref([])
const currentConversationId = ref(null)
const messages = ref([])
const inputText = ref('')
const isLoading = ref(false)
const messagesContainer = ref(null)
const inputRef = ref(null)

// User store
const userStore = useUserStore()
const userId = computed(() => userStore.userInfo?.id)

// 快捷问题
const quickQuestions = [
  '如何求二次函数的最值？',
  '英语作文怎么提高？',
  '牛顿三大定律是什么？'
]

// 数据映射 - 适配后端返回格式
function normalizeConversation(item) {
  return {
    id: item.id,
    title: item.title || '新对话',
    ...item
  }
}

function normalizeMessage(item) {
  return {
    id: item.id,
    role: item.role || (item.is_ai ? 'ai' : 'human'),
    content: item.content || '',
    ...item
  }
}

// 会话管理
async function fetchConversations() {
  if (!userId.value) {
    console.warn('用户未登录，无法获取对话列表')
    return
  }

  try {
    const res = await getConversationListApi({ page: 1, page_size: 50 })
    if (res.code === 200 && Array.isArray(res.data)) {
      conversations.value = res.data.map(normalizeConversation)
    } else {
      console.warn('获取对话列表响应格式异常:', res)
    }
  } catch (e) {
    console.error('获取对话列表失败:', e)
    message.error('获取对话列表失败')
  }
}

async function createNewChat() {
  try {
    const res = await createConversationApi({ title: '新对话' })
    if (res.code === 200 && res.data) {
      const newConversation = normalizeConversation(res.data)
      currentConversationId.value = newConversation.id
      messages.value = []
      await fetchConversations()
      focusInput()
      message.success('创建对话成功')
    } else {
      throw new Error(res.message || '创建对话失败')
    }
  } catch (e) {
    console.error('创建对话失败:', e)
    message.error('创建对话失败')
  }
}

async function switchConversation(conversationId) {
  if (conversationId === currentConversationId.value) return

  currentConversationId.value = conversationId
  messages.value = []

  try {
    const res = await getConversationByIdApi(conversationId)
    if (res.code === 200 && res.data) {
      // 假设 messages 在 res.data.messages 中，根据实际结构调整
      const msgList = res.data.messages || res.data.message_list || []
      messages.value = msgList.map(normalizeMessage)
      await nextTick()
      scrollToBottom()
    }
  } catch (e) {
    console.error('获取对话详情失败:', e)
    message.error('获取对话详情失败')
  }
}

async function deleteConversation(conversationId) {
  try {
    await deleteConversationApi(conversationId)

    if (currentConversationId.value === conversationId) {
      currentConversationId.value = null
      messages.value = []
    }

    await fetchConversations()
    message.success('删除对话成功')
  } catch (e) {
    console.error('删除对话失败:', e)
    message.error('删除对话失败')
  }
}

// 发送消息
async function handleSend(e) {
  if (e && 'shiftKey' in e && e.shiftKey) return
  if (e && 'preventDefault' in e) e.preventDefault()

  const text = inputText.value.trim()
  if (!text || isLoading.value) return

  // 如果没有当前对话，先创建
  if (!currentConversationId.value) {
    await createNewChat()
    if (!currentConversationId.value) return
  }

  // 添加用户消息到界面
  const userMessage = { role: 'human', content: text, id: Date.now() }
  messages.value.push(userMessage)
  inputText.value = ''
  isLoading.value = true

  await nextTick()
  scrollToBottom()

  try {
    // 构建上下文
    const context = {
      course_id: props.courseId,
      video_id: props.currentVideo?.id,
      video_title: props.currentVideo?.title
    }

    // 调用发送消息API
    const res = await sendMessageApi(currentConversationId.value, text, context)

    // 假设响应包含AI消息
    if (res.code === 200 && res.data) {
      const aiMessage = normalizeMessage({
        ...res.data,
        role: 'ai'
      })
      messages.value.push(aiMessage)
    }

    // 如果是第一条消息，用用户消息内容更新会话标题
    const humanMessages = messages.value.filter(m => m.role === 'human')
    if (humanMessages.length === 1) {
      const title = text.slice(0, 20) + (text.length > 20 ? '...' : '')
      try {
        await updateConversationApi({
          id: currentConversationId.value,
          title: title
        })
        await fetchConversations()
      } catch (_) {
        // 忽略更新标题失败
      }
    }

    await nextTick()
    scrollToBottom()
  } catch (e) {
    console.error('发送消息失败:', e)
    // 显示临时错误消息
    messages.value.push({
      role: 'ai',
      content: e.message || '抱歉，发送失败，请稍后重试。',
      id: Date.now()
    })
  } finally {
    isLoading.value = false
    focusInput()
  }
}

function sendQuickQuestion(question) {
  inputText.value = question
  handleSend()
}

// UI辅助
function openChat() {
  isOpen.value = true
  fetchConversations()
  nextTick(() => focusInput())
}

function closeChat() {
  isOpen.value = false
}

function toggleSidebar() {
  showSidebar.value = !showSidebar.value
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function focusInput() {
  nextTick(() => {
    inputRef.value?.focus()
  })
}

function renderMarkdown(text) {
  if (!text) return ''
  // 简单的markdown渲染：换行、加粗、代码块
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  // 加粗
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // 换行
  html = html.replace(/\n/g, '<br>')
  return html
}

onMounted(() => {
  // 预加载会话列表
  if (isOpen.value) {
    fetchConversations()
  }
})
</script>
```

- [ ] **Step 3: Keep the template unchanged (same as original)**

- [ ] **Step 4: Update the style section, adjust z-index**

In the style section, update these specific z-index values:

```css
/* ---- 悬浮按钮 ---- */
.chat-fab {
  /* ... existing styles ... */
  z-index: 999;
}

/* ---- 聊天窗口 ---- */
.chat-window {
  /* ... existing styles ... */
  z-index: 1000;
}
```

- [ ] **Step 5: Verify the complete ChatWidget.vue**

The final file should have:
- Original template section
- New refactored script setup section
- Original style section with z-index adjusted

- [ ] **Step 6: Commit**

```bash
git add src/components/ChatWidget.vue
git commit -m "feat: refactor ChatWidget to use project API layer"
```

---

### Task 3: Integrate ChatWidget into ClassVideoModule

**Files:**
- Modify: `src/components/class/modules/ClassVideoModule.vue`

- [ ] **Step 1: Add ChatWidget import**

Find the existing imports at the top of `<script setup>` and add:

```javascript
import ChatWidget from '@/components/ChatWidget.vue'
```

- [ ] **Step 2: Add ChatWidget to template at the end**

Find the closing `</div>` of the root element and add before it:

```vue
    <!-- AI 答疑助手 -->
    <ChatWidget
      :course-id="courseId"
      :current-video="currentVideo"
    />
  </div>
</template>
```

- [ ] **Step 3: Verify the complete ClassVideoModule.vue**

The imports should now include ChatWidget, and the template should have the ChatWidget component at the end.

- [ ] **Step 4: Commit**

```bash
git add src/components/class/modules/ClassVideoModule.vue
git commit -m "feat: integrate ChatWidget into ClassVideoModule"
```

---

### Task 4: Verify and Test

**Files:**
- (no files modified - verification only)

- [ ] **Step 1: Run linter**

```bash
npm run lint
```
Expected: No lint errors

- [ ] **Step 2: Run build**

```bash
npm run build
```
Expected: Build completes successfully

- [ ] **Step 3: Manual verification checklist**

- [ ] `src/api/conversation.js` exists and exports all 6 functions
- [ ] `src/components/ChatWidget.vue` exists at new location
- [ ] ChatWidget no longer has hardcoded `API_BASE` or `apiFetch`
- [ ] ChatWidget imports from `@/api/conversation` and uses `useUserStore`
- [ ] ClassVideoModule imports and renders ChatWidget
- [ ] z-index values are adjusted to 999/1000

- [ ] **Step 4: Commit verification (if any fixes needed)**

Only if fixes were required during verification:

```bash
git status
# add and commit any fixes if needed
```

---

## Self-Review

### 1. Spec coverage

✅ **Create conversation API** - Task 1 implements `src/api/conversation.js` with all 5 endpoints  
✅ **Move and refactor ChatWidget** - Task 2 moves and refactors the component  
✅ **Integrate into ClassVideoModule** - Task 3 adds the component to video page  
✅ **Remove hardcoded API** - ChatWidget no longer has internal fetch/API_BASE  
✅ **Use userStore** - Gets userId from Pinia store  
✅ **Course context props** - ChatWidget receives courseId and currentVideo  
✅ **z-index adjusted** - Updated to avoid video player conflicts

### 2. Placeholder scan

✅ No "TBD" or "TODO" except the documented one for sendMessageApi  
✅ All code is complete in every step  
✅ No references to undefined functions/types

### 3. Type consistency

✅ All API function names match across tasks  
✅ Props names are consistent (`courseId`, `currentVideo`)  
✅ Store usage matches project patterns (`useUserStore()`)

---

## Plan Complete!

Plan complete and saved to `docs/superpowers/plans/2026-05-25-chatwidget-integration.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
