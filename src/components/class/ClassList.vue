<!--
 * @Date         : 2026-05-18
 * @Description  : 统一的班级列表组件 - 支持教师、学生、管理员三种角色
 * @FilePath     : ClassList.vue
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="class-list-container">
    <a-card :title="cardTitle" class="panel-card" :bordered="false">
      <template #extra>
        <slot name="toolbar">
          <a-space v-if="showCreateButton" class="toolbar">
            <a-button
              type="primary"
              :disabled="isVisitor"
              @click="$emit('create-class')"
            >
              {{ createButtonText }}
            </a-button>
          </a-space>
        </slot>
      </template>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <a-spin :tip="loadingText" />
      </div>

      <!-- 班级卡片网格布局 -->
      <div v-else-if="classList.length > 0" ref="classGridRef" class="class-grid">
        <div
          v-for="item in classList"
          :key="item.id"
          class="class-card"
          @click="handleClassClick(item)"
        >
          <div class="class-card-header">
            <div class="class-avatar" :class="`avatar-${userRole}`">
              <UserOutlined />
            </div>
            <div class="class-info">
              <h3 class="class-title">{{ item.title || '未命名班级' }}</h3>
              <div class="class-middle-row">
                <a-tag v-if="item.course" color="blue" class="course-badge">
                  {{ item.course }}
                </a-tag>
              </div>
              <p v-if="showTeacher && item.teacher" class="class-teacher">
                教师: {{ item.teacher }}
              </p>
            </div>
          </div>

          <div class="class-card-content">
            <div class="class-stats">
              <div class="stat-item">
                <div class="stat-icon">
                  <TeamOutlined />
                </div>
                <div class="stat-text">
                  <span class="stat-value">{{ item.studentCount || item.student_count || 0 }}</span>
                  <span class="stat-label">学生</span>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">
                  <BookOutlined />
                </div>
                <div class="stat-text">
                  <span class="stat-value">{{ item.courseCount || item.course_count || 0 }}</span>
                  <span class="stat-label">课程</span>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">
                  <TrophyOutlined />
                </div>
                <div class="stat-text">
                  <span class="stat-value">{{ item.examCount || item.exam_count || 0 }}</span>
                  <span class="stat-label">考试</span>
                </div>
              </div>
            </div>

            <div class="class-time-info" v-if="showTimeInfo">
              <div class="time-item" v-if="item.start_time">
                <CalendarOutlined class="time-icon" />
                <span class="time-text">开始: {{ formatDate(item.start_time) }}</span>
              </div>
              <div class="time-item" v-if="item.end_time">
                <CalendarOutlined class="time-icon" />
                <span class="time-text">结束: {{ formatDate(item.end_time) }}</span>
              </div>
            </div>

            <div class="class-card-footer">
              <slot name="actions" :class="item">
                <a-button
                  type="primary"
                  class="class-enter-button"
                  @click.stop="handleEnterClass(item)"
                >
                  {{ actionButtonText }}
                </a-button>
                <a-button
                  v-if="showDeleteButton"
                  danger
                  class="class-delete-button"
                  :class="{ 'visitor-delete-button-muted': isVisitor }"
                  @click.stop="handleDeleteClass(item)"
                >
                  删除
                </a-button>
              </slot>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <a-empty
        v-else
        :description="emptyText"
        :image="emptyImage"
      >
        <template #extra>
          <slot name="empty-extra">
            <a-button
              v-if="showCreateButton"
              type="primary"
              @click="$emit('create-class')"
            >
              {{ emptyActionText }}
            </a-button>
          </slot>
        </template>
      </a-empty>

      <!-- 分页控件 -->
      <div v-if="showPagination && total > 0" class="pagination-section">
        <a-pagination
          :current="currentPage"
          :page-size="pageSize"
          :total="total"
          v-bind="paginationConfig"
          @change="handlePageChange"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Empty } from 'ant-design-vue'
import { useUserStore } from '@/store'
import { useResponsivePageSize } from '@/composables/useResponsivePageSize'
import {
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  TrophyOutlined,
  CalendarOutlined
} from '@ant-design/icons-vue'

