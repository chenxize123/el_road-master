<!--
 * @Date         : 2026-08-31
 * @Description  : 教学资源推荐页面
 * @FilePath     : ResourceRecommendation.vue
 * @Version      : V1.0.0
-->
<template>
  <div class="resource-page">
    <a-page-header
      title="教学资源推荐"
      sub-title="根据学习主题和薄弱知识点生成资源清单"
      class="page-header"
      @back="router.back()"
    >
      <template #extra>
        <a-button @click="router.back()">返回</a-button>
      </template>
    </a-page-header>

    <div class="resource-layout">
      <aside class="history-panel">
        <div class="panel-header">
          <h3>推荐记录</h3>
          <a-button size="small" :loading="loadingList" @click="loadRecommendationList">刷新</a-button>
        </div>
        <a-spin :spinning="loadingList">
          <a-empty v-if="!recommendationList.length" description="暂无推荐记录" />
          <a-list v-else :data-source="recommendationList" size="small">
            <template #renderItem="{ item }">
              <a-list-item
                class="history-item"
                :class="{ active: currentResourceId === getRecordId(item) }"
                @click="loadRecommendationDetail(item)"
              >
                <a-list-item-meta>
                  <template #title>
                    <span class="history-title">{{ item.topic || item.title || '未命名主题' }}</span>
                  </template>
                  <template #description>
                    <span>{{ formatDate(item.created_at || item.createdAt || item.create_time) }}</span>
                  </template>
                </a-list-item-meta>
                <template #actions>
                  <a-popconfirm
                    title="确定删除这条推荐记录吗？"
                    ok-text="删除"
                    cancel-text="取消"
                    @confirm="deleteRecommendationRecord(item)"
                  >
                    <a-button
                      type="link"
                      danger
                      size="small"
                      :loading="deletingResourceId === getRecordId(item)"
                      @click.stop
                    >
                      删除
                    </a-button>
                  </a-popconfirm>
                </template>
              </a-list-item>
            </template>
          </a-list>
        </a-spin>
      </aside>

      <main class="work-panel">
        <a-alert
          v-if="error"
          class="status-alert"
          message="处理失败"
          :description="error"
          type="error"
          show-icon
          closable
          @close="error = ''"
        />

        <section class="topic-section">
          <div class="section-title">
            <h3>新建推荐</h3>
            <span v-if="currentResourceId">任务ID：{{ currentResourceId }}</span>
          </div>
          <a-textarea
            v-model:value="topic"
            placeholder="请输入想学习的主题，例如：机器学习中的梯度下降"
            :rows="3"
            :maxlength="300"
            show-count
          />
          <div class="actions-row">
            <a-button
              type="primary"
              :loading="creating"
              :disabled="creating || recommending"
              @click="handleCreateRecommendation"
            >
              <template #icon><BulbOutlined /></template>
              生成前置知识
            </a-button>
          </div>
        </section>

        <section v-if="knowledgeOptions.length" class="knowledge-section">
          <div class="section-title">
            <h3>选择要学习的知识点</h3>
            <span>已选择 {{ selectedKnowledgePoints.length }} 项</span>
          </div>
          <a-collapse
            v-model:activeKey="activeKnowledgeItems"
            class="knowledge-collapse knowledge-item-collapse"
          >
            <a-collapse-panel
              v-for="item in knowledgeDisplayItems"
              :key="item.value"
            >
              <template #header>
                <div class="knowledge-item-header">
                  <a-checkbox
                    :checked="selectedKnowledgePoints.includes(item.value)"
                    @click.stop
                    @change="event => toggleKnowledgePoint(item.value, event.target.checked)"
                  />
                  <a-tag class="knowledge-category-tag">{{ item.category }}</a-tag>
                  <span class="knowledge-item-title">{{ item.title }}</span>
                </div>
              </template>
              <div class="knowledge-detail">
                {{ item.raw }}
              </div>
            </a-collapse-panel>
          </a-collapse>
          <div class="actions-row">
            <a-button
              type="primary"
              :loading="recommending"
              :disabled="recommending || !selectedKnowledgePoints.length"
              @click="handleRecommendResources"
            >
              <template #icon><ReadOutlined /></template>
              生成学习资源
            </a-button>
          </div>
        </section>

        <a-alert
          v-if="creating || recommending || loadingDetail"
          class="status-alert"
          type="info"
          show-icon
          :message="loadingMessage"
        />

        <section v-if="hasRecommendationResult" class="result-section">
          <div class="section-title">
            <h3>{{ currentTopic || '推荐结果' }}</h3>
          </div>
          <div v-if="structuredResult.reason" class="reason-panel">
            <h4>推荐理由</h4>
            <p>{{ structuredResult.reason }}</p>
          </div>
          <div v-if="structuredResult.selectedKnowledge.length" class="selected-panel">
            <h4>本次选择</h4>
            <div class="selected-tags">
              <a-tag v-for="item in structuredResult.selectedKnowledge" :key="item">
                {{ parseKnowledgeOption({ label: item, value: item }).title }}
              </a-tag>
            </div>
          </div>
          <div v-if="structuredResult.resourceGroups.length" class="resource-groups">
            <section
              v-for="group in structuredResult.resourceGroups"
              :key="group.knowledgePoint"
              class="resource-group"
            >
              <h4>{{ group.knowledgePoint }}</h4>
              <div class="resource-columns">
                <div class="resource-column">
                  <div class="resource-column-title">视频资源</div>
                  <a-empty v-if="!group.videos.length" description="暂无视频资源" />
                  <template v-else>
                    <a-card
                      v-for="item in group.videos"
                      :key="item.url || item.title"
                      class="resource-card"
                      size="small"
                    >
                      <a :href="item.url" target="_blank" rel="noopener" class="resource-title">
                        {{ item.title || '未命名视频' }}
                      </a>
                      <p v-if="item.description" class="resource-desc">{{ item.description }}</p>
                      <p v-if="item.reason" class="resource-reason">{{ item.reason }}</p>
                    </a-card>
                  </template>
                </div>
                <div class="resource-column">
                  <div class="resource-column-title">图文资源</div>
                  <a-empty v-if="!group.blogArticles.length" description="暂无图文资源" />
                  <template v-else>
                    <a-card
                      v-for="item in group.blogArticles"
                      :key="item.url || item.title"
                      class="resource-card"
                      size="small"
                    >
                      <a :href="item.url" target="_blank" rel="noopener" class="resource-title">
                        {{ item.title || '未命名文章' }}
                      </a>
                      <p v-if="item.summary" class="resource-desc">{{ item.summary }}</p>
                      <p v-if="item.reason" class="resource-reason">{{ item.reason }}</p>
                    </a-card>
                  </template>
                </div>
              </div>
            </section>
          </div>
          <div
            v-if="resultContent && !structuredResult.resourceGroups.length && !structuredResult.reason"
            class="resource-content markdown-body"
            v-html="renderMarkdown(resultContent)"
          />
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { BulbOutlined, ReadOutlined } from '@ant-design/icons-vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import {
  createResourceRecommendationApi,
  deleteResourceRecommendationApi,
  getResourceRecommendationDetailApi,
  getResourceRecommendationListApi,
  getTopicPreKnowledgeApi,
  recommendLearningResourcesApi
} from '@/api/resourceRecommendation'
import {
  extractKnowledgeOptions,
  extractResourceResultContent,
  extractStructuredResourceRecommendation,
  normalizeResourceId,
  parseKnowledgeOption
} from '@/utils/resourceRecommendation'

