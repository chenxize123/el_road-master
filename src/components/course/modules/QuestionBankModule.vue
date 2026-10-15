<!--
 * @Date         : 2026-05-14
 * @Description  : 题库模块组件
 * @FilePath     : QuestionBankModule.vue
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="question-bank-module">
    <!-- 操作栏 -->
    <div class="action-bar">
      <a-button type="primary" :disabled="isVisitor" @click="handleCreate">
        <template #icon><plus-outlined /></template>
        新建题库
      </a-button>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <a-table
        :columns="columns"
        :data-source="dataList"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        :scroll="{ x: 800 }"
      >
        <!-- 操作列 -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" :disabled="isVisitor" @click="handleEnterDetail(record)">
                <template #icon><eye-outlined /></template>
                管理题目
              </a-button>
              <a-button type="link" size="small" :disabled="isVisitor" @click="handleEdit(record)">
                编辑
              </a-button>
              <a-popconfirm
                title="确定要删除这个题库吗？"
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
    </div>

    <!-- 新建/编辑弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingRecord ? '编辑题库' : '新建题库'"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
      :confirmLoading="saving"
    >
      <a-form :model="formData" layout="vertical">
        <a-form-item label="题库名称" required>
          <a-input v-model:value="formData.title" placeholder="请输入题库名称" />
        </a-form-item>
        <a-form-item label="题库描述">
          <a-textarea
            v-model:value="formData.description"
            placeholder="请输入题库描述"
            :rows="4"
          />
        </a-form-item>
        <a-form-item label="公开状态">
          <a-switch
            v-model:checked="formData.is_open"
            checked-children="公开"
            un-checked-children="私有"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useUserStore } from '@/store'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons-vue'
import {
  getQuestionBankList,
  createQuestionBank,
  updateQuestionBank,
  deleteQuestionBank
} from '@/api/questionBank'

const props = defineProps({
  courseId: {
    type: [String, Number],
    required: true
  }
})

const router = useRouter()
const userStore = useUserStore()
const isVisitor = computed(() => userStore.userInfo?.user_type === 'visitor')

// 状态
const loading = ref(false)
const saving = ref(false)
const dataList = ref([])
const modalVisible = ref(false)
const editingRecord = ref(null)

// 表单数据
const formData = ref({
  title: '',
  description: '',
  is_open: true
})

// 分页配置
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

// 表格列配置
const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 120,
    customRender: ({ text }) => String(text).slice(-6) // 显示ID后6位
  },
  {
    title: '题库名称',
    dataIndex: 'title',
    key: 'title'
  },
  {
    title: '题库描述',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true
  },
  {
    title: '状态',
    dataIndex: 'is_open',
    key: 'is_open',
    width: 80
  },
  {
    title: '创建人',
    dataIndex: 'create_by',
    key: 'create_by',
    width: 100
  },
  {
    title: '所属课程',
    dataIndex: 'course',
    key: 'course',
    width: 120
  },
  {
    title: '所有者',
    dataIndex: 'owner',
    key: 'owner',
    width: 100
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right'
  }
]

// 获取列表数据
const fetchDataList = async () => {
  loading.value = true
  try {
    const res = await getQuestionBankList(props.courseId)
    if (res.code === 200) {
      dataList.value = Array.isArray(res.data) ? res.data : []
      pagination.value.total = dataList.value.length
    } else {
      message.error(res.message || '获取题库列表失败')
    }
  } catch (err) {
    console.error('获取题库列表失败:', err)
    message.error('获取题库列表失败')
  } finally {
    loading.value = false
  }
}

// 进入题库详情页
const handleEnterDetail = (record) => {
  router.push(`/question-bank/${record.id}`)
}

// 新建
const handleCreate = () => {
  editingRecord.value = null
  formData.value = {
    title: '',
    description: '',
    is_open: true
  }
  modalVisible.value = true
}

// 编辑
const handleEdit = (record) => {
  editingRecord.value = record
  formData.value = {
    title: record.title || '',
    description: record.description || '',
    is_open: record.is_open !== undefined ? record.is_open : true
  }
  modalVisible.value = true
}

// 删除
const handleDelete = async (id) => {
  try {
    const res = await deleteQuestionBank(id)
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
  if (!formData.value.title.trim()) {
    message.warning('请输入题库名称')
    return
  }

  saving.value = true
  try {
    const requestData = {
      ...formData.value,
      courseId: props.courseId
    }

    let res
    if (editingRecord.value) {
      res = await updateQuestionBank(editingRecord.value.id, requestData)
    } else {
      res = await createQuestionBank(requestData)
    }

    if (res.code === 200) {
      message.success(editingRecord.value ? '更新成功' : '创建成功')
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
    is_open: true
  }
}

onMounted(() => {
  fetchDataList()
})
</script>

<style scoped>
.question-bank-module {
  min-height: 400px;
}

.action-bar {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}

/* 表格容器响应式样式 */
.table-container {
  width: 100%;
  overflow-x: auto;
  background: #fff;
  border-radius: 6px;
}

/* 在小屏幕设备上启用横向滚动 */
@media screen and (max-width: 768px) {
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch; /* iOS 滚动优化 */
  }

  :deep(.ant-table) {
    min-width: 800px; /* 确保表格有最小宽度以触发滚动 */
  }

  :deep(.ant-table-thead > tr > th),
  :deep(.ant-table-tbody > tr > td) {
    white-space: nowrap; /* 防止文本换行 */
  }
}

/* 中等屏幕设备 */
@media screen and (max-width: 1024px) and (min-width: 769px) {
  .table-container {
    overflow-x: auto;
  }

  :deep(.ant-table) {
    min-width: 600px;
  }
}
</style>
