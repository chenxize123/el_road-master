<template>
  <div class="forbidden-container">
    <a-result
      status="403"
      title="403"
      sub-title="抱歉，您没有访问此页面的权限。"
    >
      <template #extra>
        <a-space direction="vertical" style="align-items: center">
          <a-button type="primary" @click="goHome">
            返回首页
          </a-button>
          <a-button @click="goBack">
            返回上一页
          </a-button>
        </a-space>
      </template>
    </a-result>

    <div class="info-section">
      <a-card>
        <a-typography-title :level="4">权限说明</a-typography-title>
        <a-list>
          <a-list-item v-for="item in permissionInfo" :key="item.permission">
            <a-list-item-meta
              :title="item.title"
              :description="`权限代码: ${item.permission}`"
            />
          </a-list-item>
        </a-list>
      </a-card>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const permissionInfo = [
  { title: '管理员', permission: 'admin' },
  { title: '读取权限', permission: 'read' },
  { title: '写入权限', permission: 'write' },
  { title: '删除权限', permission: 'delete' },
  { title: '管理权限', permission: 'manage' }
]

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}
</script>

<style scoped>
.forbidden-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
}

.info-section {
  margin-top: 48px;
  width: 100%;
  max-width: 800px;
}

@media screen and (max-width: 768px) {
  .forbidden-container {
    padding: 24px 16px;
  }

  .info-section {
    margin-top: 32px;
    padding: 0 16px;
  }
}
</style>