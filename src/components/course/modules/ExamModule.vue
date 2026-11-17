<!--
 * @Date         : 2026-05-14
 * @Description  : 考试模块组件
 * @FilePath     : ExamModule.vue
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="exam-module">
    <!-- 操作栏 -->
    <div class="action-bar">
      <a-button v-if="canManage" type="primary" @click="handleCreate">
        <template #icon><PlusOutlined /></template>
        新建考试
      </a-button>
    </div>

    <!-- 数据表格 -->
    <a-table
      :columns="columns"
      :data-source="dataList"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      :scroll="{ x: 1200 }"
    >
      <!-- 操作列 -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'actions'">
          <a-space v-if="canManage" wrap>
            <a-button
              type="link"
              size="small"
              @click="openPublish(record, 'publish')"
            >
              发布到班级
            </a-button>
            <a-button
              type="link"
              size="small"
              @click="openPublish(record, 'manage')"
            >
              管理发布
            </a-button>
            <template v-if="getExamStatus(record) === 'upcoming'">
              <a-button type="link" size="small" @click="handleStartNow(record)">
                立即开始
              </a-button>
            </template>
            <template v-if="getExamStatus(record) === 'ongoing'">
              <a-button type="link" size="small" danger @click="handleEndNow(record)">
                立即结束
              </a-button>
            </template>
            <a-button type="link" size="small" @click="handleEdit(record)">
              编辑
            </a-button>
            <a-popconfirm
              title="确定要删除这个考试吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="handleDelete(record.id)"
            >
              <a-button type="link" size="small" danger>
                删除
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 新建/编辑弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingRecord ? '编辑考试' : '新建考试'"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
      :confirmLoading="saving"
      width="800px"
    >
      <a-form :model="formData" layout="vertical" :rules="formRules" ref="formRef">
        <a-form-item label="考试标题" name="title" required>
          <a-input v-model:value="formData.title" placeholder="请输入考试标题" />
        </a-form-item>

        <a-form-item label="考试说明" name="description">
          <a-textarea
            v-model:value="formData.description"
            placeholder="请输入考试说明"
            :rows="3"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="考试时长(分钟)" name="total_duration" required>
              <a-input-number
                v-model:value="formData.total_duration"
                :min="1"
                :max="1440"
                placeholder="请输入考试时长"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="及格分数" name="passing_score" required>
              <a-input-number
                v-model:value="formData.passing_score"
                :min="0"
                :max="1000"
                placeholder="请输入及格分数"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="开始时间" name="start_time" required>
              <a-date-picker
                v-model:value="formData.start_time"
                show-time
                placeholder="请选择开始时间"
                style="width: 100%"
                :disabled-date="disabledStartDate"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="结束时间" name="end_time" required>
              <a-date-picker
                v-model:value="formData.end_time"
                show-time
                placeholder="请选择结束时间"
                style="width: 100%"
                :disabled-date="disabledEndDate"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="选择试卷" name="paper_id" required>
          <a-select
            v-model:value="formData.paper_id"
            placeholder="请选择试卷"
            :loading="paperLoading"
            @focus="loadPaperList"
          >
            <a-select-option
              v-for="item in paperList"
              :key="item.id"
              :value="item.id"
            >
              <div class="paper-option">
                <div class="paper-title">{{ item.title }}</div>
                <div class="paper-info">
                  <span>题目数: {{ item.total_question }}</span>
                  <span>总分: {{ item.total_score }}</span>
                  <span>创建人: {{ item.create_by }}</span>
                </div>
              </div>
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <PublishAssignmentModal
      v-model:open="publishVisible"
      :item="publishingRecord"
      kind="exam"
      :mode="publishDialogMode"
      :course-id="courseId"
      @updated="fetchDataList"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { computed } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/store'
import {
  getExamsByCourseId,
  createExam,
  updateExam,
  deleteExam
} from '@/api/exam'
import {
  getExamPaperList
} from '@/api/examPaper'
import PublishAssignmentModal from '@/components/course/PublishAssignmentModal.vue'

const props = defineProps({
  courseId: {
    type: [String, Number],
    required: true
  }
})

const userStore = useUserStore()
const canManage = computed(() => ['admin', 'teacher'].includes(userStore.userInfo?.user_type))

// 状态
const loading = ref(false)
const saving = ref(false)
const dataList = ref([])
const modalVisible = ref(false)
const editingRecord = ref(null)
const paperLoading = ref(false)
const publishVisible = ref(false)
const publishingRecord = ref(null)
const publishDialogMode = ref('manage')

