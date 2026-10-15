# ChatWidget 集成设计文档

**日期**: 2026-05-25
**版本**: V1.0.0

## 概述

将 `ChatWidget.vue` 组件集成到班级视频播放模块中，为学生提供AI答疑助手功能。

## 目标

- 只在学生观看视频页面（ClassVideoModule）显示ChatWidget
- 复用项目现有API封装和用户状态管理
- 遵循项目代码风格和架构模式

## 项目现有架构参考

### API层
- `src/api/index.js` - 统一ApiService类，处理token注入、请求超时、响应解析等
- 其他API模块（如`course.js`）使用此service

### 状态管理
- `src/store/user.js` - 用户信息和token管理

### 路由
- `/class/detail/:classId` - 班级详情页，包含video标签页

### 目标页面
- `src/views/class/ClassDetail.vue` - 班级详情主页面
- `src/components/class/modules/ClassVideoModule.vue` - 视频播放模块（集成位置）

## 设计方案

### 1. 新建 `src/api/conversation.js`

封装对话相关5个API接口，复用项目统一ApiService：

```javascript
import api from '@/api'

/**
 * 创建对话
 * POST /api/v1/conversation/
 */
export function createConversationApi(data) {
  return api.post('/v1/conversation/', data)
}

/**
 * 逻辑删除对话
 * DELETE /api/v1/conversation/?conversation_id={id}
 */
export function deleteConversationApi(conversationId) {
  return api.delete(`/v1/conversation/?conversation_id=${conversationId}`)
}

/**
 * 修改对话
 * PUT /api/v1/conversation/
 */
export function updateConversationApi(data) {
  return api.put('/v1/conversation/', data)
}

/**
 * 根据用户id获取对话列表
 * GET /api/v1/conversation/user_id?page={page}&page_size={pageSize}
 */
export function getConversationListApi(params) {
  const query = new URLSearchParams(params).toString()
  return api.get(`/v1/conversation/user_id?${query}`)
}

/**
 * 根据对话id获取对话详情
 * GET /api/v1/conversation/id?conversation_id={id}
 */
export function getConversationByIdApi(conversationId) {
  return api.get(`/v1/conversation/id?conversation_id=${conversationId}`)
}

/**
 * TODO: 发送消息接口 - 待后端提供
 */
export function sendMessageApi(conversationId, content, context = {}) {
  console.warn('发送消息接口尚未实现', { conversationId, content, context })
  return Promise.reject(new Error('发送消息接口待后端提供'))
}
```

### 2. 移动并改造 `ChatWidget.vue`

#### 文件位置
从 `src/dayi-fronted/src/components/ChatWidget.vue` 移动到 `src/components/ChatWidget.vue`

#### 主要改动

1. **移除内部API实现**
   - 删除 `API_BASE` 常量
   - 删除 `apiFetch` 函数

2. **引入项目API和Store**
   ```javascript
   import { ref, nextTick, onMounted, computed } from 'vue'
   import { useUserStore } from '@/store'
   import {
     createConversationApi,
     deleteConversationApi,
     updateConversationApi,
     getConversationListApi,
     getConversationByIdApi,
     sendMessageApi
   } from '@/api/conversation'
   ```

3. **获取用户ID**
   ```javascript
   const userStore = useUserStore()
   const userId = computed(() => userStore.userInfo?.id)
   ```

4. **添加Props接收课程上下文**
   ```javascript
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
   ```

5. **移除流式处理，改为普通请求**
   - 移除SSE相关代码
   - `handleSend` 改为调用 `sendMessageApi`

6. **调整z-index**
   - `.chat-fab`: `z-index: 999`
   - `.chat-window`: `z-index: 1000`
   - 确保不遮挡视频播放器全屏模式

7. **数据映射适配**
   - 添加数据映射函数处理后端返回字段
   - 假设响应格式为 `{ code: 200, message: 'success', data: ... }`

### 3. 在 `ClassVideoModule.vue` 中集成

#### 引入组件
```javascript
import ChatWidget from '@/components/ChatWidget.vue'
```

#### 在模板中添加
```vue
<template>
  <div class="class-video-module">
    <!-- 现有内容... -->
    
    <!-- ChatWidget 放在末尾 -->
    <ChatWidget 
      :course-id="courseId"
      :current-video="currentVideo"
    />
  </div>
</template>
```

## 数据流

```
ClassVideoModule (提供courseId, currentVideo)
    ↓
ChatWidget (接收props, 管理对话状态)
    ↓
conversation.js (API封装)
    ↓
api/index.js (统一请求处理, token注入, JSONbig解析)
    ↓
后端接口
```

## 文件清单

### 新增/修改文件
1. **新建** `src/api/conversation.js` - 对话API封装
2. **移动+修改** `src/components/ChatWidget.vue` - 改造后的聊天组件
3. **修改** `src/components/class/modules/ClassVideoModule.vue` - 集成ChatWidget

### 不修改文件
- 其他现有组件、API、Store保持不变

## 待确定事项

- [ ] 发送消息的后端接口地址和格式
- [ ] 对话和消息的完整数据结构字段
- [ ] 接口响应的具体格式确认
- [ ] 是否需要在发送消息时传递课程上下文参数

## 后续优化方向

1. 待消息接口确定后完善发送功能
2. 可考虑提取 `useConversation.js` composable 便于复用
3. 可添加对话消息本地缓存优化体验
