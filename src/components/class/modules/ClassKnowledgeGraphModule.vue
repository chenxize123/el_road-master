<!--
 * @Date         : 2026-05-18
 * @Description  : 班级知识图谱模块 - 支持树形图、关系图、文字列表
 * @FilePath     : ClassKnowledgeGraphModule.vue
 * @LastEditTime : 2026-05-18
 * @Version      : V2.0.0
-->
<template>
  <div class="class-knowledge-graph-module">
    <!-- 加载状态 -->
    <a-spin v-if="loadingState" size="large" class="loading-spin">
      <div class="loading-placeholder"></div>
    </a-spin>

    <!-- 错误状态 -->
    <a-alert
      v-else-if="error"
      message="加载失败"
      :description="error"
      type="error"
      show-icon
      :closable="false"
    >
      <template #action>
        <a-button size="small" danger @click="fetchData">重试</a-button>
      </template>
    </a-alert>

    <!-- 主内容 -->
    <template v-else>
      <KnowledgeGraphLayout
        :title="courseName"
        :data="rawData"
        @download="handleDownload"
        ref="layoutRef"
      >
        <!-- 树形图视图 -->
        <template #tree>
          <div class="knowledge-tree">
            <KnowledgeNode
              v-for="node in treeData"
              :key="node.id"
              :node="node"
              :expanded-keys="expandedKeys"
              @toggle-expand="toggleExpand"
              @select-node="selectNode"
            />
          </div>
        </template>

        <!-- 关系图视图 -->
        <template #graph>
          <KnowledgeRelationGraph
            :tree-data="treeData"
            :title="courseName || '知识图谱'"
            ref="graphRef"
          />
        </template>

        <!-- 文字列表视图 -->
        <template #list>
          <KnowledgeListView :tree-data="treeData" />
        </template>
      </KnowledgeGraphLayout>
    </template>

    <!-- 知识点详情抽屉 -->
    <a-drawer
      v-model:open="detailDrawerVisible"
      title="知识点详情"
      placement="right"
      width="500"
      :mask-closable="true"
    >
      <div v-if="selectedNode" class="node-detail">
        <h3>{{ selectedNode.label }}</h3>
        <a-tag :color="getTypeColor(selectedNode.type)" class="mb-4">
          {{ getTypeLabel(selectedNode.type) }}
        </a-tag>
        <div v-if="selectedNode.content" class="content-section">
          <h4>内容</h4>
          <p>{{ selectedNode.content }}</p>
        </div>
        <div v-if="selectedNode.prerequisites && selectedNode.prerequisites.length > 0" class="prerequisites-section">
          <h4>前置知识</h4>
          <ul>
            <li v-for="prereq in selectedNode.prerequisites" :key="prereq">
              {{ prereq }}
            </li>
          </ul>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { getKnowledgePointApi, getCourseByClassIdApi } from '@/api/course'
import { message } from 'ant-design-vue'
import { ensureTreeIds } from '@/utils/index.js'
import KnowledgeNode from '@/components/course/modules/KnowledgeNode.vue'
import KnowledgeGraphLayout from '@/components/knowledge/KnowledgeGraphLayout.vue'
import KnowledgeRelationGraph from '@/components/knowledge/KnowledgeRelationGraph.vue'
import KnowledgeListView from '@/components/knowledge/KnowledgeListView.vue'

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

const loadingState = ref(false)
const error = ref(null)
const courseName = ref('')
const courseId = ref(null)
const rawData = ref(null)
const treeData = ref([])
const expandedKeys = ref([])
const selectedNode = ref(null)
const detailDrawerVisible = ref(false)
const layoutRef = ref(null)
const graphRef = ref(null)

// 节点类型标签映射
const typeLabels = {
  chapter: '章节',
  sub_chapter: '子章节',
  point: '知识点'
}

// 节点类型颜色映射
const typeColors = {
  chapter: 'blue',
  sub_chapter: 'cyan',
  point: 'green'
}

function getTypeLabel(type) {
  return typeLabels[type] || type
}

function getTypeColor(type) {
  return typeColors[type] || 'default'
}