const router = useRouter()

const topic = ref('')
const currentTopic = ref('')
const currentResourceId = ref('')
const recommendationList = ref([])
const knowledgeOptions = ref([])
const selectedKnowledgePoints = ref([])
const activeKnowledgeItems = ref([])
const resultContent = ref('')
const recommendationResponse = ref(null)
const loadingList = ref(false)
const loadingDetail = ref(false)
const creating = ref(false)
const recommending = ref(false)
const deletingResourceId = ref('')
const error = ref('')

const loadingMessage = computed(() => {
  if (creating.value) return '正在生成前置知识点，请稍候...'
  if (recommending.value) return '正在生成学习资源，请不要关闭页面...'
  if (loadingDetail.value) return '正在加载推荐记录...'
  return ''
})

const knowledgeDisplayItems = computed(() => knowledgeOptions.value.map(parseKnowledgeOption))
const structuredResult = computed(() => extractStructuredResourceRecommendation(recommendationResponse.value))
const hasRecommendationResult = computed(() => {
  return Boolean(
    resultContent.value ||
    structuredResult.value.reason ||
    structuredResult.value.selectedKnowledge.length ||
    structuredResult.value.resourceGroups.length
  )
})

const toggleKnowledgePoint = (value, checked) => {
  if (checked) {
    if (!selectedKnowledgePoints.value.includes(value)) {
      selectedKnowledgePoints.value = [...selectedKnowledgePoints.value, value]
    }
    return
  }

  selectedKnowledgePoints.value = selectedKnowledgePoints.value.filter(item => item !== value)
}

const renderMarkdown = content => DOMPurify.sanitize(marked.parse(content || ''))

