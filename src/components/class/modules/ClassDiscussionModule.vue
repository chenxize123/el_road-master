<template>
  <div class="class-discussion-module">
    <div class="discussion-toolbar">
      <div class="toolbar-title">
        <h3>讨论区</h3>
        <span>{{ discussions.length }} 个讨论</span>
      </div>
      <a-button
        v-if="isTeacherOrAdmin"
        type="primary"
        @click="handleCreate"
      >
        <template #icon><plus-outlined /></template>
        创建讨论
      </a-button>
    </div>

    <a-alert
      v-if="error"
      class="discussion-alert"
      message="加载失败"
      :description="error"
      type="error"
      show-icon
    >
      <template #action>
        <a-button size="small" danger @click="fetchDiscussions">重试</a-button>
      </template>
    </a-alert>

    <a-table
      :columns="columns"
      :data-source="discussions"
      :expanded-row-keys="expandedRowKeys"
      :loading="loading || props.loading"
      row-key="id"
      :pagination="{ pageSize: 10, showSizeChanger: false }"
      :locale="{ emptyText: '暂无讨论' }"
      :scroll="{ x: 820 }"
      @expand="handleExpand"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'topic'">
          <a-button type="link" class="topic-link" @click="toggleDiscussion(record)">
            {{ record.topic || '-' }}
          </a-button>
        </template>

        <template v-else-if="column.key === 'zl_class'">
          {{ record.zl_class || '-' }}
        </template>

        <template v-else-if="column.key === 'create_by'">
          {{ record.create_by || '-' }}
        </template>

        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button type="link" size="small" @click="toggleDiscussion(record)">
              {{ isExpanded(record) ? '收起' : '查看讨论' }}
            </a-button>
            <a-popconfirm
              v-if="isTeacherOrAdmin"
              title="确定要删除这个讨论吗？"
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

      <template #expandedRowRender="{ record }">
        <div class="discussion-detail">
          <div class="discussion-summary">
            <div class="summary-header">
              <h3>{{ record.topic || '-' }}</h3>
              <a-button
                v-if="canUseAIFeature"
                type="primary"
                size="small"
                :loading="summaryLoading"
                @click="handleSummaryDiscussion"
              >
                <template #icon><ThunderboltOutlined /></template>
                AI总结
              </a-button>
            </div>
            <div class="summary-meta">
              <a-tag v-if="record.zl_class" color="blue">
                {{ record.zl_class }}
              </a-tag>
              <a-tag v-if="record.create_by" color="default">
                创建人：{{ record.create_by }}
              </a-tag>
            </div>
          </div>

          <div class="evaluation-section">
            <div class="section-header">
              <div>
                <h4>讨论评分</h4>
                <span v-if="evaluationExpanded">{{ discussionEvaluations.length }} 位同学</span>
                <span v-else>点击后查看评分明细</span>
              </div>
              <div class="evaluation-actions">
                <a-statistic
                  v-if="evaluationExpanded"
                  title="平均总分"
                  :value="averageTotalScore"
                  :precision="1"
                  suffix="分"
                  class="average-score"
                />
                <a-button
                  size="small"
                  :loading="evaluationLoading"
                  @click="toggleDiscussionEvaluations"
                >
                  {{ evaluationExpanded ? '收起评分' : '查看评分' }}
                </a-button>
                <a-button
                  v-if="evaluationExpanded"
                  size="small"
                  type="primary"
                  :loading="evaluationExporting"
                  :disabled="discussionEvaluations.length === 0"
                  @click="handleExportEvaluationExcel"
                >
                  <template #icon><DownloadOutlined /></template>
                  导出 Excel
                </a-button>
              </div>
            </div>

            <div v-if="evaluationExpanded">
              <a-alert
                v-if="evaluationError"
                class="discussion-alert"
                message="加载讨论评分失败"
                :description="evaluationError"
                type="error"
                show-icon
              >
                <template #action>
                  <a-button size="small" danger @click="fetchDiscussionEvaluations">重试</a-button>
                </template>
              </a-alert>

              <a-table
                v-else
                :columns="evaluationColumns"
                :data-source="discussionEvaluations"
                :loading="evaluationLoading"
                row-key="id"
                size="small"
                :pagination="false"
                :locale="{ emptyText: '暂无评分数据' }"
                :scroll="{ x: 680, y: 260 }"
                class="evaluation-table"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'user'">
                    <span class="student-name">{{ record.user || '-' }}</span>
                  </template>
                  <template v-else-if="column.key === 'total_score'">
                    <a-tag :color="getScoreColor(record.total_score)" class="score-tag">
                      {{ formatScore(record.total_score) }} 分
                    </a-tag>
                  </template>
                  <template v-else-if="column.key.endsWith('_score')">
                    {{ formatScore(record[column.key]) }}
                  </template>
                </template>
              </a-table>
            </div>
          </div>

          <a-alert
            v-if="contentError"
            class="discussion-alert"
            message="加载讨论内容失败"
            :description="contentError"
            type="error"
            show-icon
          >
            <template #action>
              <a-button size="small" danger @click="fetchDiscussionContents">重试</a-button>
            </template>
          </a-alert>

          <div class="content-list">
            <a-spin v-if="contentLoading" tip="加载讨论内容中..." />

            <a-empty
              v-else-if="discussionContents.length === 0"
              description="暂无讨论内容"
            />

            <a-list v-else :data-source="mainContents" item-layout="vertical">
              <template #renderItem="{ item }">
                <a-list-item class="content-item">
                  <div class="content-card">
                    <div class="content-header">
                      <div class="content-user">
                        <a-avatar
                          :src="getContentAvatarUrl(item)"
                          :size="36"
                          class="content-avatar"
                        >
                          {{ getUserInitial(item.user) }}
                        </a-avatar>
                        <div class="content-author">{{ item.user || '未知用户' }}</div>
                      </div>
                      <div class="content-meta">
                        <span>{{ formatDateTime(item.create_time) }}</span>
                        <a-button
                          v-if="canUseAIFeature"
                          type="link"
                          size="small"
                          @click="handleAnalyzeContent(item)"
                        >
                          AI分析
                        </a-button>
                        <a-popconfirm
                          v-if="canDeleteContent(item)"
                          title="确定要删除这条讨论内容吗？"
                          ok-text="确定"
                          cancel-text="取消"
                          @confirm="handleDeleteContent(item.id)"
                        >
                          <a-button
                            type="link"
                            size="small"
                            danger
                            class="content-delete"
                            :loading="deletingContentId === item.id"
                          >
                            删除
                          </a-button>
                        </a-popconfirm>
                      </div>
                    </div>
                    <div class="content-text">{{ item.content || '-' }}</div>
                  </div>

                  <div v-if="hasAiAnalyses(item.id)" class="ai-analyses-section">
                    <a-button
                      type="link"
                      size="small"
                      class="ai-analyses-toggle"
                      @click="toggleAiAnalyses(item.id)"
                    >
                      {{ isAiAnalysesExpanded(item.id) ? '收起' : `查看${getAiAnalysesCount(item.id)}条AI分析` }}
                    </a-button>

                    <div v-if="isAiAnalysesExpanded(item.id)" class="ai-analyses-panel">
                      <div v-for="aiItem in getAiAnalyses(item.id)" :key="aiItem.id" class="ai-analysis-item">
                        <div class="ai-analysis-card">
                          <div class="content-header">
                            <div class="content-user">
                              <a-avatar
                                :src="getContentAvatarUrl(aiItem)"
                                :size="32"
                                class="content-avatar"
                              >
                                {{ getUserInitial(aiItem.user) }}
                              </a-avatar>
                              <div class="content-author">{{ aiItem.user || 'AI助手' }}</div>
                            </div>
                            <div class="content-meta">
                              <span>{{ formatDateTime(aiItem.create_time) }}</span>
                            </div>
                          </div>
                          <div class="content-text markdown-body" v-html="renderMarkdown(aiItem.content)"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </a-list-item>
              </template>
            </a-list>
          </div>

          <div class="reply-form">
            <a-textarea
              v-model:value="replyForm.content"
              placeholder="请输入讨论内容"
              :rows="4"
              :maxlength="1000"
              show-count
            />
            <div class="reply-actions">
              <a-button
                type="primary"
                :loading="replySubmitting"
                :disabled="replySubmitting"
                @click="handleCreateContent"
              >
                发表内容
              </a-button>
            </div>
          </div>
        </div>
      </template>
    </a-table>

    <a-modal
      v-model:open="modalVisible"
      title="创建讨论"
      :confirm-loading="saving"
      @ok="handleSubmit"
      @cancel="handleCancel"
      destroy-on-close
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
      >
        <a-form-item label="讨论主题" name="topic" required>
          <a-input
            v-model:value="formData.topic"
            placeholder="请输入讨论主题"
            :maxlength="100"
            show-count
            @pressEnter="handleSubmit"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="analyzeModalVisible"
      title="AI分析"
      :confirm-loading="analyzeSubmitting"
      @ok="handleConfirmAnalyze"
      @cancel="handleCancelAnalyze"
      destroy-on-close
    >
      <div class="selected-content-preview">
        <div class="preview-label">选中的讨论内容：</div>
        <div class="preview-text">{{ selectedContentForAnalyze?.content }}</div>
      </div>
      <a-form layout="vertical" style="margin-top: 16px">
        <a-form-item label="请输入你的需求">
          <a-textarea
            v-model:value="analyzeIntent"
            placeholder="例如：分析这个观点的合理性，或者补充相关的论点"
            :rows="4"
            :maxlength="500"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="resultModalVisible"
      :title="resultModalTitle"
      :confirm-loading="resultLoading"
      @ok="handleCopyResult"
      @cancel="handleCloseResult"
      ok-text="复制内容"
      cancel-text="关闭"
      width="600px"
      destroy-on-close
    >
      <div v-if="resultLoading" class="result-loading">
        <a-spin size="large" />
        <div class="loading-text">AI思考中...</div>
      </div>
      <div v-else class="result-content">
        <div class="markdown-body" v-html="renderedResult"></div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ThunderboltOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import * as XLSX from 'xlsx'
