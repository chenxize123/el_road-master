<!--
 * @Date         : 2026-05-08 17:18:46
 * @Description  :
 * @FilePath     : TeacherHome.vue
 * @LastEditTime : 2026-05-08 21:20:36
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 * 2026-05-08 17:18:46
-->
<template>
  <div class="role-home-page">

    <a-page-header :title="pageTitle" :sub-title="welcomeText">
      <template #extra>
        <a-space>
          <a-button type="primary" :disabled="isVisitor" @click="goToProfile">
            个人资料
          </a-button>
          <logout-button />
        </a-space>
      </template>
    </a-page-header>
    <DashboardBanner />
    <a-tabs v-model:activeKey="activeTab" class="role-tabs">

      <a-tab-pane key="classes" tab="班级列表">
        <ClassList
          user-role="teacher"
          :class-list="classList"
          :loading="loading"
          title="我负责的班级"
          show-create-button
          create-button-text="新建班级"
          action-button-text="进入班级"
          :show-teacher="false"
          show-delete-button
          @enter-class="enterClass"
          @delete-class="handleDeleteClass"
          @create-class="() => createClassVisible = true"
        />
      </a-tab-pane>

      <a-tab-pane key="courses" tab="课程列表">
        <CourseList
          :user-role="courseListRole"
          :teacher-id="teacherCourseId"
          :title="courseListTitle"
          layout="card"
          manage-button-text="进入课程"
          :course-list="courseList"
          :loading="courseLoading"
          :current-page="coursePagination.current"
          :page-size="coursePagination.pageSize"
          :total="coursePagination.total"
          :pagination-config="coursePagination"
          responsive-page-size
          show-delete-button
          @manage-course="handleManageCourse"
          @delete-course="handleDeleteCourse"
          @page-change="handleCoursePageChange"
          @page-size-change="handleCoursePageSizeChange"
        >
          <template #toolbar>
            <a-button
              type="primary"
              :disabled="isVisitor"
              @click="showCreateCourseModal"
            >
              新建课程
            </a-button>
          </template>
        </CourseList>
        <CourseCreateModal
          v-model:open="createCourseVisible"
          user-role="teacher"
          @success="handleCreateCourseSuccess"
        />
      </a-tab-pane>
    </a-tabs>
    <CreateClassModal
      v-model:open="createClassVisible"
      user-role="teacher"
      :teacher-id="userStore.userInfo?.id"
      @success="fetchData"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useUserStore } from '@/store'
import { useRouter } from 'vue-router'
import { deleteClassApi, getClassListApi } from '@/api/class'
import { deleteCourseApi, getTeacherCourses, getCourseCountApi } from '@/api/course'
import { enrichClassListStats, extractClassListFromResponse } from '@/utils/classStats'
import CreateClassModal from '@/components/class/CreateClassModal.vue'
import ClassList from '@/components/class/ClassList.vue'
import DashboardBanner from '@/components/common/DashboardBanner.vue'
import CourseList from '@/components/courses/CourseList.vue'
import CourseCreateModal from '@/components/courses/CourseCreateModal.vue'
import LogoutButton from '@/components/common/LogoutButton.vue'

const userStore = useUserStore()
const router = useRouter()

const activeTab = ref(userStore.userInfo?.user_type === 'visitor' ? 'courses' : 'classes')
const loading = ref(false)
const createClassVisible = ref(false)
const classList = ref([])
const courseList = ref([])
const createCourseVisible = ref(false)

