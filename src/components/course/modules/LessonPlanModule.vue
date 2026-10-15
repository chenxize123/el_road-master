<!--
 * @Date         : 2026-08-18
 * @Description  : 课程教案模块 - 基于知识图谱结构生成教案
 * @FilePath     : LessonPlanModule.vue
 * @Version      : V1.0.0
-->
<template>
  <div class="lesson-plan-module">
    <div class="module-toolbar">
      <div>
        <h2>课程教案</h2>
        <p>从知识图谱中选择章、节或知识点，生成对应教学内容。</p>
      </div>
      <a-space wrap>
        <a-button :loading="lessonPlanListLoading" @click="fetchLessonPlanList">
          <template #icon><reload-outlined /></template>
          刷新教案
        </a-button>
        <a-button :loading="knowledgeLoading" @click="fetchKnowledgeData">
          <template #icon><reload-outlined /></template>
          刷新图谱
        </a-button>
      </a-space>
    </div>

    <a-alert
      v-if="knowledgeError"
      class="module-alert"
      type="error"
      show-icon
      :message="knowledgeError"
    />

    <a-tabs v-model:activeKey="activeSubPage" class="lesson-sub-tabs" @change="handleSubPageChange">
      <a-tab-pane key="generate" tab="生成教案">
        <div class="module-grid">
          <a-card title="选择知识结构" class="structure-card">
            <div class="structure-layout">
              <div class="tree-panel">
                <a-spin :spinning="knowledgeLoading">
                  <a-empty
                    v-if="!knowledgeTree.length"
                    description="暂无知识图谱数据"
                  />
                  <a-tree
                    v-else
                    v-model:expandedKeys="expandedKeys"
                    v-model:selectedKeys="selectedKeys"
                    :tree-data="knowledgeTree"
                    :field-names="{ title: 'label', key: 'id', children: 'children' }"
                    block-node
                    :disabled="isVisitor"
                    @select="handleSelectNode"
                  >
                    <template #title="{ label, type }">
                      <span class="tree-title">
                        <a-tag :color="getTypeColor(type)">{{ getTypeLabel(type) }}</a-tag>
                        <span>{{ label }}</span>
                      </span>
                    </template>
                  </a-tree>
                </a-spin>
              </div>

              <div class="selected-panel">
                <div v-if="selectedNode" class="selected-summary">
                  <div class="selected-heading">
                    <a-tag :color="getTypeColor(selectedNode.type)">
                      {{ getTypeLabel(selectedNode.type) }}
                    </a-tag>
                    <div class="selected-name">{{ selectedNode.label }}</div>
                  </div>
                  <div class="selected-meta">
                    已包含 {{ selectedNodeCount }} 个节点，其中 {{ selectedPointCount }} 个知识点
                  </div>
                  <div v-if="selectedNode.content" class="selected-content">
                    {{ selectedNode.content }}
                  </div>
                  <div v-if="selectedChildrenPreview.length" class="selected-children">
                    <div class="detail-label">包含内容</div>
                    <a-tag
                      v-for="child in selectedChildrenPreview"
                      :key="child.id"
                      :color="getTypeColor(child.type)"
                    >
                      {{ child.label }}
                    </a-tag>
                    <span v-if="selectedChildrenOverflow > 0" class="more-text">
                      等 {{ selectedChildrenOverflow }} 项
                    </span>
                  </div>
                </div>
                <a-empty v-else description="请选择一个知识结构" />
              </div>
            </div>
          </a-card>

          <a-card title="生成教案" class="editor-card">
            <a-form layout="vertical">
              <a-form-item label="教案标题" required>
                <a-input
                  v-model:value="form.title"
                  placeholder="请输入教案标题"
                  :maxlength="100"
                  show-count
                  :disabled="isVisitor"
                />
              </a-form-item>

              <a-form-item label="教学情境" required>
                <a-textarea
                  v-model:value="form.teaching_context"
                  placeholder="例如：授课对象、课时安排、课堂环境、已有基础等"
                  :auto-size="{ minRows: 4, maxRows: 8 }"
                  :maxlength="1000"
                  show-count
                  :disabled="isVisitor"
                />
              </a-form-item>

              <a-form-item label="教学要求" required>
                <a-textarea
                  v-model:value="form.teaching_requirements"
                  placeholder="例如：教学目标、重点难点、活动形式、考核要求等"
                  :auto-size="{ minRows: 4, maxRows: 8 }"
                  :maxlength="1000"
                  show-count
                  :disabled="isVisitor"
                />
              </a-form-item>
            </a-form>

            <div class="action-row">
              <a-space wrap>
                <a-button
                  type="primary"
                  :loading="creating"
                  :disabled="isVisitor || !canCreate"
                  @click="handleCreateLessonPlan"
                >
                  <template #icon><plus-outlined /></template>
                  提交生成任务
                </a-button>
              </a-space>
            </div>
          </a-card>
        </div>
      </a-tab-pane>

      <a-tab-pane key="existing" tab="已有教案">
        <a-card class="content-card">
          <template #title>
            <span>已有教案</span>
          </template>
          <template #extra>
            <a-space wrap>
              <a-tag v-if="currentLessonPlan?.id" color="blue">ID：{{ currentLessonPlan.id }}</a-tag>
              <a-button
                v-if="currentLessonPlan?.id && !contentEditing"
                @click="startEditContent"
              >
                修改内容
              </a-button>
              <a-button
                v-if="contentEditing"
                :loading="updating"
                type="primary"
                @click="handleUpdateLessonPlan"
              >
                <template #icon><save-outlined /></template>
                保存内容
              </a-button>
              <a-button
                v-if="contentEditing"
                @click="cancelEditContent"
              >
                取消
              </a-button>
              <a-button
                type="primary"
                :disabled="!lessonContent"
                @click="downloadLessonPlanWord"
              >
                <template #icon><file-word-outlined /></template>
                下载 Word
              </a-button>
              <a-button
                danger
                :loading="deleting"
                :disabled="!currentLessonPlan?.id"
                @click="handleDeleteLessonPlan"
              >
                <template #icon><delete-outlined /></template>
                删除教案
              </a-button>
            </a-space>
          </template>

          <div class="existing-layout">
            <div class="lesson-list-panel">
              <div class="section-heading">
                <span>教案列表</span>
              </div>

              <a-spin :spinning="lessonPlanListLoading || lessonPlanDetailLoading">
                <a-empty
                  v-if="!lessonPlanList.length"
                  description="暂无教案"
                  class="compact-empty"
                />
                <div v-else class="lesson-list">
                  <button
                    v-for="plan in lessonPlanList"
                    :key="plan.id"
                    type="button"
                    class="lesson-list-item"
                    :class="{ active: String(plan.id) === String(currentLessonPlan?.id) }"
                    @click="handleSelectLessonPlan(plan)"
                  >
                    <span class="lesson-title">{{ plan.title || '未命名教案' }}</span>
                    <a-tag v-if="plan.id" color="blue">ID：{{ plan.id }}</a-tag>
                  </button>
                </div>
              </a-spin>
            </div>

            <div class="lesson-content-panel">
              <div v-if="currentLessonPlan?.id" class="lesson-display-header">
                <h3>{{ currentLessonPlan.title || '未命名教案' }}</h3>
                <div class="lesson-meta">
                  <span v-if="currentLessonPlan.course">课程：{{ currentLessonPlan.course }}</span>
                  <span v-if="currentLessonPlan.teaching_context">教学情境：{{ currentLessonPlan.teaching_context }}</span>
                </div>
              </div>

              <a-empty
                v-if="!lessonContent && !contentEditing"
                description="提交生成任务后，请刷新教案列表查看生成结果"
              />
              <a-textarea
                v-else-if="contentEditing"
                v-model:value="contentDraft"
                :auto-size="{ minRows: 14, maxRows: 28 }"
                class="content-editor"
              />
              <article
                v-else
                class="markdown-preview"
                v-html="renderedLessonContent"
              ></article>
            </div>
          </div>
        </a-card>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useUserStore } from '@/store'
