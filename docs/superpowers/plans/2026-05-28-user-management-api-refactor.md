# 人员管理 API 重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构人员管理页面，对接新的 API 接口，实现后端条件查询和 Ant Design 分页组件

**Architecture:** 分步修改，先扩展 API 层，再新建用户 API 模块，最后重构 UserList.vue 组件逻辑，保持 UI 不变

**Tech Stack:** Vue 3, Ant Design Vue, Vite, Fetch API

---

## 文件映射

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/api/index.js` | 修改 | 新增 `getWithBody` 方法 |
| `src/api/user.js` | 新建 | 用户管理 API 封装 |
| `src/components/admin/UserList.vue` | 修改 | 重构列表和分页逻辑 |

---

### Task 1: 扩展 API 层 - 新增 getWithBody 方法

**Files:**
- Modify: `src/api/index.js:61-85`

- [ ] **Step 1: 修改 src/api/index.js，在 get/put/delete 方法后新增 getWithBody**

```javascript
  get(url) {
    return this.request(url, {
      method: 'GET'
    })
  }

  getWithBody(url, data) {
    return this.request(url, {
      method: 'GET',
      body: JSON.stringify(data)
    })
  }

  post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
```

- [ ] **Step 2: 验证文件语法正确**

检查文件可以正常读取，没有语法错误。

- [ ] **Step 3: Commit**

```bash
git add src/api/index.js
git commit -m "feat: add getWithBody method to support GET request with body"
```

---

### Task 2: 新建用户 API 模块

**Files:**
- Create: `src/api/user.js`

- [ ] **Step 1: 创建 src/api/user.js，写入完整 API 封装**

```javascript
/*
 * @Date         : 2026-05-28
 * @Description  : 用户管理 API
 */
import api from './index'

/**
 * 获取用户列表
 * @param {Object} params - 分页参数 { page, page_size }
 * @param {Object} body - 查询条件
 */
export function getUserList(params, body) {
  let url = '/v1/user/self'
  const queryParts = []
  if (params.page !== undefined && params.page !== null) {
    queryParts.push(`page=${params.page}`)
  }
  if (params.page_size !== undefined && params.page_size !== null) {
    queryParts.push(`page_size=${params.page_size}`)
  }
  if (queryParts.length > 0) {
    url += '?' + queryParts.join('&')
  }
  return api.getWithBody(url, body)
}

/**
 * 获取用户总数
 */
export function getUserCount() {
  return api.get('/v1/user/count')
}

/**
 * 删除用户
 */
export function deleteUserApi(user_id) {
  return api.delete(`/user/?user_id=${user_id}`)
}

/**
 * 更新用户
 */
export function updateUserApi(userData) {
  return api.put('/user/', userData)
}

/**
 * 创建用户
 */
export function createUserApi(userData) {
  return api.post('/user/', userData)
}
```

- [ ] **Step 2: 验证文件创建成功**

确认文件存在且内容正确。

- [ ] **Step 3: Commit**

```bash
git add src/api/user.js
git commit -m "feat: add user API module for v1 endpoints"
```

---

### Task 3: 修改 UserList.vue - 更新 imports 和新增状态

**Files:**
- Modify: `src/components/admin/UserList.vue:209-227`

- [ ] **Step 1: 更新 import 语句**

将第 209 行：
```javascript
import { getUserListApi, deleteUserApi, createUserApi } from '@/api/dashboard'
```

替换为：
```javascript
import { getUserList, getUserCount, deleteUserApi, createUserApi, updateUserApi } from '@/api/user'
```

- [ ] **Step 2: 新增 total 状态**

在第 221 行后新增：
```javascript
const total = ref(0)
```

结果：
```javascript
// 分页状态
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
```

- [ ] **Step 3: 验证代码结构**

确认修改正确，没有语法错误。

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/UserList.vue
git commit -m "refactor: update imports and add total state"
```

---

### Task 4: 修改 UserList.vue - 新增辅助函数和数据获取函数

**Files:**
- Modify: `src/components/admin/UserList.vue:272-343`

- [ ] **Step 1: 替换 fetchUsers 及相关函数**

删除第 272-343 行（从 `const fetchUsers` 到 `filterUsers` 函数结束），替换为：