// 课程分页配置
const coursePagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: false,
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 条`
})
const courseLoading = ref(false)

const welcomeText = computed(() => {
  const user = userStore.userInfo || {}
  return `欢迎回来，${user.nickname || user.username || (isVisitor.value ? '游客' : '老师')}`
})

const currentRole = computed(() => userStore.userInfo?.user_type || 'teacher')
const isVisitor = computed(() => currentRole.value === 'visitor')
const pageTitle = computed(() => isVisitor.value ? '游客首页' : '教师首页')
const courseListRole = computed(() => isVisitor.value ? 'admin' : 'teacher')
const teacherCourseId = computed(() => isVisitor.value ? null : userStore.userInfo?.id)
const courseListTitle = computed(() => isVisitor.value ? '全部课程' : '我负责的课程')

const getCourseTotal = (countRes) => {
  const total = countRes?.data?.total ?? countRes?.data?.count ?? countRes?.data ?? countRes?.total ?? countRes?.count
  return Number(total) || 0
}

const updateCourseList = (courseRes) => {
  if (courseRes && courseRes.data && Array.isArray(courseRes.data.list)) {
    courseList.value = courseRes.data.list
  } else if (Array.isArray(courseRes)) {
    courseList.value = courseRes
  } else if (courseRes && Array.isArray(courseRes.data)) {
    courseList.value = courseRes.data
  } else {
    courseList.value = []
  }
}

const fetchData = async () => {
  loading.value = true

  try {
    const classRes = await getClassListApi()

    // 提取原始班级列表
    const rawClassList = extractClassListFromResponse(classRes)

    // 补充统计数据
    const enrichedList = await enrichClassListStats(rawClassList)

    // 更新班级列表
    classList.value = enrichedList
  } catch (error) {
    console.error('获取数据失败:', error)
    message.error('教师首页数据加载失败')
  } finally {
    loading.value = false
  }
}

const fetchCourses = async () => {
  courseLoading.value = true
  try {
    const courseParams = {
      page: coursePagination.value.current,
      page_size: coursePagination.value.pageSize
    }

    if (!isVisitor.value) {
      courseParams.teacher_id = userStore.userInfo?.id
    }

    let courseRes
    let countRes

    if (isVisitor.value) {
      countRes = await getCourseCountApi()
      console.log('[VisitorCourseCount] /course/count response:', countRes)
      coursePagination.value.total = getCourseTotal(countRes)
      courseRes = await getTeacherCourses(courseParams)
    } else {
      [courseRes, countRes] = await Promise.all([
        getTeacherCourses(courseParams),
        getCourseCountApi()
      ])
      coursePagination.value.total = getCourseTotal(countRes)
    }

    // 从响应中提取课程列表（兼容现有格式）
    updateCourseList(courseRes)
  } catch (error) {
    console.error('获取课程数据失败:', error)
    message.error('课程数据加载失败')
  } finally {
    courseLoading.value = false
  }
}

const handleCoursePageChange = (pag) => {
  coursePagination.value.current = pag.current
  coursePagination.value.pageSize = pag.pageSize
  fetchCourses()
}

const handleCoursePageSizeChange = (pageSize) => {
  coursePagination.value.current = 1
  coursePagination.value.pageSize = pageSize
  fetchCourses()
}

const enterClass = record => {
  router.push(`/class/detail/${record.id}`)
}

const handleManageCourse = (course) => {
  // 跳转到课程详情页面进行管理
  router.push(`/course/${course.id}`)
}

const handleDeleteCourse = (course) => {
  Modal.confirm({
    title: '确认删除课程？',
    content: `课程“${course.title || course.courseName || course.id}”删除后不可恢复，请确认是否继续。`,
    okText: '确认删除',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      await deleteCourseApi(course.id)
      message.success('课程删除成功')
      fetchCourses()
    }
  })
}

const handleDeleteClass = (classItem) => {
  Modal.confirm({
    title: '确认删除班级？',
    content: `班级“${classItem.title || classItem.id}”删除后不可恢复，请确认是否继续。`,
    okText: '确认删除',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      await deleteClassApi(classItem.id)
      message.success('班级删除成功')
      fetchData()
    }
  })
}

// 新建课程处理
const showCreateCourseModal = () => {
  createCourseVisible.value = true
}

const handleCreateCourseSuccess = (courseData) => {
  // 添加到课程列表开头
  courseList.value.unshift(courseData)
  message.success('课程创建成功')
  // 刷新课程列表和总数
  fetchCourses()
}

const goToProfile = () => {
  router.push('/profile')
}

onMounted(() => {
  fetchData()
  fetchCourses()
})
</script>

<style scoped>
.role-home-page {
  min-height: 100vh;
  padding: 32px;
  background: #f5f7fb;
}

.role-tabs {
  margin-top: 16px;
}

.panel-card {
  border-radius: 16px;
}

.toolbar {
  margin-bottom: 16px;
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

  .role-tabs {
    margin-top: 12px;
  }

  .panel-card {
    border-radius: 12px;
  }

  .toolbar {
    margin-bottom: 12px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .table-container {
    border-radius: 8px;
  }

}

/* 小屏手机 */
@media screen and (max-width: 480px) {
  .role-home-page {
    padding: 12px;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar :deep(.ant-btn) {
    width: 100%;
  }

}
</style>
