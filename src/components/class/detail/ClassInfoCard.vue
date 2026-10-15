<!--
 * @Description  : 班级基本信息卡片组件
 * @FilePath     : ClassInfoCard.vue
-->
<template>
  <a-card title="班级信息" class="info-card">
    <a-descriptions v-if="classInfo" bordered>
      <a-descriptions-item label="班级名称" span="2">
        {{ classInfo.title }}
      </a-descriptions-item>
      <a-descriptions-item label="班级ID">
        {{ classInfo.id }}
      </a-descriptions-item>
      <a-descriptions-item label="所属课程" span="2">
        {{ classInfo.course || '未设置' }}
      </a-descriptions-item>
      <a-descriptions-item label="教师/管理员">
        {{ classInfo.teacher || classInfo.create_by || '未设置' }}
      </a-descriptions-item>
      <a-descriptions-item label="学生人数" span="3">
        {{ studentsCount }} 人
      </a-descriptions-item>
      <a-descriptions-item label="开始时间" span="2">
        {{ classInfo.start_time || '未设置' }}
      </a-descriptions-item>
      <a-descriptions-item label="结束时间">
        {{ classInfo.end_time || '未设置' }}
      </a-descriptions-item>
      <a-descriptions-item label="状态" span="3">
        <a-tag :color="classInfo.status === '正常' ? 'green' : 'red'">
          {{ classInfo.status || '未知' }}
        </a-tag>
      </a-descriptions-item>
    </a-descriptions>

    <div v-else class="loading-placeholder">
      <a-spin tip="加载中..." />
    </div>

    <!-- 功能开关区域 - 仅老师/管理员可见 -->
    <template v-if="isTeacherOrAdmin">
      <a-divider />
      <div class="function-controller-section">
        <h4 class="section-title">功能开关</h4>
        <a-spin :spinning="loadingController">
          <div class="switches-container">
            <div class="switch-grid">
              <div
                v-for="sw in functionSwitches"
                :key="sw.key"
                class="switch-item"
              >
                <span class="switch-label">{{ sw.label }}</span>
                <a-switch
                  class="switch-control"
                  :checked="localController?.[sw.field] ?? true"
                  @change="handleSwitchChange(sw.field, $event)"
                />
              </div>
            </div>
          </div>
          <div class="controller-actions">
            <a-space>
              <a-button
                type="primary"
                :loading="savingController"
                :disabled="!hasChanges"
                @click="handleSave"
              >
                保存
              </a-button>
              <a-button
                @click="handleCancel"
                :disabled="!hasChanges || savingController"
              >
                取消
              </a-button>
            </a-space>
            <div v-if="!hasChanges" class="no-changes-hint">
              <span style="color: #999; font-size: 12px;">修改开关后可保存</span>
            </div>
          </div>
        </a-spin>
      </div>
    </template>
  </a-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  classInfo: Object,
  classId: {
    type: [String, Number],
    required: true
  },
  studentsCount: {
    type: Number,
    default: 0
  },
  loading: {
    type: Boolean,
    default: false
  },
  // 新增：是否老师/管理员
  isTeacherOrAdmin: {
    type: Boolean,
    default: false
  },
  // 新增：班级控制器配置
  controller: {
    type: Object,
    default: null
  },
  // 新增：控制器加载状态
  loadingController: {
    type: Boolean,
    default: false
  },
  // 新增：控制器保存状态
  savingController: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:controller', 'save-controller'])

const defaultController = {
  exam: true,
  digital_video: true,
  knowledge_graph: true,
  experimental_code_evaluation: true,
  discussion_forum: true,
  research_planning: true
}

function normalizeController(controller = {}) {
  const normalized = { ...defaultController, ...controller }
  if (controller.discussion_forum === undefined && controller.Discussion_forum !== undefined) {
    normalized.discussion_forum = controller.Discussion_forum
  }
  if (controller.experimental_code_evaluation === undefined && controller.experiment !== undefined) {
    normalized.experimental_code_evaluation = controller.experiment
  }
  delete normalized.Discussion_forum
  delete normalized.experiment
  return normalized
}

// 本地编辑的控制器配置
const localController = ref(null)
// 原始配置（用于取消时恢复）
const originalController = ref(null)

// 标记是否正在更新中（避免循环）
let isUpdatingFromEmit = false

