<template>
  <a-modal
    v-model:open="visible"
    :title="activeMode === 'publish' ? `发布${kindLabel}` : `${kindLabel}发布管理 - ${item?.title || ''}`"
    :confirm-loading="publishing"
    :footer="null"
    width="680px"
  >
    <a-spin :spinning="loading">
      <a-alert
        v-if="error || (activeMode === 'publish' && permissionLoadError)"
        class="publish-error"
        type="error"
        show-icon
        :message="error || `发布权限加载失败：${permissionLoadError}`"
      />
      <div v-if="activeMode === 'manage'" class="publish-section">
        <h4>已发布班级</h4>
        <a-empty v-if="!publishes.length && !loading" description="暂未发布到班级" />
        <div v-else class="publish-list">
          <div v-for="record in publishes" :key="record.id || record.class_id" class="publish-row">
            <div class="publish-info">
              <strong>{{ record.class_title || record.class_name || `班级 ${record.class_id}` }}</strong>
              <a-tag :color="statusColor(record.status)">
                {{ statusLabel(record) }}
              </a-tag>
              <span v-if="getPublishTime(record)" class="publish-time">
                {{ formatDateTime(getPublishTime(record)) }}
              </span>
            </div>
            <a-popconfirm
              v-if="canUnpublish && (record.status === 'published' || record.status === 'scheduled')"
              title="确定取消该班级的发布吗？"
              ok-text="取消发布"
              cancel-text="返回"
              @confirm="handleUnpublish(record)"
            >
              <a-button type="link" danger :disabled="publishing">取消发布</a-button>
            </a-popconfirm>
          </div>
        </div>
        <div v-if="canManage" class="publish-actions">
          <a-button type="dashed" block @click="activeMode = 'publish'">
            + 发布到更多班级
          </a-button>
        </div>
      </div>

      <a-divider v-if="activeMode === 'publish' && props.mode === 'manage'" />

      <div v-if="activeMode === 'publish' && canManage" class="publish-section">
        <h4>发布到班级</h4>
        <a-alert
          v-if="!canPublish && !permissionLoadError"
          class="publish-error"
          type="warning"
          show-icon
          message="当前账号没有发布权限，无法提交发布。"
        />
        <a-alert
          v-else-if="canPublish && !classesLoading && !availableClasses.length"
          class="publish-error"
          type="info"
          show-icon
          :message="matchingClasses.length
            ? `该${kindLabel}已发布到当前课程的所有班级。`
            : '当前课程暂无可发布班级，请先在课程下创建班级。'"
        />
        <a-form layout="vertical">
          <a-form-item label="发布目标" required>
            <a-select
              v-model:value="selectedClassIds"
              mode="multiple"
              :loading="classesLoading"
              :disabled="!canPublish || Boolean(permissionLoadError)"
              :options="availableClasses"
              placeholder="请选择一个或多个班级"
              option-filter-prop="label"
              :not-found-content="classesLoading ? '正在加载班级...' : '没有可选择的班级'"
            />
          </a-form-item>
          <a-form-item label="发布时间">
            <a-radio-group v-model:value="publishMode" :disabled="!canPublish || Boolean(permissionLoadError)">
              <a-radio value="now">立即发布</a-radio>
              <a-radio value="scheduled">定时发布</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item v-if="publishMode === 'scheduled'" label="定时发布时间" required>
            <a-date-picker
              v-model:value="publishAt"
              show-time
              style="width: 100%"
              :disabled="!canPublish || Boolean(permissionLoadError)"
              :disabled-date="disabledPublishDate"
              placeholder="请选择发布时间"
            />
          </a-form-item>
          <a-alert
            v-if="publishMode === 'scheduled'"
            type="info"
            show-icon
            message="到达设定时间后，后端将自动激活发布。"
          />
          <div class="publish-actions">
            <a-button @click="handleCancelPublish">
              取消
            </a-button>
            <a-button
              type="primary"
              :loading="publishing"
              :disabled="!canPublish || Boolean(permissionLoadError)"
              @click="handlePublish"
            >
              确认发布
            </a-button>
          </div>
        </a-form>
      </div>
    </a-spin>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { useUserStore } from '@/store'
