<template>
  <div class="not-found-container">
    <a-result
      status="404"
      title="404"
      sub-title="抱歉，您访问的页面不存在。"
    >
      <template #extra>
        <a-space direction="vertical" style="align-items: center">
          <a-button type="primary" @click="goHome">
            返回首页
          </a-button>
          <a-button @click="goBack">
            返回上一页
          </a-button>
          <a-button @click="refreshPage">
            刷新页面
          </a-button>
        </a-space>
      </template>
    </a-result>

    <div class="help-section">
      <a-card>
        <a-typography-title :level="4">常见页面</a-typography-title>
        <a-row :gutter="16">
          <a-col :span="6" v-for="page in quickPages" :key="page.path">
            <a-button block @click="navigateTo(page.path)">
              {{ page.name }}
            </a-button>
          </a-col>
        </a-row>
      </a-card>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const quickPages = [
  { name: '首页', path: '/' },
  { name: '关于', path: '/about' },
  { name: '功能演示', path: '/demo' },
  { name: '登录', path: '/login' }
]

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}

const refreshPage = () => {
  window.location.reload()
}

const navigateTo = (path) => {
  router.push(path)
}
</script>

<style scoped>
.not-found-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
}

.help-section {
  margin-top: 48px;
  width: 100%;
  max-width: 600px;
}

@media screen and (max-width: 768px) {
  .not-found-container {
    padding: 24px 16px;
  }

  .help-section {
    margin-top: 32px;
    padding: 0 16px;
  }

  .help-section .ant-row {
    gap: 8px;
  }
}
</style>