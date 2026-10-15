<template>
  <!-- 悬浮按钮 -->
  <div v-if="!isOpen" class="chat-fab" @click="openChat" title="AI答疑助手">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  </div>

  <!-- 聊天窗口 -->
  <div v-if="isOpen" class="chat-window">
    <!-- 头部 -->
    <div class="chat-header">
      <div class="chat-header-left">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>AI答疑助手</span>
      </div>
      <div class="chat-header-actions">
        <button class="header-btn" @click="toggleSidebar" title="历史会话">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <button class="header-btn" @click="closeChat" title="关闭">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="chat-body">
      <!-- 左侧历史会话 -->
      <div v-if="showSidebar" class="chat-sidebar">
        <div class="sidebar-header">
          <span>历史会话</span>
          <button class="new-chat-btn" @click="createNewChat" title="新建对话">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新对话
          </button>
        </div>
        <div class="sidebar-list">
          <div
            v-for="conv in conversations"
            :key="conv.id"
            class="sidebar-item"
            :class="{ active: isCurrentConversation(conv.id) }"
            @click="switchConversation(conv)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="sidebar-item-title">{{ conv.title }}</span>
            <button class="delete-btn" @click.stop="deleteConversation(conv.id)" title="删除">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
          <div v-if="conversations.length === 0" class="sidebar-empty">
            暂无历史会话
          </div>
        </div>
      </div>

      <!-- 右侧聊天区域 -->
      <div class="chat-main">
        <!-- 消息列表 -->
        <div class="chat-messages" ref="messagesContainer" @scroll="handleScroll">
          <div v-if="messages.length === 0" class="chat-welcome">
            <div class="welcome-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3>你好，我是AI答疑助手</h3>
            <p>有任何学习上的问题，都可以随时向我提问</p>
            <div class="quick-questions">
              <button v-for="q in quickQuestions" :key="q" class="quick-btn" @click="sendQuickQuestion(q)">{{ q }}</button>
            </div>
          </div>
          <!-- 加载更多提示 -->
          <div v-if="isLoadingMore" class="load-more-indicator">
            <div class="loading-spinner"></div>
            <span>加载更多消息...</span>
          </div>
          <div v-else-if="!hasMore && messages.length > 0" class="load-more-indicator no-more">
            没有更多历史消息了
          </div>
          <div
            v-for="(msg, index) in messages"
            :key="msg.id || index"
            class="message-row"
            :class="msg.role"
          >
            <div class="message-avatar">
              <div v-if="msg.role === 'ai'" class="avatar ai-avatar">AI</div>
              <div v-else class="avatar user-avatar">我</div>
            </div>
            <div class="message-content">
              <div class="message-bubble" :class="msg.role">
                <span v-html="renderMarkdown(msg.content)"></span>
                <span v-if="msg.streaming" class="cursor-blink">|</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="chat-input-area">
          <div class="chat-input-wrapper">
            <textarea
              ref="inputRef"
              v-model="inputText"
              @keydown.enter.exact.prevent="handleSend"
              placeholder="输入你的问题..."
              rows="1"
              :disabled="isLoading"
            ></textarea>
            <button type="button" class="send-btn" @click="handleSend" :disabled="!inputText.trim() || isLoading">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <div class="input-hint">按 Enter 发送，Shift + Enter 换行</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useUserStore } from '@/store'