import { hasPublishPermission } from '@/utils/publishPermissions'
import {
  extractPublishTargetList,
  normalizePublishTargets
} from '@/utils/publishTargets'
import { usePublishPermissions } from '@/composables/usePublishPermissions'
import { getClassList } from '@/api/class'
import {
  getExperimentPublishes,
  publishExperiment,
  unpublishExperiment
} from '@/api/experiment'
import {
  getExamPublishes,
  publishExam,
  unpublishExam
} from '@/api/exam'

const props = defineProps({
  open: { type: Boolean, default: false },
  item: { type: Object, default: null },
  kind: { type: String, required: true, validator: value => ['experiment', 'exam'].includes(value) },
  mode: { type: String, default: 'manage', validator: value => ['publish', 'manage'].includes(value) },
  courseId: { type: [String, Number], required: true },
  classId: { type: [String, Number], default: null }
})

const emit = defineEmits(['update:open', 'updated'])
const userStore = useUserStore()
const {
  permissionCodes,
  loadError: permissionLoadError,
  load: loadPublishPermissions
} = usePublishPermissions(() => userStore.userInfo)
const visible = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})
const kindLabel = computed(() => props.kind === 'experiment' ? '实验' : '考试')
const canManage = computed(() => ['teacher', 'admin'].includes(
  String(userStore.userInfo?.user_type || '').toLowerCase()
))
const canPublish = computed(() => hasPublishPermission(
  userStore.userInfo,
  `${props.kind}:publish`
 ) || permissionCodes.value.includes(`${props.kind}:publish`) ||
  String(userStore.userInfo?.user_type || '').toLowerCase() === 'admin')
const canUnpublish = computed(() => hasPublishPermission(
  userStore.userInfo,
  `${props.kind}:unpublish`
 ) || permissionCodes.value.includes(`${props.kind}:unpublish`) ||
  String(userStore.userInfo?.user_type || '').toLowerCase() === 'admin')
const activeMode = ref(props.mode)
const publishes = ref([])
const classes = ref([])
const selectedClassIds = ref([])
const publishMode = ref('now')
const publishAt = ref(null)
const loading = ref(false)
const classesLoading = ref(false)
const publishing = ref(false)
const error = ref('')
const publishedClassIds = computed(() => new Set(
  publishes.value
    .filter(record => ['published', 'scheduled'].includes(String(record.status || '').toLowerCase()))
    .map(record => String(record.class_id ?? record.classId ?? ''))
))
const matchingClasses = computed(() => normalizePublishTargets(
  classes.value,
  props.courseId || props.item?.course_id || props.item?.courseId
))
const availableClasses = computed(() => matchingClasses.value.filter(item =>
  (!props.classId || item.value === String(props.classId)) &&
  !publishedClassIds.value.has(item.value)
))

function getApiMethods() {
  if (props.kind === 'experiment') {
    return {
      get: getExperimentPublishes,
      publish: publishExperiment,
      unpublish: unpublishExperiment
    }
  }
  return {
    get: getExamPublishes,
    publish: publishExam,
    unpublish: unpublishExam
  }
}

async function loadData() {
  publishes.value = []
  classes.value = []
  selectedClassIds.value = []
  const courseId = props.courseId || props.item?.course_id || props.item?.courseId
  if (canPublish.value && !courseId) {
    error.value = '缺少课程信息，无法加载发布目标班级'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const hasItemId = props.item?.id !== undefined && props.item?.id !== null
    const publishRequest = hasItemId
      ? getApiMethods().get(props.item.id)
      : Promise.resolve({ code: 200, data: [] })
    const shouldLoadClasses = Boolean(courseId)
    const classRequest = shouldLoadClasses
      ? getClassList({ course_id: courseId, page: 1, page_size: 10 })
      : Promise.resolve({ code: 200, data: [] })
    if (shouldLoadClasses) classesLoading.value = true
    const [publishResponse, classResponse] = await Promise.all([publishRequest, classRequest])
    if (publishResponse?.code !== 200) {
      throw new Error(publishResponse?.message || `获取${kindLabel.value}发布记录失败`)
    }
    if (classResponse?.code !== 200) {
      throw new Error(classResponse?.message || '获取班级列表失败')
    }
    publishes.value = extractPublishTargetList(publishResponse)
    classes.value = extractPublishTargetList(classResponse)
    if (props.classId) {
      publishes.value = publishes.value.filter(record =>
        String(record.class_id ?? record.classId) === String(props.classId)
      )
    }
  } catch (loadError) {
    console.error(`加载${kindLabel.value}发布管理失败:`, loadError)
    error.value = loadError.message || `加载${kindLabel.value}发布管理失败`
    publishes.value = []
    classes.value = []
  } finally {
    loading.value = false
    classesLoading.value = false
  }
}

