# 班级和课程总数接口集成实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps uses checkbox (`- [ ]`) syntax for tracking.

**Goal:** 集成 `/class/count` 和 `/course/count` 接口，实现管理员首页班级和课程列表的正确分页功能

**Architecture:** 采用最小改动方案，API 层添加新接口，AdminHome 管理分页状态和数据获取，CourseList 重构为纯展示组件

**Tech Stack:** Vue 3, Ant Design Vue, Vite, Pinia (existing)

---

## 文件结构映射

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/api/class.js` | 修改 | 添加 getClassCountApi 函数 |
| `src/api/course.js` | 修改 | 添加 getCourseCountApi 函数 |
| `src/views/admin/AdminHome.vue` | 修改 | 班级/课程分页逻辑，数据获取 |
| `src/components/courses/CourseList.vue` | 修改 | 重构为纯展示组件 |

---

### Task 1: 添加班级总数 API

**Files:**
- Modify: `src/api/class.js`

- [ ] **Step 1: 在 class.js 中添加 getClassCountApi 函数**

在文件末尾添加：

```javascript
// 获取班级总数
export async function getClassCountApi() {
  return api.get('/class/count')
}
```

- [ ] **Step 2: 验证文件语法**

确认文件没有语法错误，导出函数格式与现有一致。

- [ ] **Step 3: Commit**

```bash
git add src/api/class.js
git commit -m "feat: 添加班级总数 API 接口

- 新增 getClassCountApi() 函数
- 调用 /class/count 接口"
```

---

### Task 2: 添加课程总数 API

**Files:**
- Modify: `src/api/course.js`

- [ ] **Step 1: 在 course.js 中添加 getCourseCountApi 函数**

在 `getCourseVideosWithUrlsApi` 函数之后添加：

```javascript
// 获取课程总数
export async function getCourseCountApi() {
  return courseService.request('/course/count', {
    method: 'GET'
  })
}
```

- [ ] **Step 2: 验证文件语法**

确认函数使用 courseService.request 与其他 API 保持一致。

- [ ] **Step 3: Commit**

```bash
git add src/api/course.js
git commit -m "feat: 添加课程总数 API 接口

- 新增 getCourseCountApi() 函数
- 调用 /course/count 接口"
```

---

### Task 3: 修改 AdminHome.vue - 导入和状态

**Files:**
- Modify: `src/views/admin/AdminHome.vue`

- [ ] **Step 1: 更新导入语句**

找到第 87-89 行的导入部分，修改为：

```javascript
import { getClassListApi, getClassCountApi } from '@/api/class'
import { getUserListApi } from '@/api/dashboard'
import { getTeacherCourses, getCourseCountApi } from '@/api/course'
import { enrichClassListStats, extractClassListFromResponse } from '@/utils/classStats'
```

（移除了 `extractTotalFromResponse` 的导入）

- [ ] **Step 2: 添加课程分页状态**

在 `const pagination = ref({...})` 之后（约第 119 行）添加：

```javascript
// 课程分页配置
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

- [ ] **Step 3: Commit**

```bash
git add src/views/admin/AdminHome.vue
git commit -m "feat: AdminHome 添加课程分页状态和 API 导入

- 更新 API 导入语句，添加 getClassCountApi 和 getCourseCountApi
- 添加 coursePagination、courseLoading、courseList 状态"
```

---

### Task 4: 修改 AdminHome.vue - 班级 fetchData

**Files:**
- Modify: `src/views/admin/AdminHome.vue`

- [ ] **Step 1: 修改 fetchData 函数**

找到 `fetchData` 函数（约第 149 行），替换为：

