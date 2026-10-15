<template>
  <div class="knowledge-echarts-graph">
    <div class="graph-surface">
      <div ref="chartRef" class="chart-canvas"></div>

      <div v-if="selectedNode" class="floating-detail">
        <div class="floating-detail-header">
          <div class="floating-detail-title">
            <InfoCircleOutlined />
            <span>节点详情</span>
          </div>
          <button class="detail-close" type="button" @click="selectedNode = null">
            <CloseOutlined />
          </button>
        </div>
        <div class="floating-detail-body">
          <div class="detail-row">
            <span class="detail-label">名称</span>
            <span class="detail-value">{{ selectedNode.label }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">分类</span>
            <a-tag :color="getTypeColor(selectedNode.type)">
              {{ getTypeName(selectedNode.type) }}
            </a-tag>
          </div>
          <div v-if="selectedNode.content" class="detail-row">
            <span class="detail-label">描述</span>
            <span class="detail-value multiline">{{ selectedNode.content }}</span>
          </div>
          <div v-if="selectedNode.prerequisites?.length" class="detail-row">
            <span class="detail-label">前置知识</span>
            <span class="detail-value multiline">{{ selectedNode.prerequisites.join('、') }}</span>
          </div>
        </div>
      </div>

      <div v-if="!nodes.length" class="empty-state">暂无知识图谱数据</div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { CloseOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import { ensureTreeIds } from '@/utils/index.js'

const props = defineProps({
  treeData: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: '知识图谱'
  }
})

const emit = defineEmits(['nodeClick', 'selectNode'])

const chartRef = ref(null)
const nodes = ref([])
const links = ref([])
const selectedNode = ref(null)

let chartInstance = null
let resizeObserver = null

const colors = {
  root: '#4f7fd5',
  blue: '#5271c4',
  green: '#82bf6f',
  orange: '#ff7f50',
  cyan: '#63c8e8',
  red: '#f0645b',
  yellow: '#f8c85a'
}

const branchPalette = [
  colors.green,
  colors.blue,
  colors.orange,
  colors.cyan,
  colors.red,
  colors.yellow
]

const typeNames = {
  root: '核心',
  chapter: '章节',
  sub_chapter: '子章节',
  point: '知识点'
}

const typeColors = {
  root: 'blue',
  chapter: 'blue',
  sub_chapter: 'cyan',
  point: 'green'
}

const graphOption = computed(() => ({
  backgroundColor: '#ffffff',
  animationDurationUpdate: 1500,
  tooltip: {
    trigger: 'item',
    confine: true,
    formatter(params) {
      if (params.dataType !== 'node') return ''
      const data = params.data || {}
      const original = data.originalNode || {}
      let content = original.content || original.description || ''

      if (!content) {
        const childNames = getChildNames(data)
        content = childNames.length
          ? `包含相关知识点：<br/>${childNames.map(escapeHtml).join('<br/>')}`
          : '暂无详细描述'
      } else {
        content = escapeHtml(content)
      }

      return `<div style="max-width: 400px; word-wrap: break-word; white-space: normal;">
        <strong>${escapeHtml(params.name)}</strong><br/>
        ${content}
      </div>`
    },
    textStyle: {
      overflow: 'breakAll',
      whiteSpace: 'normal'
    }
  },
  series: [
    {
      type: 'graph',
      layout: 'none',
      data: nodes.value,
      links: links.value,
      roam: true,
      draggable: false,
      left: 12,
      right: 12,
      top: 12,
      bottom: 12,
      lineStyle: {
        color: 'source',
        curveness: 0.2,
        width: 1.5,
        opacity: 0.3
      },
      emphasis: {
        focus: 'none'
      }
    }
  ]
}))

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getTypeName(type) {
  return typeNames[type] || type || '知识点'
}

function getTypeColor(type) {
  return typeColors[type] || 'default'
}

function getChildNames(node) {
  const childIds = node.childrenIds || node.originalNode?.childrenIds || []

  if (!childIds.length) return []

  return childIds
    .map(childId => {
      const child = nodes.value.find(item => item.id === String(childId))
      if (!child) return ''

      const childOriginal = child.originalNode || {}
      const childContent = childOriginal.content || childOriginal.description || ''
      return childContent ? `${child.name}：${childContent}` : child.name
    })
    .filter(Boolean)
}

function flattenTree(tree) {
  const flatNodes = []
  const flatLinks = []

  function visit(item, parentId = null, depth = 1, branchIndex = 0) {
    const id = String(item.id)
    const node = {
      ...item,
      id,
      sourceItem: item,
      depth,
      branchIndex,
      childrenIds: item.children ? item.children.map(child => String(child.id)) : []
    }
    flatNodes.push(node)

    if (parentId) {
      flatLinks.push({
        source: String(parentId),
        target: id,
        branchIndex,
        depth
      })
    }

    if (item.children?.length) {
      item.children.forEach(child => visit(child, id, depth + 1, branchIndex))
    }
  }

  tree.forEach((item, index) => visit(item, null, 1, index))
  return { flatNodes, flatLinks }
}

function getDescendantLeafCount(node, nodeMap) {
  if (!node.childrenIds?.length) return 1
  return node.childrenIds.reduce((total, childId) => {
    const child = nodeMap.get(childId)
    return total + (child ? getDescendantLeafCount(child, nodeMap) : 0)
  }, 0)
}

function buildGraphData() {
  const tree = ensureTreeIds(props.treeData || [])

  if (!tree.length) {
    nodes.value = []
    links.value = []
    selectedNode.value = null
    return
  }

  const { flatNodes, flatLinks } = flattenTree(tree)
  const root = {
    id: 'virtual-root',
    label: '核心知识点',
    type: 'root',
    depth: 0,
    branchIndex: 0,
    childrenIds: tree.map(item => String(item.id))
  }
  const allNodes = [root, ...flatNodes]
  const nodeMap = new Map(allNodes.map(node => [node.id, node]))
  const graphNodes = []
  const graphLinks = []

  root.x = 0
  root.y = 0
  graphNodes.push(toEchartsNode(root, colors.root, true))

  const branches = root.childrenIds.map((id, index) => {
    const node = nodeMap.get(id)
    const leafCount = node ? getDescendantLeafCount(node, nodeMap) : 1
    return {
      id,
      index,
      weight: Math.max(3, leafCount)
    }
  })

  const totalWeight = branches.reduce((sum, branch) => sum + branch.weight, 0)
  let currentAngle = -Math.PI / 2

  branches.forEach(branch => {
    const sectorAngle = (branch.weight / totalWeight) * 2 * Math.PI
    const color = branchPalette[branch.index % branchPalette.length]

    graphLinks.push(toEchartsLink('virtual-root', branch.id, color, 1))
    placeBranch(branch.id, nodeMap, graphNodes, graphLinks, color, currentAngle, currentAngle + sectorAngle, 1)
    currentAngle += sectorAngle
  })

  flatLinks.forEach(link => {
    const color = branchPalette[link.branchIndex % branchPalette.length]
    graphLinks.push(toEchartsLink(link.source, link.target, color, link.depth))
  })

  nodes.value = graphNodes
  links.value = graphLinks
}

function placeBranch(nodeId, nodeMap, graphNodes, graphLinks, color, startAngle, endAngle, depth) {
  const node = nodeMap.get(nodeId)
  if (!node) return

  const midAngle = (startAngle + endAngle) / 2
  const radius = getRadius(depth)
  node.x = radius * Math.cos(midAngle)
  node.y = radius * Math.sin(midAngle)
  graphNodes.push(toEchartsNode(node, color))

  if (!node.childrenIds?.length) return

  const totalLeaves = getDescendantLeafCount(node, nodeMap)
  const padding = Math.max((endAngle - startAngle) * 0.06, 0.025)
  const usableStart = startAngle + padding
  const usableEnd = endAngle - padding
  const usableRange = Math.max(usableEnd - usableStart, 0.04)
  let childAngle = usableStart

  node.childrenIds.forEach(childId => {
    const child = nodeMap.get(childId)
    if (!child) return

    const childLeaves = getDescendantLeafCount(child, nodeMap)
    const childRange = (childLeaves / totalLeaves) * usableRange
    placeBranch(childId, nodeMap, graphNodes, graphLinks, color, childAngle, childAngle + childRange, depth + 1)
    childAngle += childRange
  })
}

function getRadius(depth) {
  const radiusStep = 300
  return depth * radiusStep
}

function getSymbolSize(node, isRoot) {
  if (isRoot) return 40
  return Math.max(14, 40 - node.depth * 6)
}

function toEchartsNode(node, color, isRoot = false) {
  const x = node.x || 0
  const y = node.y || 0

  return {
    id: node.id,
    name: node.label || '未命名节点',
    x,
    y,
    fixed: true,
    category: node.type,
    originalNode: node.sourceItem || node,
    childrenIds: node.childrenIds || [],
    symbol: 'circle',
    symbolSize: getSymbolSize(node, isRoot),
    itemStyle: {
      color,
      borderColor: '#ffffff',
      borderWidth: isRoot ? 4 : 0,
      shadowBlur: isRoot ? 10 : 4,
      shadowColor: 'rgba(0, 0, 0, 0.16)'
    },
    emphasis: {
      scale: 1.35,
      itemStyle: {
        color,
        shadowBlur: 16,
        shadowColor: 'rgba(0, 0, 0, 0.28)'
      }
    },
    label: {
      show: true,
      position: 'bottom',
      distance: 8,
      color,
      fontSize: Math.max(10, 14 - node.depth),
      align: 'center',
      backgroundColor: 'rgba(255,255,255,0.8)',
      padding: [2, 4],
      borderRadius: 3,
      overflow: 'none',
      whiteSpace: 'nowrap'
    }
  }
}

function toEchartsLink(source, target, color, depth) {
  return {
    source,
    target,
    lineStyle: {
      color,
      curveness: 0.2,
      width: 1.5,
      opacity: 0.3
    }
  }
}

function renderChart() {
  if (!chartRef.value) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
    chartInstance.on('click', handleChartClick)
  }

  chartInstance.setOption(graphOption.value, true)
}

function handleChartClick(params) {
  if (params.dataType !== 'node') return

  const original = params.data.originalNode || {}
  selectedNode.value = {
    id: original.id || params.data.id,
    label: params.name,
    type: original.type || params.data.category || 'root',
    content: original.content || '',
    prerequisites: Array.isArray(original.prerequisites) ? original.prerequisites : []
  }

  emit('nodeClick', selectedNode.value)
  emit('selectNode', selectedNode.value)
}

function resizeChart() {
  chartInstance?.resize()
}

function updateGraph() {
  buildGraphData()
  nextTick(renderChart)
}

function getImageDataUrl() {
  return chartInstance?.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#ffffff'
  })
}

onMounted(() => {
  updateGraph()

  if (window.ResizeObserver && chartRef.value) {
    resizeObserver = new ResizeObserver(resizeChart)
    resizeObserver.observe(chartRef.value)
  } else {
    window.addEventListener('resize', resizeChart)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  } else {
    window.removeEventListener('resize', resizeChart)
  }

  if (chartInstance) {
    chartInstance.off('click', handleChartClick)
    chartInstance.dispose()
    chartInstance = null
  }
})

watch(() => props.treeData, updateGraph, { deep: true })
watch(() => props.title, updateGraph)

defineExpose({
  nodes,
  links,
  updateGraph,
  selectedNode,
  getImageDataUrl,
  getChartInstance: () => chartInstance
})
</script>

