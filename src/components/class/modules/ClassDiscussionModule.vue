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
      :scroll="{ x: 900 }"
      @expand="handleExpand"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'topic'">
          <a-button type="link" class="topic-link" @click="toggleDiscussion(record)">
            {{ record.topic || '-' }}
          </a-button>
        </template>

        <template v-else-if="column.key === 'time_range'">
          <div class="time-range">
            <span>{{ formatDateTime(record.start_time) }}</span>
            <span class="time-separator">至</span>
            <span>{{ formatDateTime(record.end_time) }}</span>
          </div>
        </template>

        <template v-else-if="column.key === 'status'">
          <a-tag :color="getStatusColor(record)">{{ getStatusText(record) }}</a-tag>
        </template>

        <template v-else-if="column.key === 'create_by'">
          {{ record.create_by || '-' }}
        </template>

        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button type="link" size="small" @click="toggleDiscussion(record)">
              {{ isExpanded(record) ? '收起' : '进入讨论' }}
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
            </div>
            <div class="summary-meta">
              <a-tag v-if="record.zl_class" color="blue">{{ record.zl_class }}</a-tag>
              <a-tag v-if="record.create_by" color="default">创建人：{{ record.create_by }}</a-tag>
              <a-tag :color="getStatusColor(record)">{{ getStatusText(record) }}</a-tag>
              <a-tag v-if="record.duration_minutes" color="purple">
                时长 {{ record.duration_minutes }} 分钟
              </a-tag>
              <a-tag v-if="getGroupConfigText(record)" color="cyan">
                {{ getGroupConfigText(record) }}
              </a-tag>
            </div>
          </div>

          <div class="group-section">
            <div class="section-header">
              <div>
                <h4>{{ isTeacherOrAdmin ? '分组情况' : '我所在的小组' }}</h4>
                <span v-if="groups.length">{{ groups.length }} 个小组，实时查看各小组讨论</span>
                <span v-else>暂无分组信息</span>
              </div>
            </div>
            <a-spin :spinning="groupLoading">
              <a-empty v-if="groups.length === 0" description="暂无分组信息" />
              <template v-else>
                <a-radio-group
                  v-if="isTeacherOrAdmin"
                  v-model:value="activeGroupId"
                  button-style="solid"
                  class="group-radio"
                  @change="handleGroupChange"
                >
                  <a-radio-button v-for="group in groups" :key="group.id" :value="group.id">
                    第{{ group.group_no }}组（{{ group.member_count }}人）
                  </a-radio-button>
                </a-radio-group>
                <div class="group-title-text" v-else>
                  第{{ activeGroup?.group_no }}组（{{ activeGroup?.member_count || 0 }}人）
                </div>
                <div class="group-members">
                  <a-tag v-for="member in activeGroupMembers" :key="member.user_id" color="blue">
                    {{ member.user_name }}
                  </a-tag>
                </div>
              </template>
            </a-spin>
          </div>

          <a-alert
            v-if="isDiscussionEnded(record)"
            type="info"
            show-icon
            class="discussion-alert"
            message="讨论已截止，当前仅可查看历史内容，不能继续发言"
          />

          <div class="evaluation-section">
            <div class="section-header">
              <div>
                <h4>讨论评价</h4>
                <span v-if="evaluationExpanded">参与度 / 内容质量 / 认知深度</span>
                <span v-else>点击后查看班级、小组{{ isTeacherOrAdmin ? '与个人' : '及个人' }}评价</span>
              </div>
              <div class="evaluation-actions">
                <a-statistic
                  v-if="evaluationExpanded && evaluationSummary"
                  title="班级平均总分"
                  :value="evaluationSummary.class_evaluation.total_score"
                  :precision="1"
                  suffix="分"
                  class="average-score"
                />
                <a-button
                  size="small"
                  :loading="evaluationLoading"
                  @click="toggleDiscussionEvaluations"
                >
                  {{ evaluationExpanded ? '收起评价' : '查看评价' }}
                </a-button>
                <a-button
                  v-if="evaluationExpanded && isTeacherOrAdmin"
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
                message="加载讨论评价失败"
                :description="evaluationError"
                type="error"
                show-icon
              >
                <template #action>
                  <a-button size="small" danger @click="fetchEvaluationData">重试</a-button>
                </template>
              </a-alert>

              <template v-else>
                <a-spin :spinning="evaluationLoading">
                  <div v-if="evaluationSummary" class="evaluation-cards">
                    <div class="evaluation-card">
                      <div class="evaluation-card-title">班级整体</div>
                      <div class="evaluation-card-body">
                        <span>参与度 {{ formatScore(evaluationSummary.class_evaluation.engagement_score) }}</span>
                        <span>内容质量 {{ formatScore(evaluationSummary.class_evaluation.quality_score) }}</span>
                        <span>认知深度 {{ formatScore(evaluationSummary.class_evaluation.cognitive_score) }}</span>
                      </div>
                      <div class="evaluation-card-footer">
                        综合 {{ formatScore(evaluationSummary.class_evaluation.total_score) }} 分
                      </div>
                    </div>

                    <div
                      v-for="group in evaluationSummary.groups"
                      :key="group.group_id"
                      class="evaluation-card"
                    >
                      <div class="evaluation-card-title">
                        第{{ group.group_no }}组（{{ group.member_count }}人）
                      </div>
                      <div class="evaluation-card-body">
                        <span>参与度 {{ formatScore(group.engagement_score) }}</span>
                        <span>内容质量 {{ formatScore(group.quality_score) }}</span>
                        <span>认知深度 {{ formatScore(group.cognitive_score) }}</span>
                      </div>
                      <div class="evaluation-card-footer">
                        综合 {{ formatScore(group.total_score) }} 分
                      </div>
                    </div>

                    <div v-if="evaluationSummary.my_evaluation" class="evaluation-card evaluation-card-self">
                      <div class="evaluation-card-title">我的评价</div>
                      <div class="evaluation-card-body">
                        <span>参与度 {{ formatScore(evaluationSummary.my_evaluation.engagement_score) }}</span>
                        <span>内容质量 {{ formatScore(evaluationSummary.my_evaluation.quality_score) }}</span>
                        <span>认知深度 {{ formatScore(evaluationSummary.my_evaluation.cognitive_score) }}</span>
                      </div>
                      <div class="evaluation-card-footer">
                        综合 {{ formatScore(evaluationSummary.my_evaluation.total_score) }} 分
                      </div>
                    </div>
                  </div>
                </a-spin>

                <a-table
                  v-if="isTeacherOrAdmin"
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
                  <template #bodyCell="{ column, record: evaluationRecord }">
                    <template v-if="column.key === 'user'">
                      <span class="student-name">{{ evaluationRecord.user || '-' }}</span>
                    </template>
                    <template v-else-if="column.key === 'total_score'">
                      <a-tag :color="getScoreColor(evaluationRecord.total_score)" class="score-tag">
                        {{ formatScore(evaluationRecord.total_score) }} 分
                      </a-tag>
                    </template>
                    <template v-else-if="column.key.endsWith('_score')">
                      {{ formatScore(evaluationRecord[column.key]) }}
                    </template>
                  </template>
                </a-table>
              </template>
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

          <div ref="messageScrollRef" class="message-scroll">
            <a-spin v-if="contentLoading && discussionContents.length === 0" tip="加载讨论内容中..." />
            <a-empty
              v-else-if="mainContents.length === 0"
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
                        <a-tag v-if="isAiReply(item)" color="blue" class="reply-tag">AI</a-tag>
                      </div>
                      <div class="content-meta">
                        <span>{{ formatDateTime(item.create_time) }}</span>
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
                    <div
                      v-if="isAiReply(item)"
                      class="content-text markdown-body"
                      v-html="renderMarkdown(item.content)"
                    ></div>
                    <div v-else class="content-text">{{ item.content || '-' }}</div>
                  </div>

                  <div v-if="hasReplies(item.id) || replyingToId === item.id" class="replies-section">
                    <div class="replies-toolbar">
                      <a-button
                        v-if="hasReplies(item.id)"
                        type="link"
                        size="small"
                        class="replies-toggle"
                        @click="toggleReplies(item.id)"
                      >
                        {{ isRepliesExpanded(item.id) ? '收起' : `查看${getRepliesCount(item.id)}条回复` }}
                      </a-button>
                      <a-button
                        v-if="canSpeak(record) && replyingToId !== item.id"
                        type="link"
                        size="small"
                        class="reply-btn"
                        @click="startReply(item.id)"
                      >
                        回复
                      </a-button>
                    </div>

                    <div v-if="replyingToId === item.id" class="reply-input-area">
                      <a-textarea
                        v-model:value="replyInput"
                        placeholder="请输入回复内容"
                        :rows="3"
                        :maxlength="1000"
                        show-count
                      />
                      <div class="reply-input-actions">
                        <a-button size="small" @click="cancelReply">取消</a-button>
                        <a-button
                          type="primary"
                          size="small"
                          :loading="replySubmitting"
                          :disabled="!replyInput.trim()"
                          @click="handleSubmitReply"
                        >
                          发表回复
                        </a-button>
                      </div>
                    </div>

                    <div v-if="hasReplies(item.id) && isRepliesExpanded(item.id)" class="replies-panel">
                      <div
                        v-for="replyItem in getReplies(item.id)"
                        :key="replyItem.id"
                        class="reply-item"
                      >
                        <div :class="['reply-card', { 'reply-card-ai': isAiReply(replyItem) }]">
                          <div class="content-header">
                            <div class="content-user">
                              <a-avatar
                                :src="getContentAvatarUrl(replyItem)"
                                :size="32"
                                class="content-avatar"
                              >
                                {{ getUserInitial(replyItem.user) }}
                              </a-avatar>
                              <div class="content-author">{{ replyItem.user || '未知用户' }}</div>
                              <a-tag v-if="isAiReply(replyItem)" color="blue" class="reply-tag">AI</a-tag>
                            </div>
                            <div class="content-meta">
                              <span>{{ formatDateTime(replyItem.create_time) }}</span>
                              <a-popconfirm
                                v-if="canDeleteContent(replyItem)"
                                title="确定要删除这条回复吗？"
                                ok-text="确定"
                                cancel-text="取消"
                                @confirm="handleDeleteContent(replyItem.id)"
                              >
                                <a-button
                                  type="link"
                                  size="small"
                                  danger
                                  class="content-delete"
                                  :loading="deletingContentId === replyItem.id"
                                >
                                  删除
                                </a-button>
                              </a-popconfirm>
                            </div>
                          </div>
                          <div
                            v-if="isAiReply(replyItem)"
                            class="content-text markdown-body"
                            v-html="renderMarkdown(replyItem.content)"
                          ></div>
                          <div v-else class="content-text">{{ replyItem.content || '-' }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </a-list-item>
              </template>
            </a-list>
          </div>

          <div v-if="canSpeak(record)" class="reply-form">
            <a-textarea
              v-model:value="replyForm.content"
              placeholder="请输入讨论内容，与同组同学交流"
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
          />
        </a-form-item>
        <a-form-item label="开始时间" name="start_time" required>
          <a-date-picker
            v-model:value="formData.start_time"
            show-time
            format="YYYY-MM-DD HH:mm"
            placeholder="请选择讨论开始时间"
            style="width: 100%"
            :disabled-date="disabledStartDate"
          />
        </a-form-item>
        <a-form-item label="持续时长（分钟）" name="duration_minutes" required>
          <a-input-number
            v-model:value="formData.duration_minutes"
            :min="1"
            :max="600"
            :step="5"
            style="width: 100%"
            placeholder="例如：40"
          />
        </a-form-item>
        <a-form-item label="分组方式" name="group_mode">
          <a-radio-group v-model:value="formData.group_mode">
            <a-radio value="size">按每组人数分组</a-radio>
            <a-radio value="count">按小组数量分组</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="formData.group_mode === 'size'"
          label="每组人数"
          name="group_size"
        >
          <a-input-number
            v-model:value="formData.group_size"
            :min="2"
            :max="20"
            style="width: 100%"
            placeholder="例如：4"
          />
        </a-form-item>
        <a-form-item v-else label="小组数量" name="group_count">
          <a-input-number
            v-model:value="formData.group_count"
            :min="2"
            :max="20"
            style="width: 100%"
            placeholder="例如：6"
          />
        </a-form-item>
        <a-alert
          type="info"
          show-icon
          message="发布后将立即对本班学生随机分组，每个讨论独立分组"
        />
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons-vue'
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
  getDiscussionEvaluationSummary,
  getDiscussionGroups
} from '@/api/discussion'