```javascript
const fetchData = async () => {
  loading.value = true

  try {
    // 管理员：并行获取班级列表和总数
    const [classRes, countRes, userRes] = await Promise.all([
      getClassListApi({
        page: pagination.value.current,
        page_size: pagination.value.pageSize
      }),
      getClassCountApi(),
      getUserListApi()
    ])
    console.log('班级列表返回:', classRes)
    // 提取原始班级列表
    const rawClassList = extractClassListFromResponse(classRes)

    // 补充统计数据
    const enrichedList = await enrichClassListStats(rawClassList)

    // 更新班级列表
    classList.value = enrichedList

    // 从 count 接口获取总数
    pagination.value.total = countRes?.data || 0

    userList.value = userRes?.data || []
  } catch (error) {
    console.error('获取数据失败:', error)
    message.error('管理员首页数据加载失败')
  } finally {
    loading.value = false
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/views/admin/AdminHome.vue
git commit -m "feat: AdminHome 班级列表使用 count 接口获取总数

- 并行调用班级列表和班级总数接口
- 移除 extractTotalFromResponse 逻辑
- 从 countRes.data 获取总数"
```

---

### Task 5: 修改 AdminHome.vue - 添加课程相关函数

**Files:**
- Modify: `src/views/admin/AdminHome.vue`

- [ ] **Step 1: 添加 fetchCourses 函数**

在 `handleTableChange` 函数之后（约第 187 行）添加：

```javascript
const fetchCourses = async () => {
  courseLoading.value = true
  try {
    const [courseRes, countRes] = await Promise.all([
      getTeacherCourses({
        page: coursePagination.value.current,
        page_size: coursePagination.value.pageSize
      }),
      getCourseCountApi()
    ])
    
    // 从响应中提取课程列表（兼容现有格式）
    if (courseRes && courseRes.data && Array.isArray(courseRes.data.list)) {
      courseList.value = courseRes.data.list
    } else if (Array.isArray(courseRes)) {
      courseList.value = courseRes
    } else if (courseRes && Array.isArray(courseRes.data)) {
      courseList.value = courseRes.data
    } else {
      courseList.value = []
    }
    
    // 从 count 接口获取总数
    coursePagination.value.total = countRes?.data || 0
  } catch (error) {
    console.error('获取课程数据失败:', error)
    message.error('课程数据加载失败')
  } finally {
    courseLoading.value = false
  }
}

const handleCoursePageChange = (pag) => {
  coursePagination.value.current = pag.current
  coursePagination.value.pageSize = pag.pageSize
  fetchCourses()
}
```

- [ ] **Step 2: 修改 onMounted**

在 `onMounted(fetchData)` 处修改为：

```javascript
onMounted(() => {
  fetchData()
  fetchCourses()
})
```

- [ ] **Step 3: 修改 handleCreateCourseSuccess**

在 `handleCreateCourseSuccess` 函数中添加刷新课程列表：

```javascript
const handleCreateCourseSuccess = (courseData) => {
  // 添加到课程列表开头
  courseList.value.unshift(courseData)
  message.success('课程创建成功')
  // 刷新课程列表和总数
  fetchCourses()
}
```

- [ ] **Step 4: Commit**

```bash
git add src/views/admin/AdminHome.vue
git commit -m "feat: AdminHome 添加课程数据获取函数

- 新增 fetchCourses() 函数，并行获取课程列表和总数
- 新增 handleCoursePageChange() 处理课程分页
- onMounted 中同时调用 fetchData 和 fetchCourses
- 创建课程成功后刷新课程列表"
```

---

### Task 6: 修改 AdminHome.vue - 模板部分

**Files:**
- Modify: `src/views/admin/AdminHome.vue`

- [ ] **Step 1: 更新 CourseList 组件模板**

找到课程管理的 tab（约第 48-67 行），替换为：

