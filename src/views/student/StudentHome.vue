<!--
 * @Date         : 2026-05-08 17:18:31
 * @Description  :
 * @FilePath     : StudentHome.vue
 * @LastEditTime : 2026-05-08 19:57:55
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 * 2026-05-08 17:18:31
-->
<template>
  <div class="role-home-page">

    <a-page-header title="学生首页" :sub-title="welcomeText">
      <template #extra>
        <a-space>
          <a-button @click="goToResourceRecommendation">
            <template #icon>
              <BookOutlined />
            </template>
            教学资源推荐
          </a-button>
          <a-tooltip title="只有在燕山大学校园网环境下才可使用此功能">
            <span class="employment-tooltip-trigger">
              <a-button
                class="employment-button"
                @click="goToEmploymentRecommendation"
              >
                <template #icon>
                  <RocketOutlined />
                </template>
                就业推荐
              </a-button>
            </span>
          </a-tooltip>
          <a-button type="primary" @click="goToProfile">
            个人资料
          </a-button>
          <logout-button />
        </a-space>
      </template>
    </a-page-header>
    <DashboardBanner />
    <ClassList
      user-role="student"
      :class-list="classList"
      :loading="loading"
      title="我的班级"
      :show-create-button="false"
      action-button-text="进入班级"
      :show-teacher="true"
      @enter-class="enterClass"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { BookOutlined, RocketOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/store'
import { useRouter } from 'vue-router'
import { getStudentClassListApi } from '@/api/class'
import { enrichClassListStats, extractClassListFromResponse } from '@/utils/classStats'
import { openEmploymentRecommendation } from '@/utils/employmentRecommendation'
import ClassList from '@/components/class/ClassList.vue'
import DashboardBanner from '@/components/common/DashboardBanner.vue'
import LogoutButton from '@/components/common/LogoutButton.vue'

const userStore = useUserStore()
const router = useRouter()

const loading = ref(false)
const classList = ref([])

const welcomeText = computed(() => {
  const user = userStore.userInfo || {}
  return `欢迎回来，${user.nickname || user.username || '同学'}`
})

/**
 * 学生获取自己加入的班级列表
 * 调用接口: GET {VITE_API_BASE_URL}/class/user_id?page=1&page_size=1
 */
const fetchData = async () => {
  loading.value = true

  try {
    // 学生调用专用接口获取自己加入的班级
    const res = await getStudentClassListApi({
      page: 1,
      page_size: 10
    })

    // 提取原始班级列表
    const rawClassList = extractClassListFromResponse(res)

    // 补充统计数据
    const enrichedList = await enrichClassListStats(rawClassList)

    // 更新班级列表
    classList.value = enrichedList
  } catch (error) {
    console.error('获取班级列表失败:', error)
    message.error(error?.message || '班级数据加载失败')
    classList.value = []
  } finally {
    loading.value = false
  }
}

// 进入班级详情页
const enterClass = record => {
  router.push(`/class/detail/${record.id}`)
}

const goToProfile = () => {
  router.push('/profile')
}

const goToResourceRecommendation = () => {
  router.push('/resource-recommendation')
}

const goToEmploymentRecommendation = () => {
  openEmploymentRecommendation({
    studentId: userStore.userInfo?.username
  })
}

onMounted(fetchData)
</script>

<style scoped>
.role-home-page {
  min-height: 100vh;
  padding: 32px;
  background: #f5f7fb;
}

.panel-card {
  margin-top: 16px;
  border-radius: 16px;
}

.employment-button {
  height: 36px;
  min-width: 138px;
  padding: 0 18px;
  border: 0;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  background: linear-gradient(135deg, #1677ff 0%, #28c7a7 100%);
  box-shadow: 0 8px 18px rgba(22, 119, 255, 0.22);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.employment-tooltip-trigger {
  display: inline-flex;
}

.employment-button:hover,
.employment-button:focus {
  color: #fff;
  background: linear-gradient(135deg, #2f86ff 0%, #32d6b5 100%);
  box-shadow: 0 10px 22px rgba(22, 119, 255, 0.3);
  transform: translateY(-1px);
  filter: saturate(1.05);
}

.employment-button:active {
  color: #fff;
  transform: translateY(0);
  box-shadow: 0 6px 14px rgba(22, 119, 255, 0.22);
}

.employment-button:disabled {
  color: #fff;
  background: linear-gradient(135deg, #1677ff 0%, #28c7a7 100%);
  box-shadow: 0 8px 18px rgba(22, 119, 255, 0.18);
  cursor: wait;
  opacity: 0.82;
}

/* 平板端 */
@media screen and (max-width: 900px) {
  .role-home-page {
    padding: 24px;
  }
}

/* 手机端 */
@media screen and (max-width: 768px) {
  .role-home-page {
    padding: 16px;
  }

  .panel-card {
    margin-top: 12px;
    border-radius: 12px;
  }

}

/* 小屏手机 */
@media screen and (max-width: 480px) {
  .role-home-page {
    padding: 12px;
  }
}
</style>