import {
  DeleteOutlined,
  FileWordOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined
} from '@ant-design/icons-vue'
import {
  createLessonPlanApi,
  deleteLessonPlanApi,
  getLessonPlanByIdApi,
  getLessonPlanListByCourseIdApi,
  getKnowledgePointApi,
  updateLessonPlanApi
} from '@/api/course'
import { ensureTreeIds } from '@/utils/index.js'

const props = defineProps({
  courseId: {
    type: [String, Number],
    required: true
  },
  courseInfo: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const userStore = useUserStore()
const isVisitor = computed(() => userStore.userInfo?.user_type === 'visitor')

const form = reactive({
  title: '',
  teaching_context: '',
  teaching_requirements: ''
})

const knowledgeLoading = ref(false)
const knowledgeError = ref('')
const rawKnowledge = ref(null)
const knowledgeTree = ref([])
const expandedKeys = ref([])
const selectedKeys = ref([])
const selectedNode = ref(null)
const activeSubPage = ref('generate')
const currentLessonPlan = ref(null)
const lessonPlanList = ref([])
const lessonContent = ref('')
const contentDraft = ref('')
const contentEditing = ref(false)
const creating = ref(false)
const updating = ref(false)
const deleting = ref(false)
const lessonPlanListLoading = ref(false)
const lessonPlanDetailLoading = ref(false)

const typeLabels = {
  chapter: '章',
  sub_chapter: '节',
  section: '节',
  point: '知识点'
}

const typeColors = {
  chapter: 'blue',
  sub_chapter: 'cyan',
  section: 'cyan',
  point: 'green'
}

const selectedNodeCount = computed(() => countNodes(selectedNode.value))
const selectedPointCount = computed(() => countPoints(selectedNode.value))
const selectedChildrenPreview = computed(() => {
  return collectDescendants(selectedNode.value).slice(0, 8)
})
const selectedChildrenOverflow = computed(() => {
  const count = collectDescendants(selectedNode.value).length
  return Math.max(count - selectedChildrenPreview.value.length, 0)
})
const renderedLessonContent = computed(() => renderMarkdown(lessonContent.value))
const canCreate = computed(() => {
  return Boolean(
    selectedNode.value &&
    form.title.trim() &&
    form.teaching_context.trim() &&
    form.teaching_requirements.trim()
  )
})

function getTypeLabel(type) {
  return typeLabels[type] || '节点'
}

function getTypeColor(type) {
  return typeColors[type] || 'default'
}

function renderMarkdown(content) {
  if (!content) return ''
  return DOMPurify.sanitize(marked.parse(content))
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeFilename(value) {
  return String(value || '课程教案')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 80)
}

function cloneNode(node) {
  if (!node) return null
  const cloned = {
    id: node.id,
    label: node.label,
    type: node.type,
    content: node.content || ''
  }
  if (Array.isArray(node.children) && node.children.length) {
    cloned.children = node.children.map(cloneNode)
  }
  return cloned
}

function countNodes(node) {
  if (!node) return 0
  return 1 + (node.children || []).reduce((total, child) => total + countNodes(child), 0)
}

function countPoints(node) {
  if (!node) return 0
  const current = node.type === 'point' ? 1 : 0
  return current + (node.children || []).reduce((total, child) => total + countPoints(child), 0)
}

function collectDescendants(node) {
  if (!node?.children?.length) return []
  return node.children.flatMap(child => [child, ...collectDescendants(child)])
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

function getLessonPlanFromResponse(response) {
  return response?.data && typeof response.data === 'object' ? response.data : response
}

function getLessonPlanArrayFromResponse(response) {
  if (Array.isArray(response?.data)) return response.data.map(normalizeLessonPlan)
  if (Array.isArray(response?.data?.list)) return response.data.list.map(normalizeLessonPlan)
  if (Array.isArray(response?.list)) return response.list.map(normalizeLessonPlan)
  if (Array.isArray(response)) return response.map(normalizeLessonPlan)
  return []
}

function normalizeLessonPlan(plan) {
  if (!plan || typeof plan !== 'object') return plan
  return {
    ...plan,
    id: plan.id === undefined || plan.id === null ? plan.id : String(plan.id),
    course_id: plan.course_id === undefined || plan.course_id === null ? plan.course_id : String(plan.course_id)
  }
}

function applyLessonPlan(plan) {
  if (!plan || typeof plan !== 'object') return
  const normalizedPlan = normalizeLessonPlan(plan)
  currentLessonPlan.value = normalizedPlan
  lessonContent.value = normalizedPlan.content || normalizedPlan.lesson_plan || normalizedPlan.result || ''
  contentDraft.value = lessonContent.value
  contentEditing.value = false
}

function resetLessonPlanEditor() {
  currentLessonPlan.value = null
  lessonContent.value = ''
  contentDraft.value = ''
  contentEditing.value = false
}

async function fetchKnowledgeData() {
  if (!props.courseId) return
  knowledgeLoading.value = true
  knowledgeError.value = ''

  try {
    const response = await getKnowledgePointApi(props.courseId)
    if (response.code === 200 && response.data) {
      rawKnowledge.value = response.data
      const points = Array.isArray(response.data.knowledge_point)
        ? response.data.knowledge_point
        : []
      knowledgeTree.value = ensureTreeIds(points)
      expandedKeys.value = knowledgeTree.value.map(node => node.id)
      if (!form.title && props.courseInfo?.title) {
        form.title = `${props.courseInfo.title}教案`
      }
    } else {
      knowledgeError.value = response.message || '获取知识图谱失败'
    }
  } catch (error) {
    console.error('获取知识图谱失败:', error)
    knowledgeError.value = error.message || '网络请求失败，请稍后重试'
  } finally {
    knowledgeLoading.value = false
  }
}

function handleSelectNode(keys) {
  const key = keys?.[0]
  selectedNode.value = key ? findNode(knowledgeTree.value, key) : null
}

function handleSubPageChange(key) {
  if (key === 'existing') {
    fetchLessonPlanList()
  } else if (key === 'generate' && !knowledgeTree.value.length) {
    fetchKnowledgeData()
  }
}

async function fetchLessonPlanList() {
  if (!props.courseId) return
  lessonPlanListLoading.value = true

  try {
    const response = await getLessonPlanListByCourseIdApi(String(props.courseId))
    if (response.code === 200) {
      lessonPlanList.value = getLessonPlanArrayFromResponse(response)
    } else {
      message.error(response.message || '获取教案列表失败')
    }
  } catch (error) {
    console.error('获取教案列表失败:', error)
    message.error(error.message || '获取教案列表失败')
  } finally {
    lessonPlanListLoading.value = false
  }
}

async function handleSelectLessonPlan(plan) {
  if (!plan?.id) return
  applyLessonPlan(plan)
  lessonPlanDetailLoading.value = true

  try {
    const response = await getLessonPlanByIdApi(String(plan.id))
    if (response.code === 200) {
      applyLessonPlan(getLessonPlanFromResponse(response))
    } else {
      message.error(response.message || '获取教案详情失败')
    }
  } catch (error) {
    console.error('获取教案详情失败:', error)
    message.error(error.message || '获取教案详情失败')
  } finally {
    lessonPlanDetailLoading.value = false
  }
}

async function handleCreateLessonPlan() {
  if (!canCreate.value) {
    message.warning('请完整填写教案信息并选择知识结构')
    return
  }

  creating.value = true
  try {
    const response = await createLessonPlanApi({
      course_id: String(props.courseId),
      title: form.title.trim(),
      knowledge_structure: cloneNode(selectedNode.value),
      teaching_context: form.teaching_context.trim(),
      teaching_requirements: form.teaching_requirements.trim()
    })

    if (response.code === 200 || response.code === 201) {
      fetchLessonPlanList()
      message.success('教案生成任务已提交，请稍后刷新教案列表查看结果')
    } else {
      message.error(response.message || '提交生成任务失败')
    }
  } catch (error) {
    console.error('提交生成任务失败:', error)
    message.error(error.message || '提交生成任务失败')
  } finally {
    creating.value = false
  }
}

async function handleUpdateLessonPlan() {
  if (!currentLessonPlan.value?.id) return

  updating.value = true
  try {
    const response = await updateLessonPlanApi({
      id: String(currentLessonPlan.value.id),
      course_id: String(props.courseId),
      title: currentLessonPlan.value.title || '未命名教案',
      content: contentDraft.value || '',
      deleted_at: currentLessonPlan.value.deleted_at || null
    })

    if (response.code === 200) {
      const updatedPlan = getLessonPlanFromResponse(response)
      if (updatedPlan?.id) {
        applyLessonPlan(updatedPlan)
      } else {
        lessonContent.value = contentDraft.value
        contentEditing.value = false
      }
      fetchLessonPlanList()
      message.success('教案内容已更新')
    } else {
      message.error(response.message || '更新教案内容失败')
    }
  } catch (error) {
    console.error('更新教案内容失败:', error)
    message.error(error.message || '更新教案内容失败')
  } finally {
    updating.value = false
  }
}

function startEditContent() {
  if (!currentLessonPlan.value?.id) return
  contentDraft.value = lessonContent.value
  contentEditing.value = true
}

function cancelEditContent() {
  contentDraft.value = lessonContent.value
  contentEditing.value = false
}

function handleDeleteLessonPlan() {
  if (!currentLessonPlan.value?.id) return

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除教案「${form.title || currentLessonPlan.value.title}」吗？删除后无法恢复。`,
    okText: '确认删除',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      deleting.value = true
      try {
        const response = await deleteLessonPlanApi(String(currentLessonPlan.value.id))
        if (response.code === 200) {
          resetLessonPlanEditor()
          fetchLessonPlanList()
          message.success('教案已删除')
        } else {
          message.error(response.message || '删除教案失败')
        }
      } catch (error) {
        console.error('删除教案失败:', error)
        message.error(error.message || '删除教案失败')
      } finally {
        deleting.value = false
      }
    }
  })
}

function downloadLessonPlanWord() {
  if (!lessonContent.value) {
    message.warning('暂无可下载的教案内容')
    return
  }

  try {
    const title = currentLessonPlan.value?.title || '课程教案'
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.8; color: #262626; padding: 24px; }
    h1 { font-size: 26px; border-bottom: 2px solid #1677ff; padding-bottom: 10px; }
    h2 { font-size: 22px; margin-top: 28px; color: #1677ff; }
    h3 { font-size: 18px; margin-top: 22px; color: #13a8a8; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    th, td { border: 1px solid #d9d9d9; padding: 8px; }
    th { background: #f5f5f5; }
    blockquote { margin: 12px 0; padding: 8px 12px; border-left: 4px solid #91caff; background: #f6f8fa; }
    code { font-family: Consolas, monospace; background: #f6f8fa; padding: 2px 4px; }
    pre { background: #f6f8fa; padding: 12px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${renderedLessonContent.value}
</body>
</html>`
    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sanitizeFilename(title)}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success('Word 文档下载成功')
  } catch (error) {
    console.error('下载 Word 失败:', error)
    message.error(error.message || '下载 Word 失败')
  }
}

watch(() => props.courseId, (courseId) => {
  if (courseId) {
    fetchKnowledgeData()
    fetchLessonPlanList()
  }
}, { immediate: true })

watch(() => props.loading, (loading) => {
  if (!loading && props.courseInfo?.title && !form.title) {
    form.title = `${props.courseInfo.title}教案`
  }
})
</script>

<style scoped>
.lesson-plan-module {
  min-height: 600px;
}

.module-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.module-toolbar h2 {
  margin: 0 0 6px;
  color: #262626;
  font-size: 22px;
  font-weight: 600;
}

.module-toolbar p {
  margin: 0;
  color: #8c8c8c;
  font-size: 14px;
}

.module-alert {
  margin-bottom: 16px;
}

.module-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.95fr) minmax(360px, 1.05fr);
  gap: 16px;
  margin-bottom: 16px;
  align-items: start;
}

