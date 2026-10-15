<!--
 * @Date         : 2026-05-14
 * @Description  : 试卷模块组件
 * @FilePath     : ExamPaperModule.vue
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="exam-paper-module">
    <!-- 操作栏 -->
    <div class="action-bar">
      <a-space>
        <a-button :disabled="isVisitor" @click="goToOneClickPaper">
          <template #icon><ThunderboltOutlined /></template>
          一键组卷
        </a-button>
        <a-button type="primary" :disabled="isVisitor" @click="goToCreatePaper">
          <template #icon><plus-outlined /></template>
          新建试卷
        </a-button>
      </a-space>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <a-spin tip="正在加载试卷列表..." />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <a-result
        status="error"
        title="加载失败"
        :sub-title="error"
      >
        <template #extra>
          <a-button type="primary" @click="fetchPaperList">
            重新加载
          </a-button>
        </template>
      </a-result>
    </div>

    <!-- 空数据状态 -->
    <div v-else-if="!paperList.length" class="empty-container">
      <a-empty description="暂无试卷数据" >
        <template #extra>
          <a-button type="primary" :disabled="isVisitor" @click="goToCreatePaper">
            创建第一个试卷
          </a-button>
        </template>
      </a-empty>
    </div>

    <!-- 试卷列表 -->
    <div v-else>
      <a-table
        :columns="columns"
        :data-source="paperList"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        class="paper-table"
      >
        <!-- 试卷标题列 -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'">
            <a-typography-text strong class="paper-title">
              {{ record.title }}
            </a-typography-text>
          </template>

          <!-- 操作列 -->
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button
                type="link"
                size="small"
                @click="goToPaperDetail(record.id)"
              >
                查看详情
              </a-button>
              <a-button
                type="link"
                size="small"
                danger
                @click="handleDelete(record)"
              >
                <template #icon><DeleteOutlined /></template>
                删除
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { useUserStore } from '@/store'
import { PlusOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons-vue'
import { getExamPaperList, deleteExamPaper } from '@/api/examPaper'

const props = defineProps({
  courseId: {
    type: [String, Number],
    required: true
  }
})

const router = useRouter()
const userStore = useUserStore()
const isVisitor = computed(() => userStore.userInfo?.user_type === 'visitor')

// 状态管理
const loading = ref(false)
const error = ref(null)
const paperList = ref([])

// 分页配置
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total, range) => `共 ${total} 条记录，第 ${range[0]}-${range[1]} 条`
})

// 表格列配置
const columns = [
  {
    title: '试卷标题',
    dataIndex: 'title',
    key: 'title',
    width: '30%'
  },
  {
    title: '题目数量',
    dataIndex: 'total_question',
    key: 'total_question',
    width: '15%',
    align: 'center'
  },
  {
    title: '总分',
    dataIndex: 'total_score',
    key: 'total_score',
    width: '15%',
    align: 'center'
  },
  {
    title: '创建人',
    dataIndex: 'create_by',
    key: 'create_by',
    width: '15%'
  },
  {
    title: '所属课程',
    dataIndex: 'course',
    key: 'course',
    width: '15%'
  },
  {
    title: '所有者',
    dataIndex: 'owner',
    key: 'owner',
    width: '10%'
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
    align: 'center'
  }
]

/**
 * 获取试卷列表
 */
const fetchPaperList = async () => {
  loading.value = true
  error.value = null

  try {
    const res = await getExamPaperList(props.courseId)

    if (res.code === 200) {
      paperList.value = Array.isArray(res.data) ? res.data : []
      pagination.value.total = paperList.value.length
    } else {
      error.value = res.message || '获取试卷列表失败'
      message.error(error.value)
    }
  } catch (err) {
    console.error('获取试卷列表失败:', err)
    error.value = err.message || '网络请求失败，请检查网络连接'
    message.error(error.value)
  } finally {
    loading.value = false
  }
}

/**
 * 跳转到新建试卷页面
 */
const goToCreatePaper = () => {
  router.push(`/paper/create?course_id=${props.courseId}`)
}

const goToOneClickPaper = () => {
  router.push(`/paper/one-click?course_id=${props.courseId}`)
}

/**
 * 跳转到试卷详情页面
 */
const goToPaperDetail = (paperId) => {
  router.push(`/paper/detail/${paperId}`)
}

/**
 * 删除试卷
 */
const handleDelete = (record) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除试卷「${record.title}」吗？相关考试与成绩也会删除，删除后将无法恢复。`,
    okText: '确认删除',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        const res = await deleteExamPaper(record.id)
        if (res.code === 200) {
          message.success('删除成功')
          fetchPaperList()
        } else {
          message.error(res.message || '删除失败')
        }
      } catch (err) {
        console.error('删除试卷失败:', err)
        message.error(err.message || '网络请求失败，请检查网络连接')
      }
    }
  })
}

// 初始化加载
onMounted(() => {
  fetchPaperList()
})

// 暴露方法给父组件使用
defineExpose({
  fetchPaperList
})
</script>

<style scoped>
.exam-paper-module {
  min-height: 400px;
}

.action-bar {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.error-container {
  min-height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-container {
  min-height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.paper-table {
  background: #fff;
  border-radius: 8px;
}

.paper-title {
  color: #1890ff;
  cursor: pointer;
  transition: color 0.3s;
}

.paper-title:hover {
  color: #40a9ff;
}

:deep(.ant-table-thead > tr > th) {
  background: #fafafa;
  font-weight: 600;
}

:deep(.ant-table-tbody > tr:hover > td) {
  background: #f5f5f5;
}
</style>
