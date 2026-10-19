<!--
 * @Date         : 2026-05-08 17:19:01
 * @Description  :
 * @FilePath     : AdminHome.vue
 * @LastEditTime : 2026-05-28 19:38:29
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 * 2026-05-08 17:19:01
-->
<template>
  <div class="role-home-page">

    <a-page-header title="管理员首页" :sub-title="welcomeText">
      <template #extra>
        <a-space>
          <KnowledgeGraphButton />
          <a-button type="primary" @click="goToProfile">
            个人资料
          </a-button>
          <logout-button />
        </a-space>
      </template>
    </a-page-header>
    <DashboardBanner />
    <a-tabs v-model:activeKey="activeTab" class="role-tabs">

      <a-tab-pane key="courses" tab="课程管理">
        <CourseList
          user-role="admin"
          title="课程列表"
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
            <a-button type="primary" @click="showCreateCourseModal">
              新建课程
            </a-button>
          </template>
        </CourseList>
        <CourseCreateModal
          v-model:open="createCourseVisible"
          user-role="admin"
          @success="handleCreateCourseSuccess"
        />
      </a-tab-pane>

      <a-tab-pane key="classes" tab="班级管理">
        <ClassList
          user-role="admin"
          :class-list="classList"
          :loading="loading"
          title="班级管理"
          show-create-button
          create-button-text="新建班级"
          action-button-text="进入班级"
          :show-teacher="true"
          :show-time-info="true"
          :show-pagination="true"
          :current-page="pagination.current"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          :pagination-config="pagination"
          responsive-page-size
          show-delete-button
          @enter-class="enterClass"
          @delete-class="handleDeleteClass"
          @create-class="() => createClassVisible = true"
          @page-change="handleTableChange"
          @page-size-change="handleClassPageSizeChange"
        />
      </a-tab-pane>

      <a-tab-pane key="users" tab="人员管理">
        <UserList @refresh="fetchData" @showAddUserModal="showAddUserModal" ref="userListRef" />
        <AddUser ref="addUserRef" @success="fetchData" />
      </a-tab-pane>

      <a-tab-pane key="permissions" tab="权限管理">
        <PermissionManagement />
      </a-tab-pane>
    </a-tabs>
    <CreateClassModal
      v-model:open="createClassVisible"
      user-role="admin"
      @success="fetchData"
    />
  </div>
</template>

<script setup>
import KnowledgeGraphButton from '@/components/common/KnowledgeGraphButton.vue'
import { computed, onMounted, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useUserStore } from '@/store'
import { useRouter } from 'vue-router'
import { deleteClassApi, getClassListApi, getClassCountApi } from '@/api/class'
import { deleteCourseApi, getTeacherCourses, getCourseCountApi } from '@/api/course'
import { enrichClassListStats, extractClassListFromResponse } from '@/utils/classStats'
import UserList from '@/components/admin/UserList.vue'
import AddUser from '@/components/admin/AddUser.vue'
import CreateClassModal from '@/components/class/CreateClassModal.vue'
import ClassList from '@/components/class/ClassList.vue'
import DashboardBanner from '@/components/common/DashboardBanner.vue'
import CourseList from '@/components/courses/CourseList.vue'
import CourseCreateModal from '@/components/courses/CourseCreateModal.vue'
import LogoutButton from '@/components/common/LogoutButton.vue'
import PermissionManagement from '@/components/admin/PermissionManagement.vue'

const userStore = useUserStore()
const router = useRouter()

const activeTab = ref('courses')
const loading = ref(false)
const createClassVisible = ref(false)
const classList = ref([])
const courseList = ref([])
const userList = ref([])
const addUserRef = ref()
const createCourseVisible = ref(false)

// 管理员分页配置
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: false,
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 条`
})

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
  return `欢迎回来，${user.nickname || user.username || '管理员'}`
})


/**
 * 管理员分页数据处理:
 *
 * 后端实际返回格式:
 * {
 *   code: 200,
 *   message: "success",
 *   data: [
 *     {
 *       id: 7460513930612482048,
 *       title: "1",
 *       status: "正常",
 *       is_open: "公开",
 *       start_time: "2026-04-29",
 *       end_time: "2026-05-22",
 *       create_by: "管理员",
 *       course: "机器学习",
 *       teacher: "冯建周"
 *     }
 *   ]
 * }
 */
const fetchData = async () => {
  loading.value = true

  try {
    // 管理员：并行获取班级列表和总数
    const [classRes, countRes, userRes] = await Promise.all([
      getClassListApi({
        page: pagination.value.current,
        page_size: pagination.value.pageSize
      }),
      getClassCountApi(),
      // getUserListApi()
    ])
    console.log('班级列表返回:', classRes)
    // 提取原始班级列表
    const rawClassList = extractClassListFromResponse(classRes)

    // 补充统计数据
    const enrichedList = await enrichClassListStats(rawClassList)

    // 更新班级列表
    classList.value = enrichedList

    // 从 count 接口获取总数
    pagination.value.total = countRes?.data || 0

    userList.value = userRes?.data || []
  } catch (error) {
    console.error('获取数据失败:', error)
    message.error('管理员首页数据加载失败')
  } finally {
    loading.value = false
  }
}

// 表格分页、排序、筛选变化处理
const handleTableChange = (pag) => {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  fetchData()
}

const handleClassPageSizeChange = (pageSize) => {
  pagination.value.current = 1
  pagination.value.pageSize = pageSize
  fetchData()
}

const fetchCourses = async () => {
  courseLoading.value = true
  try {
    const [courseRes, countRes] = await Promise.all([
      getTeacherCourses({
        page: coursePagination.value.current,
        page_size: coursePagination.value.pageSize
      }),
      getCourseCountApi()
    ])

    // 从响应中提取课程列表（兼容现有格式）
    if (courseRes && courseRes.data && Array.isArray(courseRes.data.list)) {
      courseList.value = courseRes.data.list
    } else if (Array.isArray(courseRes)) {
      courseList.value = courseRes
    } else if (courseRes && Array.isArray(courseRes.data)) {
      courseList.value = courseRes.data
    } else {
      courseList.value = []
    }

    // 从 count 接口获取总数
    coursePagination.value.total = countRes?.data || 0
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

// 进入课程处理
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

const showAddUserModal = () => {
  if (addUserRef.value) {
    addUserRef.value.open()
  }
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
