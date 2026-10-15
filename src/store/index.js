/**
 * Pinia Store 配置文件
 */

import { createPinia } from 'pinia'
import { useUserStore } from './user'
import { usePermissionStore } from './permission'

// 创建 Pinia 实例
const pinia = createPinia()

export {
  useUserStore,
  usePermissionStore
}

export default pinia