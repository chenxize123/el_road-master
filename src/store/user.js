import { defineStore } from 'pinia'
import { loginApi, getUserInfoApi, logoutApi } from '@/api/auth'
import { updateUserApi } from '@/api/user'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: JSON.parse(localStorage.getItem('userInfo') || 'null'),
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    error: null
  }),

  actions: {
    async login(loginForm) {
      this.loading = true
      this.error = null

      try {
        const res = await loginApi(loginForm)

        if (!res || !res.token) {
          throw new Error('后端未返回 token')
        }

        this.token = res.token
        this.userInfo = res.userInfo || null
        this.isAuthenticated = true

        localStorage.setItem('token', res.token)

        if (res.userInfo) {
          localStorage.setItem('userInfo', JSON.stringify(res.userInfo))
        }

        return res
      } catch (error) {
        this.error = error.message
        this.clearUserInfo()
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchUserInfo() {
      const res = await getUserInfoApi()
      this.userInfo = res
      localStorage.setItem('userInfo', JSON.stringify(res))

      return res
    },

    async logout() {
      try {
        await logoutApi()
      } catch (error) {
        // 后端接口可能不存在，忽略错误继续退出
        console.warn('Logout API call failed, continuing with local logout:', error)
      } finally {
        this.clearUserInfo()
      }
    },

    restoreAuthState() {
      const token = localStorage.getItem('token')
      const userInfo = localStorage.getItem('userInfo')

      this.token = token || ''
      this.userInfo = userInfo ? JSON.parse(userInfo) : null
      this.isAuthenticated = !!token
    },

    clearUserInfo() {
      this.token = ''
      this.userInfo = null
      this.isAuthenticated = false
      this.loading = false
      this.error = null

      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
    },

    async updateUserInfo(userData) {
      this.loading = true
      this.error = null

      try {
        const result = await updateUserApi(userData)

        if (result.code === 200) {
          // 更新本地 userInfo，保留原有字段
          this.userInfo = { ...this.userInfo, ...userData }
          localStorage.setItem('userInfo', JSON.stringify(this.userInfo))
          return result
        }

        throw new Error(result.message || '更新失败')
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})