import { useUserStore } from '@/store'
import { getAvatarUrlApi } from '@/api/file'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import {
  createDiscussion,
  createDiscussionContent,
  deleteDiscussion,
  deleteDiscussionContent,
  getDiscussionContentsByDiscussionId,
  getDiscussionsByClassId,
  getDiscussionEvaluationByDiscussionId,
  analyzeDiscussionContent
} from '@/api/discussion'

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

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const discussions = ref([])
const modalVisible = ref(false)
const formRef = ref(null)
const formData = ref({
  topic: ''
})

const expandedRowKeys = ref([])
const selectedDiscussion = ref(null)
const contentLoading = ref(false)
const contentError = ref('')
const discussionContents = ref([])
const evaluationLoading = ref(false)
const evaluationError = ref('')
const discussionEvaluations = ref([])
const evaluationExpanded = ref(false)
const evaluationExporting = ref(false)
const replySubmitting = ref(false)
const deletingContentId = ref('')
const avatarUrlMap = ref({})
const avatarLoadingMap = ref({})
const replyForm = ref({
  content: ''
})

const mainContents = ref([])
const aiAnalysesMap = ref({})
const expandedAiAnalyses = ref(new Set())

const canUseAIFeature = computed(() => {
  return userStore.isAuthenticated === true
})

