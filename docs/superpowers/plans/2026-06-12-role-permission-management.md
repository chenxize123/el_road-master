# 角色权限管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现为四个现有角色（admin、teacher、student、visitor）分配权限的功能，在管理员首页新增"权限管理"标签页。

**Architecture:** 采用双列表布局组件 - 左侧角色选择，右侧权限列表（分页展示+复选框），独立的 API 模块封装权限相关接口。

**Tech Stack:** Vue 3 + Ant Design Vue + Pinia

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/api/permission.js` | Create | 权限管理 API 封装 |
| `src/components/admin/PermissionManagement.vue` | Create | 权限管理组件 |
| `src/views/admin/AdminHome.vue` | Modify | 新增"权限管理"标签页 |

---

### Task 1: 创建权限管理 API 模块

**Files:**
- Create: `src/api/permission.js`

- [ ] **Step 1: 创建 API 模块文件**

```javascript
/*
 * @Date         : 2026-06-12
 * @Description  : 权限管理 API
 * @FilePath     : permission.js
 */
import api from './index'

/**
 * 获取权限列表（分页）
 * @param {Object} params - 分页参数 { page, page_size }
 */
export function getPermissionListApi(params) {
  return api.get(`/v1/permission/?page=${params.page}&page_size=${params.page_size}`)
}

/**
 * 获取权限总数
 */
export function getPermissionCountApi() {
  return api.get('/v1/permission/count')
}

/**
 * 获取角色列表（包含已有权限）
 */
export function getRolesWithPermissionsApi() {
  return api.get('/v1/permission/roles')
}

/**
 * 为角色添加权限
 * @param {Number} roleId - 角色 ID
 * @param {Number} permissionId - 权限 ID
 */
export function addPermissionToRoleApi(roleId, permissionId) {
  return api.post(`/v1/permission/role?role_id=${roleId}&permission_id=${permissionId}`)
}

/**
 * 为角色删除权限
 * @param {Number} roleId - 角色 ID
 * @param {Number} permissionId - 权限 ID
 */
export function removePermissionFromRoleApi(roleId, permissionId) {
  return api.delete(`/v1/permission/role?role_id=${roleId}&permission_id=${permissionId}`)
}
```

- [ ] **Step 2: 验证文件位置正确**

确认文件创建在 `src/api/permission.js`

- [ ] **Step 3: Commit**

```bash
git add src/api/permission.js
git commit -m "feat: add permission management API module"
```

---

### Task 2: 创建权限管理组件

**Files:**
- Create: `src/components/admin/PermissionManagement.vue`

- [ ] **Step 1: 创建组件基础结构**

```vue
<!--
 * @Date         : 2026-06-12
 * @Description  : 权限管理组件
 * @FilePath     : PermissionManagement.vue
 -->
<template>
  <a-card title="权限管理" class="permission-management-card">
    <a-row :gutter="16">
      <!-- 左侧：角色列表 -->
      <a-col :span="6">
        <a-list
          :data-source="roles"
          :loading="loading"
          class="role-list"
        >
          <template #renderItem="{ item }">
            <a-list-item
              :class="{ selected: item.id === selectedRoleId }"
              @click="handleRoleSelect(item.id)"
              class="role-item"
            >
              <a-tag :color="roleColorMap[item.role]">
                {{ item.name }}
              </a-tag>
            </a-list-item>
          </template>
        </a-list>
      </a-col>

      <!-- 右侧：权限列表 -->
      <a-col :span="18">
        <!-- 工具栏 -->
        <div class="permission-toolbar">
          <a-space>
            <a-checkbox
              :checked="isCurrentPageAllChecked"
              @change="handleSelectAll($event.target.checked)"
              :disabled="!selectedRoleId"
            >
              全选当前页
            </a-checkbox>
            <a-button
              type="primary"
              @click="handleSave"
              :disabled="!hasUnsavedChanges || !selectedRoleId"
              :loading="saving"
            >
              保存权限变更
            </a-button>
            <a-button
              @click="handleReset"
              :disabled="!hasUnsavedChanges || !selectedRoleId"
            >
              重置
            </a-button>
          </a-space>
          <a-alert
            v-if="hasUnsavedChanges"
            message="有未保存的变更"
            type="warning"
            :show-icon="true"
            class="unsaved-alert"
          />
        </div>

        <!-- 权限列表 -->
        <div class="permission-table-container">
          <a-table
            :columns="permissionColumns"
            :data-source="permissions"
            :row-key="(record) => String(record.id)"
            :loading="loading"
            :pagination="false"
            size="small"
            class="permission-table"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'checkbox'">
                <a-checkbox
                  :checked="checkedPermissionIds.has(record.id)"
                  @change="handlePermissionCheck(record.id, $event.target.checked)"
                  :disabled="!selectedRoleId"
                />
              </template>
              <template v-if="column.key === 'permission'">
                <code class="permission-code">{{ record.permission }}</code>
              </template>
              <template v-if="column.key === 'description'">
                {{ record.description }}
              </template>
            </template>
          </a-table>
        </div>

        <!-- 分页 -->
        <div class="pagination-container">
          <a-pagination
            v-model:current="currentPage"
            v-model:pageSize="pageSize"
            :total="total"
            :show-size-changer="true"
            :show-quick-jumper="true"
            show-total="(total) => `共 ${total} 条`"
            :page-size-options="[10, 20, 50]"
            @change="fetchPermissions"
          />
        </div>
      </a-col>
    </a-row>
  </a-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  getPermissionListApi,
  getPermissionCountApi,
  getRolesWithPermissionsApi,
  addPermissionToRoleApi,
  removePermissionFromRoleApi
} from '@/api/permission'

