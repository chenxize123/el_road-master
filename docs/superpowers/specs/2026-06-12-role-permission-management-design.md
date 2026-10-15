---
title: 角色权限管理设计文档
date: 2026-06-12
description: 实现为现有角色分配权限的功能
---

# 角色权限管理设计文档

## 概述

在管理员首页新增"权限管理"标签页，实现为四个现有角色（admin、teacher、student、visitor）分配权限的功能。

## 需求背景

- 用户需要能够为不同角色分配特定的系统权限
- 权限列表需要分页展示
- 提供便捷的勾选/取消勾选操作来分配权限

## 功能描述

### 1. 界面布局

采用双列表布局：
- **左侧**：角色列表（单选）
- **右侧**：权限列表（分页展示，带复选框）

### 2. 主要功能

1. **角色选择**：点击左侧角色，右侧显示该角色的权限分配情况
2. **权限列表分页**：支持翻页查看所有权限
3. **权限分配**：勾选/取消勾选权限项，支持保存变更
4. **快捷操作**：支持当前页"全选/取消全选"
5. **变更确认**：切换角色前，如果有未保存的变更，提示确认

## API 设计

### 已提供的 API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/permission/?page={page}&page_size={pageSize}` | 分页获取权限列表 |
| GET | `/api/v1/permission/count` | 获取权限总数 |
| POST | `/api/v1/permission/role?role_id={roleId}&permission_id={permissionId}` | 为角色添加权限 |
| DELETE | `/api/v1/permission/role?role_id={roleId}&permission_id={permissionId}` | 为角色删除权限 |

### 假设补充的 API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/permission/roles` | 获取所有角色列表（包含已有权限 ID） |

#### 获取角色列表响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "role": "admin",
      "name": "管理员",
      "permission_ids": [7465757995830517760, 7465757995885043712, ...]
    },
    {
      "id": 2,
      "role": "teacher",
      "name": "教师",
      "permission_ids": [...]
    },
    {
      "id": 3,
      "role": "student",
      "name": "学生",
      "permission_ids": [...]
    },
    {
      "id": 4,
      "role": "visitor",
      "name": "游客",
      "permission_ids": [...]
    }
  ]
}
```

## 实现方案

### 1. 新增文件

1. `src/api/permission.js` - 权限管理 API 模块
2. `src/components/admin/PermissionManagement.vue` - 权限管理组件

### 2. 修改文件

1. `src/views/admin/AdminHome.vue` - 新增"权限管理"标签页

## 详细设计

### src/api/permission.js

封装所有权限相关的 API 调用：

```javascript
import api from './index'

// 获取权限列表（分页）
export function getPermissionListApi(params) {
  return api.get(`/v1/permission/?page=${params.page}&page_size=${params.page_size}`)
}

// 获取权限总数
export function getPermissionCountApi() {
  return api.get('/v1/permission/count')
}

// 获取角色列表（包含权限）
export function getRolesWithPermissionsApi() {
  return api.get('/v1/permission/roles')
}

// 为角色添加权限
export function addPermissionToRoleApi(roleId, permissionId) {
  return api.post(`/v1/permission/role?role_id=${roleId}&permission_id=${permissionId}`)
}

