<!--
 * @Date         : 2026-05-12 17:30:00
 * @Description  : 教师和管理员课程列表组件 - 集中管理API版本
 * @FilePath     : CourseList.vue
 * @LastEditTime : 2026-05-19 18:20:24
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 -->
<template>
  <div class="course-list-container">
    <a-card :title="cardTitle" class="panel-card">
      <template #extra>
        <slot name="toolbar">
          <a-space v-if="$slots.toolbar" class="toolbar">
            <slot name="toolbar-content"></slot>
          </a-space>
        </slot>
      </template>

      <!-- 搜索和操作栏 -->
      <div v-if="$slots.search || $slots.filter" class="search-section">
        <slot name="search"></slot>
        <slot name="filter"></slot>
      </div>

      <!-- 加载状态 -->
      <div v-if="props.loading && props.courseList.length === 0" class="loading-container">
        <a-spin tip="正在加载课程数据..." />
      </div>

      <!-- 卡片式布局 -->
      <div v-if="props.layout === 'card' && !props.loading" ref="courseGridRef" class="course-grid">
        <a-card
          v-for="item in props.courseList"
          :key="item.id"
          hoverable
          class="course-card"
          @click="handleCourseClick(item)"
        >
          <template #cover>
            <div class="course-cover-wrapper">
              <img
                v-if="coverUrlMap[item.id]"
                class="course-cover"
                :src="coverUrlMap[item.id]"
                :alt="item.title || item.courseName"
                @error="handleImageError(item)"
              />
              <div v-else class="course-cover-placeholder">
                <BookOutlined style="font-size: 32px; color: #bfbfbf;" />
                <p class="placeholder-text">暂无封面</p>
              </div>
            </div>
          </template>

          <h3 class="course-title">{{ item.title || item.courseName || '未命名课程' }}</h3>

          <p class="course-info">课程编号：{{ item.id || '未设置' }}</p>
          <p class="course-info">任课教师：{{ getTeacherName(item) }}</p>
          <p class="course-info">课时数：{{ item.class_hour || 0 }}</p>

          <template #actions>
            <slot name="course-actions" :course="item">
              <a-space>
                <a-button type="primary" size="small" @click.stop="$emit('manage-course', item)">
                  {{ props.manageButtonText }}
                </a-button>
                <a-button
                  v-if="props.showDeleteButton"
                  danger
                  size="small"
                  :class="{ 'visitor-delete-button-muted': isVisitor }"
                  @click.stop="$emit('delete-course', item)"
                >
                  删除
                </a-button>
              </a-space>
            </slot>
          </template>
        </a-card>
      </div>

      <!-- 表格式布局 -->
      <a-table
        v-else-if="props.layout === 'table' && !props.loading"
        :columns="tableColumns"
        :data-source="props.courseList"
        row-key="id"
        :pagination="{
          current: props.currentPage,
          pageSize: props.pageSize,
          total: props.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: props.paginationConfig.showTotal,
          onChange: handlePageChange
        }"
        :bordered="false"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <slot name="table-actions" :course="record">
              <a-button type="link" size="small" @click="$emit('manage-course', record)">
                {{ props.manageButtonText }}
              </a-button>
            </slot>
          </template>
          <template v-else-if="column.key === 'classCount'">
            <span>{{ record.classCount || 0 }}个班级</span>
          </template>
          <template v-else-if="column.key === 'create_time'">
            <span>{{ formatDate(record.create_time) }}</span>
          </template>
        </template>
      </a-table>

      <!-- 空状态 -->
      <a-empty v-if="!props.loading && props.courseList.length === 0" description="暂无课程数据" />

      <!-- 分页控件（卡片布局） -->
      <div v-if="props.layout === 'card' && props.total > 0 && !props.loading" class="pagination-section">
        <a-pagination
          v-bind="props.paginationConfig"
          :current="props.currentPage"
          :page-size="props.pageSize"
          :total="props.total"
          @change="handlePageChange"
        />
      </div>

      <!-- 底部操作区 -->
      <div v-if="$slots.footer && !props.loading" class="footer-section">
        <slot name="footer"></slot>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { BookOutlined } from '@ant-design/icons-vue'
import { getCourseCoverUrlApi } from '@/api/file'
import { useUserStore } from '@/store'
import { useResponsivePageSize } from '@/composables/useResponsivePageSize'

const router = useRouter()
const userStore = useUserStore()
const courseGridRef = ref(null)

