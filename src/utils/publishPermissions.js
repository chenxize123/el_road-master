const PUBLISH_PERMISSION_CODES = new Set([
  'experiment:publish',
  'experiment:unpublish',
  'exam:publish',
  'exam:unpublish'
])

export function extractPublishPermissionCodes(permissions) {
  const codes = new Set()
  const visited = new Set()

  function collect(value) {
    if (!value || visited.has(value)) return
    if (typeof value === 'string') {
      const code = value.trim().toLowerCase()
      if (PUBLISH_PERMISSION_CODES.has(code)) codes.add(code)
      return
    }
    if (typeof value !== 'object') return
    visited.add(value)

    if (Array.isArray(value)) {
      value.forEach(collect)
      return
    }

    Object.values(value).forEach(collect)
  }

  collect(permissions)
  return [...codes]
}

export function hasPublishPermission(userInfo, permissionCode) {
  if (String(userInfo?.user_type || '').toLowerCase() !== 'teacher' ||
    !PUBLISH_PERMISSION_CODES.has(permissionCode)) {
    return false
  }

  return extractPublishPermissionCodes(userInfo.permissions).includes(permissionCode)
}
