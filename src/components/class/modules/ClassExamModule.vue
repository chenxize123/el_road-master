<!--
 * @Date         : 2026-05-14 10:00:00
 * @Description  : 班级考试模块组件
 * @FilePath     : ClassExamModule.vue
 * @LastEditTime : 2026-06-09 20:32:00
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 * 2026-05-14 10:00:00
-->
<template>
  <div class="class-exam-module">
    <!-- 权限控制：教师和管理员可见操作栏 -->
    <div v-if="isTeacherOrAdmin" class="action-bar">
      <a-button
        :loading="multiExamExporting"
        :disabled="examList.length === 0"
        @click="handleOpenMultiExamExport"
      >
        <template #icon><DownloadOutlined /></template>
        导出多次成绩
      </a-button>
      <a-button type="primary" @click="handleCreate">
        <template #icon><plus-outlined /></template>
        新建考试
      </a-button>
    </div>

    <!-- 考试列表 -->
    <div v-if="loading" class="loading-container">
      <a-spin tip="加载考试列表中..." />
    </div>

    <div v-else-if="examList.length === 0" class="empty-container">
      <a-empty
        image="https://gw.alipay.com/minuscule/2.3.0/1676633489859-empty.svg"
        :image-style="{
          height: '60px',
        }"
        description="暂无考试数据"
      >
        <a-button v-if="isTeacherOrAdmin" type="primary" @click="handleCreate">
          创建第一个考试
        </a-button>
      </a-empty>
    </div>

    <a-table
      v-else
      :columns="columns"
      :data-source="examList"
      :pagination="pagination"
      row-key="id"
      :scroll="{ x: 1200 }"
    >
      <!-- 操作列 -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'actions'">
          <a-space>
            <!-- Student actions: check exam result status first -->
            <template v-if="!isTeacherOrAdmin">
              {{ printExamButtonParams(record) }}
              <a-spin v-if="examStatusLoading[record.id]" size="small" />
              <template v-else-if="examStatusError[record.id]">
                <a-button type="link" size="small" disabled>
                  加载失败
                </a-button>
              </template>
              <template v-else>
                <template v-if="getExamStatus(record) === 'ongoing'">
                  <!-- 考试进行中 -->
                  <a-button
                    v-if="!examResultMap[record.id]"
                    type="link"
                    size="small"
                    @click="handleTakeExam(record)"
                  >
                    去考试
                  </a-button>
                  <a-tooltip v-else title="考试结束后可查看结果">
                    <a-button type="link" size="small" disabled>
                      已交卷
                    </a-button>
                  </a-tooltip>
                </template>
                <template v-else-if="getExamStatus(record) === 'upcoming'">
                  <!-- 考试未开始 -->
                  <a-tooltip title="考试未开始">
                    <a-button type="link" size="small" disabled>
                      去考试
                    </a-button>
                  </a-tooltip>
                </template>
                <template v-else>
                  <!-- 考试已结束 -->
                  <a-button
                    type="link"
                    size="small"
                    @click="handleViewResult(record)"
                  >
                    查看结果
                  </a-button>
                </template>
              </template>
            </template>

            <!-- Edit/Delete buttons for teachers and admins -->
            <template v-if="isTeacherOrAdmin">
              <a-button type="link" size="small" @click="handleViewClassResult(record)">
                全班结果
              </a-button>
              <a-button type="link" size="small" @click="handleOpenClassReport(record)">
                班级报告
              </a-button>
              <template v-if="getExamStatus(record) === 'upcoming'">
                <a-button type="link" size="small" @click="handleStartNow(record)">
                  立即开始
                </a-button>
              </template>
              <template v-if="getExamStatus(record) === 'ongoing'">
                <a-button type="link" size="small" danger @click="handleEndNow(record)">
                  立即结束
                </a-button>
              </template>
              <a-button type="link" size="small" @click="handleEdit(record)">
                编辑
              </a-button>
              <a-popconfirm
                title="确定要删除这个考试吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDelete(record.id)"
              >
                <a-button type="link" size="small" danger>
                  删除
                </a-button>
              </a-popconfirm>
            </template>
          </a-space>
        </template>

        <template v-else-if="column.key === 'status'">
          <a-tag :color="getStatusColor(record)">
            {{ getStatusText(record) }}
          </a-tag>
        </template>
      </template>
    </a-table>

    <!-- 新建/编辑考试弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingRecord ? '编辑考试' : '新建考试'"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
      :confirmLoading="saving"
      width="800px"
    >
      <a-form :model="formData" layout="vertical" :rules="formRules" ref="formRef">
        <a-form-item label="考试标题" name="title" required>
          <a-input v-model:value="formData.title" placeholder="请输入考试标题" />
        </a-form-item>

        <a-form-item label="考试说明" name="description">
          <a-textarea
            v-model:value="formData.description"
            placeholder="请输入考试说明"
            :rows="3"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="考试时长(分钟)" name="total_duration" required>
              <a-input-number
                v-model:value="formData.total_duration"
                :min="1"
                :max="1440"
                placeholder="请输入考试时长"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="及格分数" name="passing_score" required>
              <a-input-number
                v-model:value="formData.passing_score"
                :min="0"
                :max="1000"
                placeholder="请输入及格分数"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="开始时间" name="start_time" required>
              <a-date-picker
                v-model:value="formData.start_time"
                show-time
                placeholder="请选择开始时间"
                style="width: 100%"
                :disabled-date="disabledStartDate"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="结束时间" name="end_time" required>
              <a-date-picker
                v-model:value="formData.end_time"
                show-time
                placeholder="请选择结束时间"
                style="width: 100%"
                :disabled-date="disabledEndDate"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="选择试卷" name="paper_id" required>
          <a-select
            v-model:value="formData.paper_id"
            placeholder="请选择试卷"
            :loading="paperLoading"
            @focus="loadPaperList"
          >
            <a-select-option
              v-for="item in paperList"
              :key="item.id"
              :value="item.id"
            >
              <div class="paper-option">
                <div class="paper-title">{{ item.title }}</div>
                <div class="paper-info">
                  <span>题目数: {{ item.total_question }}</span>
                  <span>总分: {{ item.total_score }}</span>
                  <span>创建人: {{ item.create_by }}</span>
                </div>
              </div>
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 全班考试结果抽屉 -->
    <a-modal
      v-model:open="multiExamExportVisible"
      title="导出多次考试成绩"
      ok-text="导出 Excel"
      cancel-text="取消"
      :confirm-loading="multiExamExporting"
      :ok-button-props="{ disabled: selectedExportExamIds.length === 0 }"
      @ok="handleExportMultiExamResults"
      @cancel="multiExamExportVisible = false"
      width="720px"
    >
      <a-form layout="vertical">
        <a-form-item label="选择考试">
          <a-select
            v-model:value="selectedExportExamIds"
            mode="multiple"
            allow-clear
            show-search
            placeholder="请选择要汇总导出的考试"
            :filter-option="filterExamOption"
            style="width: 100%"
          >
            <a-select-option
              v-for="exam in examList"
              :key="getExamId(exam)"
              :value="getExamId(exam)"
              :label="exam.title || `考试 ${getExamId(exam)}`"
            >
              {{ exam.title || `考试 ${getExamId(exam)}` }}
              <span class="exam-option-meta">
                {{ formatDateTime(exam.start_time) }} - {{ formatDateTime(exam.end_time) }}
              </span>
            </a-select-option>
          </a-select>
        </a-form-item>
        <div class="multi-export-summary">
          已选择 {{ selectedExportExamIds.length }} 次考试，将导出每名学生各次得分、状态、通过情况和汇总统计。
        </div>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:open="classResultDrawerVisible"
      title="全班考试结果"
      :width="drawerWidth"
      :z-index="1000"
      :root-style="{ zIndex: 1000 }"
      :closable="true"
      :destroy-on-close="false"
      @close="handleCloseClassResultDrawer"
    >
      <template #title>
        <div class="drawer-title">
          <span>全班考试结果 - {{ currentExamRecord?.title || '' }}</span>
        </div>
      </template>

      <!-- 加载状态 -->
      <div v-if="classResultLoading" class="loading-container">
        <a-spin tip="加载全班考试结果中..." />
      </div>

      <!-- 空状态 -->
      <div v-else-if="classResultList.length === 0" class="empty-container">
        <a-empty description="暂无考试结果" />
      </div>

      <!-- 结果内容 -->
      <div v-else>
        <!-- 统计信息 -->
        <div class="stats-container">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ classResultStats.total }}</div>
              <div class="stat-label">总人数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ classResultStats.submitted }}</div>
              <div class="stat-label">已交卷</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ classResultStats.autoSubmitted }}</div>
              <div class="stat-label">自动提交</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ classResultStats.absent }}</div>
              <div class="stat-label">缺考</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ classResultStats.averageScore }}</div>
              <div class="stat-label">平均分</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ classResultStats.maxScore }}</div>
              <div class="stat-label">最高分</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ classResultStats.minScore }}</div>
              <div class="stat-label">最低分</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ classResultStats.passRate }}%</div>
              <div class="stat-label">通过率</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ classResultStats.averageDuration }}</div>
              <div class="stat-label">平均用时(分钟)</div>
            </div>
          </div>

          <!-- 导出按钮容器 -->
          <div class="export-button-container">
            <a-button
              type="primary"
              :loading="exporting"
              @click="handleExportExcel"
              :disabled="classResultList.length === 0"
            >
              <template #icon><DownloadOutlined /></template>
              导出 Excel
            </a-button>
          </div>
        </div>

        <!-- 学生成绩表格 -->
        <div class="table-container">
          <a-table
            :columns="classResultColumns"
            :data-source="classResultList"
            :pagination="{ pageSize: 10 }"
            row-key="key"
            :scroll="{ x: 900 }"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">
                {{ index + 1 }}
              </template>
              <template v-else-if="column.key === 'student'">
                <div class="student-name-cell">
                  <div class="student-real-name">{{ getStudentDisplayInfo(record).real_name }}</div>
                  <div class="student-username">{{ getStudentDisplayInfo(record).username }}</div>
                </div>
              </template>
              <template v-else-if="column.key === 'score'">
                {{ record.score ?? '-' }}
              </template>
              <template v-else-if="column.key === 'duration'">
                {{ record.duration ?? '-' }} 分钟
              </template>
              <template v-else-if="column.key === 'submission_deadline'">
                {{ formatDateTime(record.submission_deadline) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="getSubmitStatusColor(record.status)">
                  {{ record.status === '未交卷' ? '自动提交' : (record.status || '-') }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'is_passing'">
                <a-tag :color="getPassingColor(record.is_passing)">
                  {{ record.is_passing || '-' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <a-button
                    type="link"
                    size="small"
                    @click="handleViewStudentDetail(record)"
                    :disabled="!record.question_result_list || record.question_result_list.length === 0"
                  >
                    查看答题明细
                  </a-button>
                  <a-button
                    type="link"
                    size="small"
                    @click="handleOpenStudentReport(record)"
                    :disabled="!record.student_id"
                  >
                    个人报告
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <a-button @click="handleCloseClassResultDrawer">
            关闭
          </a-button>
        </div>
      </template>
    </a-drawer>

    <!-- 学生答题明细抽屉 -->
    <a-drawer
      v-model:open="detailDrawerVisible"
      title="学生答题明细"
      width="800"
      :z-index="1100"
      :root-style="{ zIndex: 1100 }"
      :closable="true"
      @close="detailDrawerVisible = false"
    >
      <template #title>
        <div class="drawer-title">
          <span>答题明细 - {{ getStudentDisplayInfo(currentStudentResult).real_name }} ({{ getStudentDisplayInfo(currentStudentResult).username }})</span>
        </div>
      </template>

      <div v-if="!currentStudentResult" class="empty-container">
        <a-empty description="暂无答题明细" />
      </div>

      <div v-else-if="!currentStudentResult.question_result_list || currentStudentResult.question_result_list.length === 0" class="empty-container">
        <a-empty description="该学生暂无答题记录" />
      </div>

      <div v-else class="detail-container">
        <!-- 学生总体信息 -->
        <div class="student-summary">
          <div class="student-summary-actions">
            <a-button type="primary" ghost size="small" @click="handleOpenStudentReport(currentStudentResult)">
              查看个人报告
            </a-button>
          </div>
          <a-descriptions bordered :column="2">
            <a-descriptions-item label="学生">
              {{ getStudentDisplayInfo(currentStudentResult).real_name }} ({{ getStudentDisplayInfo(currentStudentResult).username }})
            </a-descriptions-item>
            <a-descriptions-item label="总分">
              {{ currentStudentResult.score ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="用时">
              {{ currentStudentResult.duration ?? '-' }} 分钟
            </a-descriptions-item>
            <a-descriptions-item label="提交时间">
              {{ formatDateTime(currentStudentResult.submission_deadline) }}
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-tag :color="getSubmitStatusColor(currentStudentResult.status)">
                {{ currentStudentResult.status || '-' }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="是否通过">
              <a-tag :color="getPassingColor(currentStudentResult.is_passing)">
                {{ currentStudentResult.is_passing || '-' }}
              </a-tag>
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <!-- 题目明细 -->
        <div class="questions-detail">
          <div class="section-title">答题明细</div>
          <div class="questions-list">
            <div
              v-for="(questionResult, index) in currentStudentResult.question_result_list"
              :key="index"
              class="question-item"
            >
              <div class="question-header">
                <span class="question-number">第 {{ index + 1 }} 题</span>
                <a-tag :color="questionResult.score > 0 ? 'green' : 'red'">
                  {{ questionResult.score > 0 ? '得分' : '未得分' }}
                </a-tag>
              </div>

              <div class="question-content">
                <div class="question-text">
                  <strong>题目内容：</strong>{{ questionResult.question?.question || '-' }}
                </div>

                <!-- 选择题选项 -->
                <div v-if="questionResult.question?.choose && questionResult.question.choose.length > 0" class="question-options">
                  <div class="options-label">选项：</div>
                  <div class="options-list">
                    <div
                      v-for="(option, optionIndex) in questionResult.question.choose"
                      :key="optionIndex"
                      class="option-item"
                    >
                      {{ String.fromCharCode(65 + optionIndex) }}. {{ option }}
                    </div>
                  </div>
                </div>

                <div class="answer-section">
                  <div class="answer-item">
                    <strong>学生答案：</strong>
                    <span class="answer-value">{{ formatAnswer(questionResult.question?.user_response) }}</span>
                  </div>
                  <div class="answer-item">
                    <strong>正确答案：</strong>
                    <span class="answer-value">{{ formatAnswer(questionResult.question?.answer) }}</span>
                  </div>
                  <div class="answer-item">
                    <strong>本题得分：</strong>
                    <span class="score-value">{{ questionResult.score ?? 0 }}</span>
                  </div>
                </div>

                <div v-if="questionResult.question?.analysis" class="analysis-section">
                  <strong>解析：</strong>
                  <div class="analysis-content">{{ questionResult.question.analysis }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-drawer>

    <!-- 考试分析报告抽屉 -->
    <a-drawer
      v-model:open="reportDrawerVisible"
      :title="reportTitle"
      :width="reportDrawerWidth"
      :z-index="3000"
      :root-style="{ zIndex: 3000 }"
      :closable="true"
      @close="handleCloseReportDrawer"
    >
      <template #extra>
        <a-button type="primary" :disabled="!reportContent" @click="downloadReportWord">
          下载 Word
        </a-button>
      </template>
      <div v-if="reportLoading" class="loading-container">
        <a-spin tip="正在获取考试分析报告，首次生成可能需要较长时间..." />
      </div>
      <a-result v-else-if="reportError" status="error" title="报告加载失败" :sub-title="reportError">
        <template #extra>
          <a-button type="primary" @click="retryReportRequest">重试</a-button>
        </template>
      </a-result>
      <div v-else-if="reportContent" class="report-content markdown-body" v-html="renderedReportContent"></div>
      <a-empty v-else description="暂无报告内容" />
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import { useUserStore } from '@/store'
import {
  getExamListByClassId,
  createExam,
  updateExam,
  deleteExam,
  getExamResultMe,
  getExamResultAll
} from '@/api/exam'
import {
  getExamPaperList
} from '@/api/examPaper'
import {
  getCourseByClassIdApi,
  getUsersByClassId
} from '@/api/course'
import {
  getExamReportByExamAndClass,
  getExamReportByExamAndUser
} from '@/api/examReport'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const props = defineProps({
  classId: {
    type: [String, Number],
    required: true
  }
})

const courseId = ref(null)
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)

// 窗口大小变化监听
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

// 响应式抽屉宽度
const drawerWidth = computed(() => {
  if (windowWidth.value <= 480) return '100%'
  if (windowWidth.value <= 768) return '92%'
  if (windowWidth.value <= 1200) return '86%'
  return 1000
})

const reportDrawerWidth = computed(() => {
  if (windowWidth.value <= 480) return '100%'
  if (windowWidth.value <= 768) return '92%'
  return 820
})

// 权限判断
const isTeacherOrAdmin = computed(() => {
  const role = userStore.userInfo?.user_type
  return role === 'teacher' || role === 'admin'
})

// 统计信息计算 (已优化为基于标准状态)
// 统计信息计算 (已针对最新的“自动提交”与“缺考”映射完成同步优化)
const classResultStats = computed(() => {
  // 获取班级总人数
  const total = classStudentList.value.length || classResultList.value.length
  
  let submitted = 0      // 手动已交卷人数
  let autoSubmitted = 0  // 自动提交人数
  let notSubmitted = 0   // 未交卷人数（即考试进行中、正在答题的人数）
  let absent = 0         // 缺考人数
  let passed = 0         // 通过考试的总人数

  const validScores = []
  const validDurations = []

  classResultList.value.forEach(item => {
    console.log( classResultList.value.indexOf(item) + item.status)
    // 1. 精准分类计数
    // console.error(item.status)
    if (item.status === '已交卷' || item.status == "自动提交") {submitted++}
    // else if (item.status === '自动提交') autoSubmitted++
    if (item.status === '未交卷' || item.status === "自动提交") {
      // console.error("自动提交")
      autoSubmitted++
    }
    else if (item.score === null) {
      console.log("未参与")
      notSubmitted++
      absent++
    }
    // else if (item.status ===  null ) notSubmitted++

    // 2. 分数和通过率统计（只有真正参与且完成考试的“已交卷”和“自动提交”才记录分数和用时）
    if (item.status === '已交卷' || item.status === '未交卷' || item.status === "自动提交") {
      // 健壮性优化：兼容后端返回的 '已通过' 文本、布尔值 true 或字符串 "true"
      if (item.is_passing === '已通过' || item.is_passing === true || String(item.is_passing) === 'true') {
        passed++
      }

      // 记录有效成绩用于计算均分、最高/最低分
      if (typeof item.score === 'number' && !isNaN(item.score)) {
        validScores.push(item.score)
      }
      // 记录有效时间用于计算平均用时
      if (typeof item.duration === 'number' && !isNaN(item.duration)) {
        validDurations.push(item.duration)
      }
    }
  })
  console.log(submitted, autoSubmitted, notSubmitted, absent, passed)
  // 3. 通过率分母动态优化：
  // 考试未结束时：分母排除掉还在答题的“未交卷”人数（即：已交卷 + 自动提交 + 缺考）
  // 考试已结束时：所有“未交卷”已在数据流中被自动洗成了“自动提交”或“缺考”，notSubmitted 归零，分母完美等于全班总人数(total)
  const totalEvaluated = total - notSubmitted
  const passRate = totalEvaluated > 0 ? ((passed / totalEvaluated) * 100).toFixed(1) : 0

  // 4. 计算分数综合指标
  const averageScore = validScores.length > 0
    ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : '-'
  const maxScore = validScores.length > 0 ? Math.max(...validScores) : '-'
  const minScore = validScores.length > 0 ? Math.min(...validScores) : '-'

  // 5. 计算平均作答用时
  const averageDuration = validDurations.length > 0
    ? (validDurations.reduce((a, b) => a + b, 0) / validDurations.length).toFixed(1) : '-'

  return {
    total,
    submitted,
    notSubmitted,
    autoSubmitted,
    absent,
    passed,
    averageScore,
    maxScore,
    minScore,
    averageDuration,
    passRate
  }
})

// 状态
const loading = ref(false)
const saving = ref(false)
const examList = ref([])
const modalVisible = ref(false)
const editingRecord = ref(null)
const paperLoading = ref(false)

// 考试结果状态管理
const examResultMap = ref({}) // 存储考试结果 { examId: resultData }
const examStatusLoading = ref({}) // 存储加载状态 { examId: boolean }
const examStatusError = ref({}) // 存储错误状态 { examId: boolean }

// 班级相关数据
const classResultDrawerVisible = ref(false)
const classResultLoading = ref(false)
const currentExamRecord = ref(null)
const classResultList = ref([])     // 班级考试结果列表
const classStudentList = ref([])      // 新增：班级学生列表
const rawClassResultList = ref([])    // 新增：原始考试结果
const detailDrawerVisible = ref(false)
const currentStudentResult = ref(null)
const exporting = ref(false)
const multiExamExportVisible = ref(false)
const multiExamExporting = ref(false)
const selectedExportExamIds = ref([])
const reportDrawerVisible = ref(false)
const reportLoading = ref(false)
const reportError = ref('')
const reportContent = ref(null)
const reportTitle = ref('考试分析报告')
const lastReportRequest = ref(null)

// 表单数据和引用
const formRef = ref(null)
const formData = ref({
  title: '',
  description: '',
  total_duration: undefined,
  passing_score: undefined,
  start_time: null,
  end_time: null,
  paper_id: undefined
})

// 试卷列表
const paperList = ref([])

// 分页配置
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

// 表格列配置
const columns = [
  {
    title: '考试名称',
    dataIndex: 'title',
    key: 'title'
  },
  {
    title: '考试描述',
    dataIndex: 'description',
    key: 'description'
  },
  {
    title: '考试时长',
    dataIndex: 'total_duration',
    key: 'total_duration',
    customRender: ({ text }) => `${text}分钟`
  },
  {
    title: '及格分数',
    dataIndex: 'passing_score',
    key: 'passing_score'
  },
  {
    title: '开始时间',
    dataIndex: 'start_time',
    key: 'start_time',
    customRender: ({ text }) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
  },
  {
    title: '结束时间',
    dataIndex: 'end_time',
    key: 'end_time',
    customRender: ({ text }) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
  },
  {
    title: '创建人',
    dataIndex: 'create_by',
    key: 'create_by',
    width: 100
  },
  {
    title: '试卷',
    dataIndex: 'paper',
    key: 'paper'
  },
  {
    title: '系统状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    customRender: ({ text }) => {
      const color = text === '教师无效' ? 'error' : 'default'
      return h('a-tag', { color }, () => text)
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right'
  }
]

// 全班结果表格列配置
const classResultColumns = [
  {
    title: '序号',
    key: 'index',
    width: 80,
    align: 'center'
  },
  {
    title: '学生',
    key: 'student',
    dataIndex: 'student_name',
    width: 150
  },
  {
    title: '得分',
    key: 'score',
    dataIndex: 'score',
    width: 80,
    sorter: (a, b) => (a.score ?? 0) - (b.score ?? 0),
    align: 'center'
  },
  {
    title: '用时',
    key: 'duration',
    dataIndex: 'duration',
    width: 100,
    sorter: (a, b) => (a.duration ?? 0) - (b.duration ?? 0),
    align: 'center'
  },
  {
    title: '提交时间',
    key: 'submission_deadline',
    dataIndex: 'submission_deadline',
    width: 160,
    sorter: (a, b) => {
      const t1 = a.submission_deadline ? dayjs(a.submission_deadline).unix() : 0
      const t2 = b.submission_deadline ? dayjs(b.submission_deadline).unix() : 0
      return t1 - t2
    }
  },
  {
    title: '交卷状态',
    key: 'status',
    dataIndex: 'status',
    width: 120,
    filters: [
      { text: '已交卷', value: '已交卷' },
      // { text: '自动提交', value: '自动提交' },
      { text: '未交卷', value: '自动提交' },
      { text: '未参加', value: '缺考' }
    ],
    onFilter: (value, record) => {
      // 数据已被清洗为标准状态，直接等值判断即可
      return record.status === value
    },
    align: 'center'
  },
  {
    title: '是否通过',
    key: 'is_passing',
    dataIndex: 'is_passing',
    width: 100,
    filters: [
      { text: '已通过', value: '已通过' },
      { text: '未通过', value: '未通过' }
    ],
    onFilter: (value, record) => record.is_passing === value,
    align: 'center'
  },
  {
    title: '操作',
    key: 'actions',
    width: 190,
    fixed: 'right',
    align: 'center'
  }
]

// 表单验证规则
const formRules = {
  title: [{ required: true, message: '请输入考试标题', trigger: 'blur' }],
  total_duration: [{ required: true, message: '请输入考试时长', trigger: 'blur' }],
  passing_score: [{ required: true, message: '请输入及格分数', trigger: 'blur' }],
  start_time: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  end_time: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  paper_id: [{ required: true, message: '请选择试卷', trigger: 'change' }]
}

// 获取课程信息
const fetchCourseInfo = async () => {
  try {
    const res = await getCourseByClassIdApi(props.classId)
    if (res.code === 200 && res.data) {
      courseId.value = res.data.id
      console.log('获取课程信息成功:', res.data)
    } else {
      message.error(res.message || '获取课程信息失败')
    }
  } catch (err) {
    console.error('获取课程信息失败:', err)
    message.error('获取课程信息失败')
  }
}

// 获取考试列表
const fetchExamList = async () => {
  loading.value = true
  try {
    const res = await getExamListByClassId(props.classId)
    if (res.code === 200) {
      examList.value = Array.isArray(res.data) ? res.data : []
      pagination.value.total = examList.value.length

      // 对于学生用户，获取每个考试的参加状态
      if (!isTeacherOrAdmin.value && userStore.isAuthenticated) {
        fetchAllExamStatuses()
      }
    } else {
      message.error(res.message || '获取考试列表失败')
    }
  } catch (err) {
    console.error('获取考试列表失败:', err)
    message.error('获取考试列表失败')
  } finally {
    loading.value = false
  }
}

// 获取所有考试的状态
const fetchAllExamStatuses = async () => {
  if (!examList.value.length) return

  // 并发获取所有考试状态
  const promises = examList.value.map(exam => fetchExamStatus(exam.id))
  await Promise.allSettled(promises)
}

// 新增：核心状态转换函数（结合考试时间与作答痕迹）
// 核心状态转换函数（映射后端未交卷状态）
function getStandardStatus(record, examRecord = currentExamRecord.value) {
  if (!record) return '缺考'

  const rawStatus = record.status

  // 1. 明确已交卷 (学生手动点击了交卷)
  if (rawStatus === '已交卷') {
    return '已交卷'
  }

  // 2. 状态为 "未交卷" 或 null（无状态）
  if (rawStatus === '未交卷' || rawStatus === null || rawStatus === undefined) {
    const endTime = examRecord?.end_time
    const isExamEnded = endTime ? dayjs().isAfter(dayjs(endTime)) : false

    if (isExamEnded) {
      // 【考试已结束】
      // 如果有成绩，说明他答了题但没点交卷按钮，系统时间到了，映射为 "自动提交"
      // 如果完全没成绩，映射为 "缺考"
      return record.score !== null ? '自动提交' : '缺考'
    } else {
      // 【考试未结束】
      // 还在考试时间内，正常显示 "未交卷"
      return '未交卷'
    }
  }

  // 兜底逻辑
  return '缺考'
}

// 获取单个考试的状态
const fetchExamStatus = async (examId) => {
  examStatusLoading.value[examId] = true
  examStatusError.value[examId] = false

  try {
    const res = await getExamResultMe(examId)
    console.log('获取考试状态后端完整返回:', res)
    console.log('获取考试状态成功:', res.data)
    if (res.code === 200 && res.data?.score !== null && res.data?.score !== undefined) {
      examResultMap.value[examId] = res.data
    } else {
      examResultMap.value[examId] = null
    }
  } catch (err) {
    console.error(`获取考试 ${examId} 状态失败:`, err)
    examStatusError.value[examId] = true
    examResultMap.value[examId] = null
  } finally {
    examStatusLoading.value[examId] = false
  }
}

// 打印考试按钮相关参数（调试用）
const printExamButtonParams = (record) => {
  const examStatus = getExamStatus(record)
  const hasResult = !!examResultMap.value[record.id]
  const isLoading = !!examStatusLoading.value[record.id]
  const hasError = !!examStatusError.value[record.id]

  console.log('========== "去考试"按钮参数 ==========')
  console.log('考试ID:', record.id)
  console.log('考试标题:', record.title)
  console.log('isTeacherOrAdmin:', isTeacherOrAdmin.value)
  console.log('考试状态 (getExamStatus):', examStatus)
  console.log('开始时间:', record.start_time)
  console.log('结束时间:', record.end_time)
  console.log('当前时间:', dayjs().format('YYYY-MM-DD HH:mm:ss'))
  console.log('examResultMap[record.id]:', examResultMap.value[record.id])
  console.log('hasResult (是否已有结果):', hasResult)
  console.log('examStatusLoading:', isLoading)
  console.log('examStatusError:', hasError)
  console.log('按钮应该显示:', !isTeacherOrAdmin.value && examStatus === 'ongoing' && !hasResult && !isLoading && !hasError ? '去考试' : '不显示/其他按钮')
  console.log('=====================================')
}

// 查看考试结果
const handleViewResult = (record) => {
  console.log('点击查看结果，record:', record)
  router.push({
    path: `/exam/result/${record.id}`,
    query: { classId: normalizeId(props.classId) }
  })
}

// 加载试卷列表
const loadPaperList = async () => {
  if (paperList.value.length > 0) return

  // 确保课程ID已获取
  if (!courseId.value) {
    await fetchCourseInfo()
  }

  paperLoading.value = true
  try {
    const res = await getExamPaperList(courseId.value)
    if (res.code === 200) {
      paperList.value = Array.isArray(res.data) ? res.data : []
    } else {
      message.error(res.message || '获取试卷列表失败')
    }
  } catch (err) {
    console.error('获取试卷列表失败:', err)
    message.error('获取试卷列表失败')
  } finally {
    paperLoading.value = false
  }
}

// 日期选择禁用规则
const disabledStartDate = (current) => {
  if (!current) return false
  if (formData.value.end_time) {
    return current.isAfter(formData.value.end_time)
  }
  return false
}

const disabledEndDate = (current) => {
  if (!current) return false
  if (formData.value.start_time) {
    return current.isBefore(formData.value.start_time)
  }
  return false
}

// 获取考试状态
const getStatusColor = (record) => {
  const now = dayjs()
  const start = dayjs(record.start_time)
  const end = dayjs(record.end_time)

  if (now.isBefore(start)) {
    return 'default' // 未开始
  } else if (now.isAfter(end)) {
    return 'error' // 已结束
  } else {
    return 'processing' // 进行中
  }
}

const getStatusText = (record) => {
  const now = dayjs()
  const start = dayjs(record.start_time)
  const end = dayjs(record.end_time)

  if (now.isBefore(start)) {
    return '未开始'
  } else if (now.isAfter(end)) {
    return '已结束'
  } else {
    return '进行中'
  }
}

// 获取考试状态（用于条件判断）
const getExamStatus = (record) => {
  const now = dayjs()
  const start = dayjs(record.start_time)
  const end = dayjs(record.end_time)

  if (now.isBefore(start)) {
    return 'upcoming'
  } else if (now.isAfter(end)) {
    return 'ended'
  } else {
    return 'ongoing'
  }
}

// 处理参加考试
const handleTakeExam = (record) => {
  console.log('点击去考试，record:', record)
  console.log('当前用户信息:', userStore.userInfo)
  router.push(`/exam/take/${record.id}`)
}

// 新建考试
const handleCreate = () => {
  editingRecord.value = null
  formData.value = {
    title: '',
    description: '',
    total_duration: undefined,
    passing_score: undefined,
    start_time: null,
    end_time: null,
    paper_id: undefined
  }
  modalVisible.value = true
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 编辑考试
const handleEdit = (record) => {
  editingRecord.value = record
  formData.value = {
    title: record.title || '',
    description: record.description || '',
    total_duration: record.total_duration || undefined,
    passing_score: record.passing_score || undefined,
    start_time: record.start_time ? dayjs(record.start_time) : null,
    end_time: record.end_time ? dayjs(record.end_time) : null,
    paper_id: record.paper_id || undefined
  }
  modalVisible.value = true
  console.log('点击编辑，record:', formData.value)
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 立即开始考试
const handleStartNow = async (record) => {
  try {
    const now = dayjs()
    const requestData = {
      id: record.id,
      title: record.title,
      total_duration: Number(record.total_duration),
      passing_score: Number(record.passing_score),
      description: record.description,
      start_time: now.format('YYYY-MM-DD HH:mm:ss'),
      end_time: record.end_time,
      class_id: props.classId,
      paper_id: record.paper_id
    }
    const res = await updateExam(requestData)
    if (res.code === 200) {
      message.success('考试已开始')
      fetchExamList()
    } else {
      message.error(res.message || '操作失败')
    }
  } catch (err) {
    console.error('操作失败:', err)
    message.error('操作失败')
  }
}

// 立即结束考试
const handleEndNow = async (record) => {
  try {
    const now = dayjs()
    const requestData = {
      id: record.id,
      title: record.title,
      total_duration: Number(record.total_duration),
      passing_score: Number(record.passing_score),
      description: record.description,
      start_time: record.start_time,
      end_time: now.format('YYYY-MM-DD HH:mm:ss'),
      class_id: props.classId,
      paper_id: record.paper_id
    }
    const res = await updateExam(requestData)
    if (res.code === 200) {
      message.success('考试已结束')
      fetchExamList()
    } else {
      message.error(res.message || '操作失败')
    }
  } catch (err) {
    console.error('操作失败:', err)
    message.error('操作失败')
  }
}

// 删除考试
const handleDelete = async (id) => {
  try {
    const res = await deleteExam(id)
    if (res.code === 200) {
      message.success('删除成功')
      fetchExamList()
    } else {
      message.error(res.message || '删除失败')
    }
  } catch (err) {
    console.error('删除失败:', err)
    message.error('删除失败')
  }
}

// 弹窗确认
const handleModalOk = async () => {
  try {
    await formRef.value.validate()
  } catch (error) {
    return
  }

  if (formData.value.start_time && formData.value.end_time) {
    if (formData.value.end_time.isBefore(formData.value.start_time)) {
      message.warning('结束时间必须晚于开始时间')
      return
    }
  }

  saving.value = true
  try {
    console.log('元素提交数据:', formData.value)
    const requestData = {
      title: formData.value.title,
      total_duration: Number(formData.value.total_duration),
      passing_score: Number(formData.value.passing_score),
      description: formData.value.description,
      start_time: formData.value.start_time ? formData.value.start_time.format('YYYY-MM-DD HH:mm:ss') : null,
      end_time: formData.value.end_time ? formData.value.end_time.format('YYYY-MM-DD HH:mm:ss') : null,
      class_id: props.classId, // 自动绑定当前班级
      paper_id: formData.value.paper_id
    }
    console.log('提交数据:', requestData)
    let res
    if (editingRecord.value) {
      res = await updateExam({ ...requestData, id: editingRecord.value.id })
    } else {
      res = await createExam(requestData)
    }

    if (res.code === 200) {
      message.success(editingRecord.value ? '更新成功' : '考试创建成功')
      modalVisible.value = false
      fetchExamList()
    } else {
      message.error(res.message || '操作失败')
    }
  } catch (err) {
    console.error('操作失败:', err)
    message.error('操作失败')
  } finally {
    saving.value = false
  }
}

// 弹窗取消
const handleModalCancel = () => {
  modalVisible.value = false
  editingRecord.value = null
  formData.value = {
    title: '',
    description: '',
    total_duration: undefined,
    passing_score: undefined,
    start_time: null,
    end_time: null,
    paper_id: undefined
  }
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 工具函数：归一化ID（处理大整数精度问题）
function normalizeId(id) {
  if (id === null || id === undefined) return ''
  return String(id)
}

function normalizeExamResultRecord(record) {
  if (!record || typeof record !== 'object') return record

  const normalizedRecord = { ...record }
  const normalizedStudentId = normalizeId(extractStudentId(record))

  if (normalizedStudentId) {
    normalizedRecord.student_id = normalizedStudentId
  }

  return normalizedRecord
}

// 工具函数：提取学生ID（兼容多种字段名）
function extractStudentId(record) {
  return (
    record?.student_id ??
    record?.studentId ??
    record?.user_id ??
    record?.userId ??
    record?.student?.id ??
    record?.user?.id ??
    ''
  )
}

// 工具函数：格式化答案显示
function formatAnswer(value) {
  if (value === true) return '正确'
  if (value === false) return '错误'
  if (value === '' || value === null || value === undefined) return '未作答'
  return String(value)
}

// 工具函数：合并学生列表和考试结果（已注入最新混合状态判定）
function mergeStudentsWithResults(students, results) {
  const resultMap = new Map()
  let hasStudentIds = false

  results.forEach(result => {
    const studentId = normalizeId(extractStudentId(result))
    if (studentId) {
      resultMap.set(studentId, result)
      hasStudentIds = true
    }
  })

  const usedResultIds = new Set()

  const merged = students.map((student) => {
    const studentId = normalizeId(student.id)
    let result = null

    if (hasStudentIds) {
      result = resultMap.get(studentId)
      if (result) usedResultIds.add(studentId)
    }

    const questionResultList = result?.question_result_list || []
    
    // 【核心清洗点 1】：获取标准化后的 4 种中文字符串
    const status = getStandardStatus(result);

    return {
      key: studentId,
      student_id: studentId,
      username: student.username || '-',
      real_name: student.real_name || student.username || '-',
      student,
      result,
      score: result?.score ?? null,
      duration: result?.duration ?? null,
      submission_deadline: result?.submission_deadline ?? null,
      status: status, // 存入标准状态，供表格和过滤直接使用
      absent: status === '缺考',
      is_passing: result?.is_passing ?? '-',
      question_result_list: questionResultList
    }
  })

  if (hasStudentIds) {
    results.forEach((result, index) => {
      const studentId = normalizeId(extractStudentId(result))
      if (!studentId || usedResultIds.has(studentId)) return

      const questionResultList = result?.question_result_list || []
      
      // 【核心清洗点 2】：处理未在学生列表中的异常结果
      const status = getStandardStatus(result);

      merged.push({
        key: `unknown-${studentId || index}`,
        student_id: studentId || '-',
        username: '-',
        real_name: '未知学生',
        student: null,
        result,
        score: result?.score ?? null,
        duration: result?.duration ?? null,
        submission_deadline: result?.submission_deadline ?? null,
        status: status,
        absent: status === '缺考',
        is_passing: result?.is_passing ?? '-',
        question_result_list: questionResultList
      })
    })
  }

  return merged
}

// 工具函数：获取学生显示信息
const getStudentDisplayInfo = (record) => {
  if (!record) {
    return { real_name: '未知学生', username: '-' }
  }

  // 优先使用合并后的数据
  if (record.real_name || record.username) {
    return {
      real_name: record.real_name || '未知学生',
      username: record.username || '-'
    }
  }

  // 兼容旧格式
  const nameFields = ['student_name', 'name']
  for (const field of nameFields) {
    if (record[field]) {
      return { real_name: record[field], username: '-' }
    }
  }

  return { real_name: '未知学生', username: '-' }
}

// 保留原函数用于向后兼容
const getStudentDisplayName = (record) => {
  const info = getStudentDisplayInfo(record)
  return info.real_name
}

// 工具函数：格式化日期时间
function formatDateTime(value) {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss')
}

function unwrapReportData(response) {
  const data = response?.data ?? response
  if (data && typeof data === 'object') {
    return data.content ?? data.report_content ?? data.report ?? data.analysis ?? data
  }
  return data
}

const reportContentText = computed(() => {
  const content = reportContent.value
  if (content === null || content === undefined || content === '') return ''
  if (typeof content === 'string') return content
  return JSON.stringify(content, null, 2)
})

const renderedReportContent = computed(() => renderMarkdown(reportContentText.value))

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
  return String(value || '考试分析报告')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 80)
}

function getExamId(exam) {
  return normalizeId(exam?.id ?? exam?.exam_id)
}

function getExamTitle(exam, index = 0) {
  return exam?.title || `考试${index + 1}`
}

function filterExamOption(input, option) {
  const label = String(option?.label || '')
  return label.toLowerCase().includes(String(input).toLowerCase())
}

function isPassedValue(value) {
  if (value === true) return true
  const text = String(value ?? '').toLowerCase()
  if (text === 'true' || text === '1') return true
  return text.includes('通过') && !text.includes('未')
}

function isSubmittedStatus(status) {
  if (!status) return false
  const text = String(status)
  return text.includes('已交卷') || text.includes('自动提交')
}

function getSafeSheetName(name) {
  return String(name || '成绩汇总').replace(/[\\/?*[\]:]/g, '_').slice(0, 31)
}

function generateMultiExamFileName() {
  const timeStr = dayjs().format('YYYYMMDD_HHmm')
  return `多次考试成绩汇总_${timeStr}.xlsx`
}

// 工具函数：获取通过状态颜色
function getPassingColor(value) {
  if (value === '已通过') return 'green'
  if (value === '未通过') return 'red'
  return 'default'
}

// 工具函数：获取提交状态颜色
function getSubmitStatusColor(value) {
  if (value === '已交卷') return 'green'
  if (value === '自动提交' || value === '未交卷') return 'blue'
  // if (value === '未交卷') return 'orange'
  if (value === '缺考' || value === '未参与') return 'default'
  return 'default'
}

// 查看全班结果
const handleViewClassResult = async (record) => {
  currentExamRecord.value = record
  classResultDrawerVisible.value = true
  classResultLoading.value = true

  try {
    // 并发请求班级学生列表和考试结果
    const [studentsRes, resultsRes] = await Promise.all([
      getUsersByClassId(props.classId),
      getExamResultAll(record.id || record.exam_id)
    ])

    // 过滤只保留学生
    const students = Array.isArray(studentsRes?.data)
      ? studentsRes.data.filter(item => item.user_type === 'student')
      : []

    const results = Array.isArray(resultsRes?.data)
      ? resultsRes.data.map(normalizeExamResultRecord)
      : []

    classStudentList.value = students
    rawClassResultList.value = results
    classResultList.value = mergeStudentsWithResults(students, results)
  } catch (error) {
    console.error('获取全班考试结果失败:', error)
    message.error('获取全班考试结果失败')
    classResultList.value = []
  } finally {
    classResultLoading.value = false
  }
}

// 关闭全班结果抽屉
const handleCloseClassResultDrawer = () => {
  classResultDrawerVisible.value = false
  detailDrawerVisible.value = false
  currentStudentResult.value = null
}

// 查看学生答题明细
const handleViewStudentDetail = (record) => {
  currentStudentResult.value = record
  detailDrawerVisible.value = true
}

// 工具函数：生成文件名
function generateFileName() {
  const examTitle = currentExamRecord.value?.title || '考试'
  // 去除文件名中的非法字符
  const safeTitle = examTitle.replace(/[\/\\:*?"<>|]/g, '_')
  const timeStr = dayjs().format('YYYYMMDD_HHmm')
  return `${safeTitle}_成绩表_${timeStr}.xlsx`
}

// 工具函数：准备导出数据
function prepareExportData() {
  const headers = ['序号', '学生姓名', '学号', '得分', '用时(分钟)', '提交时间', '交卷状态', '是否通过']
  const rows = classResultList.value.map((record, index) => [
    index + 1,
    record.real_name || '-',
    record.username || '-',
    record.score ?? '-',
    record.duration ?? '-',
    formatDateTime(record.submission_deadline),
    record.status || '-',
    record.is_passing || '-'
  ])
  return [headers, ...rows]
}

// 导出 Excel 函数
const handleExportExcel = async () => {
  if (classResultList.value.length === 0) {
    return
  }

  exporting.value = true
  try {
    // 准备数据
    const data = prepareExportData()
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '成绩表')

    // 调整列宽
    worksheet['!cols'] = [
      { wch: 8 },   // 序号
      { wch: 15 },  // 学生姓名
      { wch: 15 },  // 学号
      { wch: 10 },  // 得分
      { wch: 12 },  // 用时
      { wch: 20 },  // 提交时间
      { wch: 12 },  // 交卷状态
      { wch: 12 }   // 是否通过
    ]

    // 下载文件
    XLSX.writeFile(workbook, generateFileName())
  } catch (error) {
    console.error('导出 Excel 失败:', error)
  } finally {
    exporting.value = false
  }
}

async function loadReport(requestConfig) {
  lastReportRequest.value = requestConfig
  reportDrawerVisible.value = true
  reportLoading.value = true
  reportError.value = ''
  reportContent.value = null

  try {
    const res = requestConfig.type === 'class'
      ? await getExamReportByExamAndClass(requestConfig.examId, requestConfig.classId)
      : await getExamReportByExamAndUser(requestConfig.examId, requestConfig.userId)

    if (res?.code && res.code !== 200) {
      reportError.value = res.message || '获取考试分析报告失败'
      return
    }

    reportContent.value = unwrapReportData(res)
  } catch (error) {
    console.error('获取考试分析报告失败:', error)
    reportError.value = error.message || '获取考试分析报告失败'
  } finally {
    reportLoading.value = false
  }
}

function handleOpenClassReport(record) {
  const examId = normalizeId(record?.id ?? record?.exam_id)
  const classId = normalizeId(props.classId)
  if (!examId || !classId) {
    message.warning('缺少考试或班级信息')
    return
  }

  reportTitle.value = `班级考试分析报告 - ${record?.title || ''}`
  loadReport({ type: 'class', examId, classId })
}

function handleOpenStudentReport(record) {
  const examId = normalizeId(currentExamRecord.value?.id ?? currentExamRecord.value?.exam_id)
  const userId = normalizeId(record?.student_id ?? extractStudentId(record))
  if (!examId || !userId) {
    message.warning('缺少考试或学生信息')
    return
  }

  const studentInfo = getStudentDisplayInfo(record)
  reportTitle.value = `个人考试分析报告 - ${studentInfo.real_name}`
  detailDrawerVisible.value = false
  loadReport({ type: 'student', examId, userId })
}

function retryReportRequest() {
  if (lastReportRequest.value) {
    loadReport(lastReportRequest.value)
  }
}

function handleCloseReportDrawer() {
  reportDrawerVisible.value = false
}

function downloadReportWord() {
  if (!reportContentText.value) {
    message.warning('暂无可下载的报告内容')
    return
  }

  try {
    const title = reportTitle.value || '考试分析报告'
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
  ${renderedReportContent.value}
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

const handleOpenMultiExamExport = () => {
  selectedExportExamIds.value = examList.value
    .filter(exam => getExamStatus(exam) === 'ended')
    .map(exam => getExamId(exam))

  if (selectedExportExamIds.value.length === 0) {
    selectedExportExamIds.value = examList.value.map(exam => getExamId(exam)).filter(Boolean)
  }

  multiExamExportVisible.value = true
}

async function fetchClassStudents() {
  const studentsRes = await getUsersByClassId(props.classId)
  return Array.isArray(studentsRes?.data)
    ? studentsRes.data.filter(item => item.user_type === 'student')
    : []
}

function buildMultiExamExportData(students, selectedExams, examResultsMap) {
  const studentMap = new Map()

  students.forEach(student => {
    const studentId = normalizeId(student.id)
    if (!studentId) return
    studentMap.set(studentId, {
      student_id: studentId,
      username: student.username || '-',
      real_name: student.real_name || student.username || '-',
      examResults: new Map()
    })
  })

  selectedExams.forEach((exam) => {
    const examId = getExamId(exam)
    const results = examResultsMap.get(examId) || []

    results.forEach(result => {
      const studentId = normalizeId(extractStudentId(result))
      if (!studentId) return

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student_id: studentId,
          username: result.username || result.student?.username || result.user?.username || '-',
          real_name: result.real_name || result.student_name || result.student?.real_name || result.user?.real_name || '未知学生',
          examResults: new Map()
        })
      }

      studentMap.get(studentId).examResults.set(examId, result)
    })
  })

  const headers = ['序号', '学生姓名', '学号']
  selectedExams.forEach((exam, index) => {
    const title = getExamTitle(exam, index)
    headers.push(`${title}-得分`, `${title}-是否通过`, `${title}-交卷状态`)
  })
  headers.push('参加次数', '通过次数', '未通过次数', '缺考次数', '平均分')

  const rows = Array.from(studentMap.values()).map((student, index) => {
    let submittedCount = 0
    let passCount = 0
    let failCount = 0
    let absentCount = 0
    const validScores = []

    const row = [index + 1, student.real_name || '-', student.username || '-']

    selectedExams.forEach((exam) => {
      const examId = getExamId(exam)
      const result = student.examResults.get(examId)
      const status = getStandardStatus(result, exam)
      const score = result?.score ?? '-'
      const isPassing = result?.is_passing ?? '-'

      if (result && isSubmittedStatus(status)) {
        submittedCount++
        if (typeof result.score === 'number' && !Number.isNaN(result.score)) {
          validScores.push(result.score)
        }

        if (isPassedValue(result.is_passing)) {
          passCount++
        } else {
          failCount++
        }
      } else if (!result || status === '缺考' || String(status).includes('缺考')) {
        absentCount++
      }

      row.push(score, isPassing, status || '-')
    })

    const averageScore = validScores.length > 0
      ? Number((validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(1))
      : '-'

    row.push(submittedCount, passCount, failCount, absentCount, averageScore)
    return row
  })

  return [headers, ...rows]
}

const handleExportMultiExamResults = async () => {
  const selectedIds = selectedExportExamIds.value.map(id => normalizeId(id)).filter(Boolean)
  if (selectedIds.length === 0) {
    message.warning('请至少选择一次考试')
    return
  }

  const selectedExams = examList.value.filter(exam => selectedIds.includes(getExamId(exam)))
  if (selectedExams.length === 0) {
    message.warning('未找到可导出的考试')
    return
  }

  multiExamExporting.value = true
  try {
    const [students, examResultResponses] = await Promise.all([
      fetchClassStudents(),
      Promise.all(selectedExams.map(exam => getExamResultAll(getExamId(exam))))
    ])

    const examResultsMap = new Map()
    selectedExams.forEach((exam, index) => {
      const results = Array.isArray(examResultResponses[index]?.data)
        ? examResultResponses[index].data.map(normalizeExamResultRecord)
        : []
      examResultsMap.set(getExamId(exam), results)
    })

    const data = buildMultiExamExportData(students, selectedExams, examResultsMap)
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 16 },
      { wch: 16 },
      ...selectedExams.flatMap(() => [
        { wch: 12 },
        { wch: 14 },
        { wch: 14 }
      ]),
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 }
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, getSafeSheetName('多次成绩汇总'))
    XLSX.writeFile(workbook, generateMultiExamFileName())
    message.success('多次考试成绩已导出')
    multiExamExportVisible.value = false
  } catch (error) {
    console.error('导出多次考试成绩失败:', error)
    message.error('导出多次考试成绩失败')
  } finally {
    multiExamExporting.value = false
  }
}

onMounted(async () => {
  await fetchCourseInfo()
  fetchExamList()
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
.class-exam-module {
  min-height: 400px;
}

.action-bar {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.paper-option {
  padding: 8px 0;
}

.paper-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: #1890ff;
}

.exam-option-meta {
  margin-left: 8px;
  color: #8c8c8c;
  font-size: 12px;
}

.multi-export-summary {
  color: #666;
  font-size: 13px;
  line-height: 1.6;
}

.paper-info {
  font-size: 12px;
  color: #666;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.ant-select-item-option-content) {
  padding: 4px 0;
}

:deep(.ant-form-item) {
  margin-bottom: 16px;
}

:deep(.ant-modal-body) {
  max-height: 70vh;
  overflow-y: auto;
}

/* 全班结果抽屉样式 */
.drawer-title {
  font-size: 18px;
  font-weight: 600;
  max-width: 100%;
  white-space: normal;
  word-break: break-word;
}

.stats-container {
  margin-bottom: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  min-width: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1890ff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.table-container {
  margin-top: 16px;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 768px) {
  .stats-container {
    padding: 12px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat-value {
    font-size: 18px;
  }

  .stat-label {
    font-size: 12px;
  }

  .export-button-container {
    margin-top: 16px;
    display: flex;
    justify-content: stretch;
  }

  .export-button-container .ant-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

/* 学生姓名单元格样式 */
.student-name-cell {
  line-height: 1.4;
}

.student-real-name {
  font-weight: 500;
  font-size: 14px;
}

.student-username {
  font-size: 12px;
  color: #666;
}

/* 学生答题明细样式 */
.detail-container {
  padding: 16px 0;
}

.student-summary {
  margin-bottom: 24px;
}

.student-summary-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-item {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.question-number {
  font-weight: 600;
  font-size: 14px;
}

.question-content {
  line-height: 1.6;
}

.question-text {
  margin-bottom: 12px;
  font-size: 14px;
}

.question-options {
  margin-bottom: 12px;
}

.options-label {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 16px;
}

.option-item {
  font-size: 13px;
  color: #555;
}

.answer-section {
  margin: 12px 0;
  padding: 12px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

.answer-item {
  margin-bottom: 8px;
  font-size: 14px;
}

.answer-item:last-child {
  margin-bottom: 0;
}

.answer-value {
  margin-left: 8px;
  color: #1890ff;
}

.score-value {
  margin-left: 8px;
  font-weight: 600;
  color: #52c41a;
}

.analysis-section {
  margin-top: 12px;
  padding: 12px;
  background: #f6ffed;
  border-radius: 4px;
  border: 1px solid #b7eb8f;
}

.analysis-content {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: #52c41a;
}

.report-content {
  word-break: break-word;
  line-height: 1.8;
  color: #262626;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
}

.report-content :deep(h1),
.report-content :deep(h2),
.report-content :deep(h3) {
  margin-top: 20px;
  margin-bottom: 12px;
  font-weight: 600;
}

.report-content :deep(h1) {
  font-size: 24px;
}

.report-content :deep(h2) {
  font-size: 20px;
  color: #1677ff;
}

.report-content :deep(h3) {
  font-size: 17px;
  color: #13a8a8;
}

.report-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.report-content :deep(th),
.report-content :deep(td) {
  border: 1px solid #d9d9d9;
  padding: 8px;
}

.report-content :deep(th) {
  background: #f5f5f5;
}

.report-content :deep(blockquote) {
  margin: 12px 0;
  padding: 8px 12px;
  border-left: 4px solid #91caff;
  background: #f6f8fa;
}

.report-content :deep(pre) {
  overflow-x: auto;
  background: #f6f8fa;
  padding: 12px;
  border-radius: 6px;
}

.report-content :deep(code) {
  font-family: Consolas, monospace;
  background: #f6f8fa;
  padding: 2px 4px;
  border-radius: 4px;
}

/* 导出按钮容器样式 */
.export-button-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
