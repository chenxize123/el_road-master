<template>
  <div v-if="hasPermission">
    <slot />
  </div>
  <div v-else class="permission-denied">
    <a-result
      status="403"
      title="无权限访问"
      sub-title="抱歉，您没有访问此内容的权限。"
    >
      <template #extra>
        <a-button type="primary" @click="$emit('retry')">
          重新检查
        </a-button>
      </template>
    </a-result>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '../store/user'

const props = defineProps({
  permission: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['retry'])

const userStore = useUserStore()

const hasPermission = computed(() => {
  // 管理员拥有所有权限
  if (userStore.role === 'admin') return true

  // 如果有指定角色，检查角色匹配
  if (props.role) {
    return userStore.role === props.role
  }

  // 检查具体权限
  return userStore.permissions.includes(props.permission)
})
</script>

<style scoped>
.permission-denied {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}
</style>