/*
 * @Date         : 2026-06-12
 * @Description  : 权限管理 API
 * @FilePath     : permission.js
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved.
 */
import api from './index'

/**
 * 获取权限列表（分页）
 * @param {Object} params - 分页参数 { page, page_size }
 */
export function getPermissionListApi(params) {
  return api.get(`/permission/?page=${params.page}&page_size=${params.page_size}`)
}

/**
 * 获取权限总数
 */
export function getPermissionCountApi() {
  return api.get('/permission/count')
}

/**
 * 根据角色ID获取该角色的权限
 * @param {Number} roleId - 角色 ID
 */
export function getRolePermissionsApi(roleId) {
  return api.get(`/permission/role?role_id=${roleId}`)
}

/**
 * 为角色添加权限
 * @param {Number} roleId - 角色 ID
 * @param {Number} permissionId - 权限 ID
 */
export function addPermissionToRoleApi(roleId, permissionId) {
  return api.post(`/permission/role?role_id=${roleId}&permission_id=${permissionId}`)
}

/**
 * 为角色删除权限
 * @param {Number} roleId - 角色 ID
 * @param {Number} permissionId - 权限 ID
 */
export function removePermissionFromRoleApi(roleId, permissionId) {
  return api.delete(`/permission/role?role_id=${roleId}&permission_id=${permissionId}`)
}
