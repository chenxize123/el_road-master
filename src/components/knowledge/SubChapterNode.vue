<!--
 * @Date         : 2026-07-21
 * @Description  : 递归子章节节点组件
 * @FilePath     : SubChapterNode.vue
-->
<template>
  <div class="sub-chapters" :style="{ paddingLeft: depth * 16 + 'px' }">
    <a-collapse v-model:activeKeys="activeKeys" :bordered="false">
      <a-collapse-panel :key="node.id" :class="depth === 1 ? 'sub-chapter-panel' : 'nested-sub-chapter-panel'">
        <template #header>
          <div class="panel-header">
            <span class="chapter-icon">{{ depth === 1 ? '📖' : '📄' }}</span>
            <span class="chapter-title">{{ node.label }}</span>
            <a-tag :color="depth === 1 ? 'cyan' : 'orange'" class="chapter-tag">
              {{ depth === 1 ? '子章节' : '小节' }}
            </a-tag>
            <span class="point-count" v-if="totalPointCount > 0">
              {{ totalPointCount }} 个知识点
            </span>
          </div>
        </template>

        <!-- 内容摘要 -->
        <p v-if="node.content" class="node-content">{{ node.content }}</p>

        <!-- 递归渲染子章节 -->
        <template v-if="subChapters.length > 0">
          <SubChapterNode
            v-for="child in subChapters"
            :key="child.id"
            :node="child"
            :depth="depth + 1"
          />
        </template>

        <!-- 知识点列表 -->
        <div v-if="points.length > 0" class="points-list">
          <a-list :data-source="points" size="small">
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
                    <div v-if="item.prerequisites && item.prerequisites.length > 0" class="prerequisites">
                      <span class="prereq-label">前置知识：</span>
                      <a-tag v-for="prereq in item.prerequisites" :key="prereq" size="small" class="prereq-tag">
                        {{ prereq }}
                      </a-tag>
                    </div>
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </div>

        <a-empty v-if="!subChapters.length && !points.length" description="暂无内容" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Empty } from 'ant-design-vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  depth: {
    type: Number,
    default: 1
  }
})

const activeKeys = ref([])

// 子章节（type 不是 point 的子节点）
const subChapters = computed(() => {
  if (!props.node.children) return []
  return props.node.children.filter(child => child.type !== 'point')
})

// 直接知识点
const points = computed(() => {
  if (!props.node.children) return []
  return props.node.children.filter(child => child.type === 'point')
})

// 递归统计知识点总数
const totalPointCount = computed(() => {
  function countPoints(node) {
    let count = 0
    if (node.children) {
      node.children.forEach(child => {
        if (child.type === 'point') count++
        else count += countPoints(child)
      })
    }
    return count
  }
  return countPoints(props.node)
})
</script>

<style scoped>
.sub-chapters {
  margin-bottom: 8px;
}

.sub-chapter-panel {
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 6px;
  border: 1px solid #f0f0f0 !important;
}

.nested-sub-chapter-panel {
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 4px;
  border: 1px solid #e8e8e8 !important;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
}

.chapter-icon {
  font-size: 16px;
}

.chapter-title {
  flex: 1;
  font-size: 14px;
}

.chapter-tag {
  font-size: 12px;
}

.point-count {
  color: #8c8c8c;
  font-size: 12px;
}

.node-content {
  color: #595959;
  font-size: 13px;
  margin: 0 0 12px 0;
  line-height: 1.6;
  padding: 8px 12px;
  background: #fffbe6;
  border-radius: 4px;
  border-left: 3px solid #faad14;
}

.points-list {
  padding: 8px 0;
}

.point-item {
  padding: 10px 0;
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
  font-size: 13px;
  margin: 4px 0 0 0;
  line-height: 1.6;
}

.prerequisites {
  margin-top: 8px;
}

.prereq-label {
  color: #8c8c8c;
  font-size: 12px;
  margin-right: 8px;
}

.prereq-tag {
  margin: 2px;
}
</style>
