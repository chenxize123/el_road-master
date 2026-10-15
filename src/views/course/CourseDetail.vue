<!--
 * @Date         : 2026-05-13 14:30:00
 * @Description  : 课程详情页面 - 包含基本信息、课程视频、知识图谱等功能模块
 * @FilePath     : CourseDetail.vue
 * @LastEditTime : 2026-05-19 15:43:27
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="course-detail-page">
    <!-- 页面头部 -->
    <a-page-header
      :title="courseInfo?.title || '课程详情'"
      :sub-title="courseInfo?.description"
      @back="goBack"
      class="page-header"
    >
      <template #extra>
        <a-space>
          <a-button @click="handleEdit">
            <template #icon><edit-outlined /></template>
            编辑课程
          </a-button>
          <a-button type="primary" @click="handleShare">
            <template #icon><share-alt-outlined /></template>
            分享课程
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <!-- 主要内容区域 -->
    <div class="course-content">
      <!-- 课程基本信息头部 -->
      <CourseHeader
        v-if="courseInfo"
        :course-info="courseInfo"
        :loading="loading"
        @cover-uploaded="handleCoverUploaded"
      />

      <!-- 功能导航标签页 -->
      <CourseTabs
        v-model:active-tab="activeTab"
        :course-id="route.params.id"
        class="course-tabs"
      >
        <!-- 基本信息模块 -->
        <template #basic>
          <BasicInfoModule
            :course-id="route.params.id"
            :course-info="courseInfo"
            :loading="loading"
          />
        </template>

        <!-- 课程视频模块 -->
        <template #video>
          <VideoModule
            :course-id="route.params.id"
            :loading="loading"
          />
        </template>

        <!-- 知识图谱模块 -->
        <template #knowledge-graph>
          <KnowledgeGraphModule
            :course-id="route.params.id"
            :loading="loading"
          />
        </template>

        <!-- 课程教案模块 -->
        <template #lesson-plan>
          <LessonPlanModule
            :course-id="route.params.id"
            :course-info="courseInfo"
            :loading="loading"
          />
        </template>

        <!-- 课程管理模块 -->
        <template #management>
          <ManagementModule
            :course-id="route.params.id"
            :course-info="courseInfo"
            :loading="loading"
          />
        </template>

        <!-- 题库模块 -->
        <template #question-bank>
          <QuestionBankModule
            :course-id="route.params.id"
          />
        </template>

        <!-- 试卷模块 -->
        <template #exam-paper>
          <ExamPaperModule
            :course-id="route.params.id"
          />
        </template>

        <!-- 考试模块 -->
        <template #exam>
          <ExamModule
            :course-id="route.params.id"
          />
        </template>
      </CourseTabs>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useUserStore } from '@/store/user'
import {
  EditOutlined,
  ShareAltOutlined
} from '@ant-design/icons-vue'
import CourseHeader from '@/components/course/CourseHeader.vue'
import CourseTabs from '@/components/course/CourseTabs.vue'
import BasicInfoModule from '@/components/course/modules/BasicInfoModule.vue'
import VideoModule from '@/components/course/modules/VideoModule.vue'
import KnowledgeGraphModule from '@/components/course/modules/KnowledgeGraphModule.vue'
import LessonPlanModule from '@/components/course/modules/LessonPlanModule.vue'
import ManagementModule from '@/components/course/modules/ManagementModule.vue'
import QuestionBankModule from '@/components/course/modules/QuestionBankModule.vue'
import ExamPaperModule from '@/components/course/modules/ExamPaperModule.vue'
import ExamModule from '@/components/course/modules/ExamModule.vue'
import {
  getCourseDetailApi,
} from '@/api/course'

// Module components removed - keeping framework only

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 状态数据
const courseInfo = ref(null)
const loading = ref(false)
// 支持通过URL参数设置初始标签页，默认为基本信息
const activeTab = ref(route.query.tab || 'basic')

// 获取课程详情
const fetchCourseDetail = async () => {
  const courseId = route.params.id
  if (!courseId) return

  loading.value = true
  try {
    const res = await getCourseDetailApi(courseId)
    courseInfo.value = res.data
  } catch (error) {
    // console.error('获取课程详情失败:', error)
    // message.error('获取课程详情失败')
  } finally {
    loading.value = false
  }
}

// 页面操作方法
const goBack = () => {
  const role = userStore.userInfo?.user_type
  if (role === 'admin') {
    router.push('/admin')
  } else if (role === 'teacher') {
    router.push('/teacher')
  } else if (role === 'student') {
    router.push('/student')
  } else {
    router.push('/')
  }
}

// 封面上传成功后刷新课程信息
const handleCoverUploaded = () => {
  fetchCourseDetail()
}

const handleEdit = () => {
  message.info('编辑功能开发中...')
  // TODO: 跳转到课程编辑页面
  // router.push(`/course/${route.params.id}/edit`)
}

const handleShare = () => {
  navigator.clipboard.writeText(window.location.href)
  message.success('课程链接已复制到剪贴板')
}

// 监听路由变化重新加载数据
watch(() => route.params.id, (newId) => {
  if (newId) {
    fetchCourseDetail()
  }
})

onMounted(() => {
  fetchCourseDetail()
})
</script>

<style scoped>
.course-detail-page {
  min-height: 100vh;
  background: #f5f7fb;
}

.page-header {
  margin-bottom: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.course-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.course-tabs {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  
  /* 🌟 在这里直接加上左侧外边距 24px */
  margin-left: 24px; 
  
  /* 如果你是希望整个卡片两边都缩进、留出两边的白边，也可以写成：
  margin: 0 24px; 
  */
}

.module-placeholder {
  margin-bottom: 24px;
  text-align: center;
  padding: 40px 20px;
}

.placeholder-content h3 {
  color: #262626;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.placeholder-content p {
  color: #8c8c8c;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

/* 平板端 */
@media screen and (max-width: 900px) {
  .course-content {
    padding: 0 20px;
  }
}

/* 手机端 */
@media screen and (max-width: 768px) {
  .course-content {
    padding: 0 16px;
  }

  .page-header {
    margin-bottom: 16px;
    border-radius: 8px;
  }

  .page-header :deep(.ant-page-header-heading) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .page-header :deep(.ant-page-header-extra) {
    width: 100%;
    justify-content: flex-start;
  }

  .page-header :deep(.ant-btn) {
    flex: 1;
  }

  .course-tabs {
    border-radius: 8px;
  }
}

/* 小屏手机 */
@media screen and (max-width: 480px) {
  .course-content {
    padding: 0 12px;
  }
}
</style>
