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
            :class="{ active: currentConversationId === conv.id }"
            @click="switchConversation(conv.id)"
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
        <div class="chat-messages" ref="messagesContainer">
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
          <div
            v-for="(msg, index) in messages"
            :key="index"
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
              @keydown.enter.exact="handleSend"
              placeholder="输入你的问题..."
              rows="1"
              :disabled="isStreaming"
            ></textarea>
            <button class="send-btn" @click="handleSend" :disabled="!inputText.trim() || isStreaming">
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
import { ref, nextTick, onMounted } from 'vue'

const isOpen = ref(false)
const showSidebar = ref(true)
const conversations = ref([])
const currentConversationId = ref(null)
const messages = ref([])
const inputText = ref('')
const isStreaming = ref(false)
const messagesContainer = ref(null)
const inputRef = ref(null)

const quickQuestions = [
  '如何求二次函数的最值？',
  '英语作文怎么提高？',
  '牛顿三大定律是什么？',
]

// ---- API 调用 ----

const API_BASE = '/api'

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }
  return res.json()
}

// ---- 会话管理 ----

async function fetchConversations() {
  try {
    const res = await apiFetch('/conversations')
    if (res.success) {
      conversations.value = res.data
    }
  } catch (e) {
    console.error('获取会话列表失败', e)
  }
}

async function createNewChat() {
  try {
    const res = await apiFetch('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: '新对话' }),
    })
    if (res.success) {
      currentConversationId.value = res.data.id
      messages.value = []
      await fetchConversations()
      focusInput()
    }
  } catch (e) {
    console.error('创建对话失败', e)
  }
}

async function switchConversation(id) {
  if (id === currentConversationId.value) return
  currentConversationId.value = id
  messages.value = []
  try {
    const res = await apiFetch(`/conversations/${id}/messages`)
    if (res.success) {
      messages.value = res.data.map((m) => ({
        role: m.role,
        content: m.content,
        streaming: false,
      }))
      await nextTick()
      scrollToBottom()
    }
  } catch (e) {
    console.error('获取消息失败', e)
  }
}

async function deleteConversation(id) {
  try {
    await apiFetch(`/conversations/${id}`, { method: 'DELETE' })
    if (currentConversationId.value === id) {
      currentConversationId.value = null
      messages.value = []
    }
    await fetchConversations()
  } catch (e) {
    console.error('删除对话失败', e)
  }
}

// ---- 发送消息 & 流式接收 ----

async function handleSend(e) {
  if (e && 'shiftKey' in e && e.shiftKey) return
  if (e && 'preventDefault' in e) e.preventDefault()

  const text = inputText.value.trim()
  if (!text || isStreaming.value) return

  // 如果没有当前对话，先创建
  if (!currentConversationId.value) {
    await createNewChat()
    if (!currentConversationId.value) return
  }

  // 添加用户消息到界面
  messages.value.push({ role: 'human', content: text })
  inputText.value = ''
  isStreaming.value = true

  // 添加 AI 消息占位
  const aiMessage = { role: 'ai', content: '', streaming: true }
  messages.value.push(aiMessage)

  await nextTick()
  scrollToBottom()

  try {
    const res = await fetch(`${API_BASE}/conversations/${currentConversationId.value}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })

    if (!res.ok || !res.body) {
      throw new Error('流式请求失败')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // 解析 SSE 数据
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            aiMessage.streaming = false
            break
          }
          if (data.startsWith('[ERROR]')) {
            aiMessage.content += data
            aiMessage.streaming = false
            break
          }
          aiMessage.content += data
          await nextTick()
          scrollToBottom()
        }
      }
    }

    aiMessage.streaming = false

    // 如果是第一条消息，用用户消息内容更新会话标题
    if (messages.value.filter(m => m.role === 'human').length === 1) {
      const title = text.slice(0, 20) + (text.length > 20 ? '...' : '')
      try {
        await apiFetch(`/conversations/${currentConversationId.value}`, {
          method: 'PATCH',
          body: JSON.stringify({ title }),
        })
        await fetchConversations()
      } catch (_) {}
    }
  } catch (e) {
    console.error('发送消息失败', e)
    aiMessage.content = '抱歉，发送失败，请重试。'
    aiMessage.streaming = false
  } finally {
    isStreaming.value = false
    focusInput()
  }
}

function sendQuickQuestion(q) {
  inputText.value = q
  handleSend()
}

// ---- UI 辅助 ----

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
  // 简单的 markdown 渲染：换行、加粗、代码块
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
  z-index: 9999;
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
  z-index: 10000;
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
