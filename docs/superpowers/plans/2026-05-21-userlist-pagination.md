# 用户列表分页功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复并完善用户列表分页功能，请求时携带 page 和 page_size 参数，隐藏总条数显示

**Architecture:** 基于 git 历史中已有的实现进行恢复和调整，使用 Ant Design Vue Table 组件内置分页，保持本地搜索

**Tech Stack:** Vue 3 + Ant Design Vue 4 + Pinia (已有)

---

### Task 1: 恢复 UserList.vue 的分页状态和导入

**Files:**
- Modify: `src/components/admin/UserList.vue`

- [ ] **Step 1: 恢复 computed 导入**

修改 script setup 导入语句（第 187 行左右）：

```javascript
import { ref, reactive, computed, onMounted, watch } from 'vue'
```

- [ ] **Step 2: 恢复 pagination computed 属性**

在 `pageSize` 定义后添加（第 203 行左右）：

```javascript
const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  pageSizeOptions: ['10', '20', '50'],
  showSizeChanger: true,
  showTotal: false,
  showQuickJumper: false,
  simple: true
}))
```

---

### Task 2: 恢复 Table 组件的分页配置

**Files:**
- Modify: `src/components/admin/UserList.vue`

- [ ] **Step 1: 恢复 Table 分页属性**

修改 a-table 组件（第 40 行左右）：

```vue
:pagination="pagination"
@change="handleTableChange"
```

移除 `:pagination="false"`

---

### Task 3: 恢复 fetchUsers 的 API 参数传递

**Files:**
- Modify: `src/components/admin/UserList.vue`

- [ ] **Step 1: 移除调试代码，恢复分页参数**

修改 fetchUsers 函数（第 250 行左右）：

```javascript
const fetchUsers = async () => {
  loading.value = true
  try {
    const result = await getUserListApi({
      page: currentPage.value,
      page_size: pageSize.value
    })

    // 本地搜索过滤
    let filteredUsers = result.data || []
    if (Object.keys(searchForm).some(key => searchForm[key])) {
      filteredUsers = filterUsers(filteredUsers)
    }

    users.value = filteredUsers
  } catch (error) {
    console.error('获取用户列表失败:', error)
    message.error('获取用户列表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}
```

移除 console.log 调试代码

---

### Task 4: 恢复 handleTableChange 事件处理函数

**Files:**
- Modify: `src/components/admin/UserList.vue`

- [ ] **Step 1: 添加 handleTableChange 函数**

在 resetSearch 函数后添加（第 298 行左右）：

```javascript
const handleTableChange = (page, size) => {
  if (pageSize.value !== size) {
    pageSize.value = size
    currentPage.value = 1
  } else {
    currentPage.value = page
  }
  fetchUsers()
}
```

---

### Task 5: 验证功能并提交

**Files:**
- Test: 运行应用测试

- [ ] **Step 1: 检查代码完整性**

确认 UserList.vue 包含：
- computed 导入
- pagination computed 属性
- Table 组件的 :pagination 和 @change
- fetchUsers 传递 { page, page_size }
- handleTableChange 函数

- [ ] **Step 2: 启动开发服务器验证**

```bash
npm run dev
```

验证：
1. 分页控件正常显示（简洁模式，无总条数）
2. 切换页码时 Network 面板显示请求带有 page 和 page_size 参数
3. 切换每页条数时重置到第 1 页
4. 搜索功能正常工作（当前页过滤）
5. 编辑/删除/导入功能正常

- [ ] **Step 3: 提交代码**

```bash
git add src/components/admin/UserList.vue
git commit -m "feat: 恢复用户列表分页功能，携带 page 和 page_size 参数"
```

---

## 验收清单

- [x] Task 1: 恢复状态和导入
- [x] Task 2: 恢复 Table 分页配置
- [x] Task 3: 恢复 API 参数传递
- [x] Task 4: 恢复事件处理函数
- [x] Task 5: 验证并提交