// 响应式数据
const roles = ref([])
const selectedRoleId = ref(null)
const permissions = ref([])
const loading = ref(false)
const saving = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const checkedPermissionIds = ref(new Set())
const originalPermissionIds = ref(new Set())
const hasUnsavedChanges = computed(() => {
  if (checkedPermissionIds.value.size !== originalPermissionIds.value.size) return true
  for (const id of checkedPermissionIds.value) {
    if (!originalPermissionIds.value.has(id)) return true
  }
  return false
})

// 角色颜色映射
const roleColorMap = {
  admin: 'red',
  teacher: 'green',
  student: 'blue',
  visitor: 'orange'
}

// 权限列表列配置
const permissionColumns = [
  { title: '', key: 'checkbox', width: 50 },
  { title: '权限标识', key: 'permission', width: 250 },
  { title: '描述', key: 'description' }
]

// 当前页是否全选
const isCurrentPageAllChecked = computed(() => {
  if (permissions.value.length === 0) return false
  return permissions.value.every(p => checkedPermissionIds.value.has(p.id))
})

// 核心方法
const fetchData = async () => {
  loading.value = true
  try {
    const [rolesRes] = await Promise.all([
      getRolesWithPermissionsApi()
    ])
    roles.value = rolesRes.data || []

    // 默认选中第一个角色
    if (roles.value.length > 0) {
      selectedRoleId.value = roles.value[0].id
      updateCheckedPermissions(roles.value[0].permission_ids || [])
    }

    await fetchPermissions()
  } catch (error) {
    console.error('获取数据失败:', error)
    message.error('获取数据失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const fetchPermissions = async () => {
  loading.value = true
  try {
    const [listRes, countRes] = await Promise.all([
      getPermissionListApi({ page: currentPage.value, page_size: pageSize.value }),
      getPermissionCountApi()
    ])
    permissions.value = listRes.data || []
    total.value = countRes.data || 0
  } catch (error) {
    console.error('获取权限列表失败:', error)
    message.error('获取权限列表失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const updateCheckedPermissions = (permissionIds) => {
  const ids = new Set(permissionIds || [])
  checkedPermissionIds.value = ids
  originalPermissionIds.value = new Set(ids)
}

const handleRoleSelect = async (roleId) => {
  if (hasUnsavedChanges.value) {
    try {
      await Modal.confirm({
        title: '有未保存的变更',
        content: '切换角色将丢失未保存的变更，是否继续？',
        okText: '继续',
        cancelText: '取消'
      })
    } catch {
      // 用户取消，不切换
      return
    }
  }

  selectedRoleId.value = roleId
  const role = roles.value.find(r => r.id === roleId)
  if (role) {
    updateCheckedPermissions(role.permission_ids || [])
  }
}

const handlePermissionCheck = (permissionId, checked) => {
  const newSet = new Set(checkedPermissionIds.value)
  if (checked) {
    newSet.add(permissionId)
  } else {
    newSet.delete(permissionId)
  }
  checkedPermissionIds.value = newSet
}

const handleSelectAll = (checked) => {
  const newSet = new Set(checkedPermissionIds.value)
  if (checked) {
    permissions.value.forEach(p => newSet.add(p.id))
  } else {
    permissions.value.forEach(p => newSet.delete(p.id))
  }
  checkedPermissionIds.value = newSet
}

const calculateChanges = () => {
  const toAdd = []
  const toRemove = []

  // 新增的权限
  for (const id of checkedPermissionIds.value) {
    if (!originalPermissionIds.value.has(id)) {
      toAdd.push(id)
    }
  }

  // 删除的权限
  for (const id of originalPermissionIds.value) {
    if (!checkedPermissionIds.value.has(id)) {
      toRemove.push(id)
    }
  }

  return { toAdd, toRemove }
}

const handleSave = async () => {
  if (!selectedRoleId.value) return

  const { toAdd, toRemove } = calculateChanges()

  if (toAdd.length === 0 && toRemove.length === 0) {
    message.info('没有变更需要保存')
    return
  }

  saving.value = true
  let successCount = 0
  let failCount = 0

  try {
    // 并行添加权限
    const addPromises = toAdd.map(id =>
      addPermissionToRoleApi(selectedRoleId.value, id)
        .then(() => successCount++)
        .catch(() => failCount++)
    )

    // 并行删除权限
    const removePromises = toRemove.map(id =>
      removePermissionFromRoleApi(selectedRoleId.value, id)
        .then(() => successCount++)
        .catch(() => failCount++)
    )

    await Promise.all([...addPromises, ...removePromises])

    // 显示结果
    if (failCount === 0) {
      message.success(`保存成功，共 ${successCount} 项变更`)
    } else {
      message.warning(`保存完成，成功 ${successCount} 项，失败 ${failCount} 项`)
    }

    // 更新角色的权限列表
    const role = roles.value.find(r => r.id === selectedRoleId.value)
    if (role) {
      role.permission_ids = Array.from(checkedPermissionIds.value)
    }

    // 更新原始状态
    originalPermissionIds.value = new Set(checkedPermissionIds.value)
  } catch (error) {
    console.error('保存失败:', error)
    message.error('保存失败: ' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

const handleReset = () => {
  checkedPermissionIds.value = new Set(originalPermissionIds.value)
}

onMounted(fetchData)
</script>

<style scoped>
.permission-management-card {
  min-height: 500px;
}

.role-list {
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.role-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.role-item:hover {
  background-color: #f5f5f5;
}

.role-item.selected {
  background-color: #e6f7ff;
  border-left: 3px solid #1890ff;
}

.permission-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}

.unsaved-alert {
  flex: 1;
  min-width: 200px;
}

.permission-table-container {
  overflow-x: auto;
}

.permission-table {
  min-width: max-content;
}

.permission-code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  color: #c7254e;
}

.pagination-container {
  margin-top: 16px;
  text-align: right;
}
</style>
```

- [ ] **Step 2: 验证文件位置正确**

确认文件创建在 `src/components/admin/PermissionManagement.vue`

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/PermissionManagement.vue
git commit -m "feat: add permission management component"
```

---

### Task 3: 集成到管理员首页

**Files:**
- Modify: `src/views/admin/AdminHome.vue`

- [ ] **Step 1: 引入 PermissionManagement 组件**

找到 `<script setup>` 中的 import 语句区域，添加：

```javascript
import PermissionManagement from '@/components/admin/PermissionManagement.vue'
```

- [ ] **Step 2: 添加"权限管理"标签页**

找到 `<a-tabs>` 组件，在最后一个 `<a-tab-pane>` 后添加：

```vue
      <a-tab-pane key="permissions" tab="权限管理">
        <PermissionManagement />
      </a-tab-pane>
```

完整的 a-tabs 结构应该是：
```vue
      <a-tab-pane key="classes" tab="班级管理">
        <ClassList
          user-role="admin"
          :class-list="classList"
          :loading="loading"
          title="班级管理"
          show-create-button
          create-button-text="新建班级"
          action-button-text="进入班级"
          :show-teacher="true"
          :show-time-info="true"
          :show-pagination="true"
          :current-page="pagination.current"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          :pagination-config="pagination"
          @enter-class="enterClass"
          @create-class="() => createClassVisible = true"
          @page-change="handleTableChange"
        />
      </a-tab-pane>

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

      <a-tab-pane key="users" tab="人员管理">
        <UserList @refresh="fetchData" @show-add-user-modal="showAddUserModal" ref="userListRef" />
        <AddUser ref="addUserRef" @success="fetchData" />
      </a-tab-pane>

      <a-tab-pane key="permissions" tab="权限管理">
        <PermissionManagement />
      </a-tab-pane>
```

- [ ] **Step 4: Commit**

```bash
git add src/views/admin/AdminHome.vue
git commit -m "feat: add permission management tab to admin home"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ API 模块已创建
- ✅ 权限管理组件已创建（双列表布局）
- ✅ 角色选择功能
- ✅ 权限列表分页展示
- ✅ 勾选/取消勾选权限
- ✅ 保存变更功能
- ✅ 未保存变更提示
- ✅ 集成到管理员首页

**2. Placeholder scan:** 没有发现占位符，所有步骤都有完整代码

**3. Type consistency:** API 方法名、组件结构一致

---

## 执行前的注意事项

在执行此计划前，需要确保后端已实现 `/api/v1/permission/roles` 接口（获取角色列表及权限）。如果该接口尚未实现，需要先与后端确认接口格式或调整前端实现。
