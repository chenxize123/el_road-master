# 课程相关组件

本课程组件位于 `src/components/courses/` 目录下，包含了教师和管理员用于课程管理的核心组件。

## 组件说明

### CourseList.vue
- **位置**: `src/components/courses/CourseList.vue`
- **用途**: 显示课程列表，支持卡片和表格两种布局
- **适用角色**: 教师、管理员
- **功能特性**:
  - 卡片式展示课程信息（封面、标题、基本信息）
  - 表格式详细数据展示
  - 响应式设计，适配不同屏幕尺寸
  - 支持自定义工具栏和操作按钮插槽
  - 点击课程跳转到详情页面

### CourseCreateModal.vue
- **位置**: `src/components/courses/CourseCreateModal.vue`
- **用途**: 创建新课程模态框
- **适用角色**: 教师、管理员
- **功能特性**:
  - 表单验证（课程名称、描述、课时数等）
  - 角色差异化字段显示（管理员需要选择教师）
  - 异步API调用和错误处理
  - 成功回调和数据刷新

## API 接口

课程相关的API接口定义在 `src/api/course.js` 中：

```javascript
// 获取课程列表
import { getCourseListApi } from '@/api/course'
const res = await getCourseListApi(params)

// 创建课程
import { createCourseApi } from '@/api/course'
const res = await createCourseApi(courseData)

// 其他课程相关API...
```

## 使用示例

### TeacherHome.vue / AdminHome.vue

```vue
<template>
  <CourseList
    :course-list="courseList"
    :loading="loading"
    title="课程列表"
    layout="card"
    @manage-course="handleManageCourse"
  >
    <template #toolbar>
      <a-button type="primary" @click="showCreateCourseModal">
        新建课程
      </a-button>
    </template>
  </CourseList>

  <CourseCreateModal
    v-model:open="createCourseVisible"
    user-role="admin"
    @success="handleCreateCourseSuccess"
  />
</template>
```

## 依赖关系

- 依赖于 `src/api/course.js` 中的课程API接口
- 依赖于 `src/api/dashboard.js` 中的用户管理API
- 使用 Ant Design Vue 组件库
- 集成 Pinia 状态管理和 Vue Router

## 注意事项

1. **权限控制**: CourseList 组件会根据用户角色显示不同的数据
2. **导入路径**: 使用时请确保使用正确的导入路径 `@/components/courses/ComponentName.vue`
3. **API 配置**: 所有API调用都基于后端实际接口，可能需要根据后端实现调整参数格式