```vue
<a-tab-pane key="courses" tab="课程管理">
  <CourseList
    user-role="admin"
    title="课程列表"
    layout="card"
    manage-button-text="进入课程"
    :course-list="courseList"
    :loading="courseLoading"
    :current-page="coursePagination.current"
    :page-size="coursePagination.pageSize"
    :total="coursePagination.total"
    :pagination-config="coursePagination"
    @manage-course="handleManageCourse"
    @page-change="handleCoursePageChange"
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
</a-tab-pane>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/admin/AdminHome.vue
git commit -m "feat: AdminHome 模板更新 CourseList 传参

- 传入 courseList、loading、分页状态等 props
- 监听 page-change 事件"
```

---

### Task 7: 修改 CourseList.vue - Props 和 Emits

**Files:**
- Modify: `src/components/courses/CourseList.vue`

- [ ] **Step 1: 更新 Props 定义**

找到 `defineProps`（约第 139 行），替换为：

```javascript
const props = defineProps({
  // 用户角色：teacher | admin
  userRole: {
    type: String,
    default: 'teacher'
  },
  // 教师 ID（用于 API 参数）
  teacherId: {
    type: [String, Number],
    default: null
  },
  // 卡片标题
  title: {
    type: String,
    default: '课程列表'
  },
  // 布局类型：card | table
  layout: {
    type: String,
    default: 'card'
  },
  // 管理按钮文本
  manageButtonText: {
    type: String,
    default: '进入课程'
  },
  // 表格列配置
  columns: {
    type: Array,
    default: null
  },
  // 分页相关配置
  paginationConfig: {
    type: Object,
    default: () => ({
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`
    })
  },
  // 新增：父组件传入的数据
  courseList: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  currentPage: {
    type: Number,
    default: 1
  },
  pageSize: {
    type: Number,
    default: 10
  },
  total: {
    type: Number,
    default: 0
  }
})
```

- [ ] **Step 2: 更新 Emits 定义**

找到 `defineEmits`（约第 205 行），替换为：

```javascript
const emit = defineEmits([
  'manage-course',
  'course-click',
  'refresh',
  'page-change'
])
```

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/CourseList.vue
git commit -m "feat: CourseList 更新 Props 和 Emits 定义

- 新增 courseList、loading、currentPage、pageSize、total props
- 新增 page-change emit"
```

---

### Task 8: 修改 CourseList.vue - 移除内部状态和逻辑

**Files:**
- Modify: `src/components/courses/CourseList.vue`

- [ ] **Step 1: 移除封面相关状态**

删除 `coverUrlMap` ref 定义（约第 182 行）：

```javascript
// 存储课程封面 URL 的映射
const coverUrlMap = ref({})
```

替换为 watch 监听 courseList：

```javascript
// 存储课程封面 URL 的映射
const coverUrlMap = ref({})

// 监听课程列表变化，获取封面
watch(() => props.courseList, async (newList) => {
  if (newList && newList.length > 0) {
    await fetchAllCovers(newList)
  }
}, { immediate: true })
```

- [ ] **Step 2: 移除内部分页状态**

删除以下内部状态（约第 213-217 行）：

```javascript
// 内部状态
const loading = ref(false)
const courseList = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
```

- [ ] **Step 3: 保留封面获取函数**

确保以下函数保留（用于 watch 调用）：
- `fetchCourseCover`
- `fetchAllCovers`

- [ ] **Step 4: 修改模板中使用的变量**

在模板中，将 `loading` 改为 `props.loading`，`courseList` 改为 `props.courseList`，`currentPage` 改为 `props.currentPage`，`pageSize` 改为 `props.pageSize`，`total` 改为 `props.total`。