watch(() => props.open, async open => {
  if (open) {
    activeMode.value = props.mode
    await Promise.all([
      loadPublishPermissions(),
      loadData()
    ])
  } else {
    selectedClassIds.value = []
    publishMode.value = 'now'
    publishAt.value = null
    error.value = ''
  }
}, { immediate: true })

function handleCancelPublish() {
  if (props.mode === 'manage') {
    activeMode.value = 'manage'
    return
  }
  visible.value = false
}

function formatDateTime(value) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : ''
}

function statusLabel(record) {
  if (record.status === 'scheduled') return '定时发布'
  if (record.status === 'published') return '已发布'
  if (record.status === 'unpublished') return '已取消'
  if (record.status === 'draft') return '未发布'
  return record.status || '未知状态'
}

function getPublishTime(record) {
  return record.status === 'scheduled'
    ? record.scheduled_publish_at
    : record.actual_publish_at
}

function statusColor(status) {
  if (status === 'published') return 'green'
  if (status === 'scheduled') return 'blue'
  return 'default'
}

function disabledPublishDate(date) {
  return date && date.endOf('day').isBefore(dayjs())
}

async function handlePublish() {
  if (!canPublish.value) {
    message.error('当前账号没有发布权限')
    return
  }
  if (!props.item?.id) return
  if (!selectedClassIds.value.length) {
    message.warning('请选择发布班级')
    return
  }
  const allowedClassIds = new Set(availableClasses.value.map(option => option.value))
  if (selectedClassIds.value.some(classId => !allowedClassIds.has(String(classId)))) {
    message.error('所选班级不属于当前课程或已发布')
    return
  }
  if (publishMode.value === 'scheduled' && (!publishAt.value || !publishAt.value.isAfter(dayjs()))) {
    message.warning('定时发布时间必须晚于当前时间')
    return
  }

  publishing.value = true
  try {
    const response = await getApiMethods().publish({
      [`${props.kind}_id`]: props.item.id,
      class_ids: selectedClassIds.value,
      publish_time: publishMode.value === 'scheduled'
        ? publishAt.value.format('YYYY-MM-DDTHH:mm:ss')
        : null
    })
    if (response?.code !== 200) {
      throw new Error(response?.message || `${kindLabel.value}发布失败`)
    }
    message.success(publishMode.value === 'scheduled' ? '已设置定时发布' : '发布成功')
    selectedClassIds.value = []
    await loadData()
    emit('updated')
  } catch (publishError) {
    console.error(`${kindLabel.value}发布失败:`, publishError)
    message.error(publishError.message || `${kindLabel.value}发布失败`)
  } finally {
    publishing.value = false
  }
}

async function handleUnpublish(record) {
  if (!canUnpublish.value) {
    message.error('当前账号没有取消发布权限')
    return
  }
  if (props.classId && String(record.class_id) !== String(props.classId)) {
    message.error('只能管理当前班级的发布记录')
    return
  }
  publishing.value = true
  try {
    const response = await getApiMethods().unpublish({
      [`${props.kind}_id`]: props.item.id,
      class_id: record.class_id
    })
    if (response?.code !== 200) {
      throw new Error(response?.message || `取消${kindLabel.value}发布失败`)
    }
    message.success('已取消发布')
    await loadData()
    emit('updated')
  } catch (unpublishError) {
    console.error(`取消${kindLabel.value}发布失败:`, unpublishError)
    message.error(unpublishError.message || `取消${kindLabel.value}发布失败`)
  } finally {
    publishing.value = false
  }
}

</script>

<style scoped>
.publish-error {
  margin-bottom: 16px;
}

.publish-section h4 {
  margin: 0 0 14px;
  font-size: 15px;
}

.publish-list {
  max-height: 240px;
  overflow: auto;
}

.publish-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.publish-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.publish-time {
  color: #8c8c8c;
  font-size: 12px;
}

.publish-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