const props = defineProps({
  // 用户角色：teacher | student | admin
  userRole: {
    type: String,
    required: true,
    validator: (value) => ['teacher', 'student', 'admin'].includes(value)
  },
  // 班级数据列表
  classList: {
    type: Array,
    default: () => []
  },
  // 加载状态
  loading: {
    type: Boolean,
    default: false
  },
  // 卡片标题
  title: {
    type: String,
    default: ''
  },
  // 是否显示创建按钮
  showCreateButton: {
    type: Boolean,
    default: false
  },
  // 创建按钮文本
  createButtonText: {
    type: String,
    default: '新建班级'
  },
  // 操作按钮文本
  actionButtonText: {
    type: String,
    default: '进入班级'
  },
  // 是否显示教师信息
  showTeacher: {
    type: Boolean,
    default: true
  },
  // 是否显示时间信息
  showTimeInfo: {
    type: Boolean,
    default: false
  },
  // 是否显示分页
  showPagination: {
    type: Boolean,
    default: false
  },
  // 分页配置
  paginationConfig: {
    type: Object,
    default: () => ({
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`
    })
  },
  // 当前页码
  currentPage: {
    type: Number,
    default: 1
  },
  // 每页条数
  pageSize: {
    type: Number,
    default: 10
  },
  responsivePageSize: {
    type: Boolean,
    default: false
  },
  // 总条数
  total: {
    type: Number,
    default: 0
  },
  // 自定义加载文本
  loadingText: {
    type: String,
    default: '正在加载班级数据...'
  },
  // 自定义空状态文本
  emptyText: {
    type: String,
    default: ''
  },
  // 自定义空状态操作文本
  emptyActionText: {
    type: String,
    default: ''
  },
  showDeleteButton: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'class-click',
  'enter-class',
  'create-class',
  'page-change',
  'page-size-change',
  'refresh',
  'delete-class'
])

const userStore = useUserStore()
const classGridRef = ref(null)

useResponsivePageSize({
  gridRef: classGridRef,
  enabled: () => props.responsivePageSize,
  items: () => props.classList,
  pageSize: () => props.pageSize,
  onPageSizeChange: pageSize => emit('page-size-change', pageSize)
})

// 计算属性
const cardTitle = computed(() => {
  if (props.title) return props.title

  const titleMap = {
    teacher: '我负责的班级',
    student: '我的班级',
    admin: '班级管理'
  }
  return titleMap[props.userRole] || '班级列表'
})

const emptyImage = Empty.PRESENTED_IMAGE_SIMPLE

const emptyText = computed(() => {
  if (props.emptyText) return props.emptyText

  const emptyMap = {
    teacher: '暂无负责的班级',
    student: '暂未加入任何班级',
    admin: '暂无班级数据'
  }
  return emptyMap[props.userRole] || '暂无班级数据'
})

const emptyActionText = computed(() => {
  if (props.emptyActionText) return props.emptyActionText

  return props.userRole === 'student' ? '联系老师加入班级' : '创建第一个班级'
})

const isVisitor = computed(() => userStore.userInfo?.user_type === 'visitor')

// 方法
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const getStatusColor = (status) => {
  const colorMap = {
    '正常': 'success',
    '活跃': 'processing',
    '暂停': 'warning',
    '已结束': 'default',
    '公开': 'blue',
    '私有': 'orange'
  }
  return colorMap[status] || 'default'
}

const handleClassClick = (classItem) => {
  emit('class-click', classItem)
}

const handleEnterClass = (classItem) => {
  emit('enter-class', classItem)
}

const handleDeleteClass = (classItem) => {
  emit('delete-class', classItem)
}

const handlePageChange = (page, pageSize) => {
  emit('page-change', { page, pageSize })
}
</script>

<style scoped>
.class-list-container {
  width: 100%;
}

.panel-card {
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

/* 班级卡片网格布局 */
.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.class-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
  position: relative;
}

.class-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #1890ff, #52c41a);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.class-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  border-color: #e6f7ff;
}

.class-card:hover::before {
  opacity: 1;
}

.class-card-header {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  gap: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #e8f4fd 100%);
}

.class-avatar {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  flex-shrink: 0;
}

.avatar-teacher {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
}

.avatar-student {
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
}

.avatar-admin {
  background: linear-gradient(135deg, #722ed1 0%, #b37feb 100%);
}

.class-info {
  flex: 1;
  min-width: 0;
}

.class-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #262626;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.class-middle-row {
  margin-bottom: 8px;
}

.course-badge {
  flex-shrink: 0;
  margin-right: 0;
}

.class-teacher {
  margin: 0;
  font-size: 14px;
  color: #595959;
}

.class-card-content {
  padding: 20px;
}

.class-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16px;
  padding: 16px 0;
  background: #fafbfc;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1890ff;
  font-size: 18px;
}

.stat-text {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #1890ff;
  line-height: 1;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.class-time-info {
  margin-bottom: 16px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  border-left: 3px solid #1890ff;
}

.time-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 14px;
  color: #595959;
}

.time-item:last-child {
  margin-bottom: 0;
}

.time-icon {
  color: #1890ff;
  font-size: 14px;
}

.time-text {
  flex: 1;
}

.class-card-footer {
  margin-top: 16px;
  display: flex;
  gap: 10px;
}

.class-card-footer .ant-btn {
  height: 44px;
  border-radius: 12px;
  font-weight: 500;
  font-size: 16px;
  flex: 1;
}

.class-enter-button {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
  transition: all 0.3s ease;
}

.class-enter-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(24, 144, 255, 0.4);
}

.class-delete-button {
  transition: all 0.3s ease;
}

.pagination-section {
  margin-top: 24px;
  text-align: center;
}

/* 响应式设计 */
@media screen and (max-width: 900px) {
  .class-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    margin: 16px 0;
  }

  .class-card-header {
    padding: 16px;
    gap: 12px;
  }

  .class-avatar {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }

  .class-title {
    font-size: 16px;
  }

  .class-card-content {
    padding: 16px;
  }

  .class-stats {
    padding: 12px 0;
  }

  .stat-icon {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  .stat-value {
    font-size: 18px;
  }
}

@media screen and (max-width: 768px) {
  .panel-card {
    border-radius: 12px;
  }

  .class-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    margin: 12px 0;
  }

  .class-card-header {
    padding: 14px;
  }

  .class-avatar {
    width: 44px;
    height: 44px;
    font-size: 18px;
  }

  .class-title {
    font-size: 15px;
  }

  .class-id {
    font-size: 12px;
  }

  .class-stats {
    flex-direction: row;
    justify-content: space-between;
    gap: 8px;
  }

  .stat-item {
    flex: 1;
  }

  .stat-icon {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .stat-value {
    font-size: 16px;
  }

  .stat-label {
    font-size: 10px;
  }

  .class-time-info {
    padding: 8px;
  }

  .time-item {
    font-size: 12px;
  }
}

@media screen and (max-width: 480px) {
  .class-badges {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .class-stats {
    padding: 8px 0;
  }

  .class-time-info {
    margin-bottom: 12px;
  }
}
</style>
