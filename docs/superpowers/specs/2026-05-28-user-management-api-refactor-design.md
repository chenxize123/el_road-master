# 人员管理 API 重构设计文档

**日期**: 2026-05-28
**主题**: 重构人员列表查询、条件查询和分页逻辑

---

## 1. 概述

### 1.1 背景
当前人员管理功能使用旧的 API 接口，采用本地搜索过滤和自定义分页组件。需要重构为使用新的后端 API 接口，支持后端条件查询、分页，并使用 Ant Design 标准分页组件。

### 1.2 目标
- 对接新的 `/api/v1/user/self` 列表接口
- 对接新的 `/api/v1/user/count` 总数接口
- 实现后端条件查询
- 使用 Ant Design Table 内置分页
- 保持现有 UI 和其他功能不变

### 1.3 范围
- 修改 `src/api/index.js` - 新增支持 GET 带 body 的方法
- 新建 `src/api/user.js` - 用户管理专用 API 模块
- 修改 `src/components/admin/UserList.vue` - 重构列表和分页逻辑

---

## 2. 接口设计

### 2.1 API 层扩展 (`src/api/index.js`)

新增 `getWithBody` 方法，支持 GET 请求携带 body：

```javascript
getWithBody(url, data) {
  return this.request(url, {
    method: 'GET',
    body: JSON.stringify(data)
  })
}
```

### 2.2 新建用户 API 模块 (`src/api/user.js`)

```javascript
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

---

## 3. 组件设计 (`UserList.vue`)

### 3.1 状态设计

```javascript
// 数据状态
const users = ref([])
const loading = ref(false)
const total = ref(0)

// 分页状态
const currentPage = ref(1)
const pageSize = ref(10)

// 搜索表单保持不变
const searchForm = reactive({
  real_name: '',
  username: '',
  user_type: undefined
})
```

### 3.2 分页配置

使用 Table 内置 pagination：

```vue
<a-table
  :columns="userColumns"
  :data-source="users"
  :rowKey="(record) => String(record.id)"
  :loading="loading"
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
>
```

移除原有的自定义分页组件（第 67-84 行）。

### 3.3 关键函数设计

#### 3.3.1 `cleanQueryParams(values)`
清理空查询字段，避免提交无效值：

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
```

#### 3.3.2 `fetchUserList()`
仅获取用户列表：

```javascript
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
```

#### 3.3.3 `fetchUserCount()`
仅获取用户总数：

```javascript
const fetchUserCount = async () => {
  try {
    const result = await getUserCount()
    total.value = result.data || 0
  } catch (error) {
    console.error('获取用户总数失败:', error)
    // 不影响列表展示，不显示错误提示
  }
}
```

#### 3.3.4 `fetchUsers()`
初始化时同时获取列表和总数：

```javascript
const fetchUsers = async () => {
  await Promise.all([fetchUserList(), fetchUserCount()])
}
```

#### 3.3.5 `handleSearch()`
搜索查询，重置为第一页：

```javascript
const handleSearch = () => {
  currentPage.value = 1
  fetchUsers()
}
```

#### 3.3.6 `resetSearch()`
重置搜索条件：

```javascript
const resetSearch = () => {
  searchForm.real_name = ''
  searchForm.username = ''
  searchForm.user_type = undefined
  handleSearch()
}
```

#### 3.3.7 `handlePageChange(page, size)`
分页变更处理：

```javascript
const handlePageChange = (page, size) => {
  currentPage.value = page
  if (size) {
    pageSize.value = size
  }
  fetchUserList()
}
```

#### 3.3.8 `handlePageSizeChange(current, size)`
每页条数变更处理：

```javascript
const handlePageSizeChange = (current, size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchUserList()
}
```

---

## 4. 数据结构

### 4.1 接口返回结构

**用户列表 (`/v1/user/self`)**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "7460600006609903616",
      "username": "202411040423",
      "is_disabled": "正常",
      "real_name": "王星懿",
      "mobile": "暂无",
      "email": "暂无",
      "user_type": "student",
      "avatar": "avatar/default.png"
    }
  ]
}
```

**用户总数 (`/v1/user/count`)**:
```json
{
  "code": 200,
  "message": "success",
  "data": 64
}
```

### 4.2 查询条件结构

支持的查询字段（仅在有值时提交）:
- `id`
- `username`
- `real_name`
- `mobile`
- `email`
- `user_type`
- `is_disabled`
- `is_deleted`

---

## 5. 兼容性和迁移

### 5.1 保持不变的部分
- 表格列配置和展示逻辑
- 新增、编辑用户功能
- 删除用户功能
- 批量导入用户功能
- UI 布局和样式
- 角色和状态的 tag 展示（`roleNameMap`、`roleColorMap`、`getStatusText`、`getStatusColor`）

### 5.2 移除的部分
- 自定义分页组件（第 67-84 行）
- 本地搜索过滤函数 `filterUsers()`
- `prevPage()`、`nextPage()`、旧的 `handlePageSizeChange()`

---

## 6. 风险和注意事项

### 6.1 GET 请求带 body
**风险**: HTTP/1.1 规范允许 GET 请求带 body，但某些代理服务器或 CDN 可能不支持。
**缓解**: 项目直接使用 fetch 请求后端，不经过额外代理层，应该可以正常工作。建议测试验证。

### 6.2 条件查询的总数
**当前方案**: 使用 `/v1/user/count` 返回总人数，不随筛选条件变化。
**后续优化**: 如果需要条件筛选后的准确总数，只需将 `fetchUserCount()` 改为支持传递查询条件即可，整体结构无需改动。

### 6.3 大整数处理
项目已使用 `json-bigint` 将大整数转为字符串，表格展示也使用 `String(record.id)`，保持兼容。

---

## 7. 验收标准

- [ ] 打开人员管理页面，默认加载第 1 页，每页 10 条
- [ ] 表格正确展示 `id`、`username`、`real_name`、`mobile`、`email`、`user_type`、`is_disabled` 字段
- [ ] 分页总数来自 `/v1/user/count` 接口
- [ ] 切换页码时，请求 `/v1/user/self?page=X&page_size=Y`
- [ ] 修改每页条数时，列表正确刷新
- [ ] 输入搜索条件后点击搜索，查询条件通过 body 提交，分页回到第 1 页
- [ ] 点击重置按钮，清空查询条件，恢复全部人员列表，分页回到第 1 页
- [ ] 新增、编辑、删除、批量导入功能正常工作
- [ ] 控制台无报错
- [ ] loading 状态正确展示
