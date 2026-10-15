/*
 * @Date         : 2026-06-12
 * @Description  : 角色管理 API
 * @FilePath     : role.js
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 */
import api from './index'

/**
 * 获取所有角色列表
 */
export function getRoleListApi() {
  return api.get('/role/')
}
