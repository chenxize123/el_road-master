<!--
 * @Date         : 2026-05-18
 * @Description  : 班级功能标签页组件 - 支持配置化，方便添加新模块
 * @FilePath     : ClassTabs.vue
 * @Version      : V1.0.0
-->
<template>
  <div ref="containerRef" class="class-tabs-container">
    <!-- 桌面端：横向标签页导航（空间足够时显示） -->
    <a-tabs
      v-if="!useCompactNav"
      :activeKey="activeTab"
      class="main-tabs"
      @change="handleTabChange"
      :centered="true"
    >
      <a-tab-pane
        v-for="tab in visibleTabs"
        :key="tab.key"
      >
        <template #tab>
          <span class="function-tab-label">
            <component :is="tab.icon" v-if="tab.icon" />
            <span class="function-tab-text">{{ tab.label }}</span>
          </span>
        </template>
      </a-tab-pane>
    </a-tabs>

    <!-- 紧凑模式：顶部当前标签 + 弹出菜单（空间不足时显示） -->
    <div v-else class="mobile-nav">
      <div class="mobile-nav-current" @click="mobileMenuVisible = true">
        <component :is="currentTab?.icon" v-if="currentTab?.icon" />
        <span>{{ currentTab?.label || '请选择' }}</span>
        <DownOutlined class="mobile-nav-arrow" :class="{ 'arrow-up': mobileMenuVisible }" />
      </div>
    </div>

    <a-drawer
      v-model:open="mobileMenuVisible"
      placement="bottom"
      :height="mobileDrawerHeight"
      :closable="false"
      class="mobile-nav-drawer"
    >
      <div class="mobile-drawer-header">
        <span>功能导航</span>
        <CloseOutlined @click="mobileMenuVisible = false" />
      </div>
      <div class="mobile-drawer-grid">
        <div
          v-for="tab in visibleTabs"
          :key="tab.key"
          class="mobile-grid-item"
          :class="{ active: activeTab === tab.key }"
          @click="handleMobileTabChange(tab.key)"
        >
          <component :is="tab.icon" v-if="tab.icon" class="mobile-grid-icon" />
          <span class="mobile-grid-label">{{ tab.label }}</span>
        </div>
      </div>
    </a-drawer>

    <!-- 标签页内容区域 -->
    <div class="tab-content">
      <slot :name="activeTab"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  InfoCircleOutlined,
  TeamOutlined,
  ProjectOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  BookOutlined,
  CommentOutlined,
  ExperimentOutlined,
  DownOutlined,
  CloseOutlined
} from '@ant-design/icons-vue'

// 默认标签页配置 - 方便后期添加新模块
const defaultTabs = [
  {
    key: 'basic',
    label: '基本信息',
    icon: InfoCircleOutlined,
    visible: true // 所有人可见
  },
  {
    key: 'students',
    label: '学生管理',
    icon: TeamOutlined,
    visible: (props) => props.isTeacherOrAdmin // 仅教师/管理员可见
  },
  {
    key: 'knowledge',
    label: '知识图谱',
    icon: ProjectOutlined,
    visible: true // 所有人可见
  },
  {
    key: 'video',
    label: '课程视频',
    icon: VideoCameraOutlined,
    visible: true // 所有人可见
  },
  {
    key: 'exam',
    label: '考试管理',
    icon: FileTextOutlined,
    visible: true // 所有人可见
  },
  {
    key: 'experiment',
    label: '实验管理',
    icon: ExperimentOutlined,
    visible: true
  },
  {
    key: 'literature',
    label: '课程赋能课题',
    icon: BookOutlined,
    visible: true // 所有人可见
  },
  {
    key: 'discussion',
    label: '讨论区',
    icon: CommentOutlined,
    visible: true // 所有人可见
  }
]

// 标签页 key 到 controller 字段的映射
const tabKeyToControllerField = {
  knowledge: 'knowledge_graph',
  video: 'digital_video',
  exam: 'exam',
  experiment: 'experimental_code_evaluation',
  literature: 'research_planning',
  discussion: 'discussion_forum'
}

const props = defineProps({
  activeTab: {
    type: String,
    default: 'basic'
  },
  classId: {
    type: [String, Number],
    required: true
    // 预留接口，供后期需要根据班级ID做特殊处理时使用
  },
  isTeacherOrAdmin: {
    type: Boolean,
    default: false
  },
  // 新增：班级控制器配置
  controller: {
    type: Object,
    default: null
  },
  // 支持传入自定义标签配置，方便扩展
  tabs: {
    type: Array,
    default: null
  }
})

const emit = defineEmits(['update:activeTab', 'tab-change'])

// 手机端导航状态
const mobileMenuVisible = ref(false)

// 容器宽度检测，决定是否使用紧凑导航
const containerRef = ref(null)
const useCompactNav = ref(false)
let resizeObserver = null

// 每个标签大约需要的宽度（icon + 文字 + padding + gap）
const TAB_APPROX_WIDTH = 100

function updateCompactMode() {
  if (!containerRef.value) return
  const containerWidth = containerRef.value.clientWidth
  const tabCount = visibleTabs.value.length
  const neededWidth = tabCount * TAB_APPROX_WIDTH + 40 // 40px for padding
  useCompactNav.value = containerWidth < neededWidth
}

// 使用配置的标签页或默认标签页
const tabsConfig = computed(() => props.tabs || defaultTabs)

