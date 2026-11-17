<template>
  <div class="course-experiment-module">
    <div class="toolbar">
      <div>
        <h3>实验列表</h3>
        <span>{{ experiments.length }} 个实验模板</span>
      </div>
      <a-space>
        <a-select v-model:value="publishFilter" style="width: 130px">
          <a-select-option value="all">全部</a-select-option>
          <a-select-option value="published">已发布</a-select-option>
          <a-select-option value="unpublished">未发布</a-select-option>
        </a-select>
        <a-button v-if="canManage" type="primary" @click="handleCreate">
          <template #icon><PlusOutlined /></template>
          新建实验
        </a-button>
      </a-space>
    </div>

    <a-alert
      v-if="error"
      class="module-error"
      type="error"
      show-icon
      :message="error"
      closable
    />

    <a-table
      :columns="columns"
      :data-source="filteredExperiments"
      :loading="loading"
      row-key="id"
      :pagination="{ pageSize: 10, showSizeChanger: false }"
      :scroll="{ x: 1200 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'publish_status'">
          <a-tag :color="getPublishStatusColor(record)">
            {{ getPublishStatusLabel(record) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'question_config'">
          {{ formatQuestionConfig(record.question_config) }}
        </template>
        <template v-else-if="column.key === 'actions'">
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
            <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
            <a-popconfirm
              title="确定删除该实验模板吗？已发布到班级的实验可能无法删除。"
              ok-text="删除"
              cancel-text="取消"
              @confirm="handleDelete(record)"
            >
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="formVisible"
      :title="editingRecord ? '编辑实验' : '新建实验'"
      :confirm-loading="saving"
      width="760px"
      destroy-on-close
      @ok="handleSubmit"
      @cancel="resetForm"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item label="实验标题" name="title">
          <a-input v-model:value="form.title" :maxlength="100" show-count placeholder="请输入实验标题" />
        </a-form-item>
        <a-form-item label="实验说明" name="explanation">
          <a-textarea v-model:value="form.explanation" :rows="4" placeholder="请输入实验说明" />
        </a-form-item>
        <a-form-item label="实验附件">
          <div v-if="form.explanation_file" class="existing-attachment">
            <span>{{ form.explanation_file_name || form.explanation_file }}</span>
            <a-space>
              <a-button type="link" size="small" @click="downloadAttachment">
                下载
              </a-button>
              <a-popconfirm
                title="保存实验后移除当前附件？"
                ok-text="移除"
                cancel-text="取消"
                @confirm="removeExistingAttachment"
              >
                <a-button type="link" size="small" danger>移除</a-button>
              </a-popconfirm>
            </a-space>
          </div>
          <a-upload
            :file-list="attachmentFileList"
            :before-upload="beforeAttachmentUpload"
            :multiple="false"
            :disabled="saving"
            accept=".pdf,.doc,.docx,.txt,.md,.zip,.rar"
            @remove="removeSelectedAttachment"
          >
            <a-button :disabled="saving">
              <template #icon><UploadOutlined /></template>
              选择附件
            </a-button>
          </a-upload>
          <div class="attachment-hint">
            支持 PDF、Word、TXT、Markdown、ZIP、RAR，单个文件不超过 50MB。
          </div>
        </a-form-item>
        <a-form-item label="实验总分" name="score">
          <a-input-number v-model:value="form.score" :min="0" :max="10000" style="width: 100%" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :xs="24" :sm="12">
            <a-form-item label="开始时间" name="start_time">
              <a-date-picker v-model:value="form.start_time" show-time style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item label="结束时间" name="end_time">
              <a-date-picker v-model:value="form.end_time" show-time style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-collapse v-model:activeKey="configPanel" ghost>
          <a-collapse-panel key="question-config" header="LLM 出题配置">
            <a-row v-for="questionType in questionTypes" :key="questionType.type" :gutter="12" align="middle">
              <a-col :span="12">
                <a-checkbox
                  :checked="form.question_config[questionType.type].enabled"
                  @change="event => setQuestionEnabled(questionType.type, event.target.checked)"
                >
                  {{ questionType.label }}
                </a-checkbox>
              </a-col>
              <a-col :span="12">
                <a-input-number
                  v-model:value="form.question_config[questionType.type].count"
                  :min="1"
                  :max="50"
                  :disabled="!form.question_config[questionType.type].enabled"
                  addon-before="题数"
                  style="width: 100%; margin-bottom: 12px"
                />
              </a-col>
            </a-row>
          </a-collapse-panel>
        </a-collapse>
      </a-form>
    </a-modal>

    <PublishAssignmentModal
      v-model:open="publishVisible"
      :item="publishingRecord"
      kind="experiment"
      :mode="publishDialogMode"
      :course-id="courseId"
      @updated="fetchExperiments"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import { message, Upload } from 'ant-design-vue'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/store'
import {
  deleteExperimentAttachmentApi,
  getExperimentAttachmentUrlApi,
  uploadExperimentAttachmentApi
} from '@/api/file'
import {
  createExperiment,
  deleteExperiment,
  getExperimentsByCourseId,
  updateExperiment
} from '@/api/experiment'
import PublishAssignmentModal from '@/components/course/PublishAssignmentModal.vue'

const props = defineProps({
  courseId: { type: [String, Number], required: true }
})

const courseId = String(props.courseId)
const userStore = useUserStore()
const canManage = computed(() => ['admin', 'teacher'].includes(String(userStore.userInfo?.user_type || '').toLowerCase()))
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const experiments = ref([])
const publishFilter = ref('all')
const filteredExperiments = computed(() => {
  if (publishFilter.value === 'all') return experiments.value
  return experiments.value.filter(record => {
    const published = isPublished(record)
    return publishFilter.value === 'published' ? published : !published
  })
})
const formVisible = ref(false)
const publishVisible = ref(false)
const publishingRecord = ref(null)
const publishDialogMode = ref('manage')
const editingRecord = ref(null)
const formRef = ref(null)
const attachmentFileList = ref([])
const configPanel = ref(['question-config'])
const questionTypes = [
  { type: 'single_choice', label: '单选题' },
  { type: 'multiple_choice', label: '多选题' },
  { type: 'true_or_false', label: '判断题' },
  { type: 'gap_fill', label: '填空题' },
  { type: 'short_answer', label: '简答题' }
]
const columns = [
  { title: '标题', dataIndex: 'title', key: 'title', width: 220 },
  { title: '总分', dataIndex: 'score', key: 'score', width: 90 },
  { title: '开始时间', dataIndex: 'start_time', key: 'start_time', width: 170 },
  { title: '结束时间', dataIndex: 'end_time', key: 'end_time', width: 170 },
  { title: 'LLM配置', key: 'question_config', width: 180 },
  { title: '发布状态', key: 'publish_status', width: 140 },
  { title: '操作', key: 'actions', width: 400, fixed: 'right' }
]
const rules = {
  title: [{ required: true, whitespace: true, message: '请输入实验标题' }],
  explanation: [{ required: true, whitespace: true, message: '请输入实验说明' }],
  score: [{ required: true, type: 'number', message: '请输入实验总分' }],
  start_time: [{ required: true, message: '请选择开始时间' }],
  end_time: [{ required: true, message: '请选择结束时间' }]
}
const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024
const ACCEPTED_ATTACHMENT_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.txt', '.md', '.zip', '.rar'])

function emptyQuestionConfig() {
  return Object.fromEntries(questionTypes.map(({ type }) => [type, { enabled: false, count: 1 }]))
}

function emptyForm() {
  return {
    title: '',
    explanation: '',
    explanation_file: null,
    explanation_file_name: null,
    score: 100,
    start_time: null,
    end_time: null,
    question_config: emptyQuestionConfig()
  }
}

function extractList(response) {
  const data = response?.data?.data ?? response?.data ?? response
  return Array.isArray(data) ? data : []
}

function isPublished(record) {
  const status = String(record.publish_status || '').toLowerCase()
  return Number(record.publish_count || 0) > 0 ||
    ['published', 'scheduled', '已发布', '定时发布'].includes(status)
}

function getPublishStatusLabel(record) {
  const rawStatus = String(record.publish_status || '').toLowerCase()
  const status = {
    published: '已发布',
    scheduled: '定时发布',
    draft: '草稿',
    unpublished: '未发布'
  }[rawStatus] || record.publish_status
  if (status) return `${status}${Number(record.publish_count || 0) ? `（${record.publish_count}）` : ''}`
  return isPublished(record) ? `已发布（${record.publish_count || 0}）` : '未发布'
}

function getPublishStatusColor(record) {
  const status = String(record.publish_status || '').toLowerCase()
  if (status === 'scheduled' || status === '定时发布') return 'blue'
  return isPublished(record) ? 'green' : 'default'
}

function normalizeQuestionConfig(config) {
  const normalized = emptyQuestionConfig()
  for (const item of config?.types || []) {
    if (!normalized[item.type]) continue
    normalized[item.type] = { enabled: true, count: Math.max(1, Number(item.count) || 1) }
  }
  return normalized
}

function formatQuestionConfig(raw) {
  const config = parseQuestionConfig(raw)
  const types = config?.types || []
  if (!types.length) return '未配置'
  return types.map(item => `${item.label || item.type} × ${item.count}`).join('、')
}

async function fetchExperiments() {
  loading.value = true
  error.value = ''
  try {
    const response = await getExperimentsByCourseId(courseId)
    if (response?.code !== 200) throw new Error(response?.message || '获取实验模板失败')
    experiments.value = extractList(response)
  } catch (fetchError) {
    console.error('获取课程实验模板失败:', fetchError)
    error.value = fetchError.message || '获取实验模板失败'
  } finally {
    loading.value = false
  }
}

function setQuestionEnabled(type, enabled) {
  form.value.question_config[type].enabled = enabled
}

const form = ref(emptyForm())

function handleCreate() {
  editingRecord.value = null
  form.value = emptyForm()
  attachmentFileList.value = []
  formVisible.value = true
}

function parseQuestionConfig(raw) {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch (parseError) {
      console.error('解析实验出题配置失败:', parseError)
      return null
    }
  }
  return raw
}

function handleEdit(record) {
  editingRecord.value = record
  attachmentFileList.value = []
  form.value = {
    title: record.title || '',
    explanation: record.explanation || '',
    explanation_file: record.explanation_file ?? null,
    explanation_file_name: record.explanation_file_name ?? null,
    score: Number(record.score || 0),
    start_time: record.start_time ? dayjs(record.start_time) : null,
    end_time: record.end_time ? dayjs(record.end_time) : null,
    question_config: normalizeQuestionConfig(parseQuestionConfig(record.question_config))
  }
  formVisible.value = true
}

function beforeAttachmentUpload(file) {
  const extension = file.name.includes('.') ? `.${file.name.split('.').pop().toLowerCase()}` : ''
  if (!ACCEPTED_ATTACHMENT_EXTENSIONS.has(extension)) {
    message.error('仅支持 PDF、Word、TXT、Markdown、ZIP 和 RAR 文件')
    return Upload.LIST_IGNORE
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    message.error('单个附件不能超过 50MB')
    return Upload.LIST_IGNORE
  }

  attachmentFileList.value = [{
    uid: file.uid || `${file.name}-${file.lastModified}`,
    name: file.name,
    status: 'done',
    originFileObj: file
  }]
  return false
}

function removeSelectedAttachment(file) {
  attachmentFileList.value = attachmentFileList.value.filter(item => item.uid !== file.uid)
  return true
}

function removeExistingAttachment() {
  form.value.explanation_file = null
  form.value.explanation_file_name = null
}

async function downloadAttachment() {
  try {
    const url = await getExperimentAttachmentUrlApi(form.value.explanation_file)
    if (!url) throw new Error('未能获取附件下载地址')
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (downloadError) {
    console.error('获取实验附件下载地址失败:', downloadError)
    message.error(downloadError.message || '下载附件失败')
  }
}

function extractResponseData(response) {
  return response?.data?.data ?? response?.data ?? response
}

function getExperimentId(response) {
  const data = extractResponseData(response)
  return data?.id ?? data?.experiment_id ?? data?.experiment?.id ?? null
}

function buildQuestionConfig() {
  const types = questionTypes
    .filter(({ type }) => form.value.question_config[type].enabled)
    .map(({ type, label }) => ({
      type,
      label,
      count: Math.max(1, Number(form.value.question_config[type].count) || 1)
    }))
  return types.length ? { types } : null
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  if (!form.value.end_time.isAfter(form.value.start_time)) {
    message.warning('结束时间必须晚于开始时间')
    return
  }

  const payload = {
    course_id: courseId,
    title: form.value.title.trim(),
    explanation: form.value.explanation.trim(),
    explanation_file: form.value.explanation_file,
    explanation_file_name: form.value.explanation_file_name,
    score: Number(form.value.score),
    start_time: form.value.start_time.format('YYYY-MM-DD HH:mm:ss'),
    end_time: form.value.end_time.format('YYYY-MM-DD HH:mm:ss'),
    question_config: buildQuestionConfig()
  }
  saving.value = true
  let experimentSaved = false
  let experimentId = editingRecord.value?.id ?? null
  let uploadedAttachment = null
  const previousAttachment = editingRecord.value?.explanation_file ?? null
  try {
    const response = editingRecord.value
      ? await updateExperiment({ ...payload, id: editingRecord.value.id })
      : await createExperiment(payload)
    if (response?.code !== 200) throw new Error(response?.message || '保存实验失败')
    experimentSaved = true
    experimentId = experimentId ?? getExperimentId(response)
    if (!editingRecord.value && experimentId) {
      editingRecord.value = { ...payload, id: String(experimentId) }
    }

    if (attachmentFileList.value.length) {
      if (!experimentId) {
        throw new Error('实验已保存，但服务端未返回实验 ID，无法关联上传附件')
      }

      const file = attachmentFileList.value[0]?.originFileObj
      if (!file) throw new Error('无法读取所选附件，请重新选择文件')
      const uploadResponse = await uploadExperimentAttachmentApi(file, experimentId)
      if (uploadResponse?.code !== undefined && Number(uploadResponse.code) !== 200) {
        throw new Error(uploadResponse.message || '附件上传失败')
      }

      const uploadedData = extractResponseData(uploadResponse)
      if (!uploadedData?.object_name) {
        throw new Error('附件上传响应缺少 object_name，无法关联到实验')
      }
      uploadedAttachment = {
        object_name: String(uploadedData.object_name),
        file_name: uploadedData.file_name || file.name
      }

      try {
        const updateResponse = await updateExperiment({
          ...payload,
          id: experimentId,
          explanation_file: uploadedAttachment.object_name,
          explanation_file_name: uploadedAttachment.file_name
        })
        if (updateResponse?.code !== 200) {
          throw new Error(updateResponse?.message || '保存附件信息失败')
        }
      } catch (attachmentSaveError) {
        let cleanupErrorMessage = ''
        try {
          const cleanupResponse = await deleteExperimentAttachmentApi(uploadedAttachment.object_name, experimentId)
          if (cleanupResponse?.code !== undefined && Number(cleanupResponse.code) !== 200) {
            throw new Error(cleanupResponse.message || '删除未关联附件失败')
          }
        } catch (cleanupError) {
          console.error('清理未关联的实验附件失败:', cleanupError)
          cleanupErrorMessage = `；且清理未关联附件失败：${cleanupError.message || '请稍后联系管理员'}`
        }
        throw new Error(`${attachmentSaveError.message || '保存附件信息失败'}${cleanupErrorMessage}`)
      }

      form.value.explanation_file = uploadedAttachment.object_name
      form.value.explanation_file_name = uploadedAttachment.file_name
      attachmentFileList.value = []
    }

    const currentAttachment = uploadedAttachment?.object_name ?? form.value.explanation_file
    if (previousAttachment && previousAttachment !== currentAttachment) {
      try {
        const deleteResponse = await deleteExperimentAttachmentApi(previousAttachment, experimentId)
        if (deleteResponse?.code !== undefined && Number(deleteResponse.code) !== 200) {
          throw new Error(deleteResponse.message || '移除旧附件失败')
        }
      } catch (deleteError) {
        console.error('移除旧实验附件失败:', deleteError)
        message.warning(`实验已保存，但旧附件未能删除：${deleteError.message || '请稍后重试'}`)
      }
    }

    message.success(attachmentFileList.value.length
      ? '实验已保存'
      : (uploadedAttachment ? '实验和附件已保存' : (editingRecord.value ? '实验已更新' : '实验模板已创建')))
    formVisible.value = false
    await fetchExperiments()
  } catch (saveError) {
    console.error('保存课程实验模板失败:', saveError)
    if (experimentSaved) {
      message.error(`实验已保存，但附件处理失败：${saveError.message || '请稍后重试'}`)
      if (!experimentId) {
        formVisible.value = false
        await fetchExperiments()
      }
    } else {
      message.error(saveError.message || '保存实验失败')
    }
  } finally {
    saving.value = false
  }
}

function resetForm() {
  formVisible.value = false
  editingRecord.value = null
  form.value = emptyForm()
  attachmentFileList.value = []
}

async function handleDelete(record) {
  try {
    const response = await deleteExperiment(record.id)
    if (response?.code !== 200) throw new Error(response?.message || '删除实验失败')
    message.success('实验已删除')
    await fetchExperiments()
  } catch (deleteError) {
    console.error('删除课程实验模板失败:', deleteError)
    message.error(deleteError.message || '删除实验失败')
  }
}

function openPublish(record, mode) {
  publishingRecord.value = record
  publishDialogMode.value = mode
  publishVisible.value = true
}

onMounted(fetchExperiments)
</script>

<style scoped>
.course-experiment-module {
  min-height: 400px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.toolbar h3 {
  margin: 0 0 4px;
}

.toolbar span {
  color: #8c8c8c;
  font-size: 13px;
}

.module-error {
  margin-bottom: 16px;
}

.existing-attachment {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  overflow-wrap: anywhere;
}

.attachment-hint {
  margin-top: 6px;
  color: #8c8c8c;
  font-size: 12px;
}
</style>
