<!--
  @Date         : 2026-05-18
  @Description  : 课程知识图谱模块 - 支持树形图、关系图、文字列表
  @FilePath     : KnowledgeGraphModule.vue
  @LastEditTime : 2026-05-19
  @Version      : V2.1.0
-->
<template>
  <div class="knowledge-graph-module">
    <a-spin v-if="loadingState" size="large" class="loading-spin">
      <div class="loading-placeholder"></div>
    </a-spin>

    <a-alert
      v-else-if="error"
      message="加载失败"
      :description="error"
      type="error"
      show-icon
      :closable="false"
    >
      <template #action>
        <a-button size="small" danger @click="fetchData">重试</a-button>
      </template>
    </a-alert>

    <template v-else>
      <a-card v-if="showExtractPanel" class="extract-card" :bordered="false">
        <div class="extract-toolbar">
          <div>
            <div class="extract-title">教材知识点抽取</div>
            <div class="extract-desc">上传课本教材文档，系统会自动抽取章节、子章节和知识点。</div>
          </div>
          <a-upload
            accept="application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            :show-upload-list="false"
            :before-upload="beforeExtractUpload"
            :custom-request="handleExtractUpload"
            :disabled="isVisitor || extracting"
          >
            <a-button type="primary" :loading="extracting" :disabled="isVisitor">
              <template #icon><UploadOutlined /></template>
              上传教材抽取
            </a-button>
          </a-upload>
        </div>

        <a-alert
          v-if="extractTaskId || extractStatusText"
          class="extract-status"
          :type="extractStatusType"
          show-icon
          :message="extractStatusText || '抽取任务已提交'"
          :description="extractTaskId ? `任务ID：${extractTaskId}` : ''"
        />
      </a-card>

      <KnowledgeGraphLayout
        :title="courseName"
        :data="rawData"
        @download="handleDownload"
        ref="layoutRef"
      >
        <template #tree>
          <div class="knowledge-tree">
            <KnowledgeNode
              v-for="node in treeData"
              :key="node.id"
              :node="node"
              :expanded-keys="expandedKeys"
              :editing-node-id="editingNodeId"
              :edit-form="editForm"
              :saving="saving"
              @toggle-expand="toggleExpand"
              @select-node="selectNode"
              @start-edit="startEditNode"
              @save-edit="saveEditNode"
              @cancel-edit="cancelEditNode"
              @update-label="updateLabel"
              @update-content="updateContent"
            />
          </div>
        </template>

        <template #graph>
          <KnowledgeRelationGraph
            :tree-data="treeData"
            :title="courseName || '知识图谱'"
            ref="graphRef"
            @node-click="handleGraphNodeClick"
            @select-node="handleGraphNodeSelect"
          />
        </template>

        <template #list>
          <KnowledgeListView :tree-data="treeData" />
        </template>
      </KnowledgeGraphLayout>
    </template>

    <a-drawer
      v-model:open="detailDrawerVisible"
      title="节点详情"
      placement="right"
      width="500"
      :mask-closable="true"
    >
      <div v-if="selectedNode" class="node-detail">
        <h3>{{ selectedNode.label }}</h3>
        <a-tag :color="getTypeColor(selectedNode.type)" class="mb-4">
          {{ getTypeLabel(selectedNode.type) }}
        </a-tag>
        <div v-if="selectedNode.content" class="content-section">
          <h4>内容</h4>
          <p>{{ selectedNode.content }}</p>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import {
  extractKnowledgePointApi,
  getKnowledgePointApi,
  getKnowledgePointExtractStatusApi,
  updateKnowledgePointApi
} from '@/api/course'
import { message } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/store'
import { ensureTreeIds } from '@/utils/index.js'
import KnowledgeNode from './KnowledgeNode.vue'
import KnowledgeGraphLayout from '@/components/knowledge/KnowledgeGraphLayout.vue'
import KnowledgeRelationGraph from '@/components/knowledge/KnowledgeRelationGraph.vue'
import KnowledgeListView from '@/components/knowledge/KnowledgeListView.vue'

