<!--
 * @Date         : 2026-05-13 14:30:00
 * @Description  : 课程管理模块 - 简化框架版本
 * @FilePath     : ManagementModule.vue
 * @LastEditTime : 2026-05-13 14:30:00
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
-->
<template>
  <div class="management-module">
    <h2>课程管理模块</h2>
    <div class="content-placeholder">
      <p>这里是课程管理的展示区域</p>
      <p>包含：班级管理、学生管理、作业管理、数据分析等</p>
      <p>课程ID: {{ courseId }}</p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  courseId: {
    type: [String, Number],
    required: true
  },
  courseInfo: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.management-module {
  min-height: 600px;
}

.management-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 快速操作卡片 */
.quick-actions-card {
  border-radius: 12px;
}

.quick-actions-card .action-button {
  height: 80px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.quick-actions-card .action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.quick-actions-card .action-button .anticon {
  margin-right: 8px;
  font-size: 20px;
}

/* 班级管理卡片 */
.class-management-card {
  border-radius: 12px;
}

.class-management-card .class-filter {
  margin-bottom: 20px;
}

.class-management-card .class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.class-management-card .class-card {
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.class-management-card .class-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.class-management-card .class-card .class-cover {
  height: 120px;
  background: linear-gradient(135deg, #e6f7ff, #d9f7be);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #1890ff;
  gap: 8px;
}

.class-management-card .class-card .class-cover .anticon {
  font-size: 32px;
}

.class-management-card .class-card .class-name {
  margin: 12px 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: #262626;
}

.class-management-card .class-card .class-info {
  margin: 0 0 4px;
  color: #8c8c8c;
  font-size: 14px;
}

/* 进度概览卡片 */
.progress-overview-card {
  border-radius: 12px;
}

.progress-overview-card .progress-item {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #f6f9fc, #e8f4fd);
  border-radius: 12px;
  margin-bottom: 16px;
}

.progress-overview-card .progress-item:last-child {
  margin-bottom: 0;
}

.progress-overview-card .progress-number {
  font-size: 28px;
  font-weight: 700;
  color: #1890ff;
  margin-bottom: 8px;
}

.progress-overview-card .progress-label {
  font-size: 14px;
  color: #8c8c8c;
  font-weight: 500;
}

.progress-overview-card .progress-charts {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid #f0f0f0;
}

.progress-overview-card .progress-charts .chart-container h4 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.progress-overview-card .progress-charts .chart-container .chart-placeholder .chart-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}

.progress-overview-card .progress-charts .chart-container .chart-placeholder .chart-item .chart-label {
  width: 80px;
  font-size: 14px;
  color: #595959;
}

.progress-overview-card .progress-charts .chart-container .chart-placeholder .chart-item .chart-value {
  width: 40px;
  text-align: right;
  font-size: 14px;
  color: #8c8c8c;
}

.progress-overview-card .progress-charts .chart-container .chart-placeholder.mastery-chart .mastery-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 12px;
}

.progress-overview-card .progress-charts .chart-container .chart-placeholder.mastery-chart .mastery-item .point-name {
  width: 80px;
  font-size: 13px;
  color: #595959;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-overview-card .progress-charts .chart-container .chart-placeholder.mastery-chart .mastery-item .mastery-rate {
  width: 40px;
  text-align: right;
  font-size: 12px;
  color: #8c8c8c;
}

/* 响应式设计 */
@media screen and (max-width: 768px) {
  .management-content {
    gap: 16px;
  }

  .quick-actions-card .ant-row .ant-col {
    margin-bottom: 12px;
  }

  .quick-actions-card .ant-row .ant-col:last-child {
    margin-bottom: 0;
  }

  .class-management-card .class-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .class-management-card .class-filter .ant-row .ant-col {
    margin-bottom: 12px;
  }

  .class-management-card .class-filter .ant-row .ant-col:last-child {
    margin-bottom: 0;
  }

  .progress-overview-card .progress-charts .chart-container {
    margin-bottom: 24px;
  }

  .progress-overview-card .progress-charts .chart-container:last-child {
    margin-bottom: 0;
  }
}

@media screen and (max-width: 480px) {
  .class-management-card .class-grid {
    grid-template-columns: 1fr;
  }

  .progress-overview-card .progress-item {
    margin-bottom: 16px;
  }
}
</style>