具体位置：
- 第 27 行：`v-if="loading && courseList.length === 0"` → `v-if="props.loading && props.courseList.length === 0"`
- 第 32 行：`v-if="layout === 'card' && !loading"` → `v-if="layout === 'card' && !props.loading"`
- 第 33 行：`v-for="item in courseList"` → `v-for="item in props.courseList"`
- 第 74 行：`v-else-if="layout === 'table' && !loading"` → `v-else-if="layout === 'table' && !props.loading"`
- 第 78-80 行：`current: currentPage, pageSize: pageSize, total: total` → `current: props.currentPage, pageSize: props.pageSize, total: props.total`
- 第 108 行：`v-if="!loading && courseList.length === 0"` → `v-if="!props.loading && props.courseList.length === 0"`
- 第 111 行：`v-if="layout === 'card' && total > 0 && !loading"` → `v-if="layout === 'card' && props.total > 0 && !props.loading"`
- 第 113-115 行：`:current="currentPage", :page-size="pageSize", :total="total"` → `:current="props.currentPage", :page-size="props.pageSize", :total="props.total"`

- [ ] **Step 5: 修改 handlePageChange 函数**

找到 `handlePageChange` 函数（约第 355 行），替换为：

```javascript
const handlePageChange = (page, pageSize) => {
  emit('page-change', { current: page, pageSize: pageSize })
}
```

- [ ] **Step 6: 移除 fetchCourses 函数**

删除整个 `fetchCourses` 函数（约第 288-344 行）

- [ ] **Step 7: 移除 onMounted 和 watch**

删除以下代码（约第 378-388 行）：

```javascript
// 自动获取数据
onMounted(() => {
  console.log(`🚀 CourseList组件已挂载，开始获取${props.userRole}课程数据`)
  fetchCourses(currentPage.value, pageSize.value)

  // 监听props变化时重新获取数据
  watch([() => props.userRole, () => props.teacherId], () => {
    console.log('🔄 Props发生变化，重新获取数据')
    fetchCourses(currentPage.value, pageSize.value)
  })
})
```

- [ ] **Step 8: 更新导入语句**

确保导入了 `watch`：

```javascript
import { computed, ref, watch, nextTick } from 'vue'
```

移除不需要的导入（如果有）。

- [ ] **Step 9: Commit**

```bash
git add src/components/courses/CourseList.vue
git commit -m "feat: CourseList 重构为纯展示组件

- 移除内部状态管理（loading、courseList、分页状态）
- 移除内部 API 调用 fetchCourses
- 移除 onMounted 自动获取逻辑
- 添加 watch 监听 props.courseList 变化获取封面
- 修改 handlePageChange emit page-change 事件
- 模板使用 props 中的数据"
```

---

### Task 9: 整体验证和测试

**Files:**
- Test: 运行项目验证功能

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

确认没有编译错误。

- [ ] **Step 2: 手动测试班级列表分页**

1. 以管理员身份登录
2. 进入管理员首页
3. 切换到"班级管理" tab
4. 验证分页显示正确的总数
5. 切换页码验证分页功能正常

- [ ] **Step 3: 手动测试课程列表分页**

1. 切换到"课程管理" tab
2. 验证分页显示正确的总数
3. 切换页码验证分页功能正常
4. 验证课程封面图片正常加载

- [ ] **Step 4: 运行 lint 检查**

```bash
npm run lint
```

修复任何 lint 警告/错误。

- [ ] **Step 5: Commit（如有 lint 修复）**

```bash
git add .
git commit -m "fix: 修复 lint 问题"
```

---

## 自审检查

### 1. Spec Coverage
- ✅ API 层添加 getClassCountApi - Task 1
- ✅ API 层添加 getCourseCountApi - Task 2  
- ✅ AdminHome 班级分页使用 count 接口 - Task 4
- ✅ AdminHome 添加课程分页逻辑 - Task 5
- ✅ CourseList 重构为纯展示组件 - Task 7-8

### 2. Placeholder Scan
- ✅ 无 TBD/TODO
- ✅ 所有步骤都有完整代码
- ✅ 所有路径都是精确的

### 3. Type Consistency
- ✅ 函数命名一致
- ✅ Props 名称在各组件中匹配
- ✅ Emits 事件名称一致

---

## 执行方式选择

Plan complete and saved to `docs/superpowers/plans/2026-05-21-class-course-count-pagination.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
