<!--
 * @Date         : 2026-05-14 10:00:00
 * @Description  : 班级详情页 - 标签页模式
 * @FilePath     : ClassDetail.vue
 * @LastEditTime : 2026-05-18 11:05:35
 * @Version      : V2.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="class-detail-page">
    <!-- 页面头部 -->
    <a-page-header
      :title="classInfo?.title || '班级详情'"
      :sub-title="`班级ID: ${classId}`"
      @back="handleBack"
      class="page-header"
    >
      <template #extra>
        <a-button @click="handleBack">返回</a-button>
      </template>
    </a-page-header>

    <!-- 主要内容区域 -->
    <div class="class-content">
      <!-- 功能导航标签页 -->
      <ClassTabs
        v-model:active-tab="activeTab"
        :class-id="classId"
        :is-teacher-or-admin="isTeacherOrAdmin"
        :controller="classController?.controller"
        class="class-tabs"
      >
        <!-- 基本信息模块 -->
        <template #basic>
          <ClassInfoCard
            :class-info="classInfo"
            :class-id="classId"
            :students-count="studentsList.length"
            :loading="loading"
            :is-teacher-or-admin="isTeacherOrAdmin"
            :controller="classController?.controller"
            :loading-controller="loadingController"
            :saving-controller="savingController"
            @update:controller="handleUpdateController"
            @save-controller="handleSaveController"
          />
        </template>

        <!-- 学生管理模块 -->
        <template #students>
          <ClassStudentCard
            :class-info="classInfo"
            :students-list="studentsList"
            :loading-students="loadingStudents"
            :adding-student="addingStudent"
            @add-student="handleAddStudent"
            @refresh-students="fetchClassStudents"
          />
        </template>

        <!-- 知识图谱模块 -->
        <template #knowledge>
          <ClassKnowledgeGraphModule
            :class-id="classId"
            :loading="loading"
          />
        </template>
        <!-- 课程视频模块 -->
        <template #video>
          <ClassVideoModule
            :class-id="classId"
            :loading="loading"
          />
        </template>
        <!-- 考试管理模块 -->
        <template #exam>
          <ClassExamModule
            v-if="classInfo?.id"
            :class-id="classId"
          />
          <div v-else class="loading-placeholder">
            <a-spin tip="加载考试信息中..." />
          </div>
        </template>

        <!-- 课程赋能课题模块 -->
        <template #experiment>
          <ClassExperimentModule
            :class-id="classId"
            :loading="loading"
          />
        </template>

        <template #literature>
          <ClassLiteratureModule
            :class-id="classId"
            :course-id="classInfo?.course_id || classInfo?.courseId || null"
            :course-name="classInfo?.course || ''"
            :loading="loading"
          />
        </template>

        <!-- 讨论区模块 -->
        <template #discussion>
          <ClassDiscussionModule
            :class-id="classId"
            :loading="loading"
          />
        </template>
      </ClassTabs>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useUserStore } from '@/store'
import { useClassDetail } from '@/composables/useClassDetail'
import {
  getClassControllerApi,
  updateClassControllerApi
} from '@/api/classController'
import ClassTabs from '@/components/class/ClassTabs.vue'
import ClassInfoCard from '@/components/class/detail/ClassInfoCard.vue'
import ClassStudentCard from '@/components/class/detail/ClassStudentCard.vue'
import ClassExamModule from '@/components/class/modules/ClassExamModule.vue'
import ClassExperimentModule from '@/components/class/modules/ClassExperimentModule.vue'
import ClassKnowledgeGraphModule from '@/components/class/modules/ClassKnowledgeGraphModule.vue'
import ClassVideoModule from '@/components/class/modules/ClassVideoModule.vue'
import ClassDiscussionModule from '@/components/class/modules/ClassDiscussionModule.vue'
import ClassLiteratureModule from '@/components/class/modules/ClassLiteratureModule.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const classId = route.params.classId

// 支持通过URL参数设置初始标签页，默认为基本信息
const activeTab = ref(route.query.tab || 'basic')

const {
  loading,
  loadingStudents,
  classInfo,
  studentsList,
  addingStudent,
  handleAddStudent,
  fetchClassDetail,
  fetchClassStudents
} = useClassDetail(classId)

