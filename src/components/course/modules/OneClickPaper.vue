<template>
  <div class="one-click-paper">
    <section class="workspace-header">
      <div class="header-main">
        <a-button class="back-button" @click="handleCancel">
          <template #icon><ArrowLeftOutlined /></template>
        </a-button>
        <div>
          <div class="eyebrow">AI PAPER BUILDER</div>
          <h1>一键组卷</h1>
          <p>先选择知识点，再为每个知识点配置多种题型和分值。</p>
        </div>
      </div>

      <div class="header-metrics">
        <div class="metric-item">
          <span>知识点</span>
          <strong>{{ plannedKnowledgePoints.length }}</strong>
        </div>
        <div class="metric-item">
          <span>题目总数</span>
          <strong>{{ totalQuestionCount }}</strong>
        </div>
        <div class="metric-item">
          <span>试卷总分</span>
          <strong>{{ totalScore }}</strong>
        </div>
      </div>
    </section>

    <section class="paper-title-panel">
      <div class="title-input-group">
        <FileTextOutlined />
        <a-input
          v-model:value="paperTitle"
          :maxlength="100"
          size="large"
          placeholder="输入试卷标题，例如：机器学习基础单元测验"
        />
      </div>
      <div class="course-badge">课程ID {{ courseId || '-' }}</div>
    </section>

    <div class="builder-grid">
      <section class="knowledge-panel">
        <div class="panel-heading">
          <div>
            <h2>选择知识点</h2>
            <p>可一次勾选多个知识点加入右侧方案</p>
          </div>
          <a-tag color="blue">{{ selectedKnowledgePoints.length }} 已选</a-tag>
        </div>

        <a-spin :spinning="knowledgeLoading">
          <div class="knowledge-tree-wrap">
            <a-tree
              v-if="knowledgeTreeData.length"
              v-model:checked-keys="checkedKeys"
              checkable
              block-node
              :selectable="false"
              :tree-data="knowledgeTreeData"
              :default-expanded-keys="defaultExpandedKeys"
            />
            <a-empty v-else description="暂无知识点数据" />
          </div>
        </a-spin>

        <div class="selection-actions">
          <a-button
            type="primary"
            size="large"
            block
            :disabled="!selectedKnowledgePoints.length"
            @click="addSelectedKnowledgePointsIndividually"
          >
            <template #icon><PlusOutlined /></template>
            逐个出题
          </a-button>
          <a-button
            size="large"
            block
            :disabled="!selectedKnowledgePoints.length"
            @click="addSelectedKnowledgePointsMerged"
          >
            合并出题
          </a-button>
        </div>

        <div v-if="selectedKnowledgePoints.length" class="selected-points">
          <div class="selected-points-title">当前选择</div>
          <div class="selected-point-tags">
            <a-tag
              v-for="point in selectedKnowledgePoints"
              :key="point.id"
              color="processing"
            >
              {{ point.label }}
            </a-tag>
          </div>
        </div>
      </section>

      <section class="config-panel">
        <div class="panel-heading">
          <div>
            <h2>按知识点配置题目</h2>
            <p>每个知识点下可添加多种题型，系统会自动汇总成试卷要求</p>
          </div>
          <a-tag color="green">{{ requirementCount }} 组要求</a-tag>
        </div>

        <div class="order-setting">
          <div>
            <h3>出题顺序</h3>
            <p>控制提交给后端的组卷要求排列方式</p>
          </div>
          <a-radio-group v-model:value="questionOrderMode" button-style="solid">
            <a-radio-button value="knowledge">按知识点顺序</a-radio-button>
            <a-radio-button value="type">按题型顺序</a-radio-button>
          </a-radio-group>
        </div>

        <a-empty
          v-if="!plannedKnowledgePoints.length"
          description="请先从左侧选择知识点并加入方案"
        />

        <div v-else class="point-plan-list">
          <article
            v-for="(plan, planIndex) in plannedKnowledgePoints"
            :key="plan.id"
            class="point-plan-card"
          >
            <div class="point-plan-header">
              <div class="point-title-wrap">
                <div class="point-index">{{ planIndex + 1 }}</div>
                <div>
                  <div class="point-title-line">
                    <h3>{{ plan.label }}</h3>
                    <a-tag :color="plan.knowledgePoints.length > 1 ? 'purple' : 'blue'">
                      {{ plan.knowledgePoints.length > 1 ? '综合题' : '单点题' }}
                    </a-tag>
                  </div>
                  <p>{{ getPlanDescription(plan) }}</p>
                </div>
              </div>
              <a-button
                type="text"
                danger
                @click="removeKnowledgePointPlan(planIndex)"
              >
                移除
              </a-button>
            </div>

            <div class="unit-knowledge-tags">
              <a-tag
                v-for="point in plan.knowledgePoints"
                :key="point.id"
              >
                {{ point.label }}
              </a-tag>
            </div>

            <div class="type-config-list">
              <div
                v-for="(config, configIndex) in plan.configs"
                :key="config.id"
                class="type-config-row"
              >
                <a-select
                  v-model:value="config.question_type"
                  class="type-select"
                  size="large"
                >
                  <a-select-option
                    v-for="item in questionTypeOptions"
                    :key="item"
                    :value="item"
                  >
                    {{ item }}
                  </a-select-option>
                </a-select>

                <label>
                  <span>题数</span>
                  <a-input-number
                    v-model:value="config.question_num"
                    :min="1"
                    :max="50"
                    size="large"
                    class="number-input"
                  />
                </label>

                <label>
                  <span>分值</span>
                  <a-input-number
                    v-model:value="config.question_score"
                    :min="1"
                    :max="100"
                    size="large"
                    class="number-input"
                  />
                </label>

                <div class="row-total">
                  <span>小计</span>
                  <strong>{{ getConfigScore(config) }}</strong>
                </div>

                <a-button
                  class="row-delete"
                  type="text"
                  danger
                  :disabled="plan.configs.length === 1"
                  @click="removeTypeConfig(plan, configIndex)"
                >
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </div>
            </div>

            <a-button block @click="addTypeConfig(plan)">
              <template #icon><PlusOutlined /></template>
              添加题型
            </a-button>
          </article>
        </div>

        <div class="submit-bar">
          <div>
            <span>试卷将由后台异步生成，提交后可返回试卷列表等待结果</span>
            <strong>{{ paperTitle || '未命名试卷' }}</strong>
          </div>
          <a-button
            type="primary"
            size="large"
            :loading="submitting"
            :disabled="!canSubmit"
            @click="handleSubmit"
          >
            {{ submitting ? '正在提交生成任务...' : '生成试卷' }}
          </a-button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PlusOutlined
} from '@ant-design/icons-vue'
import { getKnowledgePointApi } from '@/api/course'
import { createOneClickExamPaper } from '@/api/examPaper'