// 计算可见的标签页
const visibleTabs = computed(() => {
  return tabsConfig.value.filter(tab => {
    // 1. 先检查角色权限
    let isVisibleByRole = true
    if (typeof tab.visible === 'function') {
      isVisibleByRole = tab.visible(props)
    } else {
      isVisibleByRole = tab.visible !== false
    }

    if (!isVisibleByRole) return false

    // 2. 再检查 controller 配置（仅对功能标签页）
    const controllerField = tabKeyToControllerField[tab.key]
    if (controllerField && props.controller) {
      if (controllerField === 'discussion_forum' && props.controller.discussion_forum === undefined && props.controller.Discussion_forum !== undefined) {
        return props.controller.Discussion_forum === true
      }
      if (controllerField === 'experimental_code_evaluation' && props.controller.experimental_code_evaluation === undefined && props.controller.experiment !== undefined) {
        return props.controller.experiment === true
      }
      if (props.controller[controllerField] === undefined) return true
      return props.controller[controllerField] === true
    }

    // 3. 基本信息、学生管理等不受 controller 影响
    return true
  })
})

// 当前选中的标签
const currentTab = computed(() => visibleTabs.value.find(t => t.key === props.activeTab))

// 手机端弹出层高度（根据标签数量自适应）
const mobileDrawerHeight = computed(() => {
  const rows = Math.ceil(visibleTabs.value.length / 4)
  return 60 + rows * 90 + 20
})

// 处理标签页切换
const handleTabChange = (key) => {
  emit('update:activeTab', key)
  emit('tab-change', key)
}

// 手机端标签切换
const handleMobileTabChange = (key) => {
  mobileMenuVisible.value = false
  handleTabChange(key)
}

// 监听容器宽度变化
onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(() => updateCompactMode())
    resizeObserver.observe(containerRef.value)
    updateCompactMode()
  }
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>

<style scoped>
.class-tabs-container {
  background: white;
  min-width: 0;
}

/* 桌面端标签页样式 */
.main-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
  padding: 12px 20px;
  border-bottom: 1px solid #edf0f5;
  background: #fff;
}

.main-tabs :deep(.ant-tabs-nav::before) {
  border-bottom: 0;
}

.main-tabs :deep(.ant-tabs-nav-wrap) {
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.main-tabs :deep(.ant-tabs-nav-wrap::-webkit-scrollbar) {
  display: none;
}

.main-tabs :deep(.ant-tabs-nav-list) {
  gap: 8px;
}

.main-tabs :deep(.ant-tabs-tab) {
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
  color: #4b5563;
  transition: color 0.18s ease;
}

.main-tabs :deep(.ant-tabs-tab:hover) {
  color: #1677ff;
}

.main-tabs :deep(.ant-tabs-tab-btn) {
  outline: none;
}

.main-tabs :deep(.ant-tabs-tab-active) {
  color: #1677ff;
}

.main-tabs :deep(.ant-tabs-tab-active .function-tab-label) {
  background: #e6f4ff;
  border-color: #91caff;
  color: #0958d9;
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.12);
}

.main-tabs :deep(.ant-tabs-ink-bar) {
  display: none;
}

.function-tab-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 92px;
  height: 38px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  background: transparent;
}

.function-tab-label .anticon {
  flex: 0 0 auto;
  margin: 0;
  font-size: 16px;
}

.function-tab-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-content {
  min-height: 600px;
  padding: 24px;
  background: #fff;
}

/* 响应式设计 */
@media screen and (max-width: 1024px) {
  .main-tabs :deep(.ant-tabs-nav) {
    padding: 10px 16px;
  }

  .function-tab-label {
    min-width: 86px;
    padding: 0 12px;
  }
}

/* 紧凑导航样式（空间不足时由 JS 切换） */
.mobile-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 1px solid #edf0f5;
}

.mobile-nav-current {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 600;
  color: #1677ff;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.mobile-nav-current .anticon:first-child {
  font-size: 18px;
}

.mobile-nav-arrow {
  margin-left: auto;
  font-size: 12px;
  color: #999;
  transition: transform 0.2s;
}

.mobile-nav-arrow.arrow-up {
  transform: rotate(180deg);
}

/* 手机端内容区域 */
@media screen and (max-width: 768px) {
  .tab-content {
    padding: 14px;
    min-height: 400px;
  }
}

@media screen and (max-width: 480px) {
  .tab-content {
    padding: 10px;
  }
}
</style>

<style>
/* 手机端弹出层样式（非 scoped，覆盖 drawer） */
.mobile-nav-drawer .ant-drawer-body {
  padding: 0 !important;
}

.mobile-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
}

.mobile-drawer-header .anticon {
  font-size: 16px;
  color: #999;
  cursor: pointer;
  padding: 4px;
}

.mobile-drawer-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 12px 8px;
}

.mobile-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 4px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.mobile-grid-item:active {
  background: #f5f5f5;
}

.mobile-grid-item.active {
  background: #e6f4ff;
}

.mobile-grid-item.active .mobile-grid-icon {
  color: #1677ff;
}

.mobile-grid-item.active .mobile-grid-label {
  color: #1677ff;
  font-weight: 600;
}

.mobile-grid-icon {
  font-size: 22px;
  color: #555;
}

.mobile-grid-label {
  font-size: 12px;
  color: #666;
  text-align: center;
  line-height: 1.3;
}
</style>
