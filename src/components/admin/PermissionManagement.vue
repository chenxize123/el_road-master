<!--
 * @Date         : 2026-06-12
 * @Description  : 权限管理组件
 * @FilePath     : PermissionManagement.vue
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
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
            :show-total="showTotal"
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
  getRolePermissionsApi,
  addPermissionToRoleApi,
  removePermissionFromRoleApi
} from '@/api/permission'
import { getRoleListApi } from '@/api/role'

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
  ADMIN: 'red',
  TEACHER: 'green',
  STUDENT: 'blue',
  VISITOR: 'orange'
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

// 显示总数
const showTotal = (total) => `共 ${total} 条`

// 核心方法
const fetchData = async () => {
  loading.value = true
  try {
    // 获取所有角色列表
    const rolesRes = await getRoleListApi()
    const roleList = rolesRes.data || []

    // 为每个角色获取其权限
    const rolesWithPermissions = await Promise.all(
      roleList.map(async (role) => {
        try {
          const permRes = await getRolePermissionsApi(role.id)
          // 权限返回的是对象数组，需要提取id
          const permissionIds = (permRes.data || []).map(p => p.id)
          return {
            ...role,
            name: role.description, // 添加 name 字段用于显示
            permission_ids: permissionIds
          }
        } catch (error) {
          console.error(`获取角色 ${role.id} 权限失败:`, error)
          return {
            ...role,
            name: role.description,
            permission_ids: []
          }
        }
      })
    )

    roles.value = rolesWithPermissions

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
    // 如果角色权限还没加载，先加载
    if (!role.permission_ids) {
      try {
        const permRes = await getRolePermissionsApi(roleId)
        // 权限返回的是对象数组，需要提取id
        role.permission_ids = (permRes.data || []).map(p => p.id)
      } catch (error) {
        console.error(`获取角色 ${roleId} 权限失败:`, error)
        role.permission_ids = []
      }
    }
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

    // 重新获取该角色的最新权限
    try {
      const permRes = await getRolePermissionsApi(selectedRoleId.value)
      // 权限返回的是对象数组，需要提取id
      const permissionIds = (permRes.data || []).map(p => p.id)
      const role = roles.value.find(r => r.id === selectedRoleId.value)
      if (role) {
        role.permission_ids = permissionIds
      }
      // 更新原始状态
      updateCheckedPermissions(permissionIds)
    } catch (error) {
      console.error('刷新角色权限失败:', error)
      // 如果刷新失败，至少更新原始状态为当前选中状态
      originalPermissionIds.value = new Set(checkedPermissionIds.value)
    }
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
