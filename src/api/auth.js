/*
 * @Date         : 2026-05-08 16:26:05
 * @Description  :
 * @FilePath     : auth.js
 * @LastEditTime : 2026-05-12
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 */
import api from './index'

export function loginApi(data) {
  return api.post('/auth/login', data).then(response => {
    if (response.code === 200 && response.data) {
      return {
        token: response.data.token.access_token,
        userInfo: response.data.user
      }
    }
    throw new Error(response.message || '登录失败')
  })
}

export function getUserInfoApi() {
  return api.get('/auth/user-info').then(response => {
    if (response.code === 200 && response.data) {
      return response.data.user
    }
    throw new Error(response.message || '获取用户信息失败')
  })
}

export function getUserListApi() {
  return api.get('/user').then(response => {
    if (response.code === 200 && response.data) {
      return response.data
    }
    throw new Error(response.message || '获取用户列表失败')
  })
}

export function addUserApi(data) {
  return api.post('/user', data).then(response => {
    if (response.code === 200) {
      return response
    }
    throw new Error(response.message || '添加用户失败')
  })
}

export function logoutApi() {
  return api.post('/auth/logout').then(response => {
    if (response.code === 200) {
      return response
    }
    throw new Error(response.message || '退出登录失败')
  })
}