const summaryLoading = ref(false)
const analyzeModalVisible = ref(false)
const analyzeSubmitting = ref(false)
const selectedContentForAnalyze = ref(null)
const analyzeIntent = ref('')
const resultModalVisible = ref(false)
const resultModalTitle = ref('AI分析结果')
const resultLoading = ref(false)
const aiResult = ref('')
const renderedResult = ref('')

const isTeacherOrAdmin = computed(() => {
  const role = userStore.userInfo?.user_type
  return role === 'teacher' || role === 'admin'
})

const currentUserNames = computed(() => {
  const userInfo = userStore.userInfo || {}
  return [
    userInfo.real_name,
    userInfo.nickname,
    userInfo.username,
    userInfo.name
  ]
    .filter(Boolean)
    .map(normalizeName)
})

const columns = computed(() => {
  return [
    {
      title: '讨论主题',
      dataIndex: 'topic',
      key: 'topic',
      width: 320
    },
    {
      title: '所属班级',
      dataIndex: 'zl_class',
      key: 'zl_class',
      width: 240,
      responsive: ['md']
    },
    {
      title: '创建人',
      dataIndex: 'create_by',
      key: 'create_by',
      width: 120,
      responsive: ['sm']
    },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      fixed: 'right'
    }
  ]
})

const evaluationColumns = computed(() => {
  return [
    {
      title: '学生',
      dataIndex: 'user',
      key: 'user',
      width: 160,
      fixed: 'left'
    },
    {
      title: '参与度',
      dataIndex: 'engagement_score',
      key: 'engagement_score',
      width: 120,
      sorter: (a, b) => Number(a.engagement_score || 0) - Number(b.engagement_score || 0)
    },
    {
      title: '内容质量',
      dataIndex: 'quality_score',
      key: 'quality_score',
      width: 120,
      sorter: (a, b) => Number(a.quality_score || 0) - Number(b.quality_score || 0)
    },
    {
      title: '认知深度',
      dataIndex: 'cognitive_score',
      key: 'cognitive_score',
      width: 120,
      sorter: (a, b) => Number(a.cognitive_score || 0) - Number(b.cognitive_score || 0)
    },
    {
      title: '总分',
      dataIndex: 'total_score',
      key: 'total_score',
      width: 120,
      sorter: (a, b) => Number(a.total_score || 0) - Number(b.total_score || 0),
      defaultSortOrder: 'descend'
    }
  ]
})

