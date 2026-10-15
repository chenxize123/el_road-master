# 用户列表分页功能设计文档

**日期**: 2026-05-21
**版本**: v1.1
**状态**: 待实现

## 1. 概述

为管理员用户列表添加分页功能，携带 `page` 和 `page_size` 参数请求后端 API，实现数据的分页展示。

## 2. 需求说明

### 2.1 功能需求
- 管理员查询用户列表时携带 `page` 和 `page_size` 参数
- 使用 Ant Design Vue Table 组件内置分页功能
- 支持切换每页显示条数（10/20/50）
- 搜索在本地进行，只过滤当前页数据
- 不显示总条数（后端未返回）

### 2.2 API 请求格式
```
GET /api/v1/user/?page=1&page_size=10
```

### 2.3 后端响应格式
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 7460600006609903616,
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

## 3. 设计方案

### 3.1 技术选型
- **方案**: 恢复之前的实现 + 适配无 total 的情况
- **原因**: 代码已有实现基础，改动小，复用 Ant Design Vue 组件

### 3.2 组件设计

#### 3.2.1 状态管理
| 状态名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `currentPage` | ref | 1 | 当前页码 |
| `pageSize` | ref | 10 | 每页显示条数 |

#### 3.2.2 分页配置（computed）
```javascript
pagination: {
  current: currentPage.value,
  pageSize: pageSize.value,
  pageSizeOptions: ['10', '20', '50'],
  showSizeChanger: true,
  showTotal: false,      // 隐藏总条数
  showQuickJumper: false,
  simple: true            // 简洁模式
}
```

#### 3.2.3 API 调用
```javascript
getUserListApi({
  page: currentPage.value,
  page_size: pageSize.value
})
```

#### 3.2.4 事件处理
- `handleTableChange(page, size)`: 处理页码和每页条数变化
  - 当 `pageSize` 变化时，重置 `currentPage` 为 1
  - 触发 `fetchUsers()` 重新获取数据

## 4. 用户交互流程

1. **页面加载** → 默认请求第 1 页，10 条数据
2. **切换页码** → 用户点击"下一页"/"上一页" → 请求对应页数据
3. **切换每页条数** → 用户选择 20/50 条 → 重置到第 1 页，请求新数据
4. **搜索过滤** → 用户输入搜索条件 → 在当前页数据中本地过滤显示

## 5. 文件改动清单

| 文件路径 | 改动类型 | 说明 |
|----------|----------|------|
| `src/components/admin/UserList.vue` | 修改 | 恢复分页相关代码，移除调试代码 |

## 6. 边界情况处理

- **切换 pageSize 时重置页码**: 避免请求不存在的页码
- **本地搜索只作用于当前页**: 符合需求，减少后端复杂度
- **保持现有功能不变**: 编辑、删除、批量导入等功能不受影响

## 7. 验收标准

- [ ] 分页控件正常显示，支持切换每页 10/20/50 条
- [ ] 翻页时正确请求对应页数据，URL 包含 page 和 page_size 参数
- [ ] 搜索仍在当前页工作
- [ ] 编辑/删除后刷新当前页
- [ ] 导入成功后刷新当前页
- [ ] 不显示总条数，只显示上一页/下一页