// 讨论内容轮询间隔：固定 3 秒
const POLL_INTERVAL = 3000

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
  topic: '',
  start_time: null,
  duration_minutes: 40,
  group_mode: 'size',
  group_size: 4,
  group_count: null
})

const expandedRowKeys = ref([])
const selectedDiscussion = ref(null)
const contentLoading = ref(false)
const contentError = ref('')
const discussionContents = ref([])
const evaluationLoading = ref(false)
const evaluationError = ref('')
const discussionEvaluations = ref([])
const evaluationSummary = ref(null)
const evaluationExpanded = ref(false)
const evaluationExporting = ref(false)
const replySubmitting = ref(false)
const deletingContentId = ref('')
const avatarUrlMap = ref({})
const avatarLoadingMap = ref({})
const replyForm = ref({ content: '' })

const mainContents = ref([])
const repliesMap = ref({})
const expandedReplies = ref(new Set())
const replyingToId = ref(null)
const replyInput = ref('')

const groups = ref([])
const activeGroupId = ref(null)
const groupLoading = ref(false)
const messageScrollRef = ref(null)
const nowTs = ref(Date.now())

let pollTimer = null

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

const activeGroup = computed(() => {
  return groups.value.find(group => String(group.id) === String(activeGroupId.value)) || null
})