const averageTotalScore = computed(() => {
  const scores = discussionEvaluations.value
    .map(item => Number(item.total_score))
    .filter(score => Number.isFinite(score))

  if (scores.length === 0) return 0

  return scores.reduce((sum, score) => sum + score, 0) / scores.length
})

const formRules = {
  topic: [
    { required: true, message: '请输入讨论主题', trigger: 'blur' },
    { max: 100, message: '讨论主题不能超过 100 个字符', trigger: 'blur' }
  ]
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeDiscussion(item) {
  return {
    id: item?.id === undefined || item?.id === null ? '' : String(item.id),
    zl_class: item?.zl_class || '',
    topic: item?.topic || '',
    create_by: item?.create_by || ''
  }
}

function normalizeDiscussionContent(item) {
  return {
    id: item?.id === undefined || item?.id === null ? '' : String(item.id),
    avatar: item?.avatar || '',
    user: item?.user || '',
    discussion: item?.discussion || '',
    content: item?.content || '',
    create_time: item?.create_time || '',
    quoted_content_id: item?.quoted_content_id === undefined || item?.quoted_content_id === null
      ? null
      : String(item.quoted_content_id)
  }
}

function normalizeDiscussionEvaluation(item) {
  return {
    id: item?.id === undefined || item?.id === null ? '' : String(item.id),
    discussion: item?.discussion || '',
    user: item?.user || '',
    engagement_score: Number(item?.engagement_score || 0),
    quality_score: Number(item?.quality_score || 0),
    cognitive_score: Number(item?.cognitive_score || 0),
    total_score: Number(item?.total_score || 0)
  }
}

function groupDiscussionContents(contents) {
  const mainContents = []
  const aiAnalysesMap = {}

  contents.forEach(item => {
    if (!item.quoted_content_id) {
      mainContents.push(item)
    } else {
      const quotedId = item.quoted_content_id
      if (!aiAnalysesMap[quotedId]) {
        aiAnalysesMap[quotedId] = []
      }
      aiAnalysesMap[quotedId].push(item)
    }
  })

  Object.keys(aiAnalysesMap).forEach(id => {
    aiAnalysesMap[id].sort((a, b) => new Date(a.create_time) - new Date(b.create_time))
  })

  return { mainContents, aiAnalysesMap }
}

function getUserInitial(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase()
}

function getContentAvatarUrl(item) {
  const avatar = item?.avatar
  if (!avatar) return ''
  return avatarUrlMap.value[avatar] || ''
}

async function fetchContentAvatar(avatar) {
  if (!avatar || avatarUrlMap.value[avatar] || avatarLoadingMap.value[avatar]) {
    return
  }

  avatarLoadingMap.value[avatar] = true
  try {
    avatarUrlMap.value[avatar] = await getAvatarUrlApi(avatar, 10)
  } catch (err) {
    console.error('获取讨论用户头像失败:', err)
    avatarUrlMap.value[avatar] = ''
  } finally {
    avatarLoadingMap.value[avatar] = false
  }
}

function fetchContentAvatars(contents) {
  const avatars = Array.from(new Set(
    contents
      .map(item => item.avatar)
      .filter(Boolean)
  ))

  avatars.forEach(fetchContentAvatar)
}

function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hour}:${minute}`
}

function formatScore(value) {
  const score = Number(value)
  if (!Number.isFinite(score)) return '0.0'
  return score.toFixed(1)
}

function getScoreColor(value) {
  const score = Number(value)
  if (score >= 85) return 'green'
  if (score >= 60) return 'blue'
  if (score > 0) return 'orange'
  return 'default'
}

function getSafeFileName(value) {
  return String(value || '讨论评分').replace(/[\/\\:*?"<>|]/g, '_')
}

function getExportTimeText() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${year}${month}${day}_${hour}${minute}`
}

