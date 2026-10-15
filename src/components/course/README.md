# 课程详情相关组件

本课程详情相关的组件位于 `src/components/course/` 目录下，主要用于展示和管理单个课程的详细信息。

## 组件结构

```
src/components/course/
├── CourseHeader.vue                    # 课程信息头部组件
├── CourseTabs.vue                     # 课程功能标签页组件
└── modules/                           # 课程各功能模块
    ├── BasicInfoModule.vue           # 基本信息模块
    ├── VideoModule.vue               # 课程视频模块
    ├── KnowledgeGraphModule.vue      # 知识图谱模块
    └── ManagementModule.vue          # 课程管理模块
```

## 主要组件说明

### CourseHeader.vue
**位置**: `src/components/course/CourseHeader.vue`
**用途**: 展示课程的核心信息和统计数据
**功能特性**:
- 课程封面图片展示
- 课程标题、描述和元信息
- 教师、创建时间、课时数等关键信息
- 学习统计卡片（学生数、知识点数、完成率、视频数）
- 操作按钮（编辑、预览、分享）

### CourseTabs.vue
**位置**: `src/components/course/CourseTabs.vue`
**用途**: 提供课程功能模块的标签页导航
**功能特性**:
- 四个主要功能标签：基本信息、课程视频、知识图谱、课程管理
- 图标化标签设计，提升用户体验
- 支持自定义内容插槽
- 响应式布局适配

### 模块组件

#### BasicInfoModule.vue (已完善)
**位置**: `src/components/course/modules/BasicInfoModule.vue`
**用途**: 展示课程的基本信息和学习分析
**功能特性**:
- 学习概览统计（学生数、知识点数、完成率、视频数）
- 学习进度分析图表
- 详细的课程信息表格
- 教师信息展示和联系方式
- 响应式设计，适配不同屏幕尺寸

#### VideoModule.vue
**位置**: `src/components/course/modules/VideoModule.vue`
**用途**: 课程视频播放和管理
**功能特性**:
- 当前视频播放区域
- 视频列表展示
- 播放控制功能
- 字幕切换
- 章节管理

#### KnowledgeGraphModule.vue
**位置**: `src/components/course/modules/KnowledgeGraphModule.vue`
**用途**: 知识图谱可视化展示
**功能特性**:
- 图谱数据概览
- 交互式知识图谱可视化
- 知识点关联关系展示
- 节点详情面板
- 图谱分析工具

#### ManagementModule.vue
**位置**: `src/components/course/modules/ManagementModule.vue`
**用途**: 课程管理功能
**功能特性**:
- 快速操作入口
- 班级管理
- 学生管理
- 作业管理
- 数据分析报表

## 使用示例

### 基础用法

```vue
<template>
  <div class="course-detail-page">
    <!-- 课程头部信息 -->
    <CourseHeader
      :course-info="courseDetail"
      :loading="loading"
      @edit="handleEdit"
      @preview="handlePreview"
      @share="handleShare"
    />

    <!-- 功能标签页 -->
    <CourseTabs
      :active-tab="currentTab"
      :course-id="courseId"
      @update:activeTab="currentTab = $event"
      @tab-change="handleTabChange"
    >
      <!-- 基本信息模块 -->
      <template #basic>
        <BasicInfoModule
          :course-id="courseId"
          :course-info="courseDetail"
          :loading="loading"
          @contact-teacher="handleContactTeacher"
          @view-profile="handleViewProfile"
        />
      </template>

      <!-- 其他模块插槽... -->
    </CourseTabs>
  </div>
</template>
```

### 脚本部分

```javascript
<script setup>
import {
  ref,
  onMounted,
  watch
} from 'vue'
import {
  getCourseDetailApi
} from '@/api/course'

// 组件引用
import CourseHeader from '@/components/course/CourseHeader.vue'
import CourseTabs from '@/components/course/CourseTabs.vue'
import BasicInfoModule from '@/components/course/modules/BasicInfoModule.vue'

const props = defineProps({
  courseId: {
    type: [String, Number],
    required: true
  }
})

const currentTab = ref('basic')
const courseDetail = ref({})
const loading = ref(false)

// 获取课程详情
const fetchCourseDetail = async () => {
  loading.value = true
  try {
    const res = await getCourseDetailApi(props.courseId)
    courseDetail.value = res.data || {}
  } catch (error) {
    console.error('获取课程详情失败:', error)
  } finally {
    loading.value = false
  }
}

// 事件处理
const handleTabChange = (tabKey) => {
  currentTab.value = tabKey
  // 可以根据不同的标签页加载相应的数据
}

const handleEdit = () => {
  // 跳转到课程编辑页面
  router.push(`/course/${props.courseId}/edit`)
}

const handleContactTeacher = (teacherInfo) => {
  // 联系教师的逻辑
  console.log('联系教师:', teacherInfo)
}

onMounted(fetchCourseDetail)
watch(() => props.courseId, fetchCourseDetail)
</script>
```

## 依赖关系

- **API接口**: 依赖于 `src/api/course.js` 中的课程相关API
- **状态管理**: 可与Pinia store集成获取全局状态
- **UI组件**: 基于 Ant Design Vue 组件库
- **路由**: 需要 Vue Router 进行页面导航

## 样式设计

所有组件都采用了现代化的设计风格：
- **圆角设计**: 使用12px-16px的圆角，营造柔和的视觉体验
- **渐变背景**: 在统计卡片中使用蓝绿色渐变，增加视觉层次
- **阴影效果**: 悬停时添加阴影，提升交互反馈
- **响应式布局**: 适配桌面端、平板和移动端设备
- **色彩系统**: 遵循Ant Design的设计规范，使用品牌主色#1890ff

## 注意事项

1. **数据格式**: 确保传入的 `courseInfo` 对象包含正确的字段结构
2. **加载状态**: 合理使用 `loading` 属性提供良好的用户体验
3. **错误处理**: API调用需要适当的错误处理和用户提示
4. **权限控制**: 根据用户角色显示不同的功能和操作按钮
5. **性能优化**: 对于大数据量的展示考虑分页或懒加载机制