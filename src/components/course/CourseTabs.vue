<!--
 * @Date         : 2026-05-13 14:30:00
 * @Description  : 课程功能标签页组件
 * @FilePath     : CourseTabs.vue
 * @LastEditTime : 2026-06-08 14:43:01
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="course-tabs-container">
    <!-- 标签页导航 -->
    <a-tabs
      :activeKey="activeTab"
      class="main-tabs"
      @change="handleTabChange"
      centered=true
    >
      <a-tab-pane key="basic" tab="基本信息">
        <template #tab>
          <span>
            <info-circle-outlined />
            基本信息
          </span>
        </template>
      </a-tab-pane>

      <a-tab-pane key="video" tab="课程视频">
        <template #tab>
          <span>
            <video-camera-outlined />
            课程视频
          </span>
        </template>
      </a-tab-pane>

      <a-tab-pane key="knowledge-graph" tab="知识图谱">
        <template #tab>
          <span>
            <project-outlined />
            知识图谱
          </span>
        </template>
      </a-tab-pane>

      <a-tab-pane key="lesson-plan" tab="课程教案">
        <template #tab>
          <span>
            <book-outlined />
            课程教案
          </span>
        </template>
      </a-tab-pane>

      <!-- <a-tab-pane key="management" tab="课程管理">
        <template #tab>
          <span>
            <setting-outlined />
            课程管理
          </span>
        </template>
      </a-tab-pane> -->

      <a-tab-pane key="question-bank" tab="题库">
        <template #tab>
          <span>
            <folder-outlined />
            题库
          </span>
        </template>
      </a-tab-pane>

      <a-tab-pane key="exam-paper" tab="试卷">
        <template #tab>
          <span>
            <file-text-outlined />
            试卷
          </span>
        </template>
      </a-tab-pane>

    </a-tabs>

    <!-- 标签页内容区域 -->
    <div class="tab-content">
      <slot :name="activeTab"></slot>
    </div>
  </div>
</template>

<script setup>
import {
  InfoCircleOutlined,
  VideoCameraOutlined,
  ProjectOutlined,
  BookOutlined,
  FolderOutlined,
  FileTextOutlined
} from '@ant-design/icons-vue'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'basic'
  },
  courseId: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['update:activeTab', 'tab-change'])

// 处理标签页切换
const handleTabChange = (key) => {
  emit('update:activeTab', key)
  emit('tab-change', key)
}
</script>

<style scoped>
.course-tabs-container {
  background: white;
}

.main-tabs {
  :deep(.ant-tabs-nav) {
    margin-bottom: 0;
    border-bottom: 1px solid #f0f0f0;
    position: none;
    /* 恢复原装默认样式，不需要在这里强行推了 */
  }

  :deep(.ant-tabs-tab) {
    padding: 16px 24px;
    font-size: 15px;
    font-weight: 500;
    color: #595959;
    transition: all 0.3s ease;

    &:hover {
      color: #1890ff;
    }

    .anticon {
      margin-right: 8px;
      font-size: 16px;
    }
  }

  :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
    color: #1890ff;
    font-weight: 600;
  }
}

.tab-content {
  min-height: 600px;
  padding: 24px;
}
</style>