// 为角色删除权限
export function removePermissionFromRoleApi(roleId, permissionId) {
  return api.delete(`/v1/permission/role?role_id=${roleId}&permission_id=${permissionId}`)
}
```

### src/components/admin/PermissionManagement.vue

权限管理组件，采用左右分栏布局。

#### 响应式数据

| 变量名 | 类型 | 描述 |
|--------|------|------|
| roles | Array | 角色列表 |
| selectedRoleId | Number | 当前选中的角色 ID |
| permissions | Array | 当前页权限列表 |
| loading | Boolean | 加载状态 |
| currentPage | Number | 当前页码 |
| pageSize | Number | 每页条数 |
| total | Number | 权限总数 |
| checkedPermissionIds | Set | 当前勾选的权限 ID 集合 |
| originalPermissionIds | Set | 初始加载时的权限 ID 集合（用于判断变更） |
| hasUnsavedChanges | Boolean | 是否有未保存的变更 |

#### 核心方法

1. `fetchData()` - 初始化加载角色列表和权限列表
2. `fetchPermissions()` - 获取权限列表和总数
3. `handleRoleSelect(roleId)` - 处理角色选择
4. `handlePermissionCheck(permissionId, checked)` - 处理权限勾选
5. `handleSelectAll(checked)` - 全选/取消全选当前页
6. `handleSave()` - 保存权限变更
7. `handleReset()` - 重置为原始状态
8. `calculateChanges()` - 计算需要添加和删除的权限

#### 组件模板结构

```vue
<template>
  <a-card title="权限管理" class="permission-management-card">
    <a-row :gutter="16">
      <!-- 左侧：角色列表 -->
      <a-col :span="6">
        <a-list
          :data-source="roles"
          :loading="loading"
        >
          <template #renderItem="{ item }">
            <a-list-item
              :class="{ selected: item.id === selectedRoleId }"
              @click="handleRoleSelect(item.id)"
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
            >
              全选当前页
            </a-checkbox>
            <a-button
              type="primary"
              @click="handleSave"
              :disabled="!hasUnsavedChanges"
              :loading="saving"
            >
              保存权限变更
            </a-button>
            <a-button
              @click="handleReset"
              :disabled="!hasUnsavedChanges"
            >
              重置
            </a-button>
          </a-space>
        </div>

        <!-- 权限列表 -->
        <a-table
          :columns="permissionColumns"
          :data-source="permissions"
          :row-key="(record) => String(record.id)"
          :loading="loading"
          :pagination="false"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'checkbox'">
              <a-checkbox
                :checked="checkedPermissionIds.has(record.id)"
                @change="handlePermissionCheck(record.id, $event.target.checked)"
              />
            </template>
            <template v-if="column.key === 'permission'">
              <code>{{ record.permission }}</code>
            </template>
          </template>
        </a-table>

        <!-- 分页 -->
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
      </a-col>
    </a-row>
  </a-card>
</template>
```

### src/views/admin/AdminHome.vue 修改

在 `a-tabs` 中新增"权限管理"标签页：

```vue
<a-tab-pane key="permissions" tab="权限管理">
  <PermissionManagement />
</a-tab-pane>
```

并引入组件：

```javascript
import PermissionManagement from '@/components/admin/PermissionManagement.vue'
```

## 交互流程

### 1. 初始化流程

```
页面加载
  ↓
获取角色列表
  ↓
默认选中第一个角色 (admin)
  ↓
获取权限列表 (第一页)
  ↓
根据角色的 permission_ids 勾选对应的权限
```

### 2. 切换角色流程

```
点击左侧角色
  ↓
检查是否有未保存的变更？
  ├─ 是 → 弹出确认对话框
  │         ├─ 确认放弃 → 切换到新角色
  │         └─ 取消 → 保持当前角色
  └─ 否 → 直接切换到新角色
  ↓
更新勾选状态为新角色的权限
```

### 3. 保存变更流程

```
点击"保存权限变更"
  ↓
计算变更：
  - 新增的权限 (checked - original)
  - 删除的权限 (original - checked)
  ↓
并行调用添加/删除 API
  ↓
显示保存结果
  ↓
更新 originalPermissionIds
```

## 错误处理

1. API 请求失败时，使用 `message.error()` 提示用户
2. 保存过程中，按钮显示 loading 状态，防止重复提交
3. 如果部分权限保存失败，告知用户哪些成功哪些失败

## 样式设计

- 左侧角色列表：选中状态高亮显示
- 权限列表：紧凑模式，节省空间
- 整体风格与现有管理员页面保持一致

## 测试要点

1. 切换角色时，未保存的变更提示正常
2. 全选/取消全选功能正常
3. 保存权限变更后，切换角色再切换回来，验证变更已保存
4. 分页功能正常，翻页后勾选状态正确
5. 权限项显示正确（permission 标识符 + description 描述）
