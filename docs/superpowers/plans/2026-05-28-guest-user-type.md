# 游客用户类型实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 添加"游客"用户类型，拥有教师的查看权限但无写权限

**Architecture:** 修改现有用户管理组件和权限系统，在不破坏现有功能的前提下添加 guest 角色支持

**Tech Stack:** Vue 3, Ant Design Vue, Pinia, Vue Router

---

### Task 1: 更新 AddUser.vue - 添加游客选项

**Files:**
- Modify: `src/components/admin/AddUser.vue:56-62`

- [ ] **Step 1: 在用户类型下拉框中添加"游客"选项**

修改 `src/components/admin/AddUser.vue` 的 `a-select` 部分：

```vue
<a-form-item label="用户类型" name="user_type">
  <a-select v-model:value="form.user_type" placeholder="请选择用户类型">
    <a-select-option value="student">学生</a-select-option>
    <a-select-option value="teacher">教师</a-select-option>
    <a-select-option value="admin">管理员</a-select-option>
    <a-select-option value="guest">游客</a-select-option>
  </a-select>
</a-form-item>
```

- [ ] **Step 2: 验证修改正确**

检查文件内容，确认选项已添加。

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AddUser.vue
git commit -m "feat: add guest option to AddUser component"
```

---

### Task 2: 更新 EditUserModal.vue - 添加游客选项

**Files:**
- Modify: `src/components/admin/EditUserModal.vue:46-52`

- [ ] **Step 1: 在用户类型下拉框中添加"游客"选项**

修改 `src/components/admin/EditUserModal.vue` 的 `a-select` 部分：

```vue
<a-form-item label="角色" name="user_type">
  <a-select v-model:value="formData.user_type" placeholder="请选择角色">
    <a-select-option value="student">学生</a-select-option>
    <a-select-option value="teacher">教师</a-select-option>
    <a-select-option value="admin">管理员</a-select-option>
    <a-select-option value="guest">游客</a-select-option>
  </a-select>
</a-form-item>
```

- [ ] **Step 2: 验证修改正确**

检查文件内容，确认选项已添加。

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/EditUserModal.vue
git commit -m "feat: add guest option to EditUserModal component"
```

---

### Task 3: 更新 UserList.vue - 搜索筛选和角色展示

**Files:**
- Modify: `src/components/admin/UserList.vue:17-27` (搜索筛选)
- Modify: `src/components/admin/UserList.vue:231-241` (角色名称映射)
- Modify: `src/components/admin/UserList.vue:237-241` (角色颜色映射)

- [ ] **Step 1: 在搜索筛选器中添加"游客"选项**

修改搜索的 `a-select` 部分：

```vue
<a-select
  v-model:value="searchForm.user_type"
  placeholder="选择角色"
  style="width: 120px"
  allow-clear
  @change="handleSearch"
>
  <a-select-option value="student">学生</a-select-option>
  <a-select-option value="teacher">教师</a-select-option>
  <a-select-option value="admin">管理员</a-select-option>
  <a-select-option value="guest">游客</a-select-option>
</a-select>
```

- [ ] **Step 2: 更新角色名称映射**

修改 `roleNameMap`：

```javascript
const roleNameMap = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
  guest: '游客'
}
```

- [ ] **Step 3: 更新角色颜色映射**

修改 `roleColorMap`：

```javascript
const roleColorMap = {
  student: 'blue',
  teacher: 'green',
  admin: 'red',
  guest: 'orange'
}
```

- [ ] **Step 4: 验证修改正确**

