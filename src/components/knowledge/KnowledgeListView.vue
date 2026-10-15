<!--
 * @Date         : 2026-05-18
 * @Description  : 知识图谱文字列表视图
 * @FilePath     : KnowledgeListView.vue
 * @Version      : V1.0.1
-->
<template>
  <div class="knowledge-list-view">
    <!-- 搜索和筛选 -->
    <div class="list-toolbar">
      <a-input-search
        v-model:value="searchText"
        placeholder="搜索知识点..."
        style="width: 300px"
        allow-clear
        @search="onSearch"
      />
      <a-space>
        <a-select
          v-model:value="filterType"
          style="width: 120px"
          placeholder="筛选类型"
          allow-clear
        >
          <a-select-option value="chapter">章节</a-select-option>
          <a-select-option value="sub_chapter">子章节</a-select-option>
          <a-select-option value="point">知识点</a-select-option>
        </a-select>
        <a-button @click="expandAll" v-if="hasCollapsedItems">
          <template #icon><ExpandOutlined /></template>
          全部展开
        </a-button>
        <a-button @click="collapseAll" v-if="hasExpandedItems">
          <template #icon><CompressOutlined /></template>
          全部收起
        </a-button>
      </a-space>
    </div>

    <!-- 统计信息 -->
    <div class="list-stats" v-if="!searchText">
      <a-statistic title="总章节" :value="statData.chapterCount" :value-style="{ color: '#1890ff' }" />
      <a-divider type="vertical" />
      <a-statistic title="子章节" :value="statData.subChapterCount" :value-style="{ color: '#13c2c2' }" />
      <a-divider type="vertical" />
      <a-statistic title="知识点" :value="statData.pointCount" :value-style="{ color: '#52c41a' }" />
    </div>

    <!-- 列表内容 -->
    <div class="list-content">
      <a-collapse v-model:activeKeys="activeKeys" :bordered="false" ghost>
        <a-collapse-panel
          v-for="chapter in filteredChapters"
          :key="chapter.id"
          class="chapter-panel"
        >
          <template #header>
            <div class="panel-header">
              <span class="chapter-icon">📚</span>
              <span class="chapter-title">{{ chapter.label }}</span>
              <a-tag color="blue" class="chapter-tag">章节</a-tag>
            </div>
          </template>

          <!-- 子章节（递归渲染） -->
          <template v-if="chapter.children && chapter.children.length > 0">
            <SubChapterNode
              v-for="subChapter in filterChildren(chapter.children)"
              :key="subChapter.id"
              :node="subChapter"
              :depth="1"
            />
          </template>

          <!-- 直接挂在章节下的知识点 -->
          <div v-else-if="hasDirectPoints(chapter)" class="points-list">
            <a-list
              :data-source="getDirectPoints(chapter)"
              size="small"
            >
              <template #renderItem="{ item }">
                <a-list-item class="point-item">
                  <a-list-item-meta>
                    <template #avatar>
                      <a-avatar style="background: #52c41a; color: white">💡</a-avatar>
                    </template>
                    <template #title>
                      <span class="point-title">{{ item.label }}</span>
                      <a-tag color="green" class="point-tag">知识点</a-tag>
                    </template>
                    <template #description>
                      <p v-if="item.content" class="point-content">{{ item.content }}</p>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </div>

          <a-empty v-else description="暂无子章节" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </a-collapse-panel>
      </a-collapse>

      <a-empty v-if="filteredChapters.length === 0" description="没有找到匹配的内容" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { ExpandOutlined, CompressOutlined } from '@ant-design/icons-vue'
import { Empty } from 'ant-design-vue'
import { ensureTreeIds } from '@/utils/index.js'
import SubChapterNode from './SubChapterNode.vue'

const props = defineProps({
  treeData: {
    type: Array,
    default: () => []
  }
})

// 确保treeData有ID的处理后数据
const processedTreeData = computed(() => ensureTreeIds(props.treeData))

const searchText = ref('')
const filterType = ref('')
const activeKeys = ref([])
const subChapterActiveKeys = reactive({})

// 统计数据
const statData = computed(() => {
  const result = { chapterCount: 0, subChapterCount: 0, pointCount: 0 }

  function traverse(tree) {
    tree.forEach(item => {
      if (item.type === 'chapter') result.chapterCount++
      else if (item.type === 'sub_chapter') result.subChapterCount++
      else if (item.type === 'point') result.pointCount++

      if (item.children) {
        traverse(item.children)
      }
    })
  }

  traverse(processedTreeData.value)
  return result
})

