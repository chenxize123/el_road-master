/**
 * 权限管理状态
 */

import { defineStore } from 'pinia'

export const usePermissionStore = defineStore('permission', {
  state: () => ({
    // 路由白名单（无需认证即可访问）
    whiteList: ['/', '/login', '/register', '/about'],
    // 动态路由列表
    dynamicRoutes: [],
    // 加载动态路由状态
    loadingRoutes: false,
    // 菜单配置
    menus: [],
    // 当前用户信息
    userInfo: null,
    // 当前用户权限
    currentPermissions: []
  }),

  getters: {
    // 获取需要认证的路由
    authRoutes: (state) => {
      return state.dynamicRoutes.filter(route => !state.whiteList.includes(route.path))
    },
    // 获取侧边栏菜单
    sidebarMenus: (state) => {
      return state.menus.filter(menu => menu.showInMenu !== false)
    },
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
      if (state.userRole === 'visitor') {
        const guestPermissions = ['course_view', 'grade_view', 'basic_view']
        if (guestPermissions.includes(permission)) return true
      }

      return state.currentPermissions.includes(permission)
    },
    // 获取用户等级
    userLevel: (state) => {
      const levelMap = {
        visitor: 0,
        student: 1,
        teacher: 2,
        admin: 3
      }
      return levelMap[state.userRole] || 0
    },
    // 获取用户角色文本
    roleText: (state) => {
      const textMap = {
        admin: '系统管理员',
        teacher: '教师',
        student: '学生',
        visitor: '游客'
      }
      return textMap[state.userRole] || '未知角色'
    },
    // 获取当前权限
    currentPermissions: (state) => state.currentPermissions
  },

  actions: {
    // 设置动态路由
    setDynamicRoutes(routes) {
      this.dynamicRoutes = routes
    },

    // 添加单个路由
    addRoute(route) {
      if (!this.dynamicRoutes.some(r => r.path === route.path)) {
        this.dynamicRoutes.push(route)
      }
    },

    // 移除路由
    removeRoute(path) {
      this.dynamicRoutes = this.dynamicRoutes.filter(route => route.path !== path)
    },

    // 清除所有动态路由
    clearRoutes() {
      this.dynamicRoutes = []
    },

    // 设置菜单配置
    setMenus(menus) {
      this.menus = menus
    },

    // 根据用户权限过滤菜单
    filterMenusByPermission(userPermissions, allMenus) {
      return allMenus.filter(menu => {
        // 如果菜单没有权限要求，显示
        if (!menu.requiredPermissions) return true

        // 如果有权限要求，检查用户是否拥有任一权限
        return menu.requiredPermissions.some(perm => userPermissions.includes(perm))
      })
    },

    // 模拟获取动态路由（实际项目中应调用API）
    async fetchDynamicRoutes() {
      this.loadingRoutes = true

      try {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 500))

        // 根据不同角色返回不同的路由和菜单
        // 动态路由配置（保留基础结构，实际页面将在需要时创建）
        const routes = []

        // 根据用户权限过滤路由
        const userPermissions = this.currentPermissions
        const filteredRoutes = routes.filter(route =>
          !route.requiredPermissions || route.requiredPermissions.some(p => userPermissions.includes(p))
        )

        this.setDynamicRoutes(filteredRoutes)

        // 生成菜单配置
        const menus = filteredRoutes.map(route => ({
          key: route.path,
          label: route.meta.title,
          icon: route.meta.icon,
          path: route.path,
          requiredPermissions: route.requiredPermissions
        }))

        this.setMenus(menus)

        return filteredRoutes
      } catch (error) {
        console.error('获取动态路由失败:', error)
        throw error
      } finally {
        this.loadingRoutes = false
      }
    },

    // 设置用户信息
    setUserInfo(userInfo) {
      this.userInfo = userInfo
      this.currentPermissions = userInfo?.permissions || []
    },

    // 清除用户信息
    clearUserInfo() {
      this.userInfo = null
      this.currentPermissions = []
    },

    // 重置权限状态
    reset() {
      this.clearRoutes()
      this.setMenus([])
      this.clearUserInfo()
    }
  }
})