import {
  createConversationApi,
  deleteConversationApi,
  updateConversationApi,
  getConversationListApi,
  getConversationMessagesApi,
  sendMessageStreamApi
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
const pendingSendKeys = globalThis.__chatWidgetPendingSendKeys || (globalThis.__chatWidgetPendingSendKeys = new Set())

// 分页相关状态
const currentPage = ref(1)
const pageSize = ref(20)
const hasMore = ref(true)
const isLoadingMore = ref(false)
const isFirstLoad = ref(true)
const lastScrollHeight = ref(0)

// User store
const userStore = useUserStore()
const userId = computed(() => userStore.userInfo?.id)

marked.setOptions({
  gfm: true,
  breaks: true
})

// 快捷问题
const quickQuestions = [
  '如何求二次函数的最值？',
  '英语作文怎么提高？',
  '牛顿三大定律是什么？'
]

// 数据映射 - 适配后端返回格式
function getConversationId(item) {
  return item?.id ?? item?.conversation_id ?? item?.conversationId
}

function normalizeConversation(item) {
  const id = getConversationId(item)

  return {
    ...item,
    id,
    title: item.title || '新对话',
  }
}

function normalizeMessage(item) {
  if (typeof item === 'string') {
    return {
      id: `ai-${Date.now()}-${Math.random()}`,
      role: 'ai',
      content: item,
      streaming: false
    }
  }

  if (!item) {
    return {
      id: `message-${Date.now()}-${Math.random()}`,
      role: 'human',
      content: '',
      streaming: false
    }
  }

  const role = normalizeMessageRole(item.role || item.sender || item.type || (item.is_ai ? 'ai' : 'human'))
  const content = item.content ?? item.message ?? item.text ?? item.answer ?? item.question ?? ''

  return {
    ...item,
    id: item.id ?? `${role}-${Date.now()}-${Math.random()}`,
    role,
    content,
    streaming: false
  }
}

function normalizeMessageRole(role) {
  const value = String(role || '').toLowerCase()

  if (['ai', 'assistant', 'bot', 'system'].includes(value)) return 'ai'
  if (['human', 'user', 'student'].includes(value)) return 'human'

  return value || 'human'
}

function dedupeMessages(list) {
  const seenIds = new Set()

  return list.filter((msg, index) => {
    const id = msg.id ?? msg.message_id ?? msg.messageId
    if (id) {
      const idKey = String(id)
      if (seenIds.has(idKey)) return false
      seenIds.add(idKey)
    }

    const prev = list[index - 1]
    return !(prev && prev.role === msg.role && prev.content === msg.content)
  })
}

function extractMessageList(data) {
  if (Array.isArray(data)) return data

  const candidates = [
    data?.messages,
    data?.message_list,
    data?.messageList,
    data?.records,
    data?.list,
    data?.items,
    data?.data,
    data?.conversation?.messages,
    data?.conversation?.message_list
  ]

  return candidates.find(Array.isArray) || []
}

function extractConversationList(data) {
  if (Array.isArray(data)) return data

  const candidates = [
    data?.records,
    data?.list,
    data?.items,
    data?.rows,
    data?.data,
    data?.conversations,
    data?.conversation_list
  ]

  return candidates.find(Array.isArray) || []
}

function isCurrentConversation(conversationId) {
  return String(currentConversationId.value) === String(conversationId)
}

// 会话管理
async function fetchConversations() {
  if (!userId.value) {
    console.warn('用户未登录，无法获取对话列表')
    return
  }

  try {
    const res = await getConversationListApi({ page: 1, page_size: 50 })
    if (res.code === 200) {
      conversations.value = extractConversationList(res.data).map(normalizeConversation)
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
      currentPage.value = 1
      hasMore.value = true
      isFirstLoad.value = true
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

async function switchConversation(conversation) {
  const normalizedConversation = normalizeConversation(
    typeof conversation === 'object' ? conversation : { id: conversation }
  )
  const conversationId = normalizedConversation.id

  if (!conversationId) {
    message.error('会话ID不存在，无法切换')
    return
  }

  if (isCurrentConversation(conversationId)) {
    focusInput()
    return
  }

  currentConversationId.value = conversationId
  messages.value = []
  currentPage.value = 1
  hasMore.value = true
  isFirstLoad.value = true
  await reloadConversationMessages(conversationId, normalizedConversation)
}

async function reloadConversationMessages(conversationId, fallbackConversation = null) {
  try {
    const res = await getConversationMessagesApi(conversationId, currentPage.value, pageSize.value)
    if (res.code === 200) {
      const msgList = extractMessageList(res.data)
      const fallbackMsgList = fallbackConversation ? extractMessageList(fallbackConversation) : []
      const normalizedMessages = dedupeMessages((msgList.length ? msgList : fallbackMsgList).map(normalizeMessage))

      // 接口返回的消息已按展示顺序排列，直接渲染

      if (currentPage.value === 1) {
        messages.value = normalizedMessages
      } else {
        // 加载更多时，新消息插入到前面（历史消息）
        messages.value = dedupeMessages([...normalizedMessages, ...messages.value])
      }

      // 判断是否还有更多数据
      hasMore.value = normalizedMessages.length >= pageSize.value

      await nextTick()

      // 只有第一次加载才滚动到底部
      if (isFirstLoad.value) {
        scrollToBottom()
        isFirstLoad.value = false
      } else {
        // 加载更多时，恢复到之前的滚动位置
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight - lastScrollHeight.value
        }
      }

      focusInput()
    } else {
      throw new Error(res.message || '获取对话详情失败')
    }
  } catch (e) {
    console.error('获取对话详情失败:', e)
    message.error('获取对话详情失败')
  } finally {
    isLoadingMore.value = false
  }
}

async function loadMoreMessages() {
  if (!currentConversationId.value || !hasMore.value || isLoadingMore.value) {
    return
  }

  isLoadingMore.value = true
  currentPage.value += 1

  // 记录当前的滚动高度，加载完成后恢复
  if (messagesContainer.value) {
    lastScrollHeight.value = messagesContainer.value.scrollHeight - messagesContainer.value.scrollTop
  }

  await reloadConversationMessages(currentConversationId.value)
}

function handleScroll(e) {
  const container = e.target
  // 当滚动到顶部时加载更多
  if (container.scrollTop <= 50 && hasMore.value && !isLoadingMore.value) {
    loadMoreMessages()
  }
}

async function deleteConversation(conversationId) {
  try {
    await deleteConversationApi(conversationId)

    if (isCurrentConversation(conversationId)) {
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

  const sendKey = `${currentConversationId.value || 'new'}:${text}`
  if (pendingSendKeys.has(sendKey)) return

  isLoading.value = true
  pendingSendKeys.add(sendKey)

  // 如果没有当前对话，先创建
  if (!currentConversationId.value) {
    await createNewChat()
    if (!currentConversationId.value) {
      pendingSendKeys.delete(sendKey)
      isLoading.value = false
      return
    }
  }

  // 添加用户消息到界面
  const userMessage = { role: 'human', content: text, id: Date.now() }
  messages.value.push(userMessage)
  inputText.value = ''

  // 添加AI消息占位（用于显示流式内容）
  const aiMessageId = Date.now() + 1
  const aiMessage = { role: 'ai', content: '', id: aiMessageId, streaming: true }
  messages.value.push(aiMessage)
  const aiMessageIndex = messages.value.length - 1

  const updateAiMessage = (patch) => {
    const currentMessage = messages.value[aiMessageIndex]
    if (!currentMessage) return

    messages.value.splice(aiMessageIndex, 1, {
      ...currentMessage,
      ...patch
    })
  }

  const appendAiContent = (chunk) => {
    if (!chunk) return
    const currentMessage = messages.value[aiMessageIndex]
    updateAiMessage({
      content: `${currentMessage?.content || ''}${chunk}`
    })
  }

  await nextTick()
  scrollToBottom()

  try {
    // 构建上下文
    const context = {
      course_id: props.courseId,
      video_id: props.currentVideo?.id,
      video_title: props.currentVideo?.title
    }

    // 调用流式发送消息API
    const response = await sendMessageStreamApi(currentConversationId.value, text, context)

    // 处理流式响应
    if (!response.body) {
      const responseText = await response.text()
      updateAiMessage({
        content: extractStreamContent(responseText),
        streaming: false
      })
      // 发送消息后重新从第一页加载
      currentPage.value = 1
      isFirstLoad.value = true
      await reloadConversationMessages(currentConversationId.value)
      await nextTick()
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const contentType = response.headers.get('content-type') || ''
    const usesLineProtocol = /text\/event-stream|application\/x-ndjson|application\/json/.test(contentType)
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const decodedChunk = decoder.decode(value, { stream: true })

      if (!usesLineProtocol) {
        appendAiContent(decodedChunk)
        await nextTick()
        scrollToBottom()
        continue
      }

      buffer += decodedChunk

      // 兼容没有及时换行的 SSE/JSON chunk，能解析就立即显示
      const bufferedChunk = extractStreamContent(buffer, { allowPlainText: false })
      if (bufferedChunk) {
        if (bufferedChunk === '[DONE]') {
          updateAiMessage({ streaming: false })
        } else {
          appendAiContent(bufferedChunk)
          await nextTick()
          scrollToBottom()
        }
        buffer = ''
        continue
      }

      // 兼容标准 SSE(data: ...)、NDJSON
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || '' // 保存未完成的行

      for (const line of lines) {
        const chunk = extractStreamContent(line)
        if (chunk === '[DONE]') {
          aiMessage.streaming = false
          continue
        }

        if (chunk) {
          appendAiContent(chunk)
          await nextTick()
          scrollToBottom()
        }
      }
    }

    const remainingChunk = extractStreamContent(buffer)
    if (remainingChunk && remainingChunk !== '[DONE]') {
      appendAiContent(remainingChunk)
    }

    updateAiMessage({ streaming: false })
    // 发送消息后重新从第一页加载
    currentPage.value = 1
    isFirstLoad.value = true
    await reloadConversationMessages(currentConversationId.value)
    await nextTick()

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
  } catch (e) {
    console.error('发送消息失败:', e)
    // 找到AI消息并更新为错误信息
    const aiMsgIndex = messages.value.findIndex(m => m.id === aiMessageId)
    if (aiMsgIndex !== -1) {
      messages.value.splice(aiMsgIndex, 1, {
        ...messages.value[aiMsgIndex],
        content: e.message || '抱歉，发送失败，请稍后重试。',
        streaming: false
      })
    }
  } finally {
    pendingSendKeys.delete(sendKey)
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

function extractStreamContent(rawLine, options = {}) {
  const { allowPlainText = true } = options
  const line = (rawLine || '').trim()
  if (!line || line.startsWith(':')) return ''

  const payload = line.startsWith('data:') ? line.slice(5).trimStart() : line
  if (!payload) return ''
  if (payload === '[DONE]') return '[DONE]'

  try {
    const data = JSON.parse(payload)
    const candidates = [
      data.content,
      data.answer,
      data.message,
      data.response,
      data.text,
      data.data?.content,
      data.data?.answer,
      data.data?.message,
      data.data?.response,
      data.data?.text,
      data.choices?.[0]?.delta?.content,
      data.choices?.[0]?.message?.content,
      data.data
    ]
    return candidates.find(item => typeof item === 'string') || ''
  } catch (_) {
    return allowPlainText ? payload : ''
  }
}

function renderMarkdown(text) {
  if (!text) return ''
  return DOMPurify.sanitize(marked.parse(text))
}

onMounted(() => {
  // 预加载会话列表
  if (isOpen.value) {
    fetchConversations()
  }
})
</script>

<style scoped>
/* ---- 悬浮按钮 ---- */
.chat-fab {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.4);
  transition: all 0.3s ease;
  z-index: 999;
}

.chat-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 28px rgba(79, 70, 229, 0.55);
}

/* ---- 聊天窗口 ---- */
.chat-window {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 800px;
  height: 600px;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  animation: chatSlideIn 0.25s ease-out;
}

@keyframes chatSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ---- 头部 ---- */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  flex-shrink: 0;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
}

.chat-header-actions {
  display: flex;
  gap: 4px;
}

.header-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* ---- 主体 ---- */
.chat-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ---- 左侧边栏 ---- */
.chat-sidebar {
  width: 240px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 1px solid #4f46e5;
  background: white;
  color: #4f46e5;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  background: #4f46e5;
  color: white;
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 2px;
  color: #475569;
  font-size: 13px;
}

.sidebar-item:hover {
  background: #e2e8f0;
}

.sidebar-item.active {
  background: #ede9fe;
  color: #4f46e5;
  font-weight: 500;
}

.sidebar-item-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s;
}

.sidebar-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #ef4444;
  background: #fee2e2;
}

.sidebar-empty {
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
  padding: 32px 16px;
}

/* ---- 聊天主区域 ---- */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ---- 消息列表 ---- */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;
}

/* ---- 加载更多提示 ---- */
.load-more-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  color: #94a3b8;
  font-size: 13px;
  margin-bottom: 12px;
}

