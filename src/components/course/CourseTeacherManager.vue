<template>
  <a-card class="teacher-manager-card" :bordered="false">
    <template #title>
      <div class="manager-title-wrap">
        <span class="manager-title">授课老师</span>
        <a-tag v-if="hasManagePermission" color="green">可管理</a-tag>
        <a-tag v-else color="default">只读</a-tag>
      </div>
    </template>

    <div class="teacher-list" v-if="courseTeachers.length">
      <div
        v-for="teacher in courseTeachers"
        :key="teacher.user_id || teacher.id || teacher.teacher_id"
        class="teacher-item"
      >
        <div class="teacher-main">
          <a-avatar size="small" class="teacher-avatar">
            {{ getInitial(teacher.real_name || teacher.username || teacher.user_name || 'T') }}
          </a-avatar>
          <div class="teacher-meta">
            <div class="teacher-name-row">
              <span class="teacher-name">
                {{ teacher.real_name || teacher.username || teacher.user_name || '未知老师' }}
              </span>
              <a-tag v-if="teacher.is_owner" color="blue">主讲</a-tag>
              <a-tag v-else color="default">共享</a-tag>
            </div>
            <div class="teacher-subtitle">
              {{ teacher.username || teacher.user_name || teacher.email || '老师' }}
            </div>
          </div>
        </div>

        <a-popconfirm
          v-if="canManage && !teacher.is_owner"
          title="确定要从课程中移除该老师吗？"
          ok-text="确定"
          cancel-text="取消"
          @confirm="handleRemoveTeacher(teacher)"
        >
          <a-button type="text" danger size="small">移除</a-button>
        </a-popconfirm>
      </div>
    </div>

    <a-empty v-else description="暂无授课老师" />

    <div v-if="canManage" class="teacher-add-row">
      <a-select
        v-model:value="selectedTeacherId"
        :options="teacherOptions"
        :filter-option="filterOption"
        placeholder="搜索并添加老师"
        allow-clear
        show-search
        style="width: 260px;"
      />
      <a-button
        type="primary"
        :loading="adding"
        :disabled="!selectedTeacherId || adding"
        @click="handleAddTeacher"
      >
        添加老师
      </a-button>
    </div>

    <div v-else-if="!hasManagePermission" class="read-only-tip">
      当前账号仅可查看，不可修改授课老师列表。
    </div>
  </a-card>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useUserStore } from '@/store/user'
import { getUserListApi } from '@/api/user'
import {
  addTeacherToCourse,
  getCourseTeachers,
  removeTeacherFromCourse
} from '@/api/course'

const props = defineProps({
  courseId: {
    type: [String, Number],
    required: true
  },
  editable: {
    type: Boolean,
    default: false
  }
})

const userStore = useUserStore()
const courseTeachers = ref([])
const teacherOptions = ref([])
const selectedTeacherId = ref(undefined)
const loading = ref(false)
const adding = ref(false)

const currentUserId = computed(() => {
  const id = userStore.userInfo?.id
  return id === undefined || id === null ? '' : String(id)
})

const currentUserType = computed(() => userStore.userInfo?.user_type || '')

const hasManagePermission = computed(() => {
  if (currentUserType.value === 'admin') return true
  return courseTeachers.value.some(item => {
    const userId = String(item.user_id ?? item.id ?? item.teacher_id ?? '')
    return userId === currentUserId.value && item.is_owner === true
  })
})

const canManage = computed(() => props.editable && hasManagePermission.value)

const normalizeTeacher = (teacher) => {
  if (!teacher || typeof teacher !== 'object') return null

  const userId = teacher.user_id ?? teacher.id ?? teacher.teacher_id ?? teacher.userId
  const realName = teacher.real_name ?? teacher.realName ?? teacher.name ?? teacher.username
  const username = teacher.username ?? teacher.user_name ?? teacher.userName ?? teacher.email ?? ''

  return {
    ...teacher,
    user_id: userId,
    teacher_id: teacher.user_id ?? teacher.teacher_id ?? userId,
    real_name: realName || username || '未知老师',
    username,
    is_owner: Boolean(teacher.is_owner ?? teacher.isOwner ?? false),
    is_writable: Boolean(teacher.is_writable ?? teacher.isWritable ?? true)
  }
}

