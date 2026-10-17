<!--
 * @Date         : 2026-05-14
 * @Description  : 题库详情页 - 题目管理
 * @FilePath     : QuestionBankDetail.vue
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="question-bank-detail-page">
    <!-- 页面头部 -->
    <a-page-header
      :title="questionBankInfo?.title || '题库详情'"
      @back="goBack"
      class="page-header"
    >
      <template #extra>
        <a-space>
          <a-button @click="handleEditBank">
            <template #icon><edit-outlined /></template>
            编辑题库
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <!-- 主要内容区域 -->
    <div class="detail-content">
      <!-- 加载状态 -->
      <a-spin :spinning="loading" tip="加载中...">
        <!-- 题库信息卡片 -->
        <a-card class="bank-info-card" v-if="questionBankInfo">
          <a-descriptions :column="3" bordered>
            <a-descriptions-item label="题库名称">
              {{ questionBankInfo.title || questionBankInfo.name || '未知题库' }}
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-tag :color="questionBankInfo.is_open ? 'green' : 'orange'">
                {{ questionBankInfo.is_open ? '公开' : '私有' }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="创建人">
              {{ questionBankInfo.create_by || questionBankInfo.creator || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="题库描述" :span="3">
              {{ questionBankInfo.description || questionBankInfo.desc || '暂无描述' }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-spin>

      <!-- AI 智能出题卡片 -->
      <a-card
        v-if="questionBankInfo"
        class="ai-question-card"
        title="🤖 AI 智能出题"
      >
        <a-row :gutter="24">
          <!-- 左侧：知识点选择 -->
          <a-col :span="10">
            <div class="tree-section">
              <div class="section-title">选择知识点</div>
              <a-spin :spinning="treeLoading">
                <a-tree
                  v-if="knowledgeTreeData.length > 0"
                  checkable
                  :tree-data="knowledgeTreeData"
                  v-model:checked-keys="checkedKeys"
                  :selectable="false"
                  :default-expand-all="false"
                  :default-expanded-keys="knowledgeTreeData.filter(n => !n.isLeaf).map(n => n.key)"
                  class="knowledge-tree"
                  block-node
                />
                <a-empty v-else description="暂无知识点数据" />
              </a-spin>
              <div class="selected-count">
                已选择 {{ checkedKeys.length }} 个知识点
              </div>
            </div>
          </a-col>

          <!-- 右侧：题型和生成结果 -->
          <a-col :span="14">
            <div class="generation-section">
              <!-- 题型选择和生成按钮 -->
              <div class="control-row">
                <a-select
                  v-model:value="selectedQuestionType"
                  style="width: 200px; margin-right: 12px"
                  placeholder="选择题型"
                >
                  <a-select-option value="single_choice">单选题</a-select-option>
                  <a-select-option value="multiple_choice">多选题</a-select-option>
                  <a-select-option value="true_or_false">判断题</a-select-option>
                  <a-select-option value="gap_fill">填空题</a-select-option>
                  <a-select-option value="short_answer">简答题</a-select-option>
                </a-select>
                <a-button
                  type="primary"
                  :loading="generating"
                  :disabled="savingDirectly"
                  @click="generateQuestion"
                >
                  <template #icon>
                    <ThunderboltOutlined v-if="!generating" />
                  </template>
                  {{ generating ? '生成中...' : '生成题目' }}
                </a-button>
                <a-button
                  :loading="savingDirectly"
                  :disabled="generating"
                  @click="generateQuestionDirectlyToRepo"
                >
                  <template #icon>
                    <ThunderboltOutlined v-if="!savingDirectly" />
                  </template>
                  {{ savingDirectly ? '入库中...' : '智能生成入库' }}
                </a-button>
              </div>

              <!-- 生成结果显示 -->
              <div v-if="generatedQuestion" class="result-section">
                <a-divider>生成结果</a-divider>

                <!-- 单选题/多选题显示 -->
                <div v-if="generatedQuestion.type === 'single_choice' || generatedQuestion.type === 'multiple_choice'">
                  <a-form layout="vertical">
                    <a-form-item label="题干">
                      <a-textarea
                        v-model:value="generatedQuestion.question"
                        :rows="3"
                      />
                    </a-form-item>
                    <a-form-item label="选项">
                      <div class="options-list">
                        <div
                          v-for="(opt, idx) in generatedQuestion.choose"
                          :key="idx"
                          class="option-item"
                        >
                          <a-tag>{{ String.fromCharCode(65 + idx) }}</a-tag>
                          <a-input v-model:value="generatedQuestion.choose[idx]" style="flex: 1" />
                        </div>
                      </div>
                    </a-form-item>
                    <a-form-item label="正确答案">
                      <a-tag v-if="generatedQuestion.type === 'single_choice'">
                        {{ generatedQuestion.answer }}
                      </a-tag>
                      <div v-else>
                        <a-tag v-for="(ans, idx) in generatedQuestion.answer" :key="idx" style="margin: 2px">
                          {{ ans }}
                        </a-tag>
                      </div>
                    </a-form-item>
                  </a-form>
                </div>

                <!-- 判断题显示 -->
                <div v-else-if="generatedQuestion.type === 'true_or_false'">
                  <a-form layout="vertical">
                    <a-form-item label="题干">
                      <a-textarea
                        v-model:value="generatedQuestion.question"
                        :rows="3"
                      />
                    </a-form-item>
                    <a-form-item label="正确答案">
                      <a-tag :color="generatedQuestion.answer ? 'green' : 'orange'">
                        {{ generatedQuestion.answer ? '正确' : '错误' }}
                      </a-tag>
                    </a-form-item>
                  </a-form>
                </div>

                <!-- 填空题显示 -->
                <div v-else-if="generatedQuestion.type === 'gap_fill'">
                  <a-form layout="vertical">
                    <a-form-item label="题干">
                      <a-textarea
                        v-model:value="generatedQuestion.question"
                        :rows="3"
                        placeholder="用 _____ 表示填空位置"
                      />
                    </a-form-item>
                    <a-form-item label="答案">
                      <div class="answers-list">
                        <div
                          v-for="(ans, idx) in generatedQuestion.answer"
                          :key="idx"
                          class="answer-item"
                        >
                          <a-tag>答案 {{ idx + 1 }}</a-tag>
                          <a-input v-model:value="generatedQuestion.answer[idx]" style="flex: 1" />
                        </div>
                      </div>
                    </a-form-item>
                  </a-form>
                </div>

                <!-- 简答题显示 -->
                <div v-else-if="generatedQuestion.type === 'short_answer'">
                  <a-form layout="vertical">
                    <a-form-item label="题干">
                      <a-textarea
                        v-model:value="generatedQuestion.question"
                        :rows="3"
                      />
                    </a-form-item>
                    <a-form-item label="参考答案">
                      <a-textarea
                        v-model:value="generatedQuestion.answer"
                        :rows="5"
                      />
                    </a-form-item>
                    <a-form-item label="评分要点" v-if="generatedQuestion.scoring_points?.length">
                      <div class="answers-list">
                        <div
                          v-for="(point, idx) in generatedQuestion.scoring_points"
                          :key="idx"
                          class="answer-item"
                        >
                          <a-tag>评分要点 {{ idx + 1 }}</a-tag>
                          <span>{{ point }}</span>
                        </div>
                      </div>
                    </a-form-item>
                  </a-form>
                </div>

                <!-- 解析显示 -->
                <a-collapse v-if="generatedQuestion.analysis">
                  <a-collapse-panel header="查看解析">
                    <p style="color: #666; margin: 0">{{ generatedQuestion.analysis }}</p>
                  </a-collapse-panel>
                </a-collapse>

                <!-- 添加到题库按钮 -->
                <div style="margin-top: 16px; text-align: right">
                  <a-button type="primary" @click="addGeneratedToQuestionBank">
                    <template #icon><PlusOutlined /></template>
                    添加到题库
                  </a-button>
                </div>
              </div>

              <!-- 空状态提示 -->
              <div v-else class="empty-hint">
                <div class="hint-icon">📝</div>
                <div class="hint-text">选择知识点和题型，点击"生成题目"开始</div>
              </div>
            </div>
          </a-col>
        </a-row>
      </a-card>

      <!-- 题目列表区域 -->
      <a-card class="question-list-card">
        <!-- 操作栏 -->
        <div class="action-bar">
          <a-button type="primary" @click="handleCreateQuestion">
            <template #icon><plus-outlined /></template>
            新增题目
          </a-button>
        </div>

        <!-- 数据表格 -->
        <div class="table-container">
          <a-table
            :columns="columns"
            :data-source="questionList"
            :loading="loading"
            :pagination="pagination"
            @change="handleTableChange"
            row-key="id"
            :scroll="{ x: 800 }"
          >
            <!-- 题型列 -->
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'type_'">
                <a-tag>{{ getQuestionTypeLabel(record.type_) }}</a-tag>
              </template>
              <template v-else-if="column.key === 'question'">
                <a-tooltip v-if="getQuestionStem(record)" :title="getQuestionStem(record)">
                  <span class="question-stem">{{ getQuestionStem(record) }}</span>
                </a-tooltip>
                <span v-else>-</span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <a-button type="link" size="small" @click="handleEditQuestion(record)">
                    编辑
                  </a-button>
                  <a-popconfirm
                    title="确定要删除这道题目吗？"
                    ok-text="确定"
                    cancel-text="取消"
                    @confirm="handleDeleteQuestion(record.id)"
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
      </a-card>
    </div>

    <!-- 新增/编辑题目弹窗 -->
    <a-modal
      v-model:open="questionModalVisible"
      :title="editingQuestion ? '编辑题目' : '新增题目'"
      @ok="handleQuestionModalOk"
      @cancel="handleQuestionModalCancel"
      :confirm-loading="saving"
      width="700px"
    >
      <a-form :model="questionForm" layout="vertical">
        <!-- 题型选择 -->
        <a-form-item label="题型" required>
          <a-select
            v-model:value="questionForm.type_"
            placeholder="请选择题型"
            @change="handleTypeChange"
            :disabled="!!editingQuestion"
          >
            <a-select-option :value="0">填空题</a-select-option>
            <a-select-option :value="1">判断题</a-select-option>
            <a-select-option :value="2">单选题</a-select-option>
            <a-select-option :value="3">多选题</a-select-option>
            <a-select-option :value="4">简答题</a-select-option>
          </a-select>
        </a-form-item>

        <!-- 单选题/多选题表单 -->
        <template v-if="questionForm.type_ === 2 || questionForm.type_ === 3">
          <a-form-item label="题干" required>
            <a-textarea
              v-model:value="choiceForm.stem"
              placeholder="请输入题目题干"
              :rows="3"
            />
          </a-form-item>
          <a-form-item label="选项">
            <div class="options-list">
              <div v-for="(opt, index) in choiceForm.options" :key="index" class="option-item">
                <a-input
                  v-model:value="choiceForm.options[index]"
                  :placeholder="`选项 ${String.fromCharCode(65 + index)}`"
                  style="flex: 1"
                />
                <a-button
                  v-if="choiceForm.options.length > 2"
                  type="text"
                  danger
                  @click="removeOption(index)"
                >
                  <delete-outlined />
                </a-button>
              </div>
              <a-button type="dashed" block @click="addOption">
                <plus-outlined /> 添加选项
              </a-button>
            </div>
          </a-form-item>
          <a-form-item label="正确答案" required>
            <a-checkbox-group v-model:value="choiceForm.answer" v-if="questionForm.type_ === 3">
              <a-checkbox
                v-for="(opt, index) in choiceForm.options"
                :key="index"
                :value="opt"
              >
                {{ String.fromCharCode(65 + index) }}
              </a-checkbox>
            </a-checkbox-group>
            <a-radio-group v-model:value="choiceForm.answer" v-else-if="questionForm.type_ === 2">
              <a-radio
                v-for="(opt, index) in choiceForm.options"
                :key="index"
                :value="opt"
              >
                {{ String.fromCharCode(65 + index) }}
              </a-radio>
            </a-radio-group>
          </a-form-item>
        </template>

        <!-- 判断题表单 -->
        <template v-else-if="questionForm.type_ === 1">
          <a-form-item label="题干" required>
            <a-textarea
              v-model:value="judgmentForm.stem"
              placeholder="请输入题目题干"
              :rows="3"
            />
          </a-form-item>
          <a-form-item label="正确答案" required>
            <a-radio-group v-model:value="judgmentForm.answer">
              <a-radio :value="true">对</a-radio>
              <a-radio :value="false">错</a-radio>
            </a-radio-group>
          </a-form-item>
        </template>

        <!-- 填空题表单 -->
        <template v-else-if="questionForm.type_ === 0">
          <a-form-item label="题干" required>
            <a-textarea
              v-model:value="fillBlankForm.stem"
              placeholder="请输入题目题干，用 ___ 表示需要填空的位置"
              :rows="3"
            />
          </a-form-item>
          <a-form-item label="答案列表">
            <div class="answers-list">
              <div v-for="(ans, index) in fillBlankForm.answers" :key="index" class="answer-item">
                <a-input
                  v-model:value="fillBlankForm.answers[index]"
                  :placeholder="`答案 ${index + 1}`"
                  style="flex: 1"
                />
                <a-button
                  v-if="fillBlankForm.answers.length > 1"
                  type="text"
                  danger
                  @click="removeAnswer(index)"
                >
                  <delete-outlined />
                </a-button>
              </div>
              <a-button type="dashed" block @click="addAnswer">
                <plus-outlined /> 添加答案
              </a-button>
            </div>
          </a-form-item>
        </template>

        <!-- 简答题表单 -->
        <template v-else-if="questionForm.type_ === 4">
          <a-form-item label="题干" required>
            <a-textarea
              v-model:value="essayForm.stem"
              placeholder="请输入题目题干"
              :rows="3"
            />
          </a-form-item>
          <a-form-item label="参考答案">
            <a-textarea
              v-model:value="essayForm.answer"
              placeholder="请输入参考答案（可选）"
              :rows="5"
            />
          </a-form-item>
          <a-form-item label="评分要点">
            <div class="answers-list">
              <div v-for="(_point, index) in essayForm.scoringPoints" :key="index" class="answer-item">
                <a-input
                  v-model:value="essayForm.scoringPoints[index]"
                  :placeholder="`评分要点 ${index + 1}`"
                  style="flex: 1"
                />
                <a-button
                  v-if="essayForm.scoringPoints.length > 1"
                  type="text"
                  danger
                  @click="removeScoringPoint(index)"
                >
                  <delete-outlined />
                </a-button>
              </div>
              <a-button type="dashed" block @click="addScoringPoint">
                <plus-outlined /> 添加评分要点
              </a-button>
            </div>
          </a-form-item>
        </template>
      </a-form>
    </a-modal>

    <!-- 编辑题库弹窗（复用现有逻辑） -->
    <a-modal
      v-model:open="bankModalVisible"
      title="编辑题库"
      @ok="handleBankModalOk"
      @cancel="handleBankModalCancel"
      :confirm-loading="saving"
    >
      <a-form :model="bankForm" layout="vertical">
        <a-form-item label="题库名称" required>
          <a-input v-model:value="bankForm.title" placeholder="请输入题库名称" />
        </a-form-item>
        <a-form-item label="题库描述">
          <a-textarea
            v-model:value="bankForm.description"
            placeholder="请输入题库描述"
            :rows="4"
          />
        </a-form-item>
        <a-form-item label="公开状态">
          <a-switch
            v-model:checked="bankForm.is_open"
            checked-children="公开"
            un-checked-children="私有"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  ThunderboltOutlined
} from '@ant-design/icons-vue'
import {
  getQuestionBankDetail,
  updateQuestionBank,
  getQuestionList,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  QUESTION_TYPE_LABELS
} from '@/api/questionBank'
import { courseService } from '@/api/course.js'
import {
  generateGapFillQuestion,
  generateGapFillQuestionToRepo,
  generateTrueFalseQuestion,
  generateTrueFalseQuestionToRepo,
  generateSingleChoiceQuestion,
  generateSingleChoiceQuestionToRepo,
  generateMultipleChoiceQuestion,
  generateMultipleChoiceQuestionToRepo,
  generateShortAnswerQuestion,
  generateShortAnswerQuestionToRepo
} from '@/api/course.js'

const route = useRoute()
const router = useRouter()

// 状态
const loading = ref(false)
const saving = ref(false)
const questionBankInfo = ref(null)
const questionList = ref([])

// 弹窗状态
const questionModalVisible = ref(false)
const bankModalVisible = ref(false)
const editingQuestion = ref(null)

// ========== AI 智能出题相关状态 ==========
// 知识点树相关
const knowledgeTreeData = ref([])
const checkedKeys = ref([])
const treeLoading = ref(false)

// 知识点详细信息（用于传递给 AI）
const knowledgePointsMap = ref({})

// 题型和生成相关
const selectedQuestionType = ref('single_choice') // gap_fill, true_or_false, single_choice, multiple_choice
const generating = ref(false)
const savingDirectly = ref(false)

// 生成的题目数据
const generatedQuestion = ref(null)

// 当前题目的分析内容（来自AI生成）
const currentQuestionAnalysis = ref('')

// 题型映射
const QUESTION_TYPE_MAP = {
  gap_fill: { label: '填空题', typeCode: 0 },
  true_or_false: { label: '判断题', typeCode: 1 },
  single_choice: { label: '单选题', typeCode: 2 },
  multiple_choice: { label: '多选题', typeCode: 3 },
  short_answer: { label: '简答题', typeCode: 4 }
}

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
    width: 100,
    customRender: ({ text }) => String(text).slice(-6)
  },
  {
    title: '题型',
    dataIndex: 'type_',
    key: 'type_',
    width: 100
  },
  {
    title: '题目内容',
    dataIndex: 'question',
    key: 'question',
    ellipsis: true
  },
  {
    title: '创建人',
    dataIndex: 'create_by',
    key: 'create_by',
    width: 120
  },
  {
    title: '创建时间',
    dataIndex: 'create_time',
    key: 'create_time',
    width: 180
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right'
  }
]

// 题目表单
const questionForm = reactive({
  type_: 0
})

// 选择题表单
const choiceForm = reactive({
  stem: '',
  options: ['', ''],
  answer: []
})

// 判断题表单
const judgmentForm = reactive({
  stem: '',
  answer: true
})

// 填空题表单
const fillBlankForm = reactive({
  stem: '',
  answers: ['']
})

// 简答题表单
const essayForm = reactive({
  stem: '',
  answer: '',
  scoringPoints: []
})

// 题库编辑表单
const bankForm = reactive({
  title: '',
  description: '',
  is_open: true
})

// 获取题型标签
const getQuestionTypeLabel = (type_) => {
  return QUESTION_TYPE_LABELS[type_] || '未知'
}

// 将字符串题型转换为数字
const convertStringTypeToNumber = (typeStr) => {
  const typeMap = {
    '填空题': 0,
    '判断题': 1,
    '单选题': 2,
    '多选题': 3,
    '简答题': 4
  }
  return typeMap[typeStr] || 0
}

// 获取题目题干
const getQuestionStem = (record) => {
  if (!record.question) return ''
  try {
    const q = typeof record.question === 'string'
      ? JSON.parse(record.question)
      : record.question
    // 优先使用 question 字段，如果没有则使用 stem
    return q.question || q.stem || ''
  } catch {
    return ''
  }
}

// ========== AI 智能出题辅助函数 ==========
// 将知识点数据转换为 Tree 组件格式
function transformKnowledgeTreeData(nodes, prefix = 'point') {
  if (!nodes || !Array.isArray(nodes)) return []

  return nodes.map((node, index) => {
    const key = `${prefix}-${index}`
    const isPoint = node.type === 'point'
    const transformed = {
      key,
      title: node.label,
      disabled: !isPoint, // 只有知识点可选
      isLeaf: isPoint
    }

    if (node.children && node.children.length > 0) {
      transformed.children = transformKnowledgeTreeData(node.children, key)
    }

    return transformed
  })
}

// 加载知识点树
async function loadKnowledgeTree() {
  treeLoading.value = true
  try {
    // 使用题库 ID 获取知识点
    const repoId = route.params.id
    if (repoId) {
      const res = await courseService.request(`/course/point/repo_id?repo_id=${repoId}`)
      if (res.code === 200 && res.data?.knowledge_point) {
        // 保存完整的知识点信息（包括 label 和 content）
        checkedKeys.value = []
        knowledgePointsMap.value = {}
        saveKnowledgePointsData(res.data.knowledge_point)
        knowledgeTreeData.value = transformKnowledgeTreeData(res.data.knowledge_point)
      } else {
        // API 返回失败，使用演示数据
        loadDemoKnowledgeData()
      }
    } else {
      // 没有题库 ID，使用演示数据
      loadDemoKnowledgeData()
    }
  } catch (error) {
    console.error('加载知识点树失败:', error)
    // 出错时使用演示数据
    loadDemoKnowledgeData()
  } finally {
    treeLoading.value = false
  }
}

// 保存知识点详细信息到映射表
function saveKnowledgePointsData(nodes, prefix = 'point') {
  nodes.forEach((node, index) => {
    const fullKey = `${prefix}-${index}`
    if (node.type === 'point') {
      knowledgePointsMap.value[fullKey] = {
        id: node.id ?? fullKey,
        label: node.label,
        content: node.content || ''
      }
    }

    if (node.children && node.children.length > 0) {
      saveKnowledgePointsData(node.children, fullKey)
    }
  })
}

// 加载演示知识点数据（备用方案）
function loadDemoKnowledgeData() {
  knowledgeTreeData.value = [
    {
      key: 'demo-chapter-1',
      title: '演示章节',
      disabled: true,
      isLeaf: false,
      children: [
        {
          key: 'demo-point-1',
          title: '演示知识点',
          disabled: false,
          isLeaf: true
        }
      ]
    }
  ]
  knowledgePointsMap.value = {
    'demo-point-1': {
      id: 'demo-point-1',
      label: '演示知识点',
      content: '这是一个演示知识点的内容'
    }
  }
}

function getSelectedKnowledgePoints() {
  const selectedPoints = checkedKeys.value
  if (!selectedPoints || selectedPoints.length === 0) {
    return []
  }

  const selectedKnowledgePoints = []
  selectedPoints.forEach(key => {
    const pointInfo = knowledgePointsMap.value[key]
    if (pointInfo) {
      selectedKnowledgePoints.push({
        id: pointInfo.id,
        label: pointInfo.label,
        content: pointInfo.content || '暂无内容描述'
      })
    } else {
      console.warn('未找到知识点信息:', key)
    }
  })

  return selectedKnowledgePoints
}

// 生成题目
async function generateQuestion() {
  const selectedPoints = checkedKeys.value
  console.log('选中的知识点:', selectedPoints)
  if (!selectedPoints || selectedPoints.length === 0) {
    message.warning('请至少选择一个知识点')
    return
  }

  // 获取选中知识点的详细信息
  const selectedKnowledgePoints = getSelectedKnowledgePoints()

  console.log('知识点点映射表:', knowledgePointsMap.value)
  console.log('选中的知识点 ID:', selectedPoints)
  console.log('选中的知识点详情:', selectedKnowledgePoints)

  generating.value = true
  generatedQuestion.value = null

  try {
    let res
    const type = selectedQuestionType.value

    switch (type) {
      case 'gap_fill':
        res = await generateGapFillQuestion(selectedKnowledgePoints)
        break
      case 'true_or_false':
        res = await generateTrueFalseQuestion(selectedKnowledgePoints)
        break
      case 'single_choice':
        res = await generateSingleChoiceQuestion(selectedKnowledgePoints)
        break
      case 'multiple_choice':
        res = await generateMultipleChoiceQuestion(selectedKnowledgePoints)
        break
      case 'short_answer':
        res = await generateShortAnswerQuestion(selectedKnowledgePoints)
        break
      default:
        message.error('未知题型')
        return
    }

    if (res.code === 200 && res.data) {
      generatedQuestion.value = {
        type: type,
        ...res.data
      }
      message.success('题目生成成功')
    } else {
      message.error(res.message || '生成题目失败')
    }
  } catch (error) {
    console.error('生成题目失败:', error)
    message.error('生成题目失败，请稍后重试')
  } finally {
    generating.value = false
  }
}

async function generateQuestionDirectlyToRepo() {
  const selectedKnowledgePoints = getSelectedKnowledgePoints()
  if (selectedKnowledgePoints.length === 0) {
    message.warning('请至少选择一个知识点')
    return
  }

  const repoId = String(route.params.id || '')
  if (!repoId) {
    message.error('缺少题库ID')
    return
  }

  savingDirectly.value = true

  try {
    let res
    const type = selectedQuestionType.value

    switch (type) {
      case 'gap_fill':
        res = await generateGapFillQuestionToRepo(selectedKnowledgePoints, repoId)
        break
      case 'true_or_false':
        res = await generateTrueFalseQuestionToRepo(selectedKnowledgePoints, repoId)
        break
      case 'single_choice':
        res = await generateSingleChoiceQuestionToRepo(selectedKnowledgePoints, repoId)
        break
      case 'multiple_choice':
        res = await generateMultipleChoiceQuestionToRepo(selectedKnowledgePoints, repoId)
        break
      case 'short_answer':
        res = await generateShortAnswerQuestionToRepo(selectedKnowledgePoints, repoId)
        break
      default:
        message.error('未知题型')
        return
    }

    if (res.code === 200) {
      message.success('AI题目已保存到题库')
      generatedQuestion.value = null
      await fetchData()
    } else {
      message.error(res.message || '保存到题库失败')
    }
  } catch (error) {
    console.error('AI题目直接保存失败:', error)
    message.error(error?.message || '保存到题库失败，请稍后重试')
  } finally {
    savingDirectly.value = false
  }
}

// 从选项文本中提取纯内容（去掉 "A. " 前缀）
function extractOptionText(optionStr) {
  if (!optionStr) return ''
  return optionStr.replace(/^[A-Z]\.\s*/, '')
}

// 查找答案在选项中的索引
function findAnswerIndices(chooseList, answer) {
  if (!chooseList || !answer) return []

  const answerList = Array.isArray(answer) ? answer : [answer]
  const indices = []

  answerList.forEach(ans => {
    const idx = chooseList.findIndex(c => c === ans)
    if (idx !== -1) {
      indices.push(idx)
    }
  })

  return indices
}

// 将生成的题目添加到题库（填充到新增弹窗）
function addGeneratedToQuestionBank() {
  if (!generatedQuestion.value) {
    message.warning('请先生成题目')
    return
  }

  const q = generatedQuestion.value
  editingQuestion.value = null
  resetQuestionForms()

  // 设置题型
  questionForm.type_ = QUESTION_TYPE_MAP[q.type].typeCode

  // 根据题型填充数据
  if (q.type === 'single_choice' || q.type === 'multiple_choice') {
    choiceForm.stem = q.question || ''
    choiceForm.options = (q.choose || []).map(opt => extractOptionText(opt))

    // 直接保存答案文本（去掉 "A." 前缀）
    if (Array.isArray(q.answer)) {
      // 多选题
      choiceForm.answer = q.answer.map(ans => extractOptionText(ans))
    } else {
      // 单选题
      choiceForm.answer = extractOptionText(q.answer)
    }
  } else if (q.type === 'true_or_false') {
    judgmentForm.stem = q.question || ''
    judgmentForm.answer = q.answer !== undefined ? q.answer : true
  } else if (q.type === 'gap_fill') {
    fillBlankForm.stem = q.question || ''
    fillBlankForm.answers = Array.isArray(q.answer) ? q.answer : [q.answer || '']
  } else if (q.type === 'short_answer') {
    essayForm.stem = q.question || ''
    essayForm.answer = q.answer || ''
    essayForm.scoringPoints = q.scoring_points ? [...q.scoring_points] : []
  }

  // 保存分析内容到组件状态，以便在构建题目数据时使用
  currentQuestionAnalysis.value = q.analysis || ''

  // 打开弹窗
  questionModalVisible.value = true
}

// 获取题库详情和题目列表
const fetchData = async () => {
  const id = route.params.id
  if (!id) return

  loading.value = true
  try {
    // 并行请求
    const [bankRes, questionRes] = await Promise.all([
      getQuestionBankDetail(id),
      getQuestionList(id, {
        page: pagination.value.current,
        page_size: pagination.value.pageSize
      })
    ])

    console.log('题库详情返回:', bankRes)
    console.log('题目列表返回:', questionRes)

    // 处理题库信息 - 支持多种数据格式
    if (bankRes.code === 200) {
      if (bankRes.data) {
        questionBankInfo.value = bankRes.data
      } else if (Array.isArray(bankRes.data) && bankRes.data.length > 0) {
        // 如果是列表，找匹配的 id
        questionBankInfo.value = bankRes.data.find(item => String(item.id) === String(id))
      }
    } else if (Array.isArray(bankRes.data)) {
      // 尝试从列表中找
      questionBankInfo.value = bankRes.data.find(item => String(item.id) === String(id))
    }

    // 如果还是没找到，尝试从题目列表的 repo_id 推断或使用 mock
    if (!questionBankInfo.value) {
      console.warn('未找到题库信息，使用默认数据')
      questionBankInfo.value = {
        id: id,
        title: '题库 ' + id,
        description: '暂无描述',
        is_open: true,
        create_by: '-'
      }
    }

    // 如果有 course_id，加载知识点树
    if (questionBankInfo.value?.course_id) {
      loadKnowledgeTree()
    } else {
      // 如果没有 course_id，也尝试加载知识点树（用于演示）
      loadKnowledgeTree()
    }

    if (questionRes.code === 200) {
      const rawData = Array.isArray(questionRes.data) ? questionRes.data : []
      // Convert string type_ to numeric and ensure proper structure
      questionList.value = rawData.map(item => ({
        ...item,
        type_: convertStringTypeToNumber(item.type_)
      }))
      // 优先使用后端返回的 total，如果没有则使用数据长度
      pagination.value.total = questionRes.total !== undefined ? questionRes.total : questionList.value.length
    }
  } catch (error) {
    console.error('获取数据失败:', error)
    message.error('获取数据失败')
    // 即使出错也设置一个默认的题库信息，让页面能显示
    questionBankInfo.value = {
      id: route.params.id,
      title: '题库 ' + route.params.id,
      description: '暂无描述',
      is_open: true,
      create_by: '-'
    }
    questionList.value = []
  } finally {
    loading.value = false
  }
}

// 表格分页、排序、筛选变化处理
const handleTableChange = (pag) => {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  fetchData()
}

// 页面操作
const goBack = () => {
  router.back()
}

// 编辑题库
const handleEditBank = () => {
  if (!questionBankInfo.value) return
  bankForm.title = questionBankInfo.value.title || ''
  bankForm.description = questionBankInfo.value.description || ''
  bankForm.is_open = questionBankInfo.value.is_open !== undefined
    ? questionBankInfo.value.is_open
    : true
  bankModalVisible.value = true
}

const handleBankModalOk = async () => {
  if (!bankForm.title.trim()) {
    message.warning('请输入题库名称')
    return
  }
  saving.value = true
  try {
    const res = await updateQuestionBank(route.params.id, {
      ...bankForm,
      courseId: questionBankInfo.value?.course_id
    })
    if (res.code === 200) {
      message.success('更新成功')
      bankModalVisible.value = false
      fetchData()
    } else {
      message.error(res.message || '更新失败')
    }
  } catch (error) {
    console.error('更新失败:', error)
    message.error('更新失败')
  } finally {
    saving.value = false
  }
}

const handleBankModalCancel = () => {
  bankModalVisible.value = false
}

// 题目操作
const handleCreateQuestion = () => {
  editingQuestion.value = null
  resetQuestionForms()
  questionModalVisible.value = true
}

const handleEditQuestion = (record) => {
  editingQuestion.value = record
  resetQuestionForms()
  // 回填数据
  try {
    const q = typeof record.question === 'string'
      ? JSON.parse(record.question)
      : record.question
    questionForm.type_ = record.type_

    // 提取分析内容
    if (q.analysis) {
      currentQuestionAnalysis.value = q.analysis
    }

    if (record.type_ === 2 || record.type_ === 3) {
      // 选择题：单选题和多选题
      choiceForm.stem = q.question || q.stem || ''
      choiceForm.options = q.choose || q.options || ['', '']

      // 处理答案格式：兼容新旧格式
      if (Array.isArray(q.answer)) {
        if (q.answer.length > 0 && typeof q.answer[0] === 'number') {
          // 旧格式：索引数组，转换成文本数组
          choiceForm.answer = q.answer
            .map(idx => choiceForm.options[idx])
            .filter(Boolean)
        } else {
          // 新格式：文本数组
          choiceForm.answer = q.answer
        }
      } else if (typeof q.answer === 'number') {
        // 旧格式：单个索引，转换成文本
        choiceForm.answer = choiceForm.options[q.answer] || ''
      } else if (typeof q.answer === 'string') {
        // 新格式：单个文本，或者带"A."前缀的文本
        const cleanAnswer = extractOptionText(q.answer)
        // 检查是否在选项中，如果不在，尝试通过包含关系匹配
        if (choiceForm.options.includes(cleanAnswer)) {
          choiceForm.answer = cleanAnswer
        } else {
          // 尝试模糊匹配
          const matchedOption = choiceForm.options.find(opt =>
            opt.includes(cleanAnswer) || cleanAnswer.includes(opt)
          )
          choiceForm.answer = matchedOption || ''
        }
      } else {
        choiceForm.answer = record.type_ === 3 ? [] : ''
      }
    } else if (record.type_ === 1) {
      // 判断题
      judgmentForm.stem = q.question || q.stem || ''
      judgmentForm.answer = q.answer !== undefined ? q.answer : true
    } else if (record.type_ === 0) {
      // 填空题
      fillBlankForm.stem = q.question || q.stem || ''
      fillBlankForm.answers = Array.isArray(q.answer) ? q.answer : [q.answer || '']
    } else if (record.type_ === 4) {
      // 简答题
      essayForm.stem = q.question || q.stem || ''
      essayForm.answer = q.answer || q.referenceAnswer || ''
      essayForm.scoringPoints = q.scoring_points || []
    }
  } catch (error) {
    console.error('解析题目数据失败:', error)
  }
  questionModalVisible.value = true
}

const handleDeleteQuestion = async (questionId) => {
  try {
    const res = await deleteQuestion(questionId)
    if (res.code === 200) {
      message.success('删除成功')
      fetchData()
    } else {
      message.error(res.message || '删除失败')
    }
  } catch (error) {
    console.error('删除失败:', error)
    message.error('删除失败')
  }
}

// 题型切换
const handleTypeChange = () => {
  resetQuestionForms()
}

// 重置表单
const resetQuestionForms = () => {
  questionForm.type_ = editingQuestion.value ? editingQuestion.value.type_ : 0
  choiceForm.stem = ''
  choiceForm.options = ['', '']
  // 根据题型设置答案初始值：多选题用数组，单选题用字符串
  choiceForm.answer = questionForm.type_ === 3 ? [] : ''
  judgmentForm.stem = ''
  judgmentForm.answer = true
  fillBlankForm.stem = ''
  fillBlankForm.answers = ['']
  essayForm.stem = ''
  essayForm.answer = ''
  essayForm.scoringPoints = []
  currentQuestionAnalysis.value = ''
}

// 选项操作
const addOption = () => {
  if (choiceForm.options.length < 8) {
    choiceForm.options.push('')
  }
}
const removeOption = (index) => {
  const removedOption = choiceForm.options[index]
  choiceForm.options.splice(index, 1)
  // 同时移除答案中的对应选项
  if (Array.isArray(choiceForm.answer)) {
    // 多选题：过滤掉被删除的选项
    choiceForm.answer = choiceForm.answer.filter(a => a !== removedOption)
  } else if (choiceForm.answer === removedOption) {
    // 单选题：如果被删除的是选中的答案，清空答案
    choiceForm.answer = ''
  }
}

// 答案操作
const addAnswer = () => {
  fillBlankForm.answers.push('')
}
const removeAnswer = (index) => {
  fillBlankForm.answers.splice(index, 1)
}

// 评分要点操作
const addScoringPoint = () => {
  essayForm.scoringPoints.push('')
}
const removeScoringPoint = (index) => {
  essayForm.scoringPoints.splice(index, 1)
}

// 生成的题目评分要点操作
const addGeneratedScoringPoint = () => {
  if (generatedQuestion.value?.scoring_points) {
    generatedQuestion.value.scoring_points.push('')
  }
}
const removeGeneratedScoringPoint = (index) => {
  if (generatedQuestion.value?.scoring_points) {
    generatedQuestion.value.scoring_points.splice(index, 1)
  }
}

// 构建题目数据
const buildQuestionData = () => {
  let question = {}
  if (questionForm.type_ === 2 || questionForm.type_ === 3) {
    question = {
      question: choiceForm.stem,
      choose: choiceForm.options,
      answer: choiceForm.answer,
      analysis: currentQuestionAnalysis.value || ''
    }
  } else if (questionForm.type_ === 1) {
    question = {
      question: judgmentForm.stem,
      answer: judgmentForm.answer,
      analysis: currentQuestionAnalysis.value || ''
    }
  } else if (questionForm.type_ === 0) {
    question = {
      question: fillBlankForm.stem,
      answer: fillBlankForm.answers,
      analysis: currentQuestionAnalysis.value || ''
    }
  } else if (questionForm.type_ === 4) {
    question = {
      question: essayForm.stem,
      answer: essayForm.answer,
      scoring_points: essayForm.scoringPoints,
      analysis: currentQuestionAnalysis.value || ''
    }
  }
  console.log('构建题目数据:', question)
  return {
    question: question,
    type_: questionForm.type_,
    repo_id: route.params.id
  }
}

// 题目弹窗确认
const handleQuestionModalOk = async () => {
  // 验证必填字段
  if (questionForm.type_ === 2 || questionForm.type_ === 3) {
    if (!choiceForm.stem.trim()) {
      message.warning('请输入题干')
      return
    }
    if (choiceForm.options.some(o => !o.trim())) {
      message.warning('请填写完整的选项')
      return
    }
    if (choiceForm.answer.length === 0) {
      message.warning('请选择正确答案')
      return
    }
  } else if (questionForm.type_ === 1) {
    if (!judgmentForm.stem.trim()) {
      message.warning('请输入题干')
      return
    }
  } else if (questionForm.type_ === 0) {
    if (!fillBlankForm.stem.trim()) {
      message.warning('请输入题干')
      return
    }
  } else if (questionForm.type_ === 4) {
    if (!essayForm.stem.trim()) {
      message.warning('请输入题干')
      return
    }
  }

  saving.value = true
  try {
    const data = buildQuestionData()

    let res
    if (editingQuestion.value) {
      data.id = editingQuestion.value.id
      res = await updateQuestion(data)
    } else {
      res = await createQuestion(data)
    }

    if (res.code === 200) {
      message.success(editingQuestion.value ? '更新成功' : '创建成功')
      questionModalVisible.value = false
      fetchData()
    } else {
      message.error(res.message || '操作失败')
    }
  } catch (error) {
    console.error('操作失败:', error)
    message.error('操作失败')
  } finally {
    saving.value = false
  }
}

const handleQuestionModalCancel = () => {
  questionModalVisible.value = false
  editingQuestion.value = null
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.question-bank-detail-page {
  min-height: 100vh;
  background: #f5f7fb;
}

.page-header {
  margin-bottom: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.detail-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.bank-info-card {
  margin-bottom: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.question-list-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.action-bar {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}

.table-container {
  width: 100%;
  overflow-x: auto;
}

.question-stem {
  display: inline-block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}

.options-list,
.answers-list {
  width: 100%;
}

.option-item {
  padding: 4px 0;
  color: #595959;
  font-size: 14px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}

.answer-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}

.selected-question-content {
  margin-bottom: 8px;
  color: #262626;
  font-size: 14px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}

/* ========== AI 智能出题卡片样式 ========== */
.ai-question-card {
  margin-bottom: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tree-section {
  border-right: 1px solid #f0f0f0;
  padding-right: 16px;
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.section-title {
  font-weight: 500;
  margin-bottom: 12px;
  color: #333;
}

.knowledge-tree {
  max-height: 280px;
  overflow-y: auto;
  padding: 8px;
  background: #fafafa;
  border-radius: 8px;
  flex: 1;
}

.selected-count {
  margin-top: 12px;
  color: #666;
  font-size: 13px;
}

.generation-section {
  padding-left: 16px;
}

.control-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.result-section {
  background: #f5f7fb;
  padding: 16px;
  border-radius: 8px;
}

.empty-hint {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.hint-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.hint-text {
  font-size: 14px;
}

.options-list,
.answers-list {
  width: 100%;
}

.option-item,
.answer-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

/* 响应式：小屏幕改为上下布局 */
@media screen and (max-width: 992px) {
  .tree-section {
    border-right: none;
    border-bottom: 1px solid #f0f0f0;
    padding-right: 0;
    padding-bottom: 16px;
    margin-bottom: 16px;
  }

  .generation-section {
    padding-left: 0;
  }

  .control-row {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .control-row .ant-select {
    width: 100% !important;
    margin-right: 0 !important;
  }
}

@media screen and (max-width: 768px) {
  .detail-content {
    padding: 0 16px;
  }

  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  :deep(.ant-table) {
    min-width: 800px;
  }
}

.scoring-points-list {
  width: 100%;
}

.scoring-point-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: flex-start;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
}
</style>
