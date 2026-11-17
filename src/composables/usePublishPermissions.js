import { ref } from 'vue'
import { getRolePermissionsApi } from '@/api/permission'
import { getRoleListApi } from '@/api/role'
import { extractPublishPermissionCodes } from '@/utils/publishPermissions'

function unwrapList(response) {
  let data = response?.data?.data ?? response?.data ?? response
  for (let depth = 0; depth < 3 && data && !Array.isArray(data); depth += 1) {
    data = data.items ?? data.list ?? data.records ?? data.roles ?? data.permissions ?? data.data
  }
  return Array.isArray(data) ? data : []
}

function matchesUserRole(role, userType) {
  const aliases = {
    teacher: ['teacher', '教师'],
    admin: ['admin', 'administrator', '管理员']
  }[userType] || [userType]
  return ['role', 'role_name', 'name', 'description', 'role_type']
    .some(key => aliases.includes(String(role?.[key] || '').trim().toLowerCase()))
}

export function usePublishPermissions(getUserInfo) {
  const permissionCodes = ref([])
  const loading = ref(false)
  const loadError = ref('')

  async function load() {
    const userInfo = getUserInfo()
    const userType = String(userInfo?.user_type || '').toLowerCase()
    permissionCodes.value = extractPublishPermissionCodes(userInfo?.permissions)
    loadError.value = ''
    if (userType !== 'teacher') return

    loading.value = true
    try {
      const rolesResponse = await getRoleListApi()
      if (rolesResponse?.code !== 200) {
        throw new Error(rolesResponse?.message || '获取角色列表失败')
      }

      const role = unwrapList(rolesResponse).find(item => matchesUserRole(item, userType))
      if (!role?.id) {
        throw new Error('未找到教师角色')
      }

      const permissionsResponse = await getRolePermissionsApi(role.id)
      if (permissionsResponse?.code !== 200) {
        throw new Error(permissionsResponse?.message || '获取教师权限失败')
      }

      permissionCodes.value = [
        ...new Set([
          ...permissionCodes.value,
          ...extractPublishPermissionCodes(unwrapList(permissionsResponse))
        ])
      ]
    } catch (error) {
      console.error('获取发布权限失败:', error)
      loadError.value = error.message || '获取发布权限失败'
    } finally {
      loading.value = false
    }
  }

  return { permissionCodes, loading, loadError, load }
}