检查文件内容，确认三处修改都已完成。

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/UserList.vue
git commit -m "feat: add guest support to UserList search and display"
```

---

### Task 4: 更新 UserList.vue - 批量导入支持游客

**Files:**
- Modify: `src/components/admin/UserList.vue:98-104` (Excel 说明)
- Modify: `src/components/admin/UserList.vue:439-452` (normalizeUserType 函数)
- Modify: `src/components/admin/UserList.vue:574-581` (validateImportRows 函数)

- [ ] **Step 1: 更新 Excel 模板说明**

修改说明区域的用户类型支持列表：

```vue
<ul>
  <li>支持的表头：用户名(账号)、密码、真实姓名(姓名)、手机号(手机)、邮箱、用户类型(角色)</li>
  <li>用户类型支持：学生(student)、教师(teacher/老师)、管理员(admin)、游客(guest)</li>
  <li>必填字段：用户名、真实姓名、用户类型</li>
  <li>密码为空时，默认密码=用户名</li>
</ul>
```

- [ ] **Step 2: 更新 normalizeUserType 函数**

修改 `normalizeUserType` 函数，添加游客类型映射：

```javascript
const normalizeUserType = (value) => {
  if (!value) return ''
  const v = String(value).trim().toLowerCase()
  const typeMap = {
    'student': 'student',
    '学生': 'student',
    'teacher': 'teacher',
    '教师': 'teacher',
    '老师': 'teacher',
    'admin': 'admin',
    '管理员': 'admin',
    'guest': 'guest',
    '游客': 'guest'
  }
  return typeMap[v] || v
}
```

- [ ] **Step 3: 更新 validateImportRows 函数**

修改用户类型合法校验，添加 guest：

```javascript
} else if (!['student', 'teacher', 'admin', 'guest'].includes(user.user_type)) {
  errors.push(`用户类型不合法: ${user.user_type}`)
  user.valid = false
}
```

- [ ] **Step 4: 验证修改正确**

检查文件内容，确认三处修改都已完成。

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/UserList.vue
git commit -m "feat: add guest support to batch import"
```

---

### Task 5: 更新 permission.js - 游客权限逻辑

**Files:**
- Modify: `src/store/permission.js:33-60` (hasPermission getter)

- [ ] **Step 1: 修改 hasPermission getter**

找到 `hasPermission` getter，修改 guest 权限部分：

```javascript
// 检查是否有特定权限（助教系统四级权限）
hasPermission: (state) => (permission) => {
  // 管理员拥有所有权限
  if (state.userRole === 'admin') return true

  // 教师拥有除管理外的所有权限
  if (state.userRole === 'teacher') {
    const teacherOnlyPermissions = ['course_manage', 'grade_view', 'student_manage', 'content_create']
    if (teacherOnlyPermissions.includes(permission)) return true
  }

  // 学生只有课程和作业相关权限
  if (state.userRole === 'student') {
    const studentPermissions = ['course_view', 'assignment_submit', 'grade_view']
    if (studentPermissions.includes(permission)) return true
  }

  // 游客拥有教师的查看权限，但无写权限
  if (state.userRole === 'guest') {
    const guestPermissions = ['course_view', 'grade_view', 'basic_view']
    if (guestPermissions.includes(permission)) return true
  }

  return state.currentPermissions.includes(permission)
},
```

- [ ] **Step 2: 确认 userLevel 和 roleText**

检查 `userLevel` 和 `roleText`，确认 guest 已有定义（应该已有）：

```javascript
userLevel: (state) => {
  const levelMap = {
    guest: 0,
    student: 1,
    teacher: 2,
    admin: 3
  }
  return levelMap[state.userRole] || 0
},
roleText: (state) => {
  const textMap = {
    admin: '系统管理员',
    teacher: '教师',
    student: '学生',
    guest: '游客'
  }
  return textMap[state.userRole] || '未知角色'
},
```

- [ ] **Step 3: 验证修改正确**

检查文件内容，确认权限逻辑已更新。

- [ ] **Step 4: Commit**

```bash
git add src/store/permission.js
git commit -m "feat: update guest permissions to have teacher-level view access"
```

---

### Task 6: 更新 router/index.js - 路由权限

**Files:**
- Modify: `src/router/index.js:13-143` (多个路由的 meta.permissions)

- [ ] **Step 1: 更新 /profile 路由**