const formatDate = value => {
  if (!value) return '暂无时间'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN')
}

const getRecordId = record => normalizeResourceId(record)

const extractList = response => {
  const data = response?.data ?? response
  const candidates = [
    data?.records,
    data?.list,
    data?.items,
    data?.resource,
    data?.resources,
    data
  ]

  const list = candidates.find(Array.isArray)
  return Array.isArray(list) ? list : []
}

const normalizeResultContent = content => {
  if (!content) return ''
  return typeof content === 'string' ? content : JSON.stringify(content, null, 2)
}

const loadRecommendationList = async () => {
  loadingList.value = true
  try {
    const response = await getResourceRecommendationListApi()
    recommendationList.value = extractList(response)
  } catch (err) {
    console.error('获取资源推荐记录失败:', err)
    message.error(err?.message || '获取推荐记录失败')
  } finally {
    loadingList.value = false
  }
}

const loadRecommendationDetail = async record => {
  const resourceId = getRecordId(record)
  if (!resourceId) return

  loadingDetail.value = true
  error.value = ''
  currentResourceId.value = resourceId
  currentTopic.value = record.topic || record.title || ''

  try {
    const response = await getResourceRecommendationDetailApi(resourceId)
    const data = response?.data ?? response
    recommendationResponse.value = response
    currentTopic.value = data?.topic || data?.title || currentTopic.value
    resultContent.value = normalizeResultContent(extractResourceResultContent(response))
    knowledgeOptions.value = extractKnowledgeOptions(response)
    activeKnowledgeItems.value = []
    selectedKnowledgePoints.value = []
  } catch (err) {
    console.error('加载资源推荐详情失败:', err)
    error.value = err?.message || '加载推荐详情失败'
    message.error(error.value)
  } finally {
    loadingDetail.value = false
  }
}

const clearCurrentRecommendation = () => {
  currentResourceId.value = ''
  currentTopic.value = ''
  resultContent.value = ''
  recommendationResponse.value = null
  knowledgeOptions.value = []
  activeKnowledgeItems.value = []
  selectedKnowledgePoints.value = []
}

const deleteRecommendationRecord = async record => {
  const resourceId = getRecordId(record)
  if (!resourceId) return

  deletingResourceId.value = resourceId
  error.value = ''

  try {
    await deleteResourceRecommendationApi(resourceId)
    message.success('推荐记录已删除')

    if (currentResourceId.value === resourceId) {
      clearCurrentRecommendation()
    }

    await loadRecommendationList()
  } catch (err) {
    console.error('删除资源推荐记录失败:', err)
    error.value = err?.message || '删除推荐记录失败'
    message.error(error.value)
  } finally {
    deletingResourceId.value = ''
  }
}

const handleCreateRecommendation = async () => {
  const nextTopic = topic.value.trim()
  if (!nextTopic) {
    message.warning('请输入学习主题')
    return
  }

  creating.value = true
  error.value = ''
  resultContent.value = ''
  recommendationResponse.value = null
  knowledgeOptions.value = []
  activeKnowledgeItems.value = []
  selectedKnowledgePoints.value = []

  try {
    const createResponse = await createResourceRecommendationApi(nextTopic)
    currentResourceId.value = createResponse.resource_id
    currentTopic.value = nextTopic

    if (!currentResourceId.value) {
      throw new Error('创建记录成功，但未获取到任务ID')
    }

    const knowledgeResponse = await getTopicPreKnowledgeApi(currentResourceId.value)
    knowledgeOptions.value = extractKnowledgeOptions(knowledgeResponse)
    activeKnowledgeItems.value = []

    if (!knowledgeOptions.value.length) {
      message.warning('未获取到可选择的前置知识点')
      return
    }

    message.success('前置知识点已生成，请选择要学习的知识点')
    await loadRecommendationList()
  } catch (err) {
    console.error('创建教学资源推荐失败:', err)
    error.value = err?.message || '创建教学资源推荐失败'
    message.error(error.value)
  } finally {
    creating.value = false
  }
}

const handleRecommendResources = async () => {
  if (!currentResourceId.value) {
    message.warning('请先生成前置知识')
    return
  }
  if (!selectedKnowledgePoints.value.length) {
    message.warning('请至少选择一个知识点')
    return
  }

  recommending.value = true
  error.value = ''

  try {
    const response = await recommendLearningResourcesApi(currentResourceId.value, selectedKnowledgePoints.value)
    recommendationResponse.value = response
    resultContent.value = normalizeResultContent(extractResourceResultContent(response))

    if (!resultContent.value) {
      message.warning('生成完成，但未返回推荐内容')
    } else {
      message.success('学习资源已生成')
    }

    await loadRecommendationList()
  } catch (err) {
    console.error('生成学习资源失败:', err)
    error.value = err?.message || '生成学习资源失败'
    message.error(error.value)
  } finally {
    recommending.value = false
  }
}

