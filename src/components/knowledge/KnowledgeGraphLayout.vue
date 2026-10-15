<!--
 * @Date         : 2026-05-18
 * @Description  : 知识图谱布局组件 - 支持树形图、关系图、文字列表切换
 * @FilePath     : KnowledgeGraphLayout.vue
 * @Version      : V1.0.0
-->
<template>
  <div class="knowledge-graph-layout">
    <!-- 头部工具栏 -->
    <div class="layout-header">
      <div class="header-left">
        <slot name="title">
          <h2>知识图谱</h2>
        </slot>
        <slot name="subtitle">
          <span v-if="title" class="subtitle">{{ title }}</span>
        </slot>
      </div>

      <div class="header-right">
        <!-- 视图切换 -->
        <a-radio-group v-model:value="currentView" button-style="solid" class="view-switcher">
          <a-radio-button value="tree">
            <template #icon><ApartmentOutlined /></template>
            树形图
          </a-radio-button>
          <a-radio-button value="graph">
            <template #icon><ShareAltOutlined /></template>
            关系图
          </a-radio-button>
          <a-radio-button value="list">
            <template #icon><UnorderedListOutlined /></template>
            文字列表
          </a-radio-button>
        </a-radio-group>

        <!-- 下载按钮 -->
        <a-dropdown placement="bottomRight" trigger="click">
          <a-button type="primary">
            <template #icon><DownloadOutlined /></template>
            下载
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item key="word" @click="downloadWord">
                <FileWordOutlined /> 下载 Word
              </a-menu-item>
              <a-menu-item key="json" @click="downloadJson">
                <FileTextOutlined /> 下载 JSON
              </a-menu-item>
              <a-menu-item key="image" @click="downloadImage">
                <PictureOutlined /> 下载图片
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="layout-content" ref="contentRef">
      <div class="view-container" :class="currentView">
        <!-- 树形图视图 -->
        <div v-if="currentView === 'tree'" class="tree-view">
          <slot name="tree"></slot>
        </div>

        <!-- 关系图视图 -->
        <div v-else-if="currentView === 'graph'" class="graph-view">
          <slot name="graph"></slot>
        </div>

        <!-- 文字列表视图 -->
        <div v-else-if="currentView === 'list'" class="list-view">
          <slot name="list"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ApartmentOutlined,
  ShareAltOutlined,
  UnorderedListOutlined,
  DownloadOutlined,
  DownOutlined,
  FileTextOutlined,
  PictureOutlined,
  FileWordOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const props = defineProps({
  title: String,
  data: Object
})

const emit = defineEmits(['download'])

const currentView = ref('tree')
const contentRef = ref(null)

// 下载 JSON
function downloadJson() {
  if (!props.data) {
    message.warning('没有可下载的数据')
    return
  }

  const dataStr = JSON.stringify(props.data, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `knowledge-graph-${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  message.success('JSON 文件下载成功')
}

// 下载图片
function downloadImage() {
  if (!contentRef.value) {
    message.warning('无法获取内容区域')
    return
  }

  // 触发下载事件，让父组件处理具体的截图逻辑
  emit('download', { type: 'image', view: currentView })
  message.info('准备下载图片...')
}

// 下载 Word
function downloadWord() {
  if (!props.data) {
    message.warning('没有可下载的数据')
    return
  }

  try {
    // 生成 Word 文档内容
    const wordContent = generateWordContent(props.data)
    const blob = new Blob(['﻿', wordContent], { type: 'application/msword;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `knowledge-graph-${Date.now()}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success('Word 文档下载成功')
  } catch (err) {
    console.error('下载 Word 失败:', err)
    message.error('下载失败: ' + err.message)
  }
}

// 生成 Word 文档内容（HTML 格式）
function generateWordContent(data) {
  const courseName = data.course || '知识图谱'
  const knowledgePoints = data.knowledge_point || []

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${courseName} - 知识图谱</title>
  <style>
    body { font-family: 'Microsoft YaHei', Arial, sans-serif; padding: 20px; }
    h1 { color: #1890ff; border-bottom: 2px solid #1890ff; padding-bottom: 10px; }
    h2 { color: #13c2c2; margin-top: 30px; }
    h3 { color: #52c41a; margin-top: 20px; }
    .chapter { margin-left: 0; }
    .sub-chapter { margin-left: 20px; }
    .point { margin-left: 40px; padding: 10px; background: #f6ffed; border-left: 3px solid #52c41a; margin: 10px 0; }
    .point-title { font-weight: bold; }
    .point-content { color: #666; margin-top: 5px; }
    .prerequisites { color: #8c8c8c; font-size: 14px; margin-top: 5px; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px; }
    .tag-chapter { background: #e6f7ff; color: #1890ff; }
    .tag-sub-chapter { background: #e6fffb; color: #13c2c2; }
    .tag-point { background: #f6ffed; color: #52c41a; }
  </style>
</head>
<body>
  <h1>${courseName} - 知识图谱</h1>
  <p style="color: #8c8c8c;">生成时间: ${new Date().toLocaleString('zh-CN')}</p>
`

  // 递归生成内容
  function renderNodes(nodes, level = 0) {
    nodes.forEach(node => {
      const tagClass = node.type === 'chapter' ? 'tag-chapter' :
                        node.type === 'sub_chapter' ? 'tag-sub-chapter' : 'tag-point'
      const tagLabel = node.type === 'chapter' ? '章节' :
                       node.type === 'sub_chapter' ? '子章节' : '知识点'

      if (node.type === 'chapter') {
        html += `<h2><span class="tag ${tagClass}">${tagLabel}</span> ${node.label}</h2>`
      } else if (node.type === 'sub_chapter') {
        html += `<h3><span class="tag ${tagClass}">${tagLabel}</span> ${node.label}</h3>`
      } else if (node.type === 'point') {
        html += `<div class="point">
          <div class="point-title">💡 ${node.label}</div>
          ${node.content ? `<div class="point-content">${node.content}</div>` : ''}
          ${node.prerequisites && node.prerequisites.length > 0 ?
            `<div class="prerequisites">前置知识: ${node.prerequisites.join(', ')}</div>` : ''}
        </div>`
      }

      if (node.children && node.children.length > 0) {
        renderNodes(node.children, level + 1)
      }
    })
  }

  renderNodes(knowledgePoints)

  html += `
</body>
</html>
  `

  return html
}

// 暴露方法
defineExpose({
  currentView
})
</script>

<style scoped>
.knowledge-graph-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 600px;
  background: white;
  border-radius: 8px;
}

.layout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  border-radius: 8px 8px 0 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #262626;
}

.subtitle {
  font-size: 14px;
  color: #8c8c8c;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.view-switcher {
  display: flex;
}

.layout-content {
  flex: 1;
  overflow: hidden;
}

.view-container {
  height: 100%;
  overflow: auto;
}

.view-container.tree,
.view-container.list {
  padding: 24px;
}

.view-container.graph {
  padding: 0;
}

/* 响应式设计 */
@media screen and (max-width: 900px) {
  .layout-header {
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .header-left {
    width: 100%;
    justify-content: center;
  }

  .header-right {
    width: 100%;
    justify-content: center;
  }

  .view-switcher {
    flex: 1;
  }
}

@media screen and (max-width: 600px) {
  .layout-header {
    padding: 12px;
  }

  .view-switcher :deep(.ant-radio-button-wrapper) {
    padding-inline: 8px;
    font-size: 13px;
  }

  .view-switcher :deep(.anticon) {
    margin-right: 4px;
  }

  .view-container.tree,
  .view-container.list {
    padding: 16px;
  }
}
</style>
