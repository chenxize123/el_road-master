/**
 * 路由守卫和权限控制
 */

import { useUserStore } from '../store/user'
import { usePermissionStore } from '../store/permission'

// 白名单路由（无需认证）
const whiteList = ['/', '/login', '/register', '/about']

export const createAuthGuard = (router) => {
  router.beforeEach(async (to, from, next) => {
    const userStore = useUserStore()
    const permissionStore = usePermissionStore()

    // 1. 检查是否已登录
    if (!userStore.isAuthenticated) {
      // 如果在白名单中，允许访问
      if (whiteList.includes(to.path)) {
        next()
      } else {
        // 未登录且不在白名单，重定向到登录页
        next({
          path: '/login',
          query: { redirect: to.fullPath }
        })
      }
      return
    }

    // 2. 已登录用户尝试访问登录页，重定向到首页
    if (to.path === '/login') {
      next('/')
      return
    }

    // 3. 检查权限（如果路由有权限要求）
    if (to.meta && to.meta.requiredPermissions) {
      const hasPermission = to.meta.requiredPermissions.some(perm =>
        userStore.permissions.includes(perm)
      )

      if (!hasPermission) {
        // 无权限，重定向到无权限页面或首页
        next('/403')
        return
      }
    }

    // 4. 加载动态路由（首次进入需要权限的页面时）
    if (!permissionStore.dynamicRoutes.length) {
      try {
        await permissionStore.fetchDynamicRoutes()
        // 重新执行当前路由
        next({ ...to, replace: true })
      } catch (error) {
        console.error('加载权限路由失败:', error)
        userStore.logout()
        next('/login')
      }
      return
    }

    next()
  })

  router.afterEach((to) => {
    // 记录路由访问日志（可选）
    console.log(`导航到: ${to.path}`)
  })

  // 错误处理
  router.onError((error) => {
    console.error('路由错误:', error)
    // 可以在这里添加全局错误处理逻辑
  })
}