const props = defineProps({
  courseId: {
    type: [String, Number],
    required: false
  }
})

const route = useRoute()
const router = useRouter()

const paperTitle = ref('')
const knowledgeTreeData = ref([])
const knowledgePointsMap = ref({})
const checkedKeys = ref([])
const knowledgeLoading = ref(false)
const plannedKnowledgePoints = ref([])
const questionOrderMode = ref('knowledge')
const submitting = ref(false)

const questionTypeOptions = ['单选题', '多选题', '判断题', '填空题', '简答题']

const courseId = computed(() => {
  return props.courseId || route.query.course_id || route.query.courseId || route.params.courseId || ''
})

const defaultExpandedKeys = computed(() => {
  return knowledgeTreeData.value.filter(item => !item.isLeaf).map(item => item.key)
})

const selectedKnowledgePoints = computed(() => {
  return checkedKeys.value
    .map(key => knowledgePointsMap.value[key])
    .filter(Boolean)
})

const questionRequirements = computed(() => {
  const requirements = plannedKnowledgePoints.value.flatMap((unit, pointIndex) => {
    return unit.configs
      .filter(config => Number(config.question_num) > 0 && Number(config.question_score) > 0)
      .map((config, configIndex) => ({
        knowledge_points: unit.knowledgePoints.map(point => point.content || point.label),
        question_num: Number(config.question_num),
        question_type: config.question_type,
        question_score: Number(config.question_score),
        pointIndex,
        configIndex
      }))
  })

  const sortedRequirements = questionOrderMode.value === 'type'
    ? [...requirements].sort((a, b) => {
        const typeDiff = questionTypeOptions.indexOf(a.question_type) - questionTypeOptions.indexOf(b.question_type)
        if (typeDiff !== 0) return typeDiff
        if (a.pointIndex !== b.pointIndex) return a.pointIndex - b.pointIndex
        return a.configIndex - b.configIndex
      })
    : requirements

  return sortedRequirements.map(({ pointIndex, configIndex, ...item }) => item)
})

