/*
 * @Date         : 2026-05-28
 * @Description  : 用户管理 API
 * @FilePath     : user.js
 * @LastEditTime : 2026-05-28 19:56:21
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 */
import api from './index'

/**
 * 获取用户列表
 * @param {Object} params - 分页参数 { page, page_size }
 * @param {Object} body - 查询条件
 */
export function getUserListApi(params = {}, body = {}) {
  console.log('getUserListApi', params, body)
  let url = '/user/self'
  const queryParts = []
  if (params.page !== undefined && params.page !== null) {
    queryParts.push(`page=${params.page}`)
  }
  if (params.page_size !== undefined && params.page_size !== null) {
    queryParts.push(`page_size=${params.page_size}`)
  }
  if (queryParts.length > 0) {
    url += '?' + queryParts.join('&')
  }
  return api.post(url, body)
}

/**
 * 获取用户总数
 * @param {Object} body - 查询条件 { id, username, real_name, mobile, email, user_type, is_disabled, is_deleted }
 */
export function getUserCountApi(body = {}) {
  console.log('getUserCountApi', body)
  return api.post('/user/count', body)
}

/**
 * 删除用户
 */
export function deleteUserApi(user_id) {
  return api.delete(`/user/?user_id=${user_id}`)
}

/**
 * 更新用户
 */
export function updateUserApi(userData) {
  console.log('updateUserApi', userData)
  return api.put('/user/', userData)
}

/**
 * 创建用户
 */
export function createUserApi(userData) {
  return api.post('/user/', userData)
}
