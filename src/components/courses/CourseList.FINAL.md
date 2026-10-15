# CourseList 组件 - 最终版本

## 🎯 核心功能

`CourseList.vue` 是一个**完全自包含的课程列表展示组件**，具有以下特点：

### ✅ 已实现的功能

1. **📡 自动API调用**
   - 使用统一端点：`{VITE_API_BASE_URL}/course/teacher_id/`
   - 通过集中管理的API服务获取数据
   - 内置认证支持（从localStorage获取token）

2. **🔐 认证集成**
   - 自动读取localStorage中的认证令牌
   - 添加Authorization头到API请求
   - 401错误处理和重新登录机制

3. **📊 数据管理**
   - 内部状态管理（loading, courseList, total等）
   - 响应式数据更新
   - 错误处理和空状态显示

4. **🎨 完整UI功能**
   - 卡片和表格两种布局
   - 分页控件支持
   - 丰富的插槽系统
   - 响应式设计

### 🚀 Props 配置

| Prop | Required | Default | Description |
|------|----------|---------|-------------|
| `userRole` | ❌ | `'teacher'` | 用户角色：`'teacher'` \| `'admin'` |
| `teacherId` | ✅(教师) | `null` | 教师ID（仅教师模式需要） |
| `title` | ❌ | `'课程列表'` | 页面标题 |
| `layout` | ❌ | `'card'` | 布局类型：`'card'` \| `'table'` |
| `manageButtonText` | ❌ | `'进入课程'` | 操作按钮文本 |
| `columns` | ❌ | `null` | 表格列配置（仅表格布局） |
| `paginationConfig` | ❌ | `{...}` | 分页控件配置 |

## 💻 使用方法

### 教师页面集成

```vue
<!-- src/views/teacher/TeacherHome.vue -->
<template>
  <a-tab-pane key="courses" tab="课程列表">
    <CourseList
      user-role="teacher"
      :teacher-id="currentUser.id"
      title="我负责的课程"
      layout="card"
      @manage-course="handleManageCourse"
      @course-click="handleCourseClick"
    />
  </a-tab-pane>
</template>

<script setup>
import CourseList from '@/components/courses/CourseList.vue'

const currentUser = { id: 123 } // 当前用户信息

const handleManageCourse = (course) => {
  router.push(`/course/${course.id}/manage`)
}

const handleCourseClick = (course) => {
  router.push(`/course/${course.id}`)
}
</script>
```

### 管理员页面集成

```vue
<!-- src/views/admin/AdminHome.vue -->
<template>
  <a-tab-pane key="courses" tab="课程管理">
    <CourseList
      user-role="admin"
      title="全部课程管理"
      layout="table"
      manage-button-text="管理"
      @manage-course="handleManageCourse"
    >
      <template #toolbar>
        <a-button type="primary">新建课程</a-button>
      </template>
    </CourseList>
  </a-tab-pane>
</template>

<script setup>
import CourseList from '@/components/courses/CourseList.vue'

const handleManageCourse = (course) => {
  console.log('进入课程:', course)
  // 处理课程管理逻辑
}
</script>
```

## 🔧 Slots 系统

### toolbar - 顶部操作栏
```vue
<CourseList v-slot:toolbar>
  <a-space>
    <a-button type="primary" @click="showCreateModal">
      新建课程
    </a-button>
    <a-button @click="refreshData">
      刷新
    </a-button>
  </a-space>
</CourseList>
```

### course-actions - 单个课程的操作按钮
```vue
<CourseList v-slot:course-actions="{ course }">
  <a-space>
    <a-button size="small" @click.stop="viewDetails(course)">
      查看详情
    </a-button>
    <a-button size="small" type="primary" @click.stop="editCourse(course)">
      编辑课程
    </a-button>
  </a-space>
</CourseList>
```

### table-actions - 表格行的操作按钮
```vue
<CourseList v-slot:table-actions="{ course }">
  <a-dropdown>
    <a-button size="small">操作</a-button>
    <template #overlay>
      <a-menu>
        <a-menu-item @click="editCourse(course)">编辑</a-menu-item>
        <a-menu-item @click="deleteCourse(course)">删除</a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</CourseList>
```

### search - 搜索栏
```vue
<CourseList v-slot:search>
  <a-input-search
    placeholder="搜索课程名称"
    style="width: 300px"
    @search="onSearch"
  />
</CourseList>
```

### filter - 筛选器
```vue
<CourseList v-slot:filter>
  <a-select
    v-model:value="selectedCategory"
    placeholder="选择分类"
    @change="onFilterChange"
  >
    <a-select-option value="">全部分类</a-select-option>
    <a-select-option value="math">数学</a-select-option>
  </a-select>
</CourseList>
```

### footer - 底部信息
```vue
<CourseList v-slot:footer>
  <div class="summary-info">
    <span>共 {{ total }} 门课程</span>
    <a-divider type="vertical" />
    <span>平均完成率: {{ averageCompletion }}%</span>
  </div>
</CourseList>
```

## 📡 Events 事件系统

| Event | Parameters | Description |
|-------|------------|-------------|
| `manage-course` | `course` | 点击进入课程按钮时触发 |
| `course-click` | `course` | 点击课程卡片时触发 |
| `load-more` | `{page, size, ...}` | 分页、排序或筛选变化时触发 |
| `refresh` | - | 数据更新后自动触发 |

## 🛠️ 技术实现

### API调用流程
```javascript
// 组件挂载时自动执行
onMounted(() => {
  fetchCourses() // 通过集中管理API服务获取数据
})

// 监听props变化重新获取数据
watch([() => props.userRole, () => props.teacherId], () => {
  fetchCourses()
})
```

### 认证机制
```javascript
// 自动从localStorage获取token
const getToken = () => {
  return localStorage.getItem('auth_token') || ''
}

// 添加到API请求头
headers: {
  'Content-Type': 'application/json',
  ...(token && { 'Authorization': `Bearer ${token}` })
}
```

### 数据格式处理
```javascript
// 处理多种API响应格式
if (result && result.data && Array.isArray(result.data.list)) {
  // 标准格式: { code, message, data: { list, total } }
  courseList.value = result.data.list
  total.value = result.data.total
} else if (Array.isArray(result)) {
  // 扁平格式: [{}, {}, ...]
  courseList.value = result
} else {
  // 备用格式处理
}
```

## 🎯 优势特点

1. **即插即用**: 简单配置即可使用，无需复杂的数据绑定
2. **集中管理**: 通过API服务统一管理所有网络请求
3. **自动认证**: 内置认证支持，减少重复代码
4. **灵活扩展**: 完整的插槽系统和事件机制
5. **易于维护**: 代码结构清晰，注释完整

## 📝 更新日志

- **v1.0.0**: 初始版本，基础功能和UI
- **v1.1.0**: 添加认证支持
- **v1.2.0**: 集成集中管理API服务
- **v1.3.0**: 完善文档和示例

---

**🎉 现在你可以直接使用CourseList组件来展示和进入课程了！**

如有问题，请检查：
- 浏览器控制台中的API调用日志
- Network面板中的HTTP请求
- 认证token是否正确设置

如有需要，可以使用调试工具查看详细的API交互过程。