const requirementCount = computed(() => questionRequirements.value.length)

const totalQuestionCount = computed(() => {
  return questionRequirements.value.reduce((sum, item) => sum + Number(item.question_num || 0), 0)
})

const totalScore = computed(() => {
  return questionRequirements.value.reduce((sum, item) => {
    return sum + Number(item.question_num || 0) * Number(item.question_score || 0)
  }, 0)
})

const canSubmit = computed(() => {
  return paperTitle.value.trim() && courseId.value && questionRequirements.value.length > 0
})

function createTypeConfig(type = '单选题') {
  return {
    id: `${Date.now()}-${Math.random()}`,
    question_type: type,
    question_num: 2,
    question_score: 2
  }
}

function getConfigScore(config) {
  return Number(config.question_num || 0) * Number(config.question_score || 0)
}

function getPlanDescription(plan) {
  if (!plan.knowledgePoints?.length) return '暂无知识点说明'
  if (plan.knowledgePoints.length === 1) {
    return plan.knowledgePoints[0].content || '暂无知识点说明'
  }

  return `联合 ${plan.knowledgePoints.length} 个知识点生成综合题`
}

function transformKnowledgeTreeData(nodes, prefix = '') {
  if (!Array.isArray(nodes)) return []

  return nodes.map((node, index) => {
    const isPoint = node.type === 'point'
    const nodeKey = `${index}-${node.id ?? 'node'}`
    const fullKey = prefix ? `${prefix}-${nodeKey}` : nodeKey
    const item = {
      key: fullKey,
      title: node.label,
      disabled: !isPoint,
      isLeaf: isPoint
    }

    if (Array.isArray(node.children) && node.children.length) {
      item.children = transformKnowledgeTreeData(node.children, fullKey)
    }

    return item
  })
}

function saveKnowledgePointsData(nodes, prefix = '') {
  if (!Array.isArray(nodes)) return

  nodes.forEach((node, index) => {
    const nodeKey = `${index}-${node.id ?? 'node'}`
    const fullKey = prefix ? `${prefix}-${nodeKey}` : nodeKey
    if (node.type === 'point') {
      knowledgePointsMap.value[fullKey] = {
        id: fullKey,
        sourceId: String(node.id ?? ''),
        label: node.label || '未命名知识点',
        content: node.content || node.label || ''
      }
    }

    if (Array.isArray(node.children) && node.children.length) {
      saveKnowledgePointsData(node.children, fullKey)
    }
  })
}

async function loadKnowledgePoints() {
  if (!courseId.value) {
    message.error('未获取到课程ID')
    return
  }

  knowledgeLoading.value = true
  try {
    const res = await getKnowledgePointApi(courseId.value)
    const knowledgePoints = res?.data?.knowledge_point

    if (res.code === 200 && Array.isArray(knowledgePoints)) {
      knowledgePointsMap.value = {}
      saveKnowledgePointsData(knowledgePoints)
      knowledgeTreeData.value = transformKnowledgeTreeData(knowledgePoints)
    } else {
      knowledgeTreeData.value = []
      message.warning(res.message || '暂无知识点数据')
    }
  } catch (error) {
    console.error('加载知识点失败:', error)
    message.error(error?.message || '加载知识点失败')
  } finally {
    knowledgeLoading.value = false
  }
}

