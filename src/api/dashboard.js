/*
 * @Date         : 2026-05-08 17:13:24
 * @Description  : 仪表盘相关 API
 * @FilePath     : dashboard.js
 * @LastEditTime : 2026-05-28 19:38:00
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 */
import api from './index'

// 获取我的班级列表
export function getMyClassListApi() {
  return api.get('/user')
}