const props = defineProps({
  // 用户角色：teacher | admin
  userRole: {
    type: String,
    default: 'teacher'
  },
  // 教师 ID（用于 API 参数）
  teacherId: {
    type: [String, Number],
    default: null
  },
  // 卡片标题
  title: {
    type: String,
    default: '课程列表'
  },
  // 布局类型：card | table
  layout: {
    type: String,
    default: 'card'
  },
  // 管理按钮文本
  manageButtonText: {
    type: String,
    default: '进入课程'
  },
  // 表格列配置
  columns: {
    type: Array,
    default: null
  },
  // 分页相关配置
  paginationConfig: {
    type: Object,
    default: () => ({
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`
    })
  },
  // 新增：父组件传入的数据
  courseList: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  currentPage: {
    type: Number,
    default: 1
  },
  pageSize: {
    type: Number,
    default: 10
  },
  responsivePageSize: {
    type: Boolean,
    default: false
  },
  total: {
    type: Number,
    default: 0
  },
  showDeleteButton: {
    type: Boolean,
    default: false
  }
})

// 存储课程封面URL的映射
const coverUrlMap = ref({})

// 获取单门课程的封面URL
const fetchCourseCover = async (course) => {
  if (!course.cover) return
  try {
    console.log('获取封面URL:', course.cover)
    const url = await getCourseCoverUrlApi(course.cover, 10)
    coverUrlMap.value[course.id] = url
  } catch (error) {
    console.error('获取封面URL失败:', course.title, error)
  }
}

// 获取所有课程的封面
const fetchAllCovers = async (courses) => {
  const coursesWithCover = courses.filter(c => c.cover)
  if (coursesWithCover.length === 0) return

  // 并行获取所有封面
  await Promise.all(coursesWithCover.map(course => fetchCourseCover(course)))
}

const emit = defineEmits([
  'manage-course',
  'course-click',
  'refresh',
  'page-change',
  'page-size-change',
  'delete-course'
])

useResponsivePageSize({
  gridRef: courseGridRef,
  enabled: () => props.responsivePageSize && props.layout === 'card',
  items: () => props.courseList,
  pageSize: () => props.pageSize,
  onPageSizeChange: pageSize => emit('page-size-change', pageSize)
})

// 计算属性
const cardTitle = computed(() => props.title)
const isVisitor = computed(() => userStore.userInfo?.user_type === 'visitor')

const tableColumns = computed(() => {
  if (props.columns) return props.columns

  return [
    {
      title: '课程名称',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      customRender: ({ text }) => text || '未命名课程'
    },
    {
      title: '课程编号',
      dataIndex: 'courseCode',
      key: 'courseCode',
      ellipsis: true
    },
    {
      title: '任课教师',
      dataIndex: 'teacher_name',
      key: 'teacher_name',
      ellipsis: true,
      customRender: ({ record }) => getTeacherName(record)
    },
    {
      title: '班级数量',
      dataIndex: 'classCount',
      key: 'classCount',
      customRender: ({ text }) => `${text || 0}个班级`
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      key: 'create_time',
      customRender: ({ text }) => formatDate(text)
    },
    {
      title: '操作',
      key: 'action',
      width: 100
    }
  ]
})

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未设置'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 获取任课教师姓名；课程创建人不是任课教师，不能作为兜底显示
const getTeacherName = (course) => {
  return course.teacher_name || course.teacherName || course.teacher || '未设置'
}

// 处理图片加载错误
const handleImageError = (course) => {
  console.log('图片加载失败，使用占位符:', course.title || course.courseName)
  // 可以在这里添加默认图片逻辑
}

// 处理课程点击
const handleCourseClick = (course) => {
  console.log('🎯 课程被点击:', course)
  emit('course-click', course)

  // 自动跳转到课程详情页面
  router.push(`/course/${course.id}`)
}

// 处理分页变化
const handlePageChange = (page, newPageSize) => {
  emit('page-change', { current: page, pageSize: newPageSize })
}

// 处理表格排序和筛选变化
const handleTableChange = (pagination, filters, sorter) => {
  emit('page-change', {
    current: pagination.current,
    pageSize: pagination.pageSize,
    sortField: sorter.field,
    sortOrder: sorter.order,
    filters
  })
}

// 监听 courseList 变化来获取封面
watch(() => props.courseList, (newList) => {
  if (newList && newList.length > 0) {
    nextTick(() => {
      fetchAllCovers(newList)
    })
  }
}, { immediate: true })
</script>