const props = defineProps({
  courseId: {
    type: [String, Number],
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const route = useRoute()
const userStore = useUserStore()
const isVisitor = computed(() => userStore.userInfo?.user_type === 'visitor')
const loadingState = ref(false)
const error = ref(null)
const courseName = ref('')
const rawData = ref(null)
const treeData = ref([])
const expandedKeys = ref([])
const selectedNode = ref(null)
const detailDrawerVisible = ref(false)
const editingNodeId = ref(null)
const editForm = ref({ label: '', content: '' })
const originalNode = ref(null)
const saving = ref(false)
const layoutRef = ref(null)
const graphRef = ref(null)
const extracting = ref(false)
const extractTaskId = ref('')
const extractStatusText = ref('')
const extractStatusType = ref('info')
let extractStatusTimer = null
const extractFinishedTypes = ['success', 'error']
const showExtractPanel = true
const currentCourseId = computed(() => props.courseId || route.params.id || '')
const extractSubmitRetryDelays = [5000, 10000, 20000]

const typeLabels = {
  chapter: '章节',
  sub_chapter: '子章节',
  point: '知识点'
}

const typeColors = {
  chapter: 'blue',
  sub_chapter: 'cyan',
  point: 'green'
}

function getTypeLabel(type) { return typeLabels[type] || type }
function getTypeColor(type) { return typeColors[type] || 'default' }

function getExtractStorageKey(courseId = currentCourseId.value) {
  return courseId ? `knowledge-point-extract:${courseId}` : ''
}

function saveExtractState() {
  const storageKey = getExtractStorageKey()
  if (!storageKey) return

  const state = {
    taskId: extractTaskId.value,
    statusText: extractStatusText.value,
    statusType: extractStatusType.value,
    extracting: extracting.value,
    updatedAt: Date.now()
  }
  localStorage.setItem(storageKey, JSON.stringify(state))
}

function restoreExtractState(courseId = currentCourseId.value) {
  const storageKey = getExtractStorageKey(courseId)
  if (!storageKey) return

  try {
    const rawState = localStorage.getItem(storageKey)
    if (!rawState) return

    const state = JSON.parse(rawState)
    extractTaskId.value = state.taskId || ''
    extractStatusText.value = state.statusText || ''
    extractStatusType.value = state.statusType || 'info'
    extracting.value = Boolean(state.extracting && !extractFinishedTypes.includes(extractStatusType.value))

    if (extracting.value && extractTaskId.value) {
      startExtractStatusPolling(extractTaskId.value)
    }
  } catch (err) {
    console.error('恢复知识点抽取状态失败:', err)
    localStorage.removeItem(storageKey)
  }
}

function resetExtractState() {
  stopExtractStatusPolling()
  extracting.value = false
  extractTaskId.value = ''
  extractStatusText.value = ''
  extractStatusType.value = 'info'
}

function cloneTree(nodes) {
  return nodes.map(node => ({
    ...node,
    children: node.children ? cloneTree(node.children) : undefined
  }))
}

function updateNodeById(nodes, nodeId, patch) {
  return nodes.map(node => {
    if (String(node.id) === String(nodeId)) {
      return { ...node, ...patch }
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateNodeById(node.children, nodeId, patch)
      }
    }
    return node
  })
}

function findNode(nodes, key) {
  for (const node of nodes) {
    if (String(node.id) === String(key)) return node
    if (node.children) {
      const found = findNode(node.children, key)
      if (found) return found
    }
  }
  return null
}

function getResponsePayload(response) {
  return response?.data && typeof response.data === 'object' ? response.data : response
}

function getExtractTaskId(response) {
  const payload = getResponsePayload(response)
  return payload?.task_id || payload?.taskId || payload?.task || payload?.id || response?.task_id || ''
}

function getExtractStatusValue(response) {
  const payload = getResponsePayload(response)
  return String(
    payload?.status ||
    payload?.state ||
    payload?.task_status ||
    response?.status ||
    ''
  ).toLowerCase()
}

function getExtractStatusMessage(response) {
  const payload = getResponsePayload(response)
  return payload?.message || payload?.msg || response?.message || ''
}

function getExtractKnowledgePoints(response) {
  const payload = getResponsePayload(response)
  const result = payload?.result && typeof payload.result === 'object' ? payload.result : null
  const knowledgePoint = payload?.knowledge_point || payload?.knowledgePoint || result?.knowledge_point
  return Array.isArray(knowledgePoint) ? knowledgePoint : null
}

function stopExtractStatusPolling() {
  if (extractStatusTimer) {
    clearInterval(extractStatusTimer)
    extractStatusTimer = null
  }
}

function applyExtractResult(response) {
  const knowledgePoints = getExtractKnowledgePoints(response)
  if (!knowledgePoints) return false

  const nextTree = ensureTreeIds(knowledgePoints)
  treeData.value = nextTree
  expandedKeys.value = nextTree.map(node => node.id)
  rawData.value = {
    ...(rawData.value || {}),
    course_id: rawData.value?.course_id || props.courseId,
    course: rawData.value?.course || courseName.value,
    knowledge_point: nextTree
  }
  return true
}

function isExtractCompleted(response) {
  if (getExtractKnowledgePoints(response)) return true
  const status = getExtractStatusValue(response)
  return ['success', 'succeeded', 'completed', 'complete', 'finished', 'done'].includes(status)
}

function isExtractFailed(response) {
  const status = getExtractStatusValue(response)
  return ['fail', 'failed', 'error', 'errored', 'canceled', 'cancelled'].includes(status)
}

async function pollExtractStatus(taskId) {
  try {
    const response = await getKnowledgePointExtractStatusApi(taskId)
    const status = getExtractStatusValue(response)
    const statusMessage = getExtractStatusMessage(response)

    if (isExtractFailed(response)) {
      stopExtractStatusPolling()
      extracting.value = false
      extractStatusType.value = 'error'
      extractStatusText.value = statusMessage || '知识点抽取失败'
      saveExtractState()
      message.error(extractStatusText.value)
      return
    }

    if (isExtractCompleted(response)) {
      stopExtractStatusPolling()
      extracting.value = false
      extractStatusType.value = 'success'
      extractStatusText.value = statusMessage || '知识点抽取完成'
      const applied = applyExtractResult(response)
      if (!applied) await fetchData()
      saveExtractState()
      message.success('知识点抽取完成')
      return
    }

    extractStatusType.value = 'info'
    extractStatusText.value = statusMessage || (status ? `抽取中：${status}` : '知识点抽取中，请稍候')
    saveExtractState()
  } catch (err) {
    console.error('查询知识点抽取状态失败:', err)
    extractStatusType.value = 'warning'
    extractStatusText.value = err.message || '状态查询失败，稍后将继续重试'
    saveExtractState()
  }
}

function startExtractStatusPolling(taskId) {
  stopExtractStatusPolling()
  pollExtractStatus(taskId)
  extractStatusTimer = setInterval(() => pollExtractStatus(taskId), 3000)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isQueueFullError(error) {
  return String(error?.data?.code) === '10010' ||
    error?.message?.includes('任务提交队列已满')
}

async function submitExtractTaskWithRetry(file, courseId) {
  for (let attempt = 0; attempt <= extractSubmitRetryDelays.length; attempt++) {
    try {
      return await extractKnowledgePointApi(file, courseId)
    } catch (err) {
      const retryDelay = extractSubmitRetryDelays[attempt]
      if (!isQueueFullError(err) || !retryDelay) throw err

      extractStatusType.value = 'warning'
      extractStatusText.value = `PaddleOCR 任务提交队列已满，${retryDelay / 1000} 秒后自动重试（${attempt + 1}/${extractSubmitRetryDelays.length}）`
      saveExtractState()
      await sleep(retryDelay)
    }
  }
}

function beforeExtractUpload(file) {
  const fileName = file.name?.toLowerCase() || ''
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  const allowedExtensions = ['.pdf', '.doc', '.docx']
  const isAllowedDocument = allowedTypes.includes(file.type) ||
    allowedExtensions.some(extension => fileName.endsWith(extension))

  if (!isAllowedDocument) {
    message.error('只能上传 PDF 或 Word 格式的课本教材')
    return false
  }
  return true
}

async function handleExtractUpload({ file, onSuccess, onError }) {
  const courseId = currentCourseId.value
  if (!courseId) {
    const err = new Error('缺少课程ID，无法上传教材抽取知识点')
    message.error(err.message)
    onError?.(err)
    return
  }

  extracting.value = true
  extractStatusType.value = 'info'
  extractStatusText.value = '正在上传教材文档...'
  extractTaskId.value = ''
  stopExtractStatusPolling()
  saveExtractState()

  try {
    const response = await submitExtractTaskWithRetry(file, courseId)
    const taskId = getExtractTaskId(response)

    if (!taskId && !isExtractCompleted(response)) {
      throw new Error(response.message || '上传成功，但未返回任务ID')
    }

    if (taskId) {
      extractTaskId.value = String(taskId)
      extractStatusText.value = '抽取任务已提交，正在处理'
      saveExtractState()
      startExtractStatusPolling(extractTaskId.value)
    } else {
      extracting.value = false
      extractStatusType.value = 'success'
      extractStatusText.value = '知识点抽取完成'
      const applied = applyExtractResult(response)
      if (!applied) await fetchData()
      saveExtractState()
    }

    onSuccess?.(response)
  } catch (err) {
    console.error('上传教材抽取知识点失败:', err)
    extracting.value = false
    extractStatusType.value = 'error'
    extractStatusText.value = isQueueFullError(err)
      ? 'PaddleOCR 任务提交队列已满，请稍后再试'
      : err.message || '上传失败，请稍后重试'
    saveExtractState()
    message.error(extractStatusText.value)
    onError?.(err)
  }
}

async function fetchData() {
  const courseId = currentCourseId.value
  if (!courseId) return
  loadingState.value = true
  error.value = null
  try {
    const response = await getKnowledgePointApi(courseId)
    if (response.code === 200 && response.data) {
      rawData.value = response.data
      courseName.value = response.data.course || ''
      if (response.data.knowledge_point && Array.isArray(response.data.knowledge_point)) {
        treeData.value = ensureTreeIds(response.data.knowledge_point)
        expandedKeys.value = treeData.value.map(node => node.id)
      } else {
        treeData.value = []
      }
    } else {
      error.value = response.message || '获取数据失败'
    }
  } catch (err) {
    console.error('获取知识图谱数据失败:', err)
    error.value = err.message || '网络请求失败，请稍后重试'
  } finally {
    loadingState.value = false
  }
}

function toggleExpand(nodeId) {
  const index = expandedKeys.value.indexOf(nodeId)
  if (index > -1) {
    expandedKeys.value.splice(index, 1)
  } else {
    expandedKeys.value.push(nodeId)
  }
}

function selectNode(nodeId) {
  const node = findNode(treeData.value, nodeId)
  if (node && node.type === 'point') {
    selectedNode.value = node
    detailDrawerVisible.value = true
  }
}

function handleGraphNodeClick(node) {
  if (node) {
    selectedNode.value = node
  }
}

function handleGraphNodeSelect(node) {
  if (node) {
    selectedNode.value = node
  }
}

function startEditNode(node) {
  if (editingNodeId.value && String(editingNodeId.value) !== String(node.id)) {
    message.warning('请先保存或取消当前编辑')
    return
  }
  editingNodeId.value = node.id
  originalNode.value = { ...node }
  editForm.value = { label: node.label || '', content: node.content || '' }
}

function cancelEditNode() {
  editingNodeId.value = null
  editForm.value = { label: '', content: '' }
  originalNode.value = null
}

async function saveEditNode() {
  if (!editingNodeId.value) return
  if (!editForm.value.label?.trim()) {
    message.error('名称不能为空')
    return
  }
  if (!rawData.value) {
    message.error('数据不存在，请刷新后重试')
    return
  }

  saving.value = true
  try {
    const updatedKnowledgePoint = ensureTreeIds(updateNodeById(
      cloneTree(treeData.value),
      editingNodeId.value,
      { label: editForm.value.label, content: editForm.value.content }
    ))
    const payload = {
      id: rawData.value.id,
      course_id: rawData.value.course_id || props.courseId,
      knowledge_point: updatedKnowledgePoint,
      deleted_at: null
    }
    const response = await updateKnowledgePointApi(payload)
    if (response.code === 200) {
      if (response.data) {
        rawData.value = response.data
        if (response.data.knowledge_point) treeData.value = response.data.knowledge_point
      } else {
        rawData.value.knowledge_point = updatedKnowledgePoint
        treeData.value = updatedKnowledgePoint
      }
      if (selectedNode.value && String(selectedNode.value.id) === String(editingNodeId.value)) {
        const updatedNode = findNode(treeData.value, editingNodeId.value)
        if (updatedNode) selectedNode.value = updatedNode
      }
      editingNodeId.value = null
      editForm.value = { label: '', content: '' }
      originalNode.value = null
      message.success('知识点更新成功')
    } else {
      message.error(response.message || '更新失败')
    }
  } catch (err) {
    console.error('保存知识点失败:', err)
    message.error(err.message || '保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

function updateLabel(value) { editForm.value.label = value }
function updateContent(value) { editForm.value.content = value }

function handleDownload({ type, view }) {
  if (type === 'image' && view === 'graph' && graphRef.value) {
    try {
      const imageUrl = graphRef.value.getImageDataUrl?.()
      if (!imageUrl) {
        message.error('无法获取图谱图片')
        return
      }

      const link = document.createElement('a')
      link.download = `knowledge-graph-${Date.now()}.png`
      link.href = imageUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      message.success('图片下载成功')
    } catch (err) {
      console.error('下载图片失败:', err)
      message.error('下载失败: ' + err.message)
    }
  } else {
    message.info('该视图的图片下载功能开发中')
  }
}

watch(() => props.courseId, (newCourseId) => {
  const courseId = newCourseId || route.params.id
  if (courseId) {
    resetExtractState()
    if (showExtractPanel) restoreExtractState(courseId)
    fetchData()
  }
}, { immediate: true })

watch(() => route.params.id, (newCourseId) => {
  if (!props.courseId && newCourseId) {
    resetExtractState()
    if (showExtractPanel) restoreExtractState(newCourseId)
    fetchData()
  }
})

watch(() => props.loading, (newLoading) => {
  if (newLoading) fetchData()
})

onBeforeUnmount(() => {
  stopExtractStatusPolling()
})
</script>

<style scoped>
.knowledge-graph-module {
  height: 100%;
  min-height: 600px;
}

.loading-spin {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.loading-placeholder {
  width: 100%;
  height: 400px;
}

.knowledge-tree {
  padding: 4px 0;
}

.extract-card {
  margin-bottom: 16px;
  background: #f8fbff;
  border: 1px solid #e6f0ff;
  border-radius: 8px;
}

.extract-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.extract-title {
  color: #262626;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.extract-desc {
  color: #8c8c8c;
  font-size: 13px;
}

.extract-status {
  margin-top: 12px;
}

.node-detail {
  padding: 8px 0;
}

.node-detail h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.node-detail .mb-4 {
  margin-bottom: 16px;
}

.node-detail h4 {
  margin: 20px 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #595959;
}

.node-detail p {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: #595959;
  text-align: justify;
}

@media screen and (max-width: 640px) {
  .extract-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .extract-toolbar :deep(.ant-btn) {
    width: 100%;
  }
}
</style>
