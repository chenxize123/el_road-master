---
name: guest-user-type-design
description: 添加"游客"用户类型，拥有教师的查看权限但无写权限
metadata:
  type: spec
  date: 2026-05-28
---

# 游客用户类型设计文档

## 一、概述

在现有系统中添加 "游客"（guest）用户类型，该类型用户拥有教师的查看权限，但无创建/编辑/删除等写操作权限。

## 二、背景与目标

### 2.1 背景
- 系统现有三种用户类型：学生（student）、教师（teacher）、管理员（admin）
- permission.js 中已存在 guest 角色定义，但目前仅拥有 basic_view 权限
- 需要一个只读的访客账户类型，供外部人员查看课程、试卷等内容

### 2.2 目标
- 在新增/编辑用户页面中添加"游客"选项
- 在用户列表中支持搜索和展示"游客"类型
- 赋予"游客"教师级别的查看权限，但屏蔽所有写操作
- 支持批量导入"游客"用户

## 三、详细设计

### 3.1 需要修改的文件

| 文件路径 | 修改内容 |
|----------|---------|
| `src/components/admin/AddUser.vue` | 用户类型下拉框添加"游客"选项 |
| `src/components/admin/EditUserModal.vue` | 用户类型下拉框添加"游客"选项 |
| `src/components/admin/UserList.vue` | 1. 搜索筛选器添加"游客"选项<br>2. 角色名称映射添加"游客"<br>3. 角色颜色映射添加"游客"<br>4. 批量导入支持"游客"类型 |
| `src/store/permission.js` | 修改 `hasPermission` getter，让 guest 拥有教师的查看权限 |
| `src/router/index.js` | 在相关路由的 `meta.permissions` 中添加 `guest` |

### 3.2 权限设计

#### 3.2.1 修改 `src/store/permission.js`

修改 `hasPermission` getter：

```javascript
// 游客拥有教师的查看权限，但无写权限
if (state.userRole === 'guest') {
  const guestPermissions = ['course_view', 'grade_view', 'basic_view']
  if (guestPermissions.includes(permission)) return true
}
```

同时更新 `userLevel` 和 `roleText`（已有 guest 定义，确认即可）。

#### 3.2.2 权限矩阵

| 权限 | admin | teacher | guest | student |
|------|-------|---------|-------|---------|
| `course_view` | ✅ | ✅ | ✅ | ✅ |
| `course_manage` | ✅ | ✅ | ❌ | ❌ |
| `grade_view` | ✅ | ✅ | ✅ | ✅ |
| `content_create` | ✅ | ✅ | ❌ | ❌ |
| `student_manage` | ✅ | ✅ | ❌ | ❌ |
| `basic_view` | ✅ | ✅ | ✅ | ✅ |

### 3.3 路由权限设计

修改 `src/router/index.js`，在以下路由的 `meta.permissions` 中添加 `guest`：

| 路由 | 现有权限 | 新增后 |
|------|---------|--------|
| `/profile` | ['admin', 'teacher', 'student'] | ['admin', 'teacher', 'student', 'guest'] |
| `/course/:id` | ['teacher', 'admin'] | ['teacher', 'admin', 'guest'] |
| `/question-bank/:id` | ['teacher', 'admin'] | ['teacher', 'admin', 'guest'] |
| `/paper/detail/:paperId` | ['teacher', 'admin'] | ['teacher', 'admin', 'guest'] |
| `/class/detail/:classId` | ['admin', 'teacher', 'student'] | ['admin', 'teacher', 'student', 'guest'] |
| `/exam/result/:examId` | ['admin', 'teacher', 'student'] | ['admin', 'teacher', 'student', 'guest'] |

### 3.4 UI 设计

#### 3.4.1 新增/编辑用户页面
在用户类型下拉框中添加：
```html
<a-select-option value="guest">游客</a-select-option>
```

#### 3.4.2 用户列表页面
1. 搜索筛选器添加"游客"选项
2. `roleNameMap` 添加：`guest: '游客'`
3. `roleColorMap` 添加：`guest: 'orange'`（橙色，区别于现有角色）
4. 批量导入：
   - 在 Excel 说明中添加"游客(guest)"
   - 在 `normalizeUserType` 函数中添加映射：`'游客': 'guest'`, `'guest': 'guest'`
   - 在 `validateImportRows` 中更新合法类型校验

## 四、实现步骤

1. 修改 `AddUser.vue` - 添加游客选项
2. 修改 `EditUserModal.vue` - 添加游客选项
3. 修改 `UserList.vue` - 更新搜索、展示和导入功能
4. 修改 `permission.js` - 更新权限逻辑
5. 修改 `router/index.js` - 更新路由权限
6. 测试验证

## 五、注意事项

- 后端需要支持 `user_type = 'guest'` 的存储和返回
- 如后端有用户类型校验，需同步更新
- 权限控制主要在前端，建议后端也添加相应的权限校验