.load-more-indicator.no-more {
  opacity: 0.6;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #64748b;
}

.welcome-icon {
  margin-bottom: 16px;
}

.chat-welcome h3 {
  font-size: 18px;
  color: #1e293b;
  margin-bottom: 8px;
  font-weight: 600;
}

.chat-welcome p {
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 24px;
}

.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-width: 400px;
}

.quick-btn {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: #4f46e5;
  transition: all 0.2s;
}

.quick-btn:hover {
  background: #ede9fe;
  border-color: #c4b5fd;
}

/* ---- 消息气泡 ---- */
.message-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-row.human {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.ai-avatar {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
}

.user-avatar {
  background: #f1f5f9;
  color: #475569;
}

.message-content {
  max-width: 70%;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.message-bubble.human {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-bubble.ai {
  background: #f1f5f9;
  color: #1e293b;
  border-bottom-left-radius: 4px;
}

.message-bubble.ai :deep(code) {
  background: #e2e8f0;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
}

.message-bubble.ai :deep(pre) {
  background: #1e293b;
  color: #e2e8f0;
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-bubble.ai :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
  font-size: 13px;
}

/* Markdown styles */
.message-bubble.ai :deep(p) {
  margin: 0 0 8px;
}

.message-bubble.ai :deep(p:last-child) {
  margin-bottom: 0;
}

.message-bubble.ai :deep(ul),
.message-bubble.ai :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

/* Markdown styles */
.message-bubble.ai :deep(h2),
.message-bubble.ai :deep(h3),
.message-bubble.ai :deep(h4) {
  margin: 12px 0 6px 0;
  font-weight: 600;
}

.message-bubble.ai :deep(h2) {
  font-size: 18px;
}

.message-bubble.ai :deep(h3) {
  font-size: 16px;
}

.message-bubble.ai :deep(h4) {
  font-size: 14px;
}

.message-bubble.ai :deep(em) {
  font-style: italic;
}

.message-bubble.ai :deep(del) {
  text-decoration: line-through;
}

.message-bubble.ai :deep(li) {
  margin: 4px 0;
  padding-left: 4px;
}

.message-bubble.ai :deep(blockquote) {
  border-left: 3px solid #4f46e5;
  padding-left: 12px;
  margin: 8px 0;
  color: #64748b;
  font-style: italic;
}

.message-bubble.ai :deep(a) {
  color: #4f46e5;
  text-decoration: underline;
}

.cursor-blink {
  animation: blink 0.8s infinite;
  color: #4f46e5;
  font-weight: bold;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ---- 输入区域 ---- */
.chat-input-area {
  padding: 12px 20px 16px;
  border-top: 1px solid #e2e8f0;
  background: white;
  flex-shrink: 0;
}

.chat-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px 12px;
  transition: border-color 0.2s;
}

.chat-input-wrapper:focus-within {
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
}

.chat-input-wrapper textarea {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  max-height: 120px;
  font-family: inherit;
  color: #1e293b;
}

.chat-input-wrapper textarea::placeholder {
  color: #94a3b8;
}

.chat-input-wrapper textarea:disabled {
  opacity: 0.6;
}

.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.input-hint {
  font-size: 11px;
  color: #cbd5e1;
  margin-top: 6px;
  padding-left: 4px;
}

/* ---- 响应式 ---- */
@media (max-width: 860px) {
  .chat-window {
    width: calc(100vw - 16px);
    height: calc(100vh - 16px);
    bottom: 8px;
    right: 8px;
    border-radius: 12px;
  }

  .chat-sidebar {
    width: 200px;
  }
}

@media (max-width: 600px) {
  .chat-sidebar {
    display: none;
  }

  .chat-window {
    width: 100vw;
    height: 100vh;
    bottom: 0;
    right: 0;
    border-radius: 0;
  }

  .chat-fab {
    bottom: 20px;
    right: 20px;
    width: 52px;
    height: 52px;
  }
}
</style>