const activeGroupMembers = computed(() => activeGroup.value?.members || [])

const columns = computed(() => {
  return [
    {
      title: '讨论主题',
      dataIndex: 'topic',
      key: 'topic',
      width: 280
    },
    {
      title: '讨论时间',
      key: 'time_range',
      width: 300
    },
    {
      title: '状态',
      key: 'status',
      width: 100
    },
    {
      title: '创建人',
      dataIndex: 'create_by',
      key: 'create_by',
      width: 110,
      responsive: ['sm']
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
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
      sorter: (a, b) => Number(a.total_score || 0) - Number(b.total_score || 0)
    }
  ]
})

const formRules = {
  topic: [
    { required: true, message: '请输入讨论主题', trigger: 'blur' },
    { max: 100, message: '讨论主题不能超过 100 个字符', trigger: 'blur' }
  ],
  start_time: [{ required: true, message: '请选择讨论开始时间', trigger: 'change' }],
  duration_minutes: [{ required: true, message: '请输入持续时长', trigger: 'blur' }]
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeDiscussion(item) {
  return {
    id: item?.id === undefined || item?.id === null ? '' : String(item.id),
    zl_class: item?.zl_class || '',
    topic: item?.topic || '',
    create_by: item?.create_by || '',
    start_time: item?.start_time || '',
    end_time: item?.end_time || '',
    duration_minutes: item?.duration_minutes ?? null,
    group_size: item?.group_size ?? null,
    group_count: item?.group_count ?? null,
    status: item?.status || ''
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
    group_id: item?.group_id === undefined || item?.group_id === null ? null : String(item.group_id),
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

function normalizeGroup(item) {
  return {
    id: item?.id === undefined || item?.id === null ? '' : String(item.id),
    discussion_id: item?.discussion_id === undefined || item?.discussion_id === null ? '' : String(item.discussion_id),
    group_no: Number(item?.group_no || 0),
    member_count: Number(item?.member_count || 0),
    members: Array.isArray(item?.members)
      ? item.members.map(member => ({
        user_id: String(member.user_id),
        user_name: member.user_name || '',
        avatar: member.avatar || ''
      }))
      : []
  }
}

function groupDiscussionContents(contents) {
  const mainContents = []
  const repliesMap = {}

  contents.forEach(item => {
    if (!item.quoted_content_id) {
      mainContents.push(item)
    } else {
      const quotedId = item.quoted_content_id
      if (!repliesMap[quotedId]) {
        repliesMap[quotedId] = []
      }
      repliesMap[quotedId].push(item)
    }
  })

  Object.keys(repliesMap).forEach(id => {
    repliesMap[id].sort((a, b) => new Date(a.create_time) - new Date(b.create_time))
  })

  return { mainContents, repliesMap }
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

function disabledStartDate(current) {
  return current && current < new Date(new Date().setHours(0, 0, 0, 0))
}

function getGroupConfigText(record) {
  if (record?.group_size) return `每组 ${record.group_size} 人`
  if (record?.group_count) return `${record.group_count} 个小组`
  return ''
}

function isDiscussionEnded(record) {
  // 依赖 nowTs 触发状态随时间推进而更新
  void nowTs.value
  const target = record || selectedDiscussion.value
  if (!target) return false
  if (target.status === 'ended') return true
  if (!target.end_time) return false
  const end = new Date(target.end_time)
  if (Number.isNaN(end.getTime())) return false
  return end.getTime() <= Date.now()
}

function isDiscussionNotStarted(record) {
  void nowTs.value
  if (!record?.start_time) return false
  const start = new Date(record.start_time)
  if (Number.isNaN(start.getTime())) return false
  return start.getTime() > Date.now()
}

function getStatusText(record) {
  if (isDiscussionEnded(record)) return '已截止'
  if (isDiscussionNotStarted(record)) return '未开始'
  return '进行中'
}

function getStatusColor(record) {
  if (isDiscussionEnded(record)) return 'default'
  if (isDiscussionNotStarted(record)) return 'orange'
  return 'green'
}

function canSpeak(record) {
  if (isTeacherOrAdmin.value) return false
  return !isDiscussionEnded(record)
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

function hasReplies(contentId) {
  return !!repliesMap.value[contentId] && repliesMap.value[contentId].length > 0
}

function getRepliesCount(contentId) {
  return repliesMap.value[contentId]?.length || 0
}

function getReplies(contentId) {
  return repliesMap.value[contentId] || []
}

function toggleReplies(contentId) {
  if (expandedReplies.value.has(contentId)) {
    expandedReplies.value = new Set([...expandedReplies.value].filter(id => id !== contentId))
  } else {
    expandedReplies.value = new Set([...expandedReplies.value, contentId])
  }
}

function isRepliesExpanded(contentId) {
  return expandedReplies.value.has(contentId)
}

function isAiReply(item) {
  return item.user === 'AI助手'
}

function startReply(contentId) {
  replyingToId.value = contentId
  replyInput.value = ''
}

function cancelReply() {
  replyingToId.value = null
  replyInput.value = ''
}

async function handleSubmitReply() {
  if (!selectedDiscussion.value?.id || !replyingToId.value) return

  const content = replyInput.value.trim()
  if (!content) {
    message.warning('请输入回复内容')
    return
  }

  replySubmitting.value = true

  try {
    const res = await createDiscussionContent({
      discussion_id: selectedDiscussion.value.id,
      content,
      quoted_content_id: replyingToId.value
    })

    if (res.code === 200) {
      message.success('回复成功')
      const repliedId = String(replyingToId.value)
      replyingToId.value = null
      replyInput.value = ''
      if (!expandedReplies.value.has(repliedId)) {
        expandedReplies.value = new Set([...expandedReplies.value, repliedId])
      }
      await fetchDiscussionContents()
      return
    }

    message.error(res.message || '回复失败')
  } catch (err) {
    console.error('回复失败:', err)
    message.error(err.message || '回复失败')
  } finally {
    replySubmitting.value = false
  }
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
      // 同步当前展开讨论的最新状态
      if (selectedDiscussion.value?.id) {
        const latest = discussions.value.find(item => item.id === selectedDiscussion.value.id)
        if (latest) {
          selectedDiscussion.value = latest
        }
      }
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

function applyContents(contents) {
  discussionContents.value = contents
  const { mainContents: groupedMain, repliesMap: groupedReplies } = groupDiscussionContents(contents)
  mainContents.value = groupedMain
  repliesMap.value = groupedReplies
  fetchContentAvatars(contents)
}

function getContentsSignature(contents) {
  if (contents.length === 0) return '0'
  return `${contents.length}-${contents[contents.length - 1]?.id || ''}`
}

async function fetchDiscussionContents() {
  if (!selectedDiscussion.value?.id) {
    discussionContents.value = []
    mainContents.value = []
    repliesMap.value = {}
    return
  }

  contentLoading.value = true
  contentError.value = ''

  try {
    const res = await getDiscussionContentsByDiscussionId(selectedDiscussion.value.id, activeGroupId.value)
    if (res.code === 200) {
      const contents = Array.isArray(res.data)
        ? res.data.map(normalizeDiscussionContent)
        : []
      applyContents(contents)
      await scrollToLatest()
      return
    }

    throw new Error(res.message || '获取讨论内容失败')
  } catch (err) {
    console.error('获取讨论内容失败:', err)
    contentError.value = err.message || '获取讨论内容失败'
    message.error(contentError.value)
    discussionContents.value = []
    mainContents.value = []
    repliesMap.value = {}
  } finally {
    contentLoading.value = false
  }
}

function getScrollElement() {
  const el = messageScrollRef.value
  if (!el) return null
  return el.$el || el
}

async function scrollToLatest() {
  await nextTick()
  const el = getScrollElement()
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}

/**
 * 静默轮询：每 3 秒拉取本组消息，只追加新消息并保持用户当前浏览位置。
 */
async function pollDiscussionContents() {
  nowTs.value = Date.now()

  if (!selectedDiscussion.value?.id || contentLoading.value) return

  const el = getScrollElement()
  const prevScrollTop = el ? el.scrollTop : 0
  const wasAtBottom = el ? (el.scrollHeight - el.scrollTop - el.clientHeight < 40) : true

  try {
    const res = await getDiscussionContentsByDiscussionId(selectedDiscussion.value.id, activeGroupId.value)
    if (res.code !== 200) return

    const contents = Array.isArray(res.data)
      ? res.data.map(normalizeDiscussionContent)
      : []

    if (getContentsSignature(contents) === getContentsSignature(discussionContents.value)) {
      return
    }

    applyContents(contents)
    await nextTick()
    const scrollEl = getScrollElement()
    if (!scrollEl) return
    // 看到底部时跟随最新消息，否则停留在上次所看消息的位置
    scrollEl.scrollTop = wasAtBottom ? scrollEl.scrollHeight : prevScrollTop
  } catch (err) {
    console.error('轮询讨论内容失败:', err)
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(pollDiscussionContents, POLL_INTERVAL)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function fetchGroups() {
  if (!selectedDiscussion.value?.id) {
    groups.value = []
    activeGroupId.value = null
    return
  }

  groupLoading.value = true

  try {
    const res = await getDiscussionGroups(selectedDiscussion.value.id)
    if (res.code === 200) {
      const groupList = Array.isArray(res.data) ? res.data.map(normalizeGroup) : []
      groups.value = groupList
      const existed = groupList.some(group => String(group.id) === String(activeGroupId.value))
      if (!existed) {
        activeGroupId.value = groupList[0]?.id ?? null
      }
      return
    }

    throw new Error(res.message || '获取分组信息失败')
  } catch (err) {
    console.error('获取分组信息失败:', err)
    groups.value = []
    activeGroupId.value = null
  } finally {
    groupLoading.value = false
  }
}

async function handleGroupChange() {
  await fetchDiscussionContents()
  await scrollToLatest()
}

async function fetchEvaluationSummary() {
  if (!selectedDiscussion.value?.id) {
    evaluationSummary.value = null
    return
  }

  try {
    const res = await getDiscussionEvaluationSummary(selectedDiscussion.value.id)
    if (res.code === 200) {
      evaluationSummary.value = res.data || null
      return
    }
    throw new Error(res.message || '获取讨论评价失败')
  } catch (err) {
    console.error('获取讨论评价失败:', err)
    evaluationSummary.value = null
    evaluationError.value = err.message || '获取讨论评价失败'
  }
}

async function fetchDiscussionEvaluations() {
  if (!isTeacherOrAdmin.value || !selectedDiscussion.value?.id) {
    discussionEvaluations.value = []
    return
  }

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
    discussionEvaluations.value = []
    evaluationError.value = err.message || '获取讨论评分失败'
  }
}

async function fetchEvaluationData() {
  evaluationLoading.value = true
  evaluationError.value = ''

  try {
    await fetchEvaluationSummary()
    await fetchDiscussionEvaluations()
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

  if (!evaluationSummary.value && !evaluationError.value) {
    await fetchEvaluationData()
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
    topic: '',
    start_time: null,
    duration_minutes: 40,
    group_mode: 'size',
    group_size: 4,
    group_count: null
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

  if (!formData.value.start_time) {
    message.warning('请选择讨论开始时间')
    return
  }

  if (!formData.value.duration_minutes) {
    message.warning('请输入持续时长')
    return
  }

  const isBySize = formData.value.group_mode === 'size'
  if (isBySize && !formData.value.group_size) {
    message.warning('请输入每组人数')
    return
  }

  if (!isBySize && !formData.value.group_count) {
    message.warning('请输入小组数量')
    return
  }

  saving.value = true

  try {
    const res = await createDiscussion({
      class_id: props.classId,
      topic,
      start_time: formData.value.start_time.format('YYYY-MM-DD HH:mm:ss'),
      duration_minutes: formData.value.duration_minutes,
      group_size: isBySize ? formData.value.group_size : null,
      group_count: isBySize ? null : formData.value.group_count
    })

    if (res.code === 200) {
      message.success('讨论创建成功，已完成随机分组')
      modalVisible.value = false
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
    evaluationSummary.value = null
    groups.value = []
    activeGroupId.value = null
    discussionContents.value = []
    mainContents.value = []
    repliesMap.value = {}
    expandedReplies.value = new Set()

    await fetchGroups()
    await fetchDiscussionContents()
    startPolling()
    return
  }

  closeExpandedDiscussion()
}

function toggleDiscussion(record) {
  handleExpand(!isExpanded(record), record)
}

function closeExpandedDiscussion() {
  stopPolling()
  expandedRowKeys.value = []
  selectedDiscussion.value = null
  contentError.value = ''
  evaluationError.value = ''
  discussionContents.value = []
  discussionEvaluations.value = []
  evaluationSummary.value = null
  evaluationExpanded.value = false
  mainContents.value = []
  repliesMap.value = {}
  expandedReplies.value = new Set()
  groups.value = []
  activeGroupId.value = null
  replyingToId.value = null
  replyInput.value = ''
  replyForm.value.content = ''
}

async function handleCreateContent() {
  if (!selectedDiscussion.value?.id) return

  if (isDiscussionEnded(selectedDiscussion.value)) {
    message.warning('讨论已截止，无法继续发言')
    return
  }

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

watch(() => props.classId, () => {
  closeExpandedDiscussion()
  fetchDiscussions()
})

onMounted(fetchDiscussions)

onBeforeUnmount(stopPolling)
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

.time-range {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  color: #595959;
  font-size: 13px;
}

.time-separator {
  color: #bfbfbf;
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

.group-section {
  padding: 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.group-radio {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.group-title-text {
  margin-bottom: 12px;
  color: #262626;
  font-size: 14px;
  font-weight: 600;
}

.group-members {
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

.evaluation-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.evaluation-card {
  padding: 12px 14px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.evaluation-card-self {
  background: #f0f7ff;
  border-color: #bfdbfe;
}

.evaluation-card-title {
  margin-bottom: 8px;
  color: #262626;
  font-size: 14px;
  font-weight: 600;
}

.evaluation-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #595959;
  font-size: 13px;
}

.evaluation-card-footer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e8e8e8;
  color: #1677ff;
  font-size: 13px;
  font-weight: 600;
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

.message-scroll {
  max-height: 460px;
  min-height: 160px;
  overflow-y: auto;
  padding-right: 4px;
}

.message-scroll :deep(.ant-spin) {
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

  .reply-input-actions {
    flex-direction: column;
    gap: 8px;
  }

  .reply-input-actions .ant-btn {
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

.replies-section {
  margin-top: 8px;
  padding-left: 24px;
}

.replies-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.replies-toggle {
  padding-left: 0;
  color: #1677ff;
  font-size: 13px;
}

.reply-btn {
  padding-left: 0;
  color: #52c41a;
  font-size: 13px;
}

.reply-input-area {
  padding: 10px 14px;
  margin-bottom: 8px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
}

.reply-input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.replies-panel {
  padding: 8px 0 0 0;
}

.reply-item {
  padding: 6px 0;
}

.reply-card {
  width: 100%;
  padding: 10px 14px;
  background: #fafafa;
  border-left: 3px solid #d9d9d9;
  border-radius: 4px;
}

.reply-card-ai {
  background: #f0f7ff;
  border-left-color: #1677ff;
}

.reply-card-ai .content-author {
  font-size: 14px;
  color: #1677ff;
}

.reply-tag {
  font-size: 11px;
  line-height: 16px;
  margin-left: 4px;
  padding: 0 4px;
}
</style>
