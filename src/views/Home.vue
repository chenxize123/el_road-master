<!--
 * @Date         : 2026-05-08 16:15:57
 * @Description  : 
 * @FilePath     : Home.vue
 * @LastEditTime : 2026-05-08 16:29:52
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved. 
 * 2026-05-08 16:15:57
-->
<template>
  <div class="home-page">
    <div class="overlay"></div>

    <main class="hero">
      <div class="brand">
        <img src="@/assets/images/ziluw.png" alt="logo" />
      </div>

      <section class="hero-content">
        <p class="welcome">WELCOME TO THE SMART TEACHING<br />ASSISTANT SYSTEM</p>

        <h1 class="title">
          大模型智慧助教系统子路
        </h1>

        <div class="actions">
          <a-button class="pill-button" @click="loginVisible = true">
            登录使用
          </a-button>

          <a-button
            class="pill-button"
            :loading="guestLoading"
            @click="handleGuestPreview"
          >
            游客预览
          </a-button>

          <a-button class="pill-button" @click="videoVisible = true">
            使用帮助
          </a-button>

          <a-button type="link" class="manual-link" @click="handleDownloadVideo">
            点击下载使用视频
          </a-button>
        </div>
      </section>

      <section class="feature-list">
        <div
          v-for="item in features"
          :key="item.title"
          class="feature-card"
        >
          <h3>{{ item.title }}</h3>
        </div>
      </section>
    </main>

    <LoginModal
      v-model:open="loginVisible"
      @success="handleLoginSuccess"
    />

    <TutorialVideoModal v-model:open="videoVisible" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { useUserStore } from '@/store'
import LoginModal from '@/components/auth/LoginModal.vue'
import TutorialVideoModal from '@/components/common/TutorialVideoModal.vue'

const router = useRouter()
const route = useRoute()

const loginVisible = ref(false)
const guestLoading = ref(false)
const videoVisible = ref(false)
const userStore = useUserStore()

// 检测 URL 参数是否需要自动打开登录弹窗
onMounted(() => {
  if (route.query.showLogin === '1') {
    loginVisible.value = true
    // 清除 URL 参数避免刷新后再次打开
    router.replace({ path: '/', query: {} })
  }
})


const features = [
  { title: '大模型知识点抽取' },
  { title: '自动生成课程视频' },
  { title: '大模型出题、阅卷与报告生成' },
  { title: '大模型辅助实验评价' },
  { title: '课程赋能课题研究' },
  { title: '就业推荐与咨询指导' },
  { title: '讨论区与助教答疑' },
  { title: '专业知识图谱' }
]

/**
 * 登录成功回调（LoginModal 已处理跳转，这里可以做额外处理）
 */
const handleLoginSuccess = data => {
  console.log('登录成功返回数据：', data)
}

const handleDownloadVideo = () => {
  const link = document.createElement('a')
  link.href = '/videos/tutorial.mp4'
  link.download = '大模型智慧助教系统-使用教程.mp4'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleGuestPreview = async () => {
  guestLoading.value = true

  try {
    await userStore.login({
      username: 'visitor',
      password: 'visitor'
    })

    message.success('登录成功')
    router.push('/teacher')
  } catch (error) {
    message.error(error?.message || '登录失败，请检查账号或密码')
  } finally {
    guestLoading.value = false
  }
}

</script>

<style scoped>
.home-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: #fff;
  background:
    linear-gradient(rgba(17, 44, 78, 0.72), rgba(17, 44, 78, 0.72)),
    url('@/assets/images/bg.jpg') center / cover no-repeat;
}

.brand img {
  width: 72px;
  height: auto;
  display: block;
}
/* 如果暂时没有 src/assets/home-bg.png，可以先改成下面这行兜底背景 */
/* background: linear-gradient(135deg, #102747, #233f5f); */

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(6, 18, 36, 0.28);
  z-index: 1;
}

.hero {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  box-sizing: border-box;
  padding: 32px 4.7vw 26px;
  display: flex;
  flex-direction: column;
}

.brand {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 4px;
  margin-bottom: 48px;
}

.hero-content {
  max-width: 680px;
}

.welcome {
  margin: 0 0 20px;
  font-size: 16px;
  line-height: 1.25;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.title {
  margin: 0;
  max-width: 650px;
  font-size: clamp(56px, 5.2vw, 82px);
  line-height: 1;
  font-weight: 500;
  letter-spacing: 2px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 24px;
  flex-wrap: wrap;
}

.pill-button {
  min-width: 98px;
  height: 42px;
  padding: 0 22px;
  border: none;
  border-radius: 999px;
  background: #000;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.pill-button:hover {
  background: #111 !important;
  color: #fff !important;
  transform: translateY(-2px);
}

.logout-btn {
  background: #ff4d4f;
}

.logout-btn:hover {
  background: #ff7875 !important;
}

.manual-link {
  color: #e9f6ff;
  font-size: 14px;
  font-weight: 600;
  padding: 0;
}

.manual-link:hover {
  color: #fff !important;
}

.feature-list {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 26px;
  padding-top: 32px;
}

.feature-card {
  min-height: 94px;
  padding: 18px 22px;
  border-radius: 28px;
  background: rgba(17, 31, 48, 0.68);
  box-shadow:
    0 0 18px rgba(255, 255, 255, 0.58),
    inset 0 0 20px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.feature-card:hover {
  transform: translateY(-6px);
  box-shadow:
    0 0 28px rgba(255, 255, 255, 0.8),
    inset 0 0 22px rgba(255, 255, 255, 0.12);
}

.feature-card h3 {
  margin: 0;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
}

@media screen and (max-width: 1024px) {
  .feature-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
  }
}

@media screen and (max-width: 900px) {
  .feature-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
  }
}

@media screen and (max-width: 768px) {
  .home-page {
    overflow-x: hidden;
  }

  .hero {
    min-height: auto;
    padding: 28px 24px 40px;
    display: block;
  }

  .brand {
    margin-bottom: 48px;
  }

  .brand img {
    width: 58px;
  }

  .hero-content {
    min-height: calc(100vh - 68px);
    display: flex;
    flex-direction: column;
  }

  .welcome {
    font-size: 14px;
    line-height: 1.35;
    margin-bottom: 22px;
  }

  .title {
    font-size: clamp(44px, 15vw, 64px);
    line-height: 1.05;
  }

  .actions {
    margin-top: 24px;
    padding-bottom: 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .pill-button {
    width: 100%;
    height: 56px;
    font-size: 17px;
  }

  .manual-link {
    grid-column: 1 / -1;
    justify-self: center;
  }

  .feature-list {
    min-height: auto;
    padding: 48px 0 0;
    margin-top: 40px;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .feature-card {
    min-height: 92px;
    border-radius: 24px;
    padding: 18px 16px;
  }
}

@media screen and (max-width: 480px) {
  .actions {
    grid-template-columns: 1fr;
  }

  .manual-link {
    display: none;
  }

  .feature-list {
    grid-template-columns: 1fr;
    padding: 48px 0 0;
    margin-top: 0;
    min-height: auto;
  }
}
</style>