function generateEvaluationFileName() {
  const topic = selectedDiscussion.value?.topic || discussionEvaluations.value[0]?.discussion || '讨论'
  return `${getSafeFileName(topic)}_讨论评分_${getExportTimeText()}.xlsx`
}

function prepareEvaluationExportData() {
  const headers = ['序号', '学生姓名', '讨论主题', '参与度评分', '内容质量评分', '认知深度评分', '总评分']
  const rows = discussionEvaluations.value.map((record, index) => [
    index + 1,
    record.user || '-',
    record.discussion || selectedDiscussion.value?.topic || '-',
    formatScore(record.engagement_score),
    formatScore(record.quality_score),
    formatScore(record.cognitive_score),
    formatScore(record.total_score)
  ])

  return [headers, ...rows]
}

function isExpanded(record) {
  return expandedRowKeys.value.includes(String(record.id))
}

function hasAiAnalyses(contentId) {
  return !!aiAnalysesMap.value[contentId] && aiAnalysesMap.value[contentId].length > 0
}

function getAiAnalysesCount(contentId) {
  return aiAnalysesMap.value[contentId]?.length || 0
}

function getAiAnalyses(contentId) {
  return aiAnalysesMap.value[contentId] || []
}

function toggleAiAnalyses(contentId) {
  console.log('toggleAiAnalyses:', contentId)
  if (expandedAiAnalyses.value.has(contentId)) {
    expandedAiAnalyses.value = new Set([...expandedAiAnalyses.value].filter(id => id !== contentId))
  } else {
    expandedAiAnalyses.value = new Set([...expandedAiAnalyses.value, contentId])
  }
}

function isAiAnalysesExpanded(contentId) {
  return expandedAiAnalyses.value.has(contentId)
}

async function fetchDiscussions() {
  if (!props.classId) {
    discussions.value = []
    return
  }

  loading.value = true
  error.value = ''

  try {
    const res = await getDiscussionsByClassId(props.classId)
    if (res.code === 200) {
      discussions.value = Array.isArray(res.data)
        ? res.data.map(normalizeDiscussion)
        : []
      return
    }

    throw new Error(res.message || '获取讨论列表失败')
  } catch (err) {
    console.error('获取讨论列表失败:', err)
    error.value = err.message || '获取讨论列表失败'
    message.error(error.value)
    discussions.value = []
  } finally {
    loading.value = false
  }
}

async function fetchDiscussionContents() {
  if (!selectedDiscussion.value?.id) {
    discussionContents.value = []
    mainContents.value = []
    aiAnalysesMap.value = {}
    return
  }

  contentLoading.value = true
  contentError.value = ''

  try {
    const res = await getDiscussionContentsByDiscussionId(selectedDiscussion.value.id)
    if (res.code === 200) {
      const contents = Array.isArray(res.data)
        ? res.data.map(normalizeDiscussionContent)
        : []
      discussionContents.value = contents
      const { mainContents: groupedMain, aiAnalysesMap: groupedAi } = groupDiscussionContents(contents)
      mainContents.value = groupedMain
      aiAnalysesMap.value = groupedAi
      fetchContentAvatars(contents)
      return
    }

    throw new Error(res.message || '获取讨论内容失败')
  } catch (err) {
    console.error('获取讨论内容失败:', err)
    contentError.value = err.message || '获取讨论内容失败'
    message.error(contentError.value)
    discussionContents.value = []
    mainContents.value = []
    aiAnalysesMap.value = {}
  } finally {
    contentLoading.value = false
  }
}

async function fetchDiscussionEvaluations() {
  if (!selectedDiscussion.value?.id) {
    discussionEvaluations.value = []
    return
  }

  evaluationLoading.value = true
  evaluationError.value = ''

  try {
    const res = await getDiscussionEvaluationByDiscussionId(selectedDiscussion.value.id)
    if (res.code === 200) {
      discussionEvaluations.value = Array.isArray(res.data)
        ? res.data.map(normalizeDiscussionEvaluation)
        : []
      return
    }

    throw new Error(res.message || '获取讨论评分失败')
  } catch (err) {
    console.error('获取讨论评分失败:', err)
    evaluationError.value = err.message || '获取讨论评分失败'
    discussionEvaluations.value = []
  } finally {
    evaluationLoading.value = false
  }
}

