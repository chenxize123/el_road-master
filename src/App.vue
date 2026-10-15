<template>
  <div ref="appRoot" class="app-root">
    <router-view />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useUserStore } from '@/store'
import {
  VISITOR_DELETE_NO_PERMISSION_MESSAGE,
  shouldBlockVisitorDeleteClick,
  updateVisitorDeleteButtonStyles
} from '@/utils/visitorDeleteGuard'

const userStore = useUserStore()
const appRoot = ref(null)
let deleteButtonObserver = null

const handleVisitorDeleteClick = event => {
  if (!shouldBlockVisitorDeleteClick(event.target, userStore.userInfo)) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation?.()
  message.warning(VISITOR_DELETE_NO_PERMISSION_MESSAGE)
}

const refreshVisitorDeleteButtonStyles = () => {
  updateVisitorDeleteButtonStyles(appRoot.value || document, userStore.userInfo)
}

onMounted(() => {
  document.addEventListener('click', handleVisitorDeleteClick, true)
  refreshVisitorDeleteButtonStyles()

  deleteButtonObserver = new MutationObserver(() => {
    refreshVisitorDeleteButtonStyles()
  })
  deleteButtonObserver.observe(appRoot.value || document.body, {
    childList: true,
    subtree: true
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleVisitorDeleteClick, true)
  deleteButtonObserver?.disconnect()
  deleteButtonObserver = null
})

watch(
  () => userStore.userInfo?.user_type,
  async () => {
    await nextTick()
    refreshVisitorDeleteButtonStyles()
  }
)
</script>

<style>
.visitor-delete-button-muted,
.visitor-delete-button-muted:hover,
.visitor-delete-button-muted:focus {
  color: #8c8c8c !important;
  border-color: #d9d9d9 !important;
  background: #f5f5f5 !important;
  box-shadow: none !important;
  cursor: not-allowed !important;
}

.visitor-delete-button-muted [data-icon="delete"],
.visitor-delete-button-muted .anticon {
  color: #8c8c8c !important;
}
</style>