// 通过班级 ID 获取课程 ID
async function fetchCourseId() {
  if (!props.classId) {
    return null
  }

  try {
    const response = await getCourseByClassIdApi(props.classId)
    if (response.code === 200 && response.data) {
      courseId.value = response.data.id
      courseName.value = response.data.title || response.data.course || ''
      return courseId.value
    }
    return null
  } catch (err) {
    console.error('获取课程信息失败:', err)
    error.value = '无法获取课程信息'
    return null
  }
}

// 获取知识图谱数据
async function fetchKnowledgeGraph(courseIdVal) {
  if (!courseIdVal) {
    treeData.value = []
    return
  }

  try {
    const response = await getKnowledgePointApi(courseIdVal)

    if (response.code === 200 && response.data) {
      rawData.value = response.data
      if (!courseName.value) {
        courseName.value = response.data.course || ''
      }

      if (response.data.knowledge_point && Array.isArray(response.data.knowledge_point)) {
        treeData.value = ensureTreeIds(response.data.knowledge_point)
        // 自动展开所有章节
        expandedKeys.value = treeData.value.map(node => node.id)
      } else {
        treeData.value = []
      }
    } else {
      error.value = response.message || '获取知识图谱数据失败'
    }
  } catch (err) {
    console.error('获取知识图谱数据失败:', err)
    error.value = err.message || '网络请求失败，请稍后重试'
  }
}

// 获取数据的主函数
async function fetchData() {
  if (!props.classId) {
    return
  }

  loadingState.value = true
  error.value = null

  try {
    // 先通过班级 ID 获取课程 ID
    const cId = await fetchCourseId()
    if (cId) {
      // 再通过课程 ID 获取知识图谱
      await fetchKnowledgeGraph(cId)
    } else {
      treeData.value = []
    }
  } catch (err) {
    console.error('获取数据失败:', err)
    error.value = err.message || '获取数据失败'
  } finally {
    loadingState.value = false
  }
}

// 切换展开状态
function toggleExpand(nodeId) {
  const index = expandedKeys.value.indexOf(nodeId)
  if (index > -1) {
    expandedKeys.value.splice(index, 1)
  } else {
    expandedKeys.value.push(nodeId)
  }
}

// 递归查找节点
function findNode(nodes, key) {
  for (const node of nodes) {
    if (node.id === key) {
      return node
    }
    if (node.children) {
      const found = findNode(node.children, key)
      if (found) return found
    }
  }
  return null
}

// 选择节点
function selectNode(nodeId) {
  const node = findNode(treeData.value, nodeId)
  if (node && node.type === 'point') {
    selectedNode.value = node
    detailDrawerVisible.value = true
  }
}

// 处理下载
async function handleDownload({ type, view }) {
  if (type === 'image' && view === 'graph' && graphRef.value) {
    try {
      const imageUrl = graphRef.value.getImageDataUrl?.()
      if (!imageUrl) {
        message.error('无法获取图谱图片')
        return
      }

      const link = document.createElement('a')
      link.download = `knowledge-graph-${Date.now()}.png`
      link.href = imageUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      message.success('图片下载成功')
    } catch (err) {
      console.error('下载图片失败:', err)
      message.error('下载失败: ' + err.message)
    }
  } else {
    message.info('该视图的图片下载功能开发中')
  }
}

// 监听 classId 变化
watch(() => props.classId, (newClassId) => {
  if (newClassId) {
    fetchData()
  }
}, { immediate: true })

// 监听外部 loading prop
watch(() => props.loading, (newLoading) => {
  if (newLoading) {
    fetchData()
  }
})
</script>

<style scoped>
.class-knowledge-graph-module {
  height: 100%;
  min-height: 600px;
}

.loading-spin {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.loading-placeholder {
  width: 100%;
  height: 400px;
}

.knowledge-tree {
  padding: 4px 0;
}

/* 节点详情样式 */
.node-detail {
  padding: 8px 0;
}

.node-detail h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.node-detail .mb-4 {
  margin-bottom: 16px;
}

.node-detail h4 {
  margin: 20px 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #595959;
}

.node-detail p {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: #595959;
  text-align: justify;
}

.node-detail ul {
  margin: 0;
  padding-left: 20px;
}

.node-detail li {
  margin-bottom: 8px;
  font-size: 14px;
  color: #595959;
}
</style>
