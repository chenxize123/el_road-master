<template>
  <a-modal
    v-model:open="visible"
    title="新增班级"
    width="680px"
    :confirm-loading="loading"
    ok-text="确定"
    cancel-text="取消"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      layout="vertical"
      :model="form"
      :rules="rules"
    >
      <a-row :gutter="16">
        <!-- 左列 -->
        <a-col :span="12">
          <a-form-item label="班级名称" name="title">
            <a-input
              v-model:value="form.title"
              placeholder="请输入班级名称"
            />
          </a-form-item>

          <a-form-item label="开始时间" name="start_time">
            <a-date-picker
              v-model:value="form.start_time"
              style="width: 100%"
              format="YYYY-MM-DD"
              placeholder="选择开始日期"
              value-format="YYYY-MM-DD"
            />
          </a-form-item>

          <a-form-item label="结束时间" name="end_time">
            <a-date-picker
              v-model:value="form.end_time"
              style="width: 100%"
              format="YYYY-MM-DD"
              placeholder="选择结束日期"
              value-format="YYYY-MM-DD"
            />
          </a-form-item>
        </a-col>

        <!-- 右列 -->
        <a-col :span="12">
          <a-form-item label="是否禁用" name="status">
            <a-switch
              v-model:checked="formDisabled"
              checked-children="禁用"
              un-checked-children="正常"
            />
          </a-form-item>

          <a-form-item label="课程选择" name="course_id">
            <a-select
              v-model:value="form.course_id"
              placeholder="请选择课程"
              style="width: 100%"
              :loading="courseLoading"
              show-search
              :filter-option="(input, option) => option.children.toLowerCase().includes(input.toLowerCase())"
            >
              <a-select-option
                v-for="course in courseList"
                :key="course.id"
                :value="course.id"
              >
                {{ course.title || course.name }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { createClassApi } from '@/api/class'
import { courseService } from '@/api/course'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  userRole: {
    type: String,
    default: 'teacher',
    validator: val => ['teacher', 'admin'].includes(val)
  },
  teacherId: {
    type: [Number, String],
    default: null
  }
})

const emit = defineEmits(['update:open', 'success'])

const formRef = ref(null)
const loading = ref(false)
const courseLoading = ref(false)
const courseList = ref([])

const visible = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const form = reactive({
  title: '',
  status: 0, // 0=正常，1=禁用
  is_open: true, // 后端仍需要此字段
  start_time: '',
  end_time: '',
  course_id: ''
})

// 开关的绑定值（true=禁用，false=正常）
const formDisabled = computed({
  get: () => form.status === 1,
  set: (value) => {
    form.status = value ? 1 : 0
  }
})

// 自定义验证规则
const validateDateRange = (rule, value) => {
  if (form.start_time && form.end_time) {
    const start = new Date(form.start_time)
    const end = new Date(form.end_time)
    if (start > end) {
      return Promise.reject('开始时间不能晚于结束时间')
    }
  }
  return Promise.resolve()
}

const rules = {
  title: [
    {
      required: true,
      message: '请输入班级名称',
      trigger: 'blur'
    }
  ],
  start_time: [
    {
      required: true,
      message: '请选择开始时间',
      trigger: 'change'
    },
    { validator: validateDateRange, trigger: ['change', 'blur'] }
  ],
  end_time: [
    {
      required: true,
      message: '请选择结束时间',
      trigger: 'change'
    },
    { validator: validateDateRange, trigger: ['change', 'blur'] }
  ],
  course_id: [
    {
      required: true,
      message: '请选择课程',
      trigger: 'change'
    }
  ]
}

// 获取课程列表
const fetchCourseList = async () => {
  courseLoading.value = true
  try {
    let result

    if (props.userRole === 'admin') {
      // 管理员：获取所有课程（带分页）
      result = await courseService.getTeacherCourses({ page: 1, page_size: 1000 })
    } else {
      // 教师：获取自己的课程
      result = await courseService.getTeacherCourses(props.teacherId)
    }

    console.log('课程列表响应:', result)

    // 处理数据，确保 id 是字符串
    const courses = result.data?.list || result.data || []
    courseList.value = courses.map(course => ({
      ...course,
      id: String(course.id) // 确保 id 是字符串
    }))
  } catch (error) {
    // console.error('获取课程列表失败:', error)
    // message.error('获取课程列表失败')
  } finally {
    courseLoading.value = false
  }
}

// 打开弹窗时获取课程
watch(
  () => props.open,
  newVal => {
    if (newVal) {
      fetchCourseList()
    }
  }
)

const resetForm = () => {
  form.title = ''
  form.status = 0 // 默认正常（不禁用）
  form.is_open = true
  form.start_time = ''
  form.end_time = ''
  form.course_id = ''
  formRef.value?.clearValidate()
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    loading.value = true

    // 构建提交数据
    const submitData = {
      title: form.title,
      status: form.status, // 0=正常，1=禁用
      is_open: form.is_open, // 后端仍需要此字段
      start_time: form.start_time,
      end_time: form.end_time,
      course_id: form.course_id // 保持字符串，避免大整数精度丢失
    }

    // 使用统一的 API 模块
    const result = await createClassApi(submitData)
    console.log('创建结果:', result)

    message.success('班级创建成功')

    visible.value = false
    resetForm()

    emit('success')
  } catch (error) {
    if (error?.errorFields) return
    message.error(error?.message || '班级创建失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  visible.value = false
  resetForm()
}
</script>