// 表单数据和引用
const formRef = ref(null)
const formData = ref({
  title: '',
  description: '',
  total_duration: undefined,
  passing_score: undefined,
  start_time: null,
  end_time: null,
  paper_id: undefined
})

// 下拉选项数据
const paperList = ref([])

// 分页配置
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

// 获取考试状态
const getExamStatus = (record) => {
  const now = dayjs()
  const start = dayjs(record.start_time)
  const end = dayjs(record.end_time)

  if (now.isBefore(start)) {
    return 'upcoming'
  } else if (now.isAfter(end)) {
    return 'ended'
  } else {
    return 'ongoing'
  }
}

// 表格列配置
const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80
  },
  {
    title: '考试名称',
    dataIndex: 'title',
    key: 'title'
  },
  {
    title: '考试描述',
    dataIndex: 'description',
    key: 'description'
  },
  {
    title: '开始时间',
    dataIndex: 'start_time',
    key: 'start_time',
    customRender: ({ text }) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
  },
  {
    title: '结束时间',
    dataIndex: 'end_time',
    key: 'end_time',
    customRender: ({ text }) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    customRender: ({ record }) => {
      const status = getExamStatus(record)
      let color = 'default'
      let text = '未开始'
      if (status === 'ongoing') {
        color = 'processing'
        text = '进行中'
      } else if (status === 'ended') {
        color = 'error'
        text = '已结束'
      }
      return h('a-tag', { color }, () => text)
    }
  },
  {
    title: '发布状态',
    key: 'publish_status',
    width: 140,
    customRender: ({ record }) => {
      const count = Number(record.publish_count || 0)
      const text = record.publish_status || (count > 0 ? `已发布（${count}）` : '未发布')
      return h('a-tag', { color: count > 0 ? 'green' : 'default' }, () => text)
    }
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt'
  },
  {
    title: '操作',
    key: 'actions',
    width: 420,
    fixed: 'right'
  }
]

// 表单验证规则
const formRules = {
  title: [{ required: true, message: '请输入考试标题', trigger: 'blur' }],
  total_duration: [{ required: true, message: '请输入考试时长', trigger: 'blur' }],
  passing_score: [{ required: true, message: '请输入及格分数', trigger: 'blur' }],
  start_time: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  end_time: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  paper_id: [{ required: true, message: '请选择试卷', trigger: 'change' }]
}

// 获取列表数据
const fetchDataList = async () => {
  loading.value = true
  try {
    const res = await getExamsByCourseId(props.courseId)
    if (res.code === 200) {
      dataList.value = Array.isArray(res.data) ? res.data : []
      pagination.value.total = dataList.value.length
    } else {
      message.error(res.message || '获取考试列表失败')
    }
  } catch (err) {
    console.error('获取考试列表失败:', err)
    message.error('获取考试列表失败')
  } finally {
    loading.value = false
  }
}

// 加载试卷列表
const loadPaperList = async () => {
  if (paperList.value.length > 0) return

  paperLoading.value = true
  try {
    const res = await getExamPaperList(props.courseId)
    if (res.code === 200) {
      paperList.value = Array.isArray(res.data) ? res.data : []
    } else {
      message.error(res.message || '获取试卷列表失败')
    }
  } catch (err) {
    console.error('获取试卷列表失败:', err)
    message.error('获取试卷列表失败')
  } finally {
    paperLoading.value = false
  }
}

// 日期选择禁用规则
const disabledStartDate = (current) => {
  if (!current) return false
  // 开始时间不能大于结束时间
  if (formData.value.end_time) {
    return current.isAfter(formData.value.end_time)
  }
  return false
}

const disabledEndDate = (current) => {
  if (!current) return false
  // 结束时间不能小于开始时间
  if (formData.value.start_time) {
    return current.isBefore(formData.value.start_time)
  }
  return false
}

