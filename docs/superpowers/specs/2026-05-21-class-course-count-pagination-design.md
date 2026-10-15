# 班级和课程总数接口集成设计文档

**日期：** 2026-05-21  
**作者：** Claude Code  
**版本：** 1.0

## 概述

本文档描述了在现有项目中集成班级和课程总数 API 接口的设计方案，以实现正确的分页功能。

## 背景

当前管理员首页的班级和课程列表分页功能存在以下问题：
1. 班级列表的总数是从列表响应中提取或根据当前页数据推断的
2. 课程列表的分页逻辑完全在组件内部，没有使用独立的总数接口

现在后端提供了两个新的接口：
- `GET /class/count` - 获取班级总数
- `GET /course/count` - 获取课程总数

两个接口都返回格式：
```json
{
  "code": 200,
  "message": "success", 
  "data": 1
}
```

## 设计方案

采用 **方案一：最小改动方案**，在现有架构基础上仅添加必要的改动。

### 1. API 层改动

#### 1.1 `src/api/class.js`
新增 `getClassCountApi()` 函数：
```javascript
// 获取班级总数
export async function getClassCountApi() {
  return api.get('/class/count')
}
```

#### 1.2 `src/api/course.js`
新增 `getCourseCountApi()` 函数：
```javascript
// 获取课程总数
export async function getCourseCountApi() {
  return courseService.request('/course/count', {
    method: 'GET'
  })
}
```

### 2. `AdminHome.vue` 改动

#### 2.1 导入新增的 API
```javascript
import { getClassListApi, getClassCountApi } from '@/api/class'
import { getTeacherCourses, getCourseCountApi } from '@/api/course'
```

#### 2.2 添加课程相关状态
```javascript
const coursePagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 条`
})
const courseLoading = ref(false)
const courseList = ref([])
```

#### 2.3 修改 `fetchData()` - 班级部分
- 移除 `extractTotalFromResponse` 相关逻辑
- 并行调用 `getClassListApi()` 和 `getClassCountApi()`
- 从 `getClassCountApi()` 响应的 `data` 字段获取总数

#### 2.4 新增 `fetchCourses()` 函数
负责获取课程列表和总数：
- 并行调用 `getTeacherCourses()` 和 `getCourseCountApi()`
- 兼容处理课程列表响应的多种格式
- 从 count 接口获取总数

#### 2.5 新增 `handleCoursePageChange()` 函数
处理课程分页变化事件。

#### 2.6 更新模板中的 CourseList 组件
传入必要的 props 并监听分页事件。

### 3. `CourseList.vue` 改动

#### 3.1 Props 调整
新增以下 props 接收父组件传入的数据：
- `courseList: Array` - 课程列表数据
- `loading: Boolean` - 加载状态
- `currentPage: Number` - 当前页码
- `pageSize: Number` - 每页条数
- `total: Number` - 总数

#### 3.2 移除内部状态管理
- 移除内部的 `loading`、`courseList`、`currentPage`、`pageSize`、`total` ref
- 移除 `onMounted` 中的自动获取逻辑
- 移除内部的 `fetchCourses()` 函数

#### 3.3 Emits 调整
新增 `page-change` 事件，通知父组件分页变化。

#### 3.4 封面图片获取
保留在组件内部，通过 `watch` 监听 `props.courseList` 变化来获取封面 URL。

## 改动文件列表

1. `src/api/class.js` - 新增班级总数 API
2. `src/api/course.js` - 新增课程总数 API
3. `src/views/admin/AdminHome.vue` - 集成分页逻辑
4. `src/components/courses/CourseList.vue` - 重构为纯展示组件

## 注意事项

1. 两个总数接口都需要认证 token
2. 返回的总数是所有班级/课程的总数（非用户相关）
3. 保持现有列表 API 的响应格式兼容处理
4. CourseList 组件的改动需确保不影响其他使用该组件的地方（如 TeacherHome）

## 后续优化方向（可选）

如果未来需要更清晰的架构分离，可以考虑：
- 将数据获取逻辑抽取到 composables
- 使用 Pinia store 管理分页状态