<style scoped>
.knowledge-echarts-graph {
  width: 100%;
  min-height: 0;
  padding: 16px;
  background: #ffffff;
  overflow: auto;
}

.graph-surface {
  position: relative;
  width: min(100%, 1040px);
  aspect-ratio: 1 / 1;
  margin: 0 auto;
  background: #ffffff;
}

.chart-canvas {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.floating-detail {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 2;
  width: min(340px, calc(100% - 32px));
  max-height: calc(100% - 32px);
  overflow: auto;
  border: 1px solid rgba(234, 236, 240, 0.9);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(8px);
}

.floating-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid #f0f0f0;
}

.floating-detail-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1677ff;
  font-size: 15px;
  font-weight: 700;
}

.detail-close {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #667085;
  cursor: pointer;
}

.detail-close:hover {
  background: #f2f4f7;
  color: #1f2937;
}

.floating-detail-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 10px;
  border-left: 3px solid #1677ff;
}

.detail-label {
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.detail-value {
  color: #1f2937;
  font-size: 14px;
  line-height: 1.65;
}

.detail-value.multiline {
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #98a2b3;
  font-size: 14px;
  pointer-events: none;
}

@media screen and (max-width: 768px) {
  .knowledge-echarts-graph {
    padding: 8px;
  }

  .floating-detail {
    top: auto;
    right: 12px;
    bottom: 12px;
    left: 12px;
    width: auto;
    max-height: 260px;
  }
}
</style>