// 是否有展开的项
const hasExpandedItems = computed(() => activeKeys.value.length > 0)
const hasCollapsedItems = computed(() => activeKeys.value.length < statData.value.chapterCount)

// 筛选子节点（返回所有子节点，由 SubChapterNode 内部区分类型）
function filterChildren(children) {
  if (!searchText.value && !filterType.value) {
    return children
  }
  return filterTree(children, true)
}

// 获取直接挂在某个节点下的知识点
function getDirectPoints(node) {
  if (!node.children) return []
  return node.children.filter(item => item.type === 'point')
}

// 获取某个节点下的知识点数量
function getPointCount(node) {
  if (!node.children) return 0
  return node.children.filter(item => item.type === 'point').length
}

// 是否有直接挂在节点下的知识点
function hasDirectPoints(node) {
  return getDirectPoints(node).length > 0
}

// 过滤树
function filterTree(tree, isSubLevel = false) {
  return tree
    .map(node => {
      const filteredChildren = node.children ? filterTree(node.children, isSubLevel) : []

      const matchesSearch = !searchText.value ||
        node.label.toLowerCase().includes(searchText.value.toLowerCase()) ||
        (node.content && node.content.toLowerCase().includes(searchText.value.toLowerCase()))

      const matchesType = !filterType.value || node.type === filterType.value

      const hasMatchingChildren = filteredChildren.length > 0

      if (isSubLevel && node.type === 'point' && !(matchesSearch || matchesType)) {
        return null
      }

      if ((matchesSearch && matchesType) || hasMatchingChildren) {
        return {
          ...node,
          children: hasMatchingChildren ? filteredChildren : node.children
        }
      }

      return null
    })
    .filter(Boolean)
}

// 过滤后的章节
const filteredChapters = computed(() => {
  if (!searchText.value && !filterType.value) {
    return processedTreeData.value
  }
  return filterTree(processedTreeData.value)
})

// 搜索
function onSearch(value) {
  searchText.value = value
  if (value) {
    expandAll()
  }
}

// 初始化子章节 keys
function initSubChapterKeys(chapters) {
  chapters.forEach(chapter => {
    if (chapter.children) {
      const subChapterIds = chapter.children
        .filter(item => item.type !== 'point')
        .map(item => item.id)
      subChapterActiveKeys[chapter.id] = subChapterIds
    }
  })
}

// 全部展开
function expandAll() {
  activeKeys.value = processedTreeData.value.map(item => item.id)
  initSubChapterKeys(processedTreeData.value)
}

// 全部收起
function collapseAll() {
  activeKeys.value = []
  Object.keys(subChapterActiveKeys).forEach(key => {
    subChapterActiveKeys[key] = []
  })
}

// 初始化
watch(processedTreeData, () => {
  expandAll()
}, { immediate: true, deep: true })
</script>

<style scoped>
.knowledge-list-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.list-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.list-content {
  flex: 1;
  overflow-y: auto;
}

.chapter-panel {
  background: white;
  border-radius: 8px;
  margin-bottom: 8px;
  border: 1px solid #f0f0f0 !important;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
}

.chapter-icon {
  font-size: 18px;
}

.chapter-title {
  flex: 1;
  font-size: 15px;
}

.chapter-tag {
  font-size: 12px;
}

.point-count {
  color: #8c8c8c;
  font-size: 13px;
}

.sub-chapters {
  padding-left: 16px;
}

.sub-chapter-panel {
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 6px;
}

.points-list {
  padding: 8px 0;
}

.point-item {
  padding: 12px 0;
}

.point-title {
  font-weight: 500;
  color: #262626;
}

.point-tag {
  margin-left: 8px;
}

.point-content {
  color: #595959;
  font-size: 14px;
  margin: 4px 0 0 0;
  line-height: 1.6;
}

.prerequisites {
  margin-top: 8px;
}

.prereq-label {
  color: #8c8c8c;
  font-size: 13px;
  margin-right: 8px;
}

.prereq-tag {
  margin: 2px;
}

/* 响应式 */
@media screen and (max-width: 900px) {
  .list-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .list-toolbar > * {
    width: 100%;
  }

  .list-toolbar .ant-input-search {
    width: 100%;
  }
}

@media screen and (max-width: 600px) {
  .list-toolbar {
    padding: 12px 0;
  }

  .panel-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .chapter-title {
    width: 100%;
    flex: none;
  }

  .list-stats {
    flex-direction: column;
    gap: 8px;
  }

  .list-stats .ant-divider {
    display: none;
  }
}
</style>