function addSelectedKnowledgePointsIndividually() {
  if (!selectedKnowledgePoints.value.length) {
    message.warning('请至少选择一个知识点')
    return
  }

  let addedCount = 0
  selectedKnowledgePoints.value.forEach(point => {
    const exists = plannedKnowledgePoints.value.some(item => item.id === point.id)
    if (exists) return

    plannedKnowledgePoints.value.push({
      id: point.id,
      label: point.label,
      knowledgePoints: [point],
      configs: [createTypeConfig()]
    })
    addedCount += 1
  })

  checkedKeys.value = []

  if (addedCount) {
    message.success(`已创建 ${addedCount} 个单点出题卡`)
  } else {
    message.info('所选知识点已在方案中')
  }
}

function addSelectedKnowledgePointsMerged() {
  if (!selectedKnowledgePoints.value.length) {
    message.warning('请至少选择一个知识点')
    return
  }

  const points = selectedKnowledgePoints.value
  const unitId = `merged-${points.map(point => point.id).join('-')}`
  const exists = plannedKnowledgePoints.value.some(item => item.id === unitId)
  if (exists) {
    message.info('该综合题组合已在方案中')
    checkedKeys.value = []
    return
  }

  plannedKnowledgePoints.value.push({
    id: unitId,
    label: points.length === 1 ? points[0].label : `${points[0].label} 等 ${points.length} 个知识点`,
    knowledgePoints: points.map(point => ({ ...point })),
    configs: [createTypeConfig(points.length > 1 ? '简答题' : '单选题')]
  })

  checkedKeys.value = []
  message.success(points.length > 1 ? '已创建综合题出题卡' : '已创建单点出题卡')
}

function removeKnowledgePointPlan(index) {
  plannedKnowledgePoints.value.splice(index, 1)
}

function addTypeConfig(plan) {
  const usedTypes = plan.configs.map(item => item.question_type)
  const nextType = questionTypeOptions.find(type => !usedTypes.includes(type)) || '单选题'
  plan.configs.push(createTypeConfig(nextType))
}

function removeTypeConfig(plan, index) {
  if (plan.configs.length === 1) return
  plan.configs.splice(index, 1)
}

async function handleSubmit() {
  if (!paperTitle.value.trim()) {
    message.warning('请输入试卷标题')
    return
  }

  if (!questionRequirements.value.length) {
    message.warning('请至少配置一组题目')
    return
  }

  submitting.value = true
  try {
    const payload = {
      course_id: String(courseId.value),
      question_requirement: questionRequirements.value,
      paper_title: paperTitle.value.trim()
    }

    const res = await createOneClickExamPaper(payload)

    if (res.code === 200) {
      message.success('组卷任务已提交，后台正在生成试卷')
      router.push(`/course/${courseId.value}?tab=exam-paper`)
    } else {
      message.error(res.message || '试卷生成失败')
    }
  } catch (error) {
    console.error('一键组卷失败:', error)
    message.error(error?.message || '试卷生成失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

function handleCancel() {
  if (courseId.value) {
    router.push(`/course/${courseId.value}?tab=exam-paper`)
  } else {
    router.back()
  }
}

onMounted(loadKnowledgePoints)
</script>

<style scoped>
.one-click-paper {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 28px;
  font-size: 16px;
  background: #eef3f8;
}

.one-click-paper *,
.one-click-paper *::before,
.one-click-paper *::after {
  box-sizing: border-box;
}

.workspace-header {
  margin-bottom: 18px;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  color: #fff;
  background: linear-gradient(135deg, #12385f, #116a7b 58%, #13815f);
  border-radius: 8px;
  box-shadow: 0 12px 28px rgba(18, 56, 95, 0.18);
}

.header-main {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-button {
  width: 48px;
  height: 48px;
  font-size: 18px;
  color: #fff;
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.12);
}

.eyebrow {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0;
  color: rgba(255, 255, 255, 0.72);
}

.workspace-header h1 {
  margin: 0;
  font-size: 38px;
  line-height: 1.2;
  font-weight: 700;
}

.workspace-header p {
  margin: 10px 0 0;
  font-size: 17px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.78);
}

.header-metrics {
  flex: none;
  display: grid;
  grid-template-columns: repeat(3, 112px);
  gap: 10px;
}

.metric-item {
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
}

.metric-item span {
  display: block;
  margin-bottom: 8px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.72);
}

.metric-item strong {
  display: block;
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 34px;
  line-height: 1;
}

.paper-title-panel {
  margin-bottom: 18px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border: 1px solid #e5ebf2;
  border-radius: 8px;
}

.title-input-group {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #1677ff;
}

.course-badge {
  flex: none;
  padding: 10px 14px;
  color: #475569;
  background: #f5f7fb;
  border-radius: 6px;
  font-size: 15px;
  line-height: 1.4;
}

.builder-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.82fr) minmax(0, 1.18fr);
  gap: 18px;
  align-items: start;
}