// 监听 controller prop 变化，初始化本地数据
watch(
  () => props.controller,
  (newController) => {
    console.log('🎯 ClassInfoCard: controller prop changed:', newController)
    // 如果是我们自己触发的更新，就不重置 originalController
    if (isUpdatingFromEmit) {
      console.log('⏭️ ClassInfoCard: skipping reset (update from emit)')
      isUpdatingFromEmit = false
      return
    }

    if (newController) {
      localController.value = normalizeController(newController)
      originalController.value = normalizeController(newController)
    } else {
      // 默认全开启
      localController.value = { ...defaultController }
      originalController.value = { ...defaultController }
    }
    console.log('✅ ClassInfoCard: initialized localController:', localController.value)
    console.log('✅ ClassInfoCard: initialized originalController:', originalController.value)
  },
  { immediate: true, deep: true }
)

// 功能开关配置
const functionSwitches = computed(() => [
  {
    key: 'exam',
    label: '考试管理',
    field: 'exam'
  },
  {
    key: 'digital_video',
    label: '课程视频',
    field: 'digital_video'
  },
  {
    key: 'knowledge_graph',
    label: '知识图谱',
    field: 'knowledge_graph'
  },
  {
    key: 'experiment',
    label: '实验管理',
    field: 'experimental_code_evaluation'
  },
  {
    key: 'discussion',
    label: '讨论区',
    field: 'discussion_forum'
  },
  {
    key: 'research_planning',
    label: '课程赋能课题',
    field: 'research_planning'
  }
])

// 计算是否有未保存的修改
const hasChanges = computed(() => {
  const result = !(!localController.value || !originalController.value) &&
    JSON.stringify(localController.value) !== JSON.stringify(originalController.value)
  console.log('🧮 ClassInfoCard: hasChanges calculated:', result)
  console.log('  - localController:', JSON.stringify(localController.value))
  console.log('  - originalController:', JSON.stringify(originalController.value))
  return result
})

// 处理开关切换
const handleSwitchChange = (field, value) => {
  console.log('🔄 ClassInfoCard: handleSwitchChange:', field, value)
  if (localController.value) {
    // 创建一个新对象以确保响应式更新
    localController.value = {
      ...localController.value,
      [field]: value
    }
    console.log('✅ ClassInfoCard: Updated localController:', localController.value)
    // 设置标记：下一次 prop 变化是我们自己触发的
    isUpdatingFromEmit = true
    emit('update:controller', { ...localController.value })
  }
}

// 触发保存
const handleSave = () => {
  console.log('💾 ClassInfoCard: handleSave called')
  emit('save-controller')
}

// 取消修改，恢复原始值
const handleCancel = () => {
  console.log('↩️ ClassInfoCard: handleCancel called')
  if (originalController.value) {
    localController.value = { ...originalController.value }
    // 设置标记：下一次 prop 变化是我们自己触发的
    isUpdatingFromEmit = true
    emit('update:controller', { ...originalController.value })
  }
}
</script>

<style scoped>
.info-card {
  margin-top: 16px;
  border-radius: 16px;
}

.loading-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.function-controller-section {
  padding-top: 8px;
}

.section-title {
  margin-bottom: 16px;
  color: #262626;
  font-weight: 500;
  font-size: 15px;
}

.switches-container {
  margin-bottom: 16px;
}

.switch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fafbfc;
}

.switch-label {
  min-width: 0;
  padding-right: 12px;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
}

.switch-control {
  flex: 0 0 auto;
}

.controller-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px dashed #f0f0f0;
}

.no-changes-hint {
  margin-top: 0;
}

/* 手机端适配 */
@media screen and (max-width: 480px) {
  .info-card {
    margin-top: 12px;
    border-radius: 12px;
  }

  :deep(.ant-descriptions-bordered .ant-descriptions-item-label),
  :deep(.ant-descriptions-bordered .ant-descriptions-item-content) {
    padding: 12px;
  }

  :deep(.ant-descriptions-item) {
    display: flex;
    flex-direction: column;
  }

  :deep(.ant-descriptions-item-label),
  :deep(.ant-descriptions-item-content) {
    width: 100% !important;
  }

  .function-controller-section {
    padding-top: 4px;
  }

  .section-title {
    font-size: 14px;
    margin-bottom: 12px;
  }

  .switch-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .switch-item {
    min-height: 42px;
    padding: 9px 10px;
  }

  .controller-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .controller-actions :deep(.ant-space) {
    width: 100%;
  }

  .controller-actions :deep(.ant-space-item),
  .controller-actions :deep(.ant-btn) {
    flex: 1;
  }

  .no-changes-hint {
    text-align: center;
  }
}
</style>