async function toggleDiscussionEvaluations() {
  if (evaluationExpanded.value) {
    evaluationExpanded.value = false
    return
  }

  evaluationExpanded.value = true

  if (discussionEvaluations.value.length === 0 && !evaluationError.value) {
    await fetchDiscussionEvaluations()
  }
}

async function handleExportEvaluationExcel() {
  if (discussionEvaluations.value.length === 0) {
    message.warning('暂无评分数据可导出')
    return
  }

  evaluationExporting.value = true

  try {
    const worksheet = XLSX.utils.aoa_to_sheet(prepareEvaluationExportData())
    const workbook = XLSX.utils.book_new()

    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 16 },
      { wch: 24 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 }
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, '讨论评分')
    XLSX.writeFile(workbook, generateEvaluationFileName())
    message.success('导出成功')
  } catch (err) {
    console.error('导出讨论评分失败:', err)
    message.error('导出失败')
  } finally {
    evaluationExporting.value = false
  }
}

function handleCreate() {
  formData.value = {
    topic: ''
  }
  modalVisible.value = true

  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch (err) {
    return
  }

  const topic = formData.value.topic.trim()
  if (!topic) {
    message.warning('请输入讨论主题')
    return
  }

  saving.value = true

  try {
    const res = await createDiscussion({
      class_id: props.classId,
      topic
    })

    if (res.code === 200) {
      message.success('讨论创建成功')
      modalVisible.value = false
      formData.value.topic = ''
      await fetchDiscussions()
      return
    }

    message.error(res.message || '创建讨论失败')
  } catch (err) {
    console.error('创建讨论失败:', err)
    message.error(err.message || '创建讨论失败')
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  modalVisible.value = false
  formData.value.topic = ''

  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

async function handleDelete(discussionId) {
  if (!discussionId) return

  try {
    const res = await deleteDiscussion(discussionId)

    if (res.code === 200) {
      message.success('删除成功')
      if (selectedDiscussion.value?.id === String(discussionId)) {
        closeExpandedDiscussion()
      }
      await fetchDiscussions()
      return
    }

    message.error(res.message || '删除失败')
  } catch (err) {
    console.error('删除讨论失败:', err)
    message.error(err.message || '删除失败')
  }
}

async function handleExpand(expanded, record) {
  if (expanded) {
    expandedRowKeys.value = [String(record.id)]
    selectedDiscussion.value = record
    replyForm.value.content = ''
    evaluationExpanded.value = false
    evaluationError.value = ''
    discussionEvaluations.value = []
    await fetchDiscussionContents()
    return
  }

  closeExpandedDiscussion()
}

function toggleDiscussion(record) {
  handleExpand(!isExpanded(record), record)
}

function closeExpandedDiscussion() {
  expandedRowKeys.value = []
  selectedDiscussion.value = null
  contentError.value = ''
  evaluationError.value = ''
  discussionContents.value = []
  discussionEvaluations.value = []
  evaluationExpanded.value = false
  mainContents.value = []
  aiAnalysesMap.value = {}
  expandedAiAnalyses.value = new Set()
  replyForm.value.content = ''
}

async function handleCreateContent() {
  if (!selectedDiscussion.value?.id) return

  const content = replyForm.value.content.trim()
  if (!content) {
    message.warning('请输入讨论内容')
    return
  }

  replySubmitting.value = true

  try {
    const res = await createDiscussionContent({
      discussion_id: selectedDiscussion.value.id,
      content
    })

    if (res.code === 200) {
      message.success('发表成功')
      replyForm.value.content = ''
      await fetchDiscussionContents()
      return
    }

    message.error(res.message || '发表失败')
  } catch (err) {
    console.error('发表讨论内容失败:', err)
    message.error(err.message || '发表失败')
  } finally {
    replySubmitting.value = false
  }
}

function canDeleteContent(item) {
  if (isTeacherOrAdmin.value) {
    return true
  }

  return currentUserNames.value.includes(normalizeName(item?.user))
}

async function handleDeleteContent(contentId) {
  if (!contentId) return

  deletingContentId.value = String(contentId)

  try {
    const res = await deleteDiscussionContent(contentId)

    if (res.code === 200) {
      message.success('删除成功')
      await fetchDiscussionContents()
      return
    }

    message.error(res.message || '删除失败')
  } catch (err) {
    console.error('删除讨论内容失败:', err)
    message.error(err.message || '删除失败')
  } finally {
    deletingContentId.value = ''
  }
}

function renderMarkdown(text) {
  if (!text) return ''
  return DOMPurify.sanitize(marked.parse(text))
}

async function handleSummaryDiscussion() {
  if (!selectedDiscussion.value?.id) return

  resultModalTitle.value = 'AI总结结果'
  resultModalVisible.value = true
  resultLoading.value = true
  aiResult.value = ''
  renderedResult.value = ''
  console.log('开始获取AI总结...')
  console.log(selectedDiscussion)
  try {
    const res = await analyzeDiscussionContent({
      discussion_id: selectedDiscussion.value.id,
      intent: '总结本讨论的全部内容'
    })

    if (res.code === 200) {
      aiResult.value = res.data?.result || res.data?.content || res.data || '暂无结果'
      renderedResult.value = renderMarkdown(aiResult.value)
    } else {
      message.error(res.message || '获取AI总结失败')
      resultModalVisible.value = false
    }
  } catch (err) {
    console.error('AI总结失败:', err)
    message.error(err.message || '获取AI总结失败')
    resultModalVisible.value = false
  } finally {
    resultLoading.value = false
  }
}

function handleAnalyzeContent(item) {
  selectedContentForAnalyze.value = item
  analyzeIntent.value = ''
  analyzeModalVisible.value = true
}

function handleCancelAnalyze() {
  analyzeModalVisible.value = false
  selectedContentForAnalyze.value = null
  analyzeIntent.value = ''
}

async function handleConfirmAnalyze() {
  const intent = analyzeIntent.value.trim()
  if (!intent) {
    message.warning('请输入你的需求')
    return
  }

  analyzeSubmitting.value = true

  try {
    analyzeModalVisible.value = false

    resultModalTitle.value = 'AI分析结果'
    resultModalVisible.value = true
    resultLoading.value = true
    aiResult.value = ''
    renderedResult.value = ''

    const res = await analyzeDiscussionContent({
      discussion_id: selectedDiscussion.value.id,
      intent: intent,
      discussion_content: selectedContentForAnalyze.value.content,
      discussion_content_id: selectedContentForAnalyze.value.id
    })

    if (res.code === 200) {
      aiResult.value = res.data?.result || res.data?.content || res.data || '暂无结果'
      renderedResult.value = renderMarkdown(aiResult.value)
    } else {
      message.error(res.message || '获取AI分析失败')
      resultModalVisible.value = false
    }
  } catch (err) {
    console.error('AI分析失败:', err)
    message.error(err.message || '获取AI分析失败')
    resultModalVisible.value = false
  } finally {
    analyzeSubmitting.value = false
    resultLoading.value = false
    selectedContentForAnalyze.value = null
    analyzeIntent.value = ''
  }
}

function handleCopyResult() {
  if (!aiResult.value) return

  navigator.clipboard.writeText(aiResult.value).then(() => {
    message.success('复制成功')
    fetchDiscussionContents()
  }).catch(() => {
    message.error('复制失败')
  })
}

function handleCloseResult() {
  resultModalVisible.value = false
  resultLoading.value = false
  aiResult.value = ''
  renderedResult.value = ''
  fetchDiscussionContents()
}

watch(() => props.classId, () => {
  fetchDiscussions()
  closeExpandedDiscussion()
})

onMounted(fetchDiscussions)
</script>

<style scoped>
.class-discussion-module {
  min-height: 400px;
}

.discussion-toolbar {
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
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.toolbar-title span {
  font-size: 13px;
  color: #8c8c8c;
}

.discussion-alert {
  margin-bottom: 16px;
}

.topic-link {
  height: auto;
  padding: 0;
  font-weight: 500;
  text-align: left;
  white-space: normal;
  word-break: break-word;
}

.discussion-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 24px 22px;
  background: #fafafa;
}

.discussion-summary {
  padding-bottom: 14px;
  border-bottom: 1px solid #f0f0f0;
}

.discussion-summary h3 {
  margin: 0 0 12px;
  color: #262626;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.5;
  word-break: break-word;
}

.summary-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.evaluation-section {
  padding: 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.section-header h4 {
  margin: 0;
  color: #262626;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.section-header span {
  color: #8c8c8c;
  font-size: 13px;
  line-height: 1.8;
}

.average-score {
  flex-shrink: 0;
  text-align: right;
}

.evaluation-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 12px;
}

.evaluation-table {
  margin-top: 4px;
}

.student-name {
  color: #262626;
  font-weight: 500;
}

.score-tag {
  min-width: 58px;
  margin-right: 0;
  text-align: center;
}

.content-list {
  min-height: 160px;
}

.content-list :deep(.ant-spin) {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.content-item {
  padding: 10px 0;
}

.content-card {
  width: 100%;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.content-user {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.content-avatar {
  flex-shrink: 0;
  background: #e6f4ff;
  color: #1677ff;
  font-weight: 600;
}

.content-author {
  color: #1f1f1f;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-word;
}

.content-meta {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
  color: #8c8c8c;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
}

.content-delete {
  height: auto;
  padding: 0;
  font-size: 12px;
}

.content-text {
  color: #3a3a3a;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.reply-form {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

:deep(.ant-table-expanded-row > .ant-table-cell) {
  padding: 0;
}

@media screen and (max-width: 768px) {
  .discussion-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .discussion-toolbar .ant-btn {
    width: 100%;
  }

  .discussion-detail {
    gap: 16px;
    padding: 16px;
  }

  .discussion-summary h3 {
    font-size: 16px;
  }

  .reply-actions .ant-btn {
    width: 100%;
  }

  .content-header {
    flex-direction: column;
    gap: 8px;
  }

  .content-meta {
    flex-wrap: wrap;
  }

  .section-header {
    flex-direction: column;
    gap: 8px;
  }

  .average-score {
    text-align: left;
  }

  .evaluation-actions {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media screen and (max-width: 480px) {
  .discussion-detail {
    padding: 14px 12px;
  }

  .content-item {
    padding: 8px 0;
  }

  .content-card {
    padding: 12px;
  }
}

.summary-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.selected-content-preview {
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.preview-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 4px;
}

.preview-text {
  font-size: 14px;
  color: #262626;
  line-height: 1.6;
}

.result-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 16px;
}

.loading-text {
  color: #595959;
  font-size: 14px;
}

.result-content {
  min-height: 120px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

.markdown-body {
  font-size: 14px;
  line-height: 1.75;
  color: #262626;
}

.markdown-body :deep(p) {
  margin: 0 0 12px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 12px 0;
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
  padding-left: 4px;
}

.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 12px 0 6px 0;
  font-weight: 600;
}

.markdown-body :deep(h2) {
  font-size: 18px;
}

.markdown-body :deep(h3) {
  font-size: 16px;
}

.markdown-body :deep(h4) {
  font-size: 14px;
}

.markdown-body :deep(em) {
  font-style: italic;
}

.markdown-body :deep(del) {
  text-decoration: line-through;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid #1677ff;
  padding-left: 12px;
  margin: 12px 0;
  color: #595959;
  font-style: italic;
}

.markdown-body :deep(a) {
  color: #1677ff;
  text-decoration: underline;
}

.markdown-body :deep(code) {
  background: #f0f0f0;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
}

.markdown-body :deep(pre) {
  background: #262626;
  color: #f0f0f0;
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
  font-size: 13px;
}

.ai-analyses-section {
  margin-top: 8px;
  padding-left: 24px;
}

.ai-analyses-toggle {
  padding-left: 0;
  color: #1677ff;
  font-size: 13px;
}

.ai-analyses-panel {
  padding: 8px 0 0 0;
}

.ai-analysis-item {
  padding: 6px 0;
}

.ai-analysis-card {
  width: 100%;
  padding: 12px 14px;
  background: #f0f7ff;
  border-left: 3px solid #1677ff;
  border-radius: 4px;
}

.ai-analysis-card .content-author {
  font-size: 14px;
  color: #1677ff;
}

.ai-analysis-card .content-meta {
  color: #8c8c8c;
  font-size: 11px;
}

.ai-analysis-card .content-text {
  font-size: 13px;
  color: #3a3a3a;
}
</style>