.knowledge-panel,
.config-panel {
  padding: 20px;
  background: #fff;
  border: 1px solid #e5ebf2;
  border-radius: 8px;
}

.panel-heading {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.panel-heading h2 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  line-height: 1.3;
}

.panel-heading p {
  margin: 6px 0 0;
  font-size: 16px;
  line-height: 1.55;
  color: #64748b;
}

.order-setting {
  margin-bottom: 16px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #e6edf5;
  border-radius: 8px;
  background: #f8fbff;
}

.order-setting h3 {
  margin: 0;
  color: #0f172a;
  font-size: 19px;
  line-height: 1.4;
}

.order-setting p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 15px;
  line-height: 1.5;
}

.knowledge-tree-wrap {
  height: 520px;
  overflow-x: auto;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  background: #fbfdff;
}

.knowledge-tree-wrap :deep(.ant-tree) {
  min-width: max-content;
  font-size: 17px;
}

.knowledge-tree-wrap :deep(.ant-tree .ant-tree-node-content-wrapper),
.knowledge-tree-wrap :deep(.ant-tree .ant-tree-checkbox),
.knowledge-tree-wrap :deep(.ant-tree .ant-tree-switcher) {
  min-height: 32px;
  line-height: 32px;
}

.knowledge-tree-wrap :deep(.ant-tree-title) {
  line-height: 1.55;
}

.one-click-paper :deep(.ant-btn) {
  font-size: 16px;
}

.one-click-paper :deep(.ant-btn-lg) {
  height: 44px;
  font-size: 17px;
}

.one-click-paper :deep(.ant-input),
.one-click-paper :deep(.ant-select-selection-item),
.one-click-paper :deep(.ant-input-number-input),
.one-click-paper :deep(.ant-radio-button-wrapper) {
  font-size: 16px;
}

.one-click-paper :deep(.ant-input-lg),
.one-click-paper :deep(.ant-select-lg),
.one-click-paper :deep(.ant-input-number-lg) {
  font-size: 17px;
}

.one-click-paper :deep(.ant-tag) {
  font-size: 14px;
  line-height: 1.6;
  padding: 2px 8px;
}