// 新建
const handleCreate = () => {
  editingRecord.value = null
  formData.value = {
    title: '',
    description: '',
    total_duration: undefined,
    passing_score: undefined,
    start_time: null,
    end_time: null,
    paper_id: undefined
  }
  modalVisible.value = true
  // 重置表单验证状态
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 编辑
const handleEdit = (record) => {
  editingRecord.value = record
  formData.value = {
    title: record.title || '',
    description: record.description || '',
    total_duration: record.total_duration || undefined,
    passing_score: record.passing_score || undefined,
    start_time: record.start_time ? dayjs(record.start_time) : null,
    end_time: record.end_time ? dayjs(record.end_time) : null,
    paper_id: record.paper_id || undefined
  }
  modalVisible.value = true
  // 重置表单验证状态
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 立即开始考试
const handleStartNow = async (record) => {
  try {
    const now = dayjs()
    const requestData = {
      id: record.id,
      title: record.title,
      total_duration: Number(record.total_duration),
      passing_score: Number(record.passing_score),
      description: record.description,
      start_time: now.format('YYYY-MM-DD HH:mm:ss'),
      end_time: record.end_time,
      course_id: props.courseId,
      paper_id: record.paper_id
    }
    const res = await updateExam(requestData)
    if (res.code === 200) {
      message.success('考试已开始')
      fetchDataList()
    } else {
      message.error(res.message || '操作失败')
    }
  } catch (err) {
    console.error('操作失败:', err)
    message.error('操作失败')
  }
}

// 立即结束考试
const handleEndNow = async (record) => {
  try {
    const now = dayjs()
    const requestData = {
      id: record.id,
      title: record.title,
      total_duration: Number(record.total_duration),
      passing_score: Number(record.passing_score),
      description: record.description,
      start_time: record.start_time,
      end_time: now.format('YYYY-MM-DD HH:mm:ss'),
      course_id: props.courseId,
      paper_id: record.paper_id
    }
    const res = await updateExam(requestData)
    if (res.code === 200) {
      message.success('考试已结束')
      fetchDataList()
    } else {
      message.error(res.message || '操作失败')
    }
  } catch (err) {
    console.error('操作失败:', err)
    message.error('操作失败')
  }
}

// 删除
const handleDelete = async (id) => {
  try {
    const res = await deleteExam(id)
    if (res.code === 200) {
      message.success('删除成功')
      fetchDataList()
    } else {
      message.error(res.message || '删除失败')
    }
  } catch (err) {
    console.error('删除失败:', err)
    message.error('删除失败')
  }
}

// 弹窗确认
const handleModalOk = async () => {
  // 表单验证
  try {
    await formRef.value.validate()
  } catch (error) {
    return
  }

  // 验证结束时间必须晚于开始时间
  if (formData.value.start_time && formData.value.end_time) {
    if (formData.value.end_time.isBefore(formData.value.start_time)) {
      message.warning('结束时间必须晚于开始时间')
      return
    }
  }

  saving.value = true
  try {
    // 组装请求数据
    const requestData = {
      title: formData.value.title,
      total_duration: Number(formData.value.total_duration),
      passing_score: Number(formData.value.passing_score),
      description: formData.value.description,
      start_time: formData.value.start_time ? formData.value.start_time.format('YYYY-MM-DD HH:mm:ss') : null,
      end_time: formData.value.end_time ? formData.value.end_time.format('YYYY-MM-DD HH:mm:ss') : null,
      course_id: props.courseId,
      paper_id: formData.value.paper_id
    }

    let res
    if (editingRecord.value) {
      res = await updateExam({ ...requestData, id: editingRecord.value.id })
    } else {
      res = await createExam(requestData)
    }

    if (res.code === 200) {
      message.success(editingRecord.value ? '更新成功' : '考试创建成功')
      modalVisible.value = false
      fetchDataList()
    } else {
      message.error(res.message || '操作失败')
    }
  } catch (err) {
    console.error('操作失败:', err)
    message.error('操作失败')
  } finally {
    saving.value = false
  }
}

// 弹窗取消
const handleModalCancel = () => {
  modalVisible.value = false
  editingRecord.value = null
  formData.value = {
    title: '',
    description: '',
    total_duration: undefined,
    passing_score: undefined,
    start_time: null,
    end_time: null,
    paper_id: undefined
  }
  // 重置表单验证状态
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

function openPublish(record, mode) {
  publishingRecord.value = record
  publishDialogMode.value = mode
  publishVisible.value = true
}

onMounted(() => {
  fetchDataList()
})
</script>

<style scoped>
.exam-module {
  min-height: 400px;
}

.action-bar {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}

.class-option,
.paper-option {
  padding: 8px 0;
}

.class-title,
.paper-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: #1890ff;
}

.class-info,
.paper-info {
  font-size: 12px;
  color: #666;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.ant-select-item-option-content) {
  padding: 4px 0;
}

:deep(.ant-form-item) {
  margin-bottom: 16px;
}

:deep(.ant-modal-body) {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