onMounted(loadRecommendationList)
</script>

<style scoped>
.resource-page {
  min-height: 100vh;
  padding: 32px;
  background: #f5f7fb;
}

.page-header {
  margin-bottom: 20px;
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 12px;
}

.resource-layout {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.history-panel,
.work-panel {
  min-width: 0;
  padding: 20px;
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 8px;
}

.panel-header,
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-header h3,
.section-title h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #262626;
}

.section-title span {
  color: #8c8c8c;
  font-size: 13px;
}

.history-item {
  cursor: pointer;
  border-radius: 8px;
}

.history-item:hover,
.history-item.active {
  background: #e6f4ff;
}

.history-title {
  font-weight: 600;
}

.topic-section,
.knowledge-section {
  margin-bottom: 24px;
}

.actions-row {
  display: flex;
  justify-content: flex-start;
  margin-top: 12px;
}

.knowledge-collapse {
  background: #fff;
  border-color: #edf0f5;
}

.knowledge-collapse :deep(.ant-collapse-header) {
  align-items: center;
  min-width: 0;
  overflow: hidden;
}

.knowledge-collapse :deep(.ant-collapse-expand-icon) {
  flex: 0 0 auto;
}

.knowledge-collapse :deep(.ant-collapse-header-text) {
  min-width: 0;
  overflow: hidden;
}

.knowledge-collapse :deep(.ant-collapse-content-box) {
  padding: 12px;
}

.knowledge-item-collapse :deep(.ant-collapse-item) {
  overflow: hidden;
}

.knowledge-item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.knowledge-item-header > :deep(.ant-checkbox-wrapper),
.knowledge-item-header > :deep(.ant-checkbox) {
  flex: 0 0 auto;
}

.knowledge-category-tag {
  flex: 0 0 auto;
  margin-inline-end: 0;
}

.knowledge-item-title {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  color: #262626;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.knowledge-detail {
  padding: 2px 4px;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.status-alert {
  margin-bottom: 16px;
}

.result-section {
  padding-top: 18px;
  border-top: 1px solid #f0f0f0;
}

.reason-panel,
.selected-panel,
.resource-group {
  margin-bottom: 18px;
}

.reason-panel,
.selected-panel {
  padding: 16px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fafafa;
}

.reason-panel h4,
.selected-panel h4,
.resource-group h4 {
  margin: 0 0 10px;
  color: #262626;
  font-size: 16px;
  font-weight: 600;
}

.reason-panel p {
  margin: 0;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.resource-group {
  min-width: 0;
}

.resource-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.resource-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.resource-column-title {
  color: #595959;
  font-size: 14px;
  font-weight: 600;
}

.resource-card {
  border-radius: 8px;
}

.resource-title {
  display: block;
  color: #1677ff;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.resource-desc,
.resource-reason {
  margin: 8px 0 0;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.resource-reason {
  padding-top: 8px;
  border-top: 1px dashed #e5e7eb;
  color: #6b7280;
}

.resource-content {
  min-height: 220px;
  padding: 20px;
  border-radius: 8px;
  background: #fafafa;
}

.markdown-body {
  color: #262626;
  font-size: 14px;
  line-height: 1.75;
}

.markdown-body :deep(p) {
  margin: 0 0 12px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 12px 0;
  padding-left: 20px;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 16px 0 8px;
  font-weight: 600;
}

.markdown-body :deep(code) {
  padding: 2px 6px;
  border-radius: 4px;
  background: #f0f0f0;
}

.markdown-body :deep(pre) {
  overflow-x: auto;
  padding: 12px 16px;
  border-radius: 8px;
  color: #f0f0f0;
  background: #262626;
}

@media screen and (max-width: 900px) {
  .resource-layout {
    grid-template-columns: 1fr;
  }
}

@media screen and (max-width: 768px) {
  .resource-page {
    padding: 16px;
  }

  .history-panel,
  .work-panel {
    padding: 16px;
  }

  .section-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .knowledge-collapse :deep(.ant-collapse-header) {
    padding: 10px 12px;
  }

  .knowledge-item-header {
    gap: 8px;
  }

  .knowledge-category-tag {
    max-width: 72px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .resource-columns {
    grid-template-columns: 1fr;
  }

  .reason-panel,
  .selected-panel {
    padding: 12px;
  }
}
</style>