.selection-actions {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.selected-points {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #eef2f7;
}

.selected-points-title {
  margin-bottom: 10px;
  color: #334155;
  font-size: 16px;
  font-weight: 600;
}

.selected-point-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.point-plan-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.point-plan-card {
  padding: 16px;
  border: 1px solid #e3ebf5;
  border-radius: 8px;
  background: #fbfdff;
}

.point-plan-header {
  margin-bottom: 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.point-title-wrap {
  min-width: 0;
  flex: 1;
  display: flex;
  gap: 12px;
}

.point-index {
  flex: none;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: #1677ff;
  font-size: 18px;
  font-weight: 700;
  background: #eaf4ff;
  border-radius: 50%;
}

.point-plan-header h3 {
  margin: 0;
  overflow-wrap: anywhere;
  color: #0f172a;
  font-size: 20px;
  line-height: 1.4;
}

.point-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.point-plan-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 16px;
  line-height: 1.6;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.unit-knowledge-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
  padding: 10px 12px;
  background: #f5f8fc;
  border-radius: 8px;
}

.type-config-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.type-config-row {
  display: grid;
  grid-template-columns: minmax(128px, 1.1fr) minmax(96px, 0.7fr) minmax(96px, 0.7fr) 82px 36px;
  align-items: end;
  gap: 10px;
  padding: 12px;
  border: 1px solid #edf2f7;
  border-radius: 8px;
  background: #fff;
}

.type-select,
.number-input {
  width: 100%;
}

.type-config-row label,
.row-total {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.type-config-row label span,
.row-total span {
  color: #64748b;
  font-size: 15px;
}

.row-total {
  justify-content: center;
  min-height: 40px;
  padding: 6px 8px;
  background: #f0f7ff;
  border-radius: 6px;
}

.row-total strong {
  color: #1677ff;
  font-size: 26px;
  line-height: 1;
}

.row-delete {
  width: 38px;
  height: 38px;
}

.submit-bar {
  position: sticky;
  bottom: 0;
  margin-top: 18px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #ffffff;
  border: 1px solid #dbe7f3;
  border-radius: 8px;
  box-shadow: 0 -8px 22px rgba(15, 23, 42, 0.08);
}

.submit-bar span {
  display: block;
  margin-bottom: 6px;
  color: #64748b;
  font-size: 15px;
  line-height: 1.5;
}

.submit-bar strong {
  color: #0f172a;
  font-size: 18px;
}

@media screen and (max-width: 1180px) {
  .workspace-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-metrics {
    width: 100%;
    grid-template-columns: repeat(3, 1fr);
  }

  .builder-grid {
    grid-template-columns: 1fr;
  }
}

@media screen and (max-width: 980px) {
  .knowledge-tree-wrap {
    height: 420px;
  }

  .type-config-row {
    grid-template-columns: minmax(180px, 1fr) repeat(2, minmax(110px, 0.65fr)) 82px 36px;
  }
}

@media screen and (max-width: 820px) {
  .type-config-row {
    grid-template-columns: minmax(180px, 1fr) minmax(96px, 0.55fr) minmax(96px, 0.55fr);
  }

  .row-total {
    min-height: auto;
  }

  .row-delete {
    width: 100%;
  }
}

@media screen and (max-width: 760px) {
  .one-click-paper {
    padding: 16px;
  }

  .workspace-header,
  .paper-title-panel,
  .knowledge-panel,
  .config-panel {
    padding: 16px;
  }

  .header-main,
  .paper-title-panel,
  .submit-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .header-metrics {
    grid-template-columns: 1fr;
  }

  .selection-actions {
    grid-template-columns: 1fr;
  }

  .order-setting {
    align-items: stretch;
    flex-direction: column;
  }

  .order-setting :deep(.ant-radio-group) {
    display: grid;
    grid-template-columns: 1fr;
  }

  .order-setting :deep(.ant-radio-button-wrapper) {
    text-align: center;
  }

  .knowledge-tree-wrap {
    height: 360px;
  }

  .point-plan-header {
    flex-direction: column;
  }

  .course-badge {
    width: 100%;
  }
}

@media screen and (max-width: 560px) {
  .workspace-header h1 {
    font-size: 30px;
  }

  .title-input-group {
    align-items: flex-start;
  }

  .type-config-row {
    grid-template-columns: 1fr;
  }

  .knowledge-tree-wrap {
    height: 320px;
  }
}
</style>
