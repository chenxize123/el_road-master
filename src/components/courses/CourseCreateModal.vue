<!--
 * @Date         : 2026-05-13 10:30:00
 * @Description  : 新建课程模态框组件
 * @FilePath     : CourseCreateModal.vue
 * @LastEditTime : 2026-05-28 20:13:43
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <a-modal
    v-model:open="visible"
    title="新建课程"
    :confirm-loading="loading"
    @ok="handleOk"
    @cancel="handleCancel"
    width="520px"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      layout="vertical"
    >
      <a-form-item label="课程名称" name="title">
        <a-input
          v-model:value="formData.title"
          placeholder="请输入课程名称"
          :disabled="loading"
        />
      </a-form-item>

      <a-form-item label="课程描述" name="description">
        <a-textarea
          v-model:value="formData.description"
          placeholder="请输入课程描述"
          :rows="4"
          :disabled="loading"
        />
      </a-form-item>

      <a-form-item label="课时数" name="class_hour">
        <a-input-number
          v-model:value="formData.class_hour"
          :min="1"
          :max="999"
          placeholder="请输入课时数"
          :disabled="loading"
          style="width: 100%"
        />
      </a-form-item>

      <!-- 管理员创建时需要选择教师 -->
      <a-form-item
        v-if="showTeacherField"
        label="授课教师"
        name="teacher_id"
      >
        <a-select
          v-model:value="formData.teacher_id"
          placeholder="请选择授课教师"
          :disabled="loading"
          :loading="teacherLoading"
          show-search
          :filter-option="(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          "
          style="width: 100%"
        >
          <a-select-option
            v-for="teacher in teacherList"
            :key="teacher.id"
            :value="teacher.id"
            :label="teacher.nickname || teacher.username"
          >
            {{ teacher.real_name || teacher.username }}
            <span v-if="teacher.username" style="color: #999; margin-left: 8px">
              ({{ teacher.username }})
            </span>
          </a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { getUserListApi } from '@/api/user'
import { createCourseApi } from '@/api/course'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  userRole: {
    type: String,
    default: 'admin' // 'admin' or 'teacher'
  }
})

const emits = defineEmits(['update:open', 'success'])

// 表单引用和数据
const formRef = ref()
const formData = ref({
  title: '',
  description: '',
  class_hour: null,
  teacher_id: undefined
})

// 模态框可见性
const visible = computed({
  get: () => props.open,
  set: (value) => emits('update:open', value)
})

// 加载状态
const loading = ref(false)
const teacherLoading = ref(false)

// 教师列表
const teacherList = ref([])

// 是否显示教师字段（只有管理员需要）
const showTeacherField = computed(() => props.userRole === 'admin')

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入课程名称', trigger: 'blur' },
    { min: 2, max: 50, message: '课程名称长度应在2-50个字符之间', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入课程描述', trigger: 'blur' },
    { min: 10, max: 200, message: '课程描述长度应在10-200个字符之间', trigger: 'blur' }
  ],
  class_hour: [
    { required: true, message: '请输入课时数', trigger: 'change' },
    { type: 'number', min: 1, max: 999, message: '课时数应在1-999之间' }
  ],
  teacher_id: [
    { required: showTeacherField.value, message: '请输入授课教师姓名或ID', trigger: 'blur' }
  ]
}

// 获取教师列表
const fetchTeachers = async () => {
  if (!showTeacherField.value) return

  try {
    teacherLoading.value = true
    // 先获取教师
    const teacherRes = await getUserListApi(
      { page: 1, page_size: 100 },
      { user_type: 'teacher' }
    )
    // 再获取管理员
    const adminRes = await getUserListApi(
      { page: 1, page_size: 100 },
      { user_type: 'visitor' }
    )
    console.log('教师列表:', teacherRes)
    console.log('管理员列表:', adminRes)
    // 合并两个列表
    const teachers = Array.isArray(teacherRes.data) ? teacherRes.data : []
    const admins = Array.isArray(adminRes.data) ? adminRes.data : []
    teacherList.value = [...teachers, ...admins]
    console.log('获取教师列表完成', teacherList.value)
  } catch (error) {
    console.error('获取教师列表失败:', error)
    message.error('获取教师列表失败')
  } finally {
    teacherLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  formData.value = {
    title: '',
    description: '',
    class_hour: null,
    teacher_id: undefined
  }
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 处理确定按钮点击
const handleOk = async () => {
  try {
    await formRef.value.validate()

    loading.value = true

    // 准备请求数据
    const requestData = {
      title: formData.value.title.trim(),
      description: formData.value.description.trim(),
      class_hour: Number(formData.value.class_hour)
    }

    // 只有管理员创建时才包含 teacher_id
    if (props.userRole === 'admin' && formData.value.teacher_id) {
      requestData.teacher_id = formData.value.teacher_id
    }

    // 调用创建课程的API
    const res = await createCourseApi(requestData)
    message.success('课程创建成功')
    emits('success', res.data)
    handleCancel()

  } catch (error) {
    if (error?.name !== 'ValidationError') {
      console.error('创建课程失败:', error)
      message.error(error?.message || '创建课程失败')
    }
  } finally {
    loading.value = false
  }
}

// 处理取消按钮点击
const handleCancel = () => {
  resetForm()
  visible.value = false
}

// 监听模态框打开状态变化
watch(() => props.open, (newVal) => {
  if (newVal) {
    resetForm()
    fetchTeachers()
  }
})
</script>

<style scoped>
/* 可以添加自定义样式 */
</style>