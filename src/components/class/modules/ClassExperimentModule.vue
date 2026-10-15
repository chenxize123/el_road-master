<template>
  <div class="class-experiment-module">
    <div class="experiment-toolbar">
      <div class="toolbar-title">
        <h3>实验管理</h3>
        <span>{{ experiments.length }} 个实验</span>
      </div>
      <a-button v-if="isTeacherOrAdmin" type="primary" @click="handleCreate">
        <template #icon><PlusOutlined /></template>
        创建实验
      </a-button>
    </div>

    <a-alert
      v-if="error"
      class="experiment-alert"
      message="加载失败"
      :description="error"
      type="error"
      show-icon
    >
      <template #action>
        <a-button size="small" danger @click="fetchExperiments">重试</a-button>
      </template>
    </a-alert>

    <a-table
      :columns="columns"
      :data-source="experiments"
      :loading="loading || props.loading"
      row-key="id"
      :pagination="{ pageSize: 10, showSizeChanger: false }"
      :locale="{ emptyText: '暂无实验数据' }"
      :scroll="{ x: tableScrollX }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'title'">
          <a-button type="link" class="title-link" @click="handleView(record)">
            {{ record.title || '-' }}
          </a-button>
        </template>

        <template v-else-if="column.key === 'score'">
          {{ formatScore(record.score) }}
        </template>

        <template v-else-if="column.key === 'start_time'">
          {{ formatDateTime(record.start_time) }}
        </template>

        <template v-else-if="column.key === 'end_time'">
          {{ formatDateTime(record.end_time) }}
        </template>

        <template v-else-if="column.key === 'submit_status'">
          <a-spin v-if="studentResultsLoading" size="small" />
          <div v-else class="status-cell">
            <a-tag :color="getStudentResultStatus(record).color">
              {{ getStudentResultStatus(record).text }}
            </a-tag>
            <span v-if="isCodeScoreFailed(getStudentResult(record))" class="status-hint">
              请重新提交
            </span>
          </div>
        </template>

        <template v-else-if="column.key === 'question_state'">
          <a-spin v-if="studentResultsLoading" size="small" />
          <a-tag v-else :color="getQuestionStateColor(getStudentResult(record))">
            {{ formatQuestionState(getStudentResult(record)) }}
          </a-tag>
        </template>

        <template v-else-if="column.key === 'actions'">
          <a-space class="action-space" :size="[6, 4]" wrap>
            <a-button type="link" size="small" @click="handleView(record)">查看</a-button>

            <template v-if="isTeacherOrAdmin">
              <a-button type="link" size="small" @click="handleOpenResults(record)">提交列表</a-button>
              <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
              <a-popconfirm
                title="确定要删除这个实验吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDelete(record.id)"
              >
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </template>

            <template v-else>
              <a-button
                type="link"
                size="small"
                :danger="isCodeScoreFailed(getStudentResult(record))"
                :disabled="isQuestionAnswered(getStudentResult(record))"
                @click="handleOpenSubmit(record)"
              >
                {{ hasSubmittedResult(record) ? (isCodeScoreFailed(getStudentResult(record)) ? '重新提交实验' : '重新提交') : '提交实验' }}
              </a-button>
              <a-button
                v-if="hasSubmittedResult(record)"
                type="link"
                size="small"
                @click="handleViewResult(getStudentResult(record))"
              >
                查看提交
              </a-button>
              <a-button
                v-if="canAnswerQuestions(getStudentResult(record))"
                type="link"
                size="small"
                @click="handleOpenQuestionAnswer(getStudentResult(record))"
              >
                {{ isQuestionAnswered(getStudentResult(record)) ? '查看问答' : '代码问答' }}
              </a-button>
              <a-popconfirm
                v-if="hasSubmittedResult(record) && !isQuestionAnswered(getStudentResult(record))"
                title="确定要删除这次实验提交吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDeleteResult(getStudentResult(record).id)"
              >
                <a-button type="link" size="small" danger>删除提交</a-button>
              </a-popconfirm>
              <a-button
                v-else-if="hasSubmittedResult(record)"
                type="link"
                size="small"
                danger
                disabled
              >
                删除提交
              </a-button>
            </template>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="modalVisible"
      :title="editingRecord ? '编辑实验' : '创建实验'"
      :confirm-loading="saving"
      :width="modalWidth"
      destroy-on-close
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <a-form-item label="实验标题" name="title" required>
          <a-input v-model:value="formData.title" placeholder="请输入实验标题" :maxlength="100" show-count />
        </a-form-item>
        <a-form-item label="实验说明" name="explanation">
          <a-textarea v-model:value="formData.explanation" placeholder="请输入实验说明" :rows="4" :maxlength="2000" show-count />
        </a-form-item>
        <a-form-item label="实验分数" name="score" required>
          <a-input-number v-model:value="formData.score" :min="0" :max="10000" style="width: 100%" placeholder="请输入实验分数" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :xs="24" :sm="12">
            <a-form-item label="开始时间" name="start_time" required>
              <a-date-picker v-model:value="formData.start_time" show-time style="width: 100%" placeholder="请选择开始时间" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item label="结束时间" name="end_time" required>
              <a-date-picker v-model:value="formData.end_time" show-time style="width: 100%" placeholder="请选择结束时间" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="submitModalVisible"
      :title="`${currentExperiment?.title || '实验'} - 提交实验`"
      :confirm-loading="resultSaving"
      :width="submitModalWidth"
      destroy-on-close
      @ok="handleSubmitResult"
      @cancel="handleCancelSubmitResult"
    >
      <a-form ref="resultFormRef" :model="resultForm" :rules="resultRules" layout="vertical">
        <a-form-item label="实验内容 / 代码" name="code" required>
          <a-textarea
            v-model:value="resultForm.code"
            placeholder="请输入实验代码或实验内容"
            :rows="12"
            :maxlength="20000"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer v-model:open="detailVisible" title="实验详情" :width="drawerWidth" :closable="true" @close="detailVisible = false">
      <a-spin v-if="detailLoading" tip="加载实验详情中..." />
      <a-descriptions v-else bordered :column="1">
        <a-descriptions-item label="实验ID">{{ detailRecord.id || '-' }}</a-descriptions-item>
        <a-descriptions-item label="标题">{{ detailRecord.title || '-' }}</a-descriptions-item>
        <a-descriptions-item label="说明">
          <div class="detail-explanation">{{ detailRecord.explanation || '-' }}</div>
        </a-descriptions-item>
        <a-descriptions-item label="分数">{{ formatScore(detailRecord.score) }}</a-descriptions-item>
        <a-descriptions-item label="开始时间">{{ formatDateTime(detailRecord.start_time) }}</a-descriptions-item>
        <a-descriptions-item label="结束时间">{{ formatDateTime(detailRecord.end_time) }}</a-descriptions-item>
      </a-descriptions>
    </a-drawer>

    <a-drawer
      v-model:open="resultDetailVisible"
      title="实验提交详情"
      :width="drawerWidth"
      :closable="true"
      @close="resultDetailVisible = false"
    >
      <a-spin v-if="resultDetailLoading" tip="加载提交详情中..." />
      <a-descriptions v-else bordered :column="1">
        <a-descriptions-item label="提交ID">{{ resultDetail.id || '-' }}</a-descriptions-item>
        <a-descriptions-item label="实验ID">{{ resultDetail.experiment_id || '-' }}</a-descriptions-item>
        <a-descriptions-item label="用户">{{ getResultUserName(resultDetail) }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="getResultStatus(resultDetail).color">
            {{ getResultStatus(resultDetail).text }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="问答状态">
          <a-tag :color="getQuestionStateColor(resultDetail)">
            {{ formatQuestionState(resultDetail) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="最终得分">{{ formatFinalScore(resultDetail.final_score) }}</a-descriptions-item>
        <a-descriptions-item label="代码得分">{{ formatAnalysisScore(resultDetail) }}</a-descriptions-item>
        <a-descriptions-item v-if="isCodeScoreFailed(resultDetail)" label="处理要求">
          <a-alert
            message="代码得分低于 80 分，请修改实验内容后重新提交。"
            type="error"
            show-icon
          />
        </a-descriptions-item>
        <a-descriptions-item v-if="resultDetail.analysis?.reason" label="分析理由">
          <div class="analysis-reason">{{ resultDetail.analysis.reason }}</div>
        </a-descriptions-item>
        <a-descriptions-item v-if="canAnswerQuestions(resultDetail)" label="代码问答">
          <a-button type="primary" @click="handleOpenQuestionAnswer(resultDetail)">
            {{ isQuestionAnswered(resultDetail) ? '查看问答结果' : '进入问答' }}
          </a-button>
        </a-descriptions-item>
        <a-descriptions-item label="内容">
          <pre class="code-preview">{{ resultDetail.code || '-' }}</pre>
        </a-descriptions-item>
      </a-descriptions>
    </a-drawer>

    <a-drawer
      v-model:open="resultsDrawerVisible"
      :title="`提交列表 - ${currentExperiment?.title || ''}`"
      :width="resultsDrawerWidth"
      :closable="true"
      @close="resultsDrawerVisible = false"
    >
      <a-table
        :columns="resultColumns"
        :data-source="experimentResults"
        :loading="resultsLoading"
        row-key="id"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :locale="{ emptyText: '暂无提交数据' }"
        :scroll="{ x: resultTableScrollX }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user'">
            {{ getResultUserName(record) }}
          </template>
          <template v-else-if="column.key === 'code'">
            <span class="code-inline">{{ record.code || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getResultStatus(record).color">
              {{ getResultStatus(record).text }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'final_score'">
            {{ formatFinalScore(record.final_score) }}
          </template>
          <template v-else-if="column.key === 'analysis_score'">
            {{ formatAnalysisScore(record) }}
          </template>
          <template v-else-if="column.key === 'question_state'">
            <a-tag :color="getQuestionStateColor(record)">
              {{ formatQuestionState(record) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="handleViewResult(record)">查看</a-button>
              <a-popconfirm
                v-if="!isQuestionAnswered(record)"
                title="确定要删除这次实验提交吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDeleteResult(record.id)"
              >
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
              <a-button v-else type="link" size="small" danger disabled>删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-drawer>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/store'
import {
  createExperiment,
  createExperimentResult,
  deleteExperiment,
  deleteExperimentResult,
  getExperimentById,
  getExperimentResultById,
  getExperimentResultsByExperimentId,
  getExperimentResultsByUserId,
  getExperimentsByClassId,
  updateExperiment
} from '@/api/experiment'

const props = defineProps({
  classId: {
    type: [String, Number],
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const userStore = useUserStore()
const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const experiments = ref([])
const modalVisible = ref(false)
const editingRecord = ref(null)
const formRef = ref(null)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailRecord = ref({})
const formData = ref(getEmptyFormData())

const submitModalVisible = ref(false)
const resultSaving = ref(false)
const resultFormRef = ref(null)
const currentExperiment = ref(null)
const resultForm = ref({ code: '' })
const studentResultsLoading = ref(false)
const studentResults = ref([])
const studentResultMap = ref({})

const resultDetailVisible = ref(false)
const resultDetailLoading = ref(false)
const resultDetail = ref({})

const resultsDrawerVisible = ref(false)
const resultsLoading = ref(false)
const experimentResults = ref([])
const viewportWidth = ref(typeof window === 'undefined' ? 1200 : window.innerWidth)

const isTeacherOrAdmin = computed(() => {
  const role = userStore.userInfo?.user_type
  return role === 'teacher' || role === 'admin'
})

const currentUserId = computed(() => {
  const userInfo = userStore.userInfo || {}
  return normalizeId(userInfo.id ?? userInfo.user_id ?? userInfo.userId)
})

const isMobileViewport = computed(() => viewportWidth.value < 768)
const isNarrowViewport = computed(() => viewportWidth.value < 992)

const tableScrollX = computed(() => {
  if (isMobileViewport.value) return isTeacherOrAdmin.value ? 820 : 970
  if (isNarrowViewport.value) return isTeacherOrAdmin.value ? 940 : 1090
  return isTeacherOrAdmin.value ? 1060 : 1230
})

const resultTableScrollX = computed(() => {
  if (isMobileViewport.value) return 1010
  return 1180
})

const modalWidth = computed(() => {
  return isMobileViewport.value ? 'calc(100vw - 24px)' : 720
})

const submitModalWidth = computed(() => {
  return isMobileViewport.value ? 'calc(100vw - 24px)' : 760
})

const drawerWidth = computed(() => {
  if (typeof window === 'undefined') return 720
  if (isMobileViewport.value) return '100%'
  if (isNarrowViewport.value) return '82vw'
  return 720
})

const resultsDrawerWidth = computed(() => {
  if (typeof window === 'undefined') return 1000
  if (isMobileViewport.value) return '100%'
  if (isNarrowViewport.value) return '88vw'
  return 1000
})

const columns = computed(() => {
  const baseColumns = [
    { title: '实验标题', dataIndex: 'title', key: 'title', width: isMobileViewport.value ? 180 : 240 },
    { title: '分数', dataIndex: 'score', key: 'score', width: isMobileViewport.value ? 72 : 100 },
    { title: '开始时间', dataIndex: 'start_time', key: 'start_time', width: 180, responsive: ['md'] },
    { title: '结束时间', dataIndex: 'end_time', key: 'end_time', width: 180, responsive: ['md'] }
  ]

  if (!isTeacherOrAdmin.value) {
    baseColumns.push({ title: '提交状态', key: 'submit_status', width: isMobileViewport.value ? 96 : 110 })
    baseColumns.push({ title: '问答状态', key: 'question_state', width: isMobileViewport.value ? 96 : 110 })
  }

  baseColumns.push({
    title: '操作',
    key: 'actions',
    width: isMobileViewport.value ? 220 : (isTeacherOrAdmin.value ? 300 : 320),
    fixed: isMobileViewport.value ? undefined : 'right'
  })

  return baseColumns
})

const resultColumns = [
  { title: '提交ID', dataIndex: 'id', key: 'id', width: 180 },
  { title: '用户', key: 'user', width: 160 },
  { title: '内容预览', dataIndex: 'code', key: 'code', width: 260 },
  { title: '状态', key: 'status', width: 110 },
  { title: '最终得分', dataIndex: 'final_score', key: 'final_score', width: 110 },
  { title: '代码得分', key: 'analysis_score', width: 110 },
  { title: '问答状态', key: 'question_state', width: 110 },
  { title: '操作', key: 'actions', width: 140, fixed: 'right' }
]

const formRules = {
  title: [
    { required: true, message: '请输入实验标题', trigger: 'blur' },
    { max: 100, message: '实验标题不能超过 100 个字符', trigger: 'blur' }
  ],
  score: [
    { required: true, type: 'number', message: '请输入实验分数', trigger: 'change' }
  ],
  start_time: [
    { required: true, message: '请选择开始时间', trigger: 'change' }
  ],
  end_time: [
    { required: true, message: '请选择结束时间', trigger: 'change' },
    { validator: validateEndTime, trigger: 'change' }
  ]
}

const resultRules = {
  code: [
    { required: true, message: '请输入实验内容', trigger: 'blur' },
    { max: 20000, message: '实验内容不能超过 20000 个字符', trigger: 'blur' }
  ]
}

function normalizeId(id) {
  return id === undefined || id === null ? '' : String(id)
}

function normalizeExperiment(item) {
  return {
    id: normalizeId(item?.id ?? item?.experiment_id),
    class_id: normalizeId(item?.class_id ?? item?.classId ?? props.classId),
    title: item?.title || '',
    explanation: item?.explanation || '',
    score: item?.score ?? 0,
    start_time: item?.start_time || '',
    end_time: item?.end_time || '',
    deleted_at: item?.deleted_at
  }
}

function normalizeExperimentResult(item) {
  const code = item?.code === undefined ? null : item.code
  const experimentValue = item?.experiment

  return {
    ...item,
    id: normalizeId(item?.id ?? item?.experiment_result_id),
    experiment_id: normalizeId(item?.experiment_id ?? item?.experimentId ?? (typeof experimentValue === 'object' ? experimentValue?.id : '')),
    experiment_title: typeof experimentValue === 'string'
      ? experimentValue
      : (experimentValue?.title || experimentValue?.name || item?.experiment_title || ''),
    user_id: normalizeId(item?.user_id ?? item?.userId ?? item?.user?.id),
    user: item?.user,
    username: item?.username || item?.user?.username || '',
    real_name: item?.real_name || item?.user?.real_name || '',
    code,
    final_score: item?.final_score ?? null,
    analysis: item?.analysis || null,
    question: item?.question || null,
    question_state: item?.question_state ?? null
  }
}

function getEmptyFormData() {
  const now = getBeijingNow()
  return {
    title: '',
    explanation: '',
    score: 0,
    start_time: now,
    end_time: now.add(1, 'hour')
  }
}

function getBeijingNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23'
  }).formatToParts(new Date())
  const valueMap = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return dayjs(`${valueMap.year}-${valueMap.month}-${valueMap.day} ${valueMap.hour}:${valueMap.minute}:${valueMap.second}`)
}

function formatDateTime(value) {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss')
}

function formatScore(value) {
  if (value === undefined || value === null || value === '') return '-'
  return Number.isFinite(Number(value)) ? Number(value) : value
}

function extractListData(res) {
  const data = res?.data?.data ?? res?.data ?? res
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.list)) return data.list
  return []
}

function extractDetailData(res) {
  return res?.data?.data ?? res?.data ?? res ?? {}
}

function normalizeTitle(value) {
  return String(value || '').trim()
}

function getStudentResult(experiment) {
  const experimentId = normalizeId(experiment?.id ?? experiment)
  const title = normalizeTitle(experiment?.title)
  const result = studentResultMap.value[experimentId] ||
    studentResultMap.value[`title:${title}`] ||
    null
  console.log('[查找] experiment.id:', experimentId, 'title:', title, '找到:', !!result, result)
  return result
}

function hasResultCode(record) {
  if (!record) return false
  return record.code !== null && record.code !== undefined && String(record.code).trim() !== ''
}

function hasSubmittedResult(experiment) {
  return hasResultCode(getStudentResult(experiment))
}

function getAnalysisScore(record) {
  return record?.analysis?.score ?? null
}

function hasAnalysisResult(record) {
  const analysis = record?.analysis
  return analysis !== null && analysis !== undefined && analysis !== ''
}

function hasQuestionResult(record) {
  const question = record?.question
  return question !== null && question !== undefined && question !== ''
}

function canAnswerQuestions(record) {
  return hasResultCode(record) && hasQuestionResult(record) && !isCodeScoreFailed(record)
}

function isQuestionAnswered(record) {
  return record?.question_state === '已回答'
}

function isCodeScoreFailed(record) {
  if (!hasResultCode(record) || !hasAnalysisResult(record)) return false
  const score = Number(getAnalysisScore(record))
  return Number.isFinite(score) && score < 80
}

function getResultStatus(record) {
  if (!hasResultCode(record)) {
    return {
      text: '未提交',
      color: 'default'
    }
  }

  if (isCodeScoreFailed(record)) {
    return {
      text: '不合格',
      color: 'error'
    }
  }

  if (!hasAnalysisResult(record)) {
    return {
      text: '正在评分',
      color: 'processing'
    }
  }

  return {
    text: '已评分',
    color: 'green'
  }
}

function getStudentResultStatus(experiment) {
  return getResultStatus(getStudentResult(experiment))
}

function formatFinalScore(value) {
  if (value === null || value === undefined || value === '') return '-'
  return Number.isFinite(Number(value)) ? Number(value) : value
}

function formatAnalysisScore(record) {
  return formatFinalScore(getAnalysisScore(record))
}

function formatQuestionState(record) {
  return record?.question_state || '未回答'
}

function getQuestionStateColor(record) {
  if (record?.question_state === '已回答') return 'green'
  if (record?.question_state) return 'blue'
  return 'default'
}

function getResultUserName(record) {
  return record?.real_name || record?.username || record?.user?.real_name || record?.user?.username || record?.user || record?.user_id || '-'
}

function rebuildStudentResultMap(results) {
  const resultMap = {}
  results.forEach((result) => {
    if (result.experiment_id) {
      resultMap[result.experiment_id] = result
    }

    if (result.experiment_title) {
      resultMap[`title:${normalizeTitle(result.experiment_title)}`] = result
    }
  })
  studentResultMap.value = resultMap
}

async function validateEndTime() {
  if (!formData.value.start_time || !formData.value.end_time) return Promise.resolve()
  return dayjs(formData.value.end_time).isAfter(dayjs(formData.value.start_time))
    ? Promise.resolve()
    : Promise.reject(new Error('结束时间必须晚于开始时间'))
}

async function fetchExperiments() {
  if (!props.classId) {
    experiments.value = []
    return
  }

  loading.value = true
  error.value = ''

  try {
    const res = await getExperimentsByClassId(props.classId)
    const rawList = extractListData(res)
    console.log('[实验] 原始响应:', res)
    console.log('[实验] 提取列表:', rawList)
    experiments.value = rawList.map(normalizeExperiment)
    console.log('[实验] 归一化后:', experiments.value)

    if (!isTeacherOrAdmin.value) {
      await fetchStudentResults()
    }
  } catch (err) {
    console.error('获取实验列表失败:', err)
    error.value = err.message || '获取实验列表失败'
    message.error(error.value)
    experiments.value = []
  } finally {
    loading.value = false
  }
}

async function fetchStudentResults() {
  if (!currentUserId.value) {
    studentResults.value = []
    studentResultMap.value = {}
    return
  }

  studentResultsLoading.value = true

  try {
    const res = await getExperimentResultsByUserId(currentUserId.value)
    console.log('[结果] 原始响应:', res)
    const rawResults = extractListData(res)
    console.log('[结果] 提取列表:', rawResults)
    const results = rawResults.map(normalizeExperimentResult)
    studentResults.value = results
    console.log('[结果] 归一化后:', results)
    rebuildStudentResultMap(results)
    console.log('[结果] studentResultMap:', studentResultMap.value)
  } catch (err) {
    console.error('获取实验提交记录失败:', err)
    message.error(err.message || '获取实验提交记录失败')
    studentResults.value = []
    studentResultMap.value = {}
  } finally {
    studentResultsLoading.value = false
  }
}

function handleCreate() {
  editingRecord.value = null
  formData.value = getEmptyFormData()
  modalVisible.value = true
}

function handleEdit(record) {
  editingRecord.value = { ...record }
  formData.value = {
    title: record.title || '',
    explanation: record.explanation || '',
    score: Number(record.score || 0),
    start_time: record.start_time ? dayjs(record.start_time) : getBeijingNow(),
    end_time: record.end_time ? dayjs(record.end_time) : getBeijingNow().add(1, 'hour')
  }
  modalVisible.value = true
}

async function handleView(record) {
  detailVisible.value = true
  detailLoading.value = true
  detailRecord.value = normalizeExperiment(record)

  try {
    const res = await getExperimentById(record.id)
    detailRecord.value = normalizeExperiment(extractDetailData(res))
  } catch (err) {
    console.error('获取实验详情失败:', err)
    message.error(err.message || '获取实验详情失败')
  } finally {
    detailLoading.value = false
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch (err) {
    return
  }

  const payload = {
    class_id: normalizeId(props.classId),
    title: formData.value.title.trim(),
    explanation: formData.value.explanation?.trim() || '',
    score: Number(formData.value.score || 0),
    start_time: formData.value.start_time ? formData.value.start_time.format('YYYY-MM-DD HH:mm:ss') : null,
    end_time: formData.value.end_time ? formData.value.end_time.format('YYYY-MM-DD HH:mm:ss') : null
  }

  saving.value = true

  try {
    if (editingRecord.value?.id) {
      await updateExperiment({ ...payload, id: editingRecord.value.id, deleted_at: editingRecord.value.deleted_at })
      message.success('实验更新成功')
    } else {
      await createExperiment(payload)
      message.success('实验创建成功')
    }

    modalVisible.value = false
    await fetchExperiments()
  } catch (err) {
    console.error('保存实验失败:', err)
    message.error(err.message || '保存实验失败')
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  modalVisible.value = false
  editingRecord.value = null
}

async function handleDelete(experimentId) {
  if (!experimentId) return

  try {
    await deleteExperiment(experimentId)
    message.success('删除成功')
    await fetchExperiments()
  } catch (err) {
    console.error('删除实验失败:', err)
    message.error(err.message || '删除实验失败')
  }
}

function handleOpenSubmit(record) {
  currentExperiment.value = record
  const existingResult = getStudentResult(record.id)
  resultForm.value = {
    code: existingResult?.code || ''
  }
  submitModalVisible.value = true
}

function handleCancelSubmitResult() {
  submitModalVisible.value = false
  currentExperiment.value = null
  resultForm.value = { code: '' }
}

async function handleSubmitResult() {
  try {
    await resultFormRef.value?.validate()
  } catch (err) {
    return
  }

  if (!currentExperiment.value?.id) return

  resultSaving.value = true

  try {
    const existingResult = getStudentResult(currentExperiment.value)
    const isResubmit = !!existingResult?.id

    if (isResubmit) {
      await deleteExperimentResult(existingResult.id)
    }

    await createExperimentResult({
      experiment_id: currentExperiment.value.id,
      code: resultForm.value.code.trim()
    })
    message.success(isResubmit ? '实验重新提交成功' : '实验提交成功')
    submitModalVisible.value = false
    await fetchStudentResults()
  } catch (err) {
    console.error('提交实验失败:', err)
    message.error(err.message || '提交实验失败')
  } finally {
    resultSaving.value = false
  }
}

async function handleViewResult(record) {
  if (!record?.id) return

  resultDetailVisible.value = true
  resultDetailLoading.value = true
  resultDetail.value = normalizeExperimentResult(record)

  try {
    const res = await getExperimentResultById(record.id)
    resultDetail.value = normalizeExperimentResult(extractDetailData(res))
  } catch (err) {
    console.error('获取实验提交详情失败:', err)
    message.error(err.message || '获取实验提交详情失败')
  } finally {
    resultDetailLoading.value = false
  }
}

function handleOpenQuestionAnswer(record) {
  if (!record?.id) return
  router.push(`/experiment/question-answer/${normalizeId(record.id)}`)
}

async function handleOpenResults(record) {
  currentExperiment.value = record
  resultsDrawerVisible.value = true
  await fetchExperimentResults(record.id)
}

async function fetchExperimentResults(experimentId) {
  if (!experimentId) {
    experimentResults.value = []
    return
  }

  resultsLoading.value = true

  try {
    const res = await getExperimentResultsByExperimentId(experimentId)
    experimentResults.value = extractListData(res).map(normalizeExperimentResult)
  } catch (err) {
    console.error('获取实验提交列表失败:', err)
    message.error(err.message || '获取实验提交列表失败')
    experimentResults.value = []
  } finally {
    resultsLoading.value = false
  }
}

async function handleDeleteResult(experimentResultId) {
  if (!experimentResultId) return

  const targetResult = findExperimentResultById(experimentResultId)
  if (isQuestionAnswered(targetResult)) {
    message.warning('问答已完成，不能删除提交')
    return
  }

  try {
    await deleteExperimentResult(experimentResultId)
    message.success('提交记录删除成功')

    if (resultsDrawerVisible.value && currentExperiment.value?.id) {
      await fetchExperimentResults(currentExperiment.value.id)
    }

    if (!isTeacherOrAdmin.value) {
      await fetchStudentResults()
    }
  } catch (err) {
    console.error('删除实验提交失败:', err)
    message.error(err.message || '删除实验提交失败')
  }
}

function findExperimentResultById(experimentResultId) {
  const id = normalizeId(experimentResultId)
  return experimentResults.value.find(item => normalizeId(item.id) === id) ||
    studentResults.value.find(item => normalizeId(item.id) === id) ||
    (normalizeId(resultDetail.value?.id) === id ? resultDetail.value : null)
}

function handleResize() {
  if (typeof window !== 'undefined') {
    viewportWidth.value = window.innerWidth
  }
}

watch(() => props.classId, fetchExperiments)

onMounted(() => {
  fetchExperiments()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize)
  }
})
</script>

<style scoped>
.class-experiment-module {
  min-height: 400px;
}

.experiment-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.toolbar-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.toolbar-title h3 {
  margin: 0;
  color: #262626;
  font-size: 18px;
  font-weight: 600;
}

.toolbar-title span {
  color: #8c8c8c;
  font-size: 13px;
}

.experiment-alert {
  margin-bottom: 16px;
}

:deep(.ant-table-cell) {
  vertical-align: top;
}

.title-link {
  height: auto;
  padding: 0;
  font-weight: 500;
  text-align: left;
  white-space: normal;
  word-break: break-word;
}

.status-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.status-hint {
  color: #ff4d4f;
  font-size: 12px;
  line-height: 1.4;
}

.action-space {
  max-width: 100%;
  row-gap: 4px;
  white-space: normal;
}

.action-space :deep(.ant-btn-link) {
  height: 24px;
  padding: 0 4px;
  line-height: 24px;
}

.detail-explanation {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.7;
}

.analysis-reason {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.7;
}

.code-preview {
  max-height: 460px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f5f5f5;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  color: #262626;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.code-inline {
  display: inline-block;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

:deep(.ant-modal-body) {
  max-height: 70vh;
  overflow-y: auto;
}

@media screen and (max-width: 768px) {
  :deep(.ant-table-cell) {
    vertical-align: middle;
  }

  .experiment-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }

  .experiment-toolbar .ant-btn {
    width: 100%;
  }

  .toolbar-title h3 {
    font-size: 16px;
  }

  .toolbar-title span {
    font-size: 12px;
  }

  .action-space {
    align-items: center;
    flex-direction: column;
    justify-content: center;
    min-height: 100%;
  }

  .action-space :deep(.ant-space-item) {
    width: 100%;
  }

  .action-space :deep(.ant-btn-link) {
    width: 100%;
    justify-content: center;
    padding: 0;
    text-align: center;
  }

  .code-preview {
    max-height: 56vh;
    padding: 10px;
    font-size: 12px;
  }

  .code-inline {
    max-width: 180px;
  }

  :deep(.ant-modal) {
    max-width: calc(100vw - 24px);
  }

  :deep(.ant-modal-body) {
    max-height: 64vh;
  }

  :deep(.ant-picker) {
    width: 100%;
  }
}

@media screen and (max-width: 480px) {
  .code-inline {
    max-width: 140px;
  }

  :deep(.ant-table-cell) {
    padding: 10px 8px;
  }
}
</style>