```javascript
const cleanQueryParams = (values) => {
  const result = {}
  Object.keys(values).forEach(key => {
    const value = values[key]
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value
    }
  })
  return result
}

const fetchUserList = async () => {
  loading.value = true
  try {
    const queryBody = cleanQueryParams(searchForm)
    const result = await getUserList({
      page: currentPage.value,
      page_size: pageSize.value
    }, queryBody)

    users.value = result.data || []
  } catch (error) {
    console.error('获取用户列表失败:', error)
    message.error('获取用户列表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const fetchUserCount = async () => {
  try {
    const result = await getUserCount()
    total.value = result.data || 0
  } catch (error) {
    console.error('获取用户总数失败:', error)
  }
}

const fetchUsers = async () => {
  await Promise.all([fetchUserList(), fetchUserCount()])
}

const showAddUserModal = () => {
  emit('showAddUserModal')
}

// 搜索相关函数
const handleSearch = () => {
  currentPage.value = 1
  fetchUsers()
}

const resetSearch = () => {
  searchForm.real_name = ''
  searchForm.username = ''
  searchForm.user_type = undefined
  handleSearch()
}

const handlePageChange = (page, size) => {
  currentPage.value = page
  if (size) {
    pageSize.value = size
  }
  fetchUserList()
}

const handlePageSizeChange = (current, size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchUserList()
}
```

- [ ] **Step 2: 验证代码**

确认代码结构正确，函数都已定义。

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/UserList.vue
git commit -m "refactor: add new data fetching functions"
```

---

### Task 5: 修改 UserList.vue - 更新 Table 分页配置

**Files:**
- Modify: `src/components/admin/UserList.vue:34-41`
- Modify: `src/components/admin/UserList.vue:66-84`

- [ ] **Step 1: 更新 Table 的 pagination 配置**

将第 40 行 `:pagination="false"` 替换为：

```javascript
  :pagination="{
    current: currentPage,
    pageSize: pageSize,
    total: total,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
    onChange: handlePageChange,
    onShowSizeChange: handlePageSizeChange
  }"
```

- [ ] **Step 2: 删除自定义分页组件**

删除第 66-84 行：
```vue
      <!-- 自定义分页 -->
      <div style="margin-top: 16px; display: flex; align-items: center; gap: 8px;">
        <span>每页</span>
        <a-select v-model:value="pageSize" style="width: 80px;" @change="handlePageSizeChange">
          <a-select-option :value="10">10</a-select-option>
          <a-select-option :value="20">20</a-select-option>
          <a-select-option :value="50">50</a-select-option>
        </a-select>
        <span>条</span>

        <a-button :disabled="currentPage <= 1" @click="prevPage">
          上一页
        </a-button>
        <span>第 {{ currentPage }} 页</span>
        <a-button @click="nextPage">
          下一页
        </a-button>
      </div>
```

- [ ] **Step 3: 验证模板结构**

确认模板修改正确。

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/UserList.vue
git commit -m "refactor: replace custom pagination with Ant Design Table pagination"
```

---

### Task 6: 验证修改完成并运行测试

**Files:**
- Check: `src/api/index.js`
- Check: `src/api/user.js`
- Check: `src/components/admin/UserList.vue`

- [ ] **Step 1: 检查所有修改是否完成**

对照验收标准检查：
- [ ] `getWithBody` 方法已添加
- [ ] `src/api/user.js` 已创建
- [ ] UserList.vue 的 import 已更新
- [ ] `total` 状态已添加
- [ ] 新的数据获取函数已实现
- [ ] Table 分页已配置
- [ ] 自定义分页已删除

- [ ] **Step 2: 运行开发服务器**

```bash
npm run dev
```

预期：服务器正常启动，无编译错误

- [ ] **Step 3: 手动测试功能**

打开浏览器测试：
- [ ] 页面正常加载
- [ ] 列表展示正常
- [ ] 分页功能正常
- [ ] 搜索功能正常
- [ ] 重置功能正常

- [ ] **Step 4: Commit（如果有需要修复的问题）**

如果发现并修复了问题，提交修复：
```bash
git add src/components/admin/UserList.vue
git commit -m "fix: [description of fix]"
```

---

## 验收标准核对

在完成所有任务后，确认以下项目：

- [ ] 打开人员管理页面，默认加载第 1 页，每页 10 条
- [ ] 表格正确展示所有字段
- [ ] 分页总数来自 `/v1/user/count` 接口
- [ ] 切换页码时，请求正确的 API
- [ ] 修改每页条数时，列表正确刷新
- [ ] 条件查询时，查询条件通过 body 提交
- [ ] 查询后分页回到第 1 页
- [ ] 重置后恢复全部人员列表
- [ ] 新增、编辑、删除、批量导入功能正常工作
- [ ] 控制台无报错
- [ ] loading 状态正确展示

---

## Spec Coverage Review

1. ✅ API 层扩展 - Task 1
2. ✅ 新建用户 API 模块 - Task 2
3. ✅ UserList.vue imports 更新 - Task 3
4. ✅ 新增状态和辅助函数 - Task 4
5. ✅ 数据获取逻辑重构 - Task 4
6. ✅ Table 分页配置 - Task 5
7. ✅ 删除自定义分页 - Task 5
8. ✅ 验证和测试 - Task 6

所有 spec 需求都有对应的实现任务。

---

## 最终执行

Plan complete and saved to `docs/superpowers/plans/2026-05-28-user-management-api-refactor.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
