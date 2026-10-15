<!--
 * @Date         : 2026-05-15
 * @Description  : 退出登录按钮组件 - 可复用
 * @FilePath     : LogoutButton.vue
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <a-popconfirm
    title="确定要退出登录吗？"
    ok-text="确定"
    cancel-text="取消"
    @confirm="handleLogout"
  >
    <a-button
      type="primary"
      danger
      :loading="loading"
      :disabled="loading"
    >
      <template #icon>
        <logout-outlined />
      </template>
      退出登录
    </a-button>
  </a-popconfirm>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { LogoutOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/store'

const emit = defineEmits(['logout-success'])

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

/**
 * 退出登录处理函数
 * 1. 调用后端退出接口
 * 2. 清空本地状态（Pinia + localStorage）
 * 3. 跳转首页并提示成功
 */
const handleLogout = async () => {
  loading.value = true

  try {
    // 调用后端退出接口（接口不存在时也会继续本地退出）
    await userStore.logout()

    // 提示用户
    message.success('已退出登录')

    // 触发成功回调
    emit('logout-success')

    // 跳转到首页并传递参数表示需要打开登录弹窗
    router.push({ path: '/', query: { showLogin: '1' } })
  } catch (error) {
    // 这里不会触发，因为 store 里已经 catch 了错误
    console.error('退出登录失败:', error)
    message.error(error?.message || '退出登录失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 按钮样式已由 Ant Design Vue 提供，这里可以根据需要自定义 */
</style>