.structure-card,
.editor-card,
.content-card {
  border-radius: 8px;
}

.lesson-list-panel {
  padding: 12px;
  background: #f6f8fa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.existing-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.32fr) minmax(0, 0.68fr);
  gap: 16px;
  align-items: start;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  color: #262626;
  font-weight: 600;
}

.lesson-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 420px;
  overflow: auto;
}

.lesson-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  color: #595959;
  text-align: left;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lesson-list-item:hover,
.lesson-list-item.active {
  color: #1677ff;
  border-color: #91caff;
  background: #e6f4ff;
}

.lesson-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-empty {
  margin: 12px 0;
}

.lesson-content-panel {
  min-width: 0;
  height: 560px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fff;
}

.lesson-display-header {
  flex: 0 0 auto;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.lesson-display-header h3 {
  margin: 0 0 8px;
  color: #262626;
  font-size: 18px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.lesson-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  color: #8c8c8c;
  font-size: 13px;
}

.structure-card :deep(.ant-card-body) {
  padding: 16px;
}

.structure-layout {
  display: grid;
  grid-template-rows: minmax(0, 360px) minmax(150px, auto);
  gap: 12px;
}

.tree-panel {
  height: 360px;
  overflow: auto;
  padding: 4px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fff;
}

.tree-panel :deep(.ant-spin-nested-loading),
.tree-panel :deep(.ant-spin-container) {
  min-height: 100%;
}

.tree-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tree-title span:last-child {
  overflow-wrap: anywhere;
}

.selected-summary {
  height: 100%;
  min-height: 150px;
  max-height: 220px;
  overflow: auto;
  padding: 12px;
  background: #f6f8fa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.selected-panel {
  min-height: 150px;
}

.selected-panel :deep(.ant-empty) {
  margin: 18px 0;
}

.selected-heading {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.selected-name {
  flex: 1;
  min-width: 0;
  color: #262626;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.selected-meta {
  color: #8c8c8c;
  font-size: 13px;
}

.selected-content {
  margin-top: 10px;
  color: #595959;
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.selected-children {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.detail-label {
  width: 100%;
  color: #8c8c8c;
  font-size: 12px;
}

.more-text {
  color: #8c8c8c;
  font-size: 12px;
}

.action-row {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.content-editor {
  flex: 1;
  min-height: 0;
  line-height: 1.8;
}

.content-editor :deep(textarea) {
  height: 100% !important;
  overflow-y: auto !important;
  resize: none;
}

.markdown-preview {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 4px;
  color: #262626;
  font-size: 14px;
  line-height: 1.85;
  overflow-wrap: anywhere;
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4) {
  margin: 1.1em 0 0.6em;
  color: #262626;
  font-weight: 600;
  line-height: 1.35;
}

.markdown-preview :deep(h1) {
  font-size: 24px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 10px;
}

.markdown-preview :deep(h2) {
  font-size: 20px;
}

.markdown-preview :deep(h3) {
  font-size: 17px;
}

.markdown-preview :deep(p),
.markdown-preview :deep(ul),
.markdown-preview :deep(ol),
.markdown-preview :deep(table),
.markdown-preview :deep(blockquote),
.markdown-preview :deep(pre) {
  margin: 0 0 12px;
}

.markdown-preview :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  padding: 8px 10px;
  border: 1px solid #f0f0f0;
  vertical-align: top;
}

.markdown-preview :deep(th) {
  background: #fafafa;
  font-weight: 600;
}

.markdown-preview :deep(blockquote) {
  padding: 8px 12px;
  color: #595959;
  background: #f6f8fa;
  border-left: 4px solid #91caff;
}

.markdown-preview :deep(code) {
  padding: 2px 4px;
  background: #f6f8fa;
  border-radius: 4px;
}

.markdown-preview :deep(pre) {
  padding: 12px;
  overflow: auto;
  background: #f6f8fa;
  border-radius: 6px;
}

@media screen and (max-width: 960px) {
  .module-grid {
    grid-template-columns: 1fr;
  }

  .existing-layout {
    grid-template-columns: 1fr;
  }

  .lesson-list {
    height: 220px;
  }

  .lesson-content-panel {
    height: 520px;
  }

  .structure-layout {
    grid-template-rows: minmax(0, 320px) minmax(140px, auto);
  }

  .tree-panel {
    height: 320px;
  }
}

@media screen and (max-width: 640px) {
  .module-toolbar {
    flex-direction: column;
  }

  .module-toolbar :deep(.ant-btn) {
    width: 100%;
  }

  .structure-card :deep(.ant-card-body) {
    padding: 12px;
  }

  .structure-layout {
    grid-template-rows: minmax(0, 280px) minmax(130px, auto);
  }

  .tree-panel {
    height: 280px;
  }

  .selected-summary {
    max-height: 200px;
  }

  .lesson-content-panel {
    height: 460px;
  }

  .action-row {
    justify-content: stretch;
  }

  .action-row :deep(.ant-space),
  .action-row :deep(.ant-btn) {
    width: 100%;
  }

  .content-card :deep(.ant-card-extra) {
    width: 100%;
    margin-top: 12px;
  }
}
</style>