// 班级控制器相关
const classController = ref(null)
const originalController = ref(null)
const loadingController = ref(false)
const savingController = ref(false)

const defaultClassController = {
  exam: true,
  digital_video: true,
  knowledge_graph: true,
  experimental_code_evaluation: true,
  discussion_forum: true,
  research_planning: true
}

function normalizeClassController(controller = {}) {
  const normalized = { ...defaultClassController, ...controller }
  if (controller.discussion_forum === undefined && controller.Discussion_forum !== undefined) {
    normalized.discussion_forum = controller.Discussion_forum
  }
  if (controller.experimental_code_evaluation === undefined && controller.experiment !== undefined) {
    normalized.experimental_code_evaluation = controller.experiment
  }
  delete normalized.Discussion_forum
  delete normalized.experiment
  return normalized
}

// 获取班级控制器配置
const fetchClassController = async () => {
  console.log('🚀 ClassDetail: fetchClassController called for classId:', classId)
  loadingController.value = true
  try {
    const res = await getClassControllerApi(classId)
    console.log('📡 ClassDetail: API response:', res)
    const data = res.data?.data || res.data
    console.log('📦 ClassDetail: extracted data:', data)
    if (data) {
      classController.value = {
        ...data,
        controller: normalizeClassController(data.controller || {})
      }
      originalController.value = { ...classController.value }
      console.log('✅ ClassDetail: classController set:', classController.value)
    }
  } catch (error) {
    console.error('❌ ClassDetail: 获取班级控制器失败:', error)
    message.error('获取功能配置失败: ' + (error.message || '未知错误'))
    // 失败时使用默认配置（全部开启）
    classController.value = {
      controller: {
        ...defaultClassController
      }
    }
    console.log('⚠️ ClassDetail: using default controller:', classController.value)
  } finally {
    loadingController.value = false
  }
}

// 保存控制器配置
const handleSaveController = async () => {
  console.log('💾 ClassDetail: handleSaveController called')
  if (!classController.value) return

  savingController.value = true
  try {
    const updateData = {
      id: classController.value.id,
      class_id: classId,
      controller: classController.value.controller
    }
    console.log('📤 ClassDetail: Sending to API:', updateData)
    await updateClassControllerApi(updateData)
    message.success('功能配置保存成功')
    // 更新原始数据
    originalController.value = { ...classController.value }
    console.log('✅ ClassDetail: Saved successfully, originalController updated')
  } catch (error) {
    console.error('❌ ClassDetail: 保存班级控制器失败:', error)
    message.error('保存失败: ' + (error.message || '未知错误'))
  } finally {
    savingController.value = false
  }
}

// 更新本地 controller 数据
const handleUpdateController = (newController) => {
  console.log('🔄 ClassDetail: handleUpdateController called with:', newController)
  if (classController.value) {
    classController.value = {
      ...classController.value,
      controller: newController
    }
    console.log('✅ ClassDetail: Updated classController:', classController.value)
  }
}

// 初始化数据
const initData = async () => {
  await Promise.all([
    fetchClassDetail(),
    fetchClassStudents(),
    fetchClassController()
  ])
}

const isTeacherOrAdmin = computed(() => {
  const role = userStore.userInfo?.user_type
  return role === 'teacher' || role === 'admin'
})

const handleBack = () => {
  router.back()
}

onMounted(initData)
</script>

<style scoped>
.class-detail-page {
  min-height: 100vh;
  padding-bottom: 32px;
  background: #f5f7fb;
}

.page-header {
  margin-bottom: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #eef0f4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.class-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.class-tabs {
  background: white;
  border: 1px solid #eef0f4;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.loading-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

/* 平板端 */
@media screen and (max-width: 900px) {
  .class-content {
    padding: 0 20px;
  }
}

/* 手机端 */
@media screen and (max-width: 768px) {
  .class-detail-page {
    padding-bottom: 20px;
  }

  .class-content {
    padding: 0 16px;
  }

  .page-header {
    margin-bottom: 16px;
    border-radius: 8px;
  }

  .class-tabs {
    border-radius: 8px;
  }
}

/* 小屏手机 */
@media screen and (max-width: 480px) {
  .class-content {
    padding: 0 12px;
  }
}
</style>
