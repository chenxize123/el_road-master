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
 * POST /api/conversation/
 * curl -X 'POST' 'http://111.63.183.17:9000/api/conversation/' \
 *   -H 'accept: application/json' \
 *   -H 'Content-Type: application/json' \
 *   -d '{ "title": "string" }'
 */
export function createConversationApi(data) {
  console.log('createConversationApi', data)
  return api.post('/conversation/', data)
}

/**
 * 逻辑删除对话
 * DELETE /api/conversation/?conversation_id={id}
 * curl -X 'DELETE' 'http://111.63.183.17:9000/api/conversation/?conversation_id=1' \
 *   -H 'accept: application/json'
 */
export function deleteConversationApi(conversationId) {
  return api.delete(`/conversation/?conversation_id=${conversationId}`)
}

/**
 * 修改对话
 * PUT /api/conversation/
 * curl -X 'PUT' 'http://111.63.183.17:9000/api/conversation/' \
 *   -H 'accept: application/json' \
 *   -H 'Content-Type: application/json' \
 *   -d '{ "id": 0, "title": "string" }'
 */
export function updateConversationApi(data) {
  return api.put('/conversation/', data)
}

/**
 * 根据用户id获取对话列表
 * GET /api/conversation/user_id?page={page}&page_size={pageSize}
 * curl -X 'GET' 'http://111.63.183.17:9000/api/conversation/user_id?page=12&page_size=12' \
 *   -H 'accept: application/json'
 */
export function getConversationListApi(params) {
  const query = new URLSearchParams(params).toString()
  return api.get(`/conversation/user_id?${query}`)
}

/**
 * 根据对话id获取对话详情
 * GET /api/conversation/id?conversation_id={id}
 * curl -X 'GET' 'http://111.63.183.17:9000/api/conversation/id?conversation_id=2121' \
 *   -H 'accept: application/json'
 */
export function getConversationByIdApi(conversationId) {
  return api.get(`/conversation/id?conversation_id=${conversationId}`)
}

/**
 * 根据对话id获取消息列表（分页）
 * GET /api/v1/message/conversation_id?page={page}&page_size={pageSize}&conversation_id={id}
 * curl -X 'GET' \
 *   'http://111.63.183.17:9000/api/v1/message/conversation_id?page=1&page_size=10&conversation_id=1234' \
 *   -H 'accept: application/json'
 */
export function getConversationMessagesApi(conversationId, page = 1, pageSize = 50) {
  console.log('getConversationMessagesApi', { conversationId, page, pageSize })
  return api.get(`/message/conversation_id?conversation_id=${conversationId}&page=${page}&page_size=${pageSize}`)
}

/**
 * 发送消息（非流式）
 * POST /api/llm/chat
 * curl -X 'POST' 'http://111.63.183.17:9000/api/llm/chat' \
 *   -H 'accept: application/json' \
 *   -H 'Content-Type: application/json' \
 *   -d '{ "conversation_id": 0, "content": "string" }'
 */
export function sendMessageApi(conversationId, content, context = {}) {
  return api.post('/llm/chat', {
    conversation_id: conversationId,
    content: content,
    ...context
  })
}

/**
 * 发送消息（流式）
 * POST /api/v1/llm/chat
 * 返回Response对象，调用者可处理流式数据
 */
export function sendMessageStreamApi(conversationId, content, context = {}) {
  return api.streamPost('/llm/chat', {
    conversation_id: conversationId,
    content: content,
    ...context
  })
}