const getInitial = (value) => {
  if (!value) return 'T'
  return String(value).trim().charAt(0).toUpperCase()
}

const filterOption = (input, option) => {
  const label = option?.label || ''
  return String(label).toLowerCase().includes(String(input || '').toLowerCase())
}

const loadCourseTeachers = async () => {
  if (!props.courseId) return

  loading.value = true
  try {
    const res = await getCourseTeachers(props.courseId)
    const data = Array.isArray(res?.data) ? res.data : Array.isArray(res?.list) ? res.list : []
    courseTeachers.value = data.map(normalizeTeacher).filter(Boolean)
  } catch (error) {
    console.error('获取课程老师失败:', error)
    message.error('获取课程老师失败')
    courseTeachers.value = []
  } finally {
    loading.value = false
  }
}

const loadTeacherOptions = async () => {
  try {
    const res = await getUserListApi({ page: 1, page_size: 200 }, { user_type: 'teacher' })
    const rawUsers = Array.isArray(res?.data) ? res.data : Array.isArray(res?.list) ? res.list : []
    const existingIds = new Set(courseTeachers.value.map(item => String(item.user_id ?? item.id ?? item.teacher_id ?? '')))

    teacherOptions.value = rawUsers
      .map(user => {
        const uid = String(user.id ?? user.user_id ?? user.userId ?? '')
        if (!uid || existingIds.has(uid)) return null
        return {
          value: uid,
          label: `${user.real_name || user.username || user.user_name || '未知老师'}${user.username ? ` (${user.username})` : ''}`
        }
      })
      .filter(Boolean)
  } catch (error) {
    console.error('获取教师选择列表失败:', error)
    teacherOptions.value = []
  }
}

const handleAddTeacher = async () => {
  if (!selectedTeacherId.value) return

  adding.value = true
  try {
    const res = await addTeacherToCourse(props.courseId, selectedTeacherId.value)
    if (res?.code === 200 || res?.code === 201 || res?.success) {
      message.success('添加成功')
      selectedTeacherId.value = undefined
      await loadCourseTeachers()
      await loadTeacherOptions()
    } else {
      message.error(res?.message || '添加失败')
    }
  } catch (error) {
    console.error('添加老师失败:', error)
    message.error(error?.message || '添加老师失败')
  } finally {
    adding.value = false
  }
}

const handleRemoveTeacher = async (teacher) => {
  const teacherId = teacher.user_id ?? teacher.id ?? teacher.teacher_id
  if (!teacherId) return

  if (teacher.is_owner) {
    message.warning('不能移除主讲老师')
    return
  }

  try {
    const res = await removeTeacherFromCourse(props.courseId, teacherId)
    if (res?.code === 200 || res?.success) {
      message.success('移除成功')
      await loadCourseTeachers()
      await loadTeacherOptions()
    } else {
      message.error(res?.message || '移除失败')
    }
  } catch (error) {
    console.error('移除老师失败:', error)
    message.error(error?.message || '移除老师失败')
  }
}

watch(
  () => props.courseId,
  async () => {
    await loadCourseTeachers()
    await loadTeacherOptions()
  },
  { immediate: true }
)

watch(
  () => courseTeachers.value,
  async () => {
    if (courseTeachers.value.length) {
      await loadTeacherOptions()
    }
  },
  { deep: true }
)
</script>

<style scoped>
.teacher-manager-card {
  margin-top: 24px;
}

.manager-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.manager-title {
  font-size: 18px;
  font-weight: 700;
}

.teacher-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.teacher-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 260px;
  padding: 10px 12px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  background: #fafafa;
}

.teacher-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.teacher-avatar {
  background: #e6f7ff;
  color: #1677ff;
  font-weight: 600;
}

.teacher-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.teacher-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.teacher-name {
  font-weight: 600;
}

.teacher-subtitle {
  font-size: 12px;
  color: #8c8c8c;
}

.teacher-add-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 8px;
}

.read-only-tip {
  margin-top: 12px;
  color: #8c8c8c;
}
</style>