```javascript
{
  path: '/profile',
  name: 'Profile',
  component: () => import('@/views/Profile.vue'),
  meta: {
    title: '个人资料',
    requiresAuth: true,
    permissions: ['admin', 'teacher', 'student', 'guest']
  }
},
```

- [ ] **Step 2: 更新 /course/:id 路由**

```javascript
{
  path: '/course/:id',
  name: 'CourseDetail',
  component: () => import('@/views/course/CourseDetail.vue'),
  meta: {
    title: '课程详情',
    requiresAuth: true,
    permissions: ['teacher', 'admin', 'guest']
  }
},
```

- [ ] **Step 3: 更新 /question-bank/:id 路由**

```javascript
{
  path: '/question-bank/:id',
  name: 'QuestionBankDetail',
  component: () => import('@/views/question-bank/QuestionBankDetail.vue'),
  meta: {
    title: '题库详情',
    requiresAuth: true,
    permissions: ['teacher', 'admin', 'guest']
  }
},
```

- [ ] **Step 4: 更新 /paper/detail/:paperId 路由**

```javascript
{
  path: '/paper/detail/:paperId',
  name: 'PaperDetail',
  component: () => import('@/views/paper/PaperDetail.vue'),
  meta: {
    title: '试卷详情',
    requiresAuth: true,
    permissions: ['teacher', 'admin', 'guest']
  }
},
```

- [ ] **Step 5: 更新 /class/detail/:classId 路由**

```javascript
{
  path: '/class/detail/:classId',
  name: 'ClassDetail',
  component: () => import('@/views/class/ClassDetail.vue'),
  meta: {
    title: '班级详情',
    requiresAuth: true,
    permissions: ['admin', 'teacher', 'student', 'guest']
  }
},
```

- [ ] **Step 6: 更新 /exam/result/:examId 路由**

```javascript
{
  path: '/exam/result/:examId',
  name: 'ExamResult',
  component: () => import('@/views/exam/ExamResult.vue'),
  meta: {
    title: '考试结果',
    requiresAuth: true,
    permissions: ['admin', 'teacher', 'student', 'guest']
  }
}
```

- [ ] **Step 7: 验证修改正确**

检查所有路由，确认 guest 已添加到对应权限列表。

- [ ] **Step 8: Commit**

```bash
git add src/router/index.js
git commit -m "feat: add guest to route permissions"
```

---

### Task 7: 测试验证

**Files:**
- 无需修改文件，仅运行测试

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 手动测试以下场景**

1. 打开新增用户页面，确认"游客"选项存在
2. 打开编辑用户页面，确认"游客"选项存在
3. 在用户列表搜索筛选中，确认"游客"选项存在
4. 创建一个游客用户，确认可以成功保存
5. 验证用户列表中游客用户显示橙色标签
6. （如后端支持）使用游客用户登录，确认可以访问课程详情等页面

- [ ] **Step 3: 运行 lint 检查**

```bash
npm run lint
```

- [ ] **Step 4: Commit（如果 lint 有修复）**

（仅在有 lint 修复时执行）

```bash
git add .
git commit -m "style: fix lint issues"
```

---

## 自检

### 1. Spec Coverage 检查
- ✅ AddUser.vue 添加游客选项 - Task 1
- ✅ EditUserModal.vue 添加游客选项 - Task 2
- ✅ UserList.vue 搜索和展示 - Task 3
- ✅ UserList.vue 批量导入 - Task 4
- ✅ permission.js 权限逻辑 - Task 5
- ✅ router/index.js 路由权限 - Task 6
- ✅ 测试验证 - Task 7

### 2. Placeholder Scan
- ✅ 无 TBD/TODO
- ✅ 所有代码步骤都有实际代码
- ✅ 所有命令都有具体内容

### 3. Type Consistency
- ✅ 用户类型统一使用 `'guest'`
- ✅ 角色名称统一使用 `'游客'`
- ✅ 角色颜色统一使用 `'orange'`
