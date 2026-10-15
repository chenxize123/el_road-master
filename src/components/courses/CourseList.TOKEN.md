# CourseList 组件 - Token设置指南

## 🔑 认证机制说明

`CourseList` 组件支持从多个位置自动获取认证令牌：

### 1. 支持的Token Key

```javascript
// 优先级顺序（从高到低）
const token = (
  localStorage.getItem('token') ||           // ✅ 主要key
  localStorage.getItem('auth_token') ||      // ⚠️ 备用key
  document.cookie.match(/token=([^;]+)/)?.[1] || // Cookie
  ''
)
```

### 2. 正确的Token设置方法

#### 方法一：登录成功后立即设置

```javascript
// 在你的登录逻辑中
async function handleLogin(credentials) {
  try {
    const response = await fetch(import.meta.env.VITE_API_BASE_URL + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    })

    if (response.ok) {
      const data = await response.json()
      const token = data.token || data.data?.token || data.access_token

      // ✅ 设置token到localStorage
      localStorage.setItem('token', token)
      
      // 可选：也设置到其他key以便兼容性
      localStorage.setItem('auth_token', token)

      console.log('✅ 登录成功，Token已保存')
      
      // 跳转到主页面
      router.push('/teacher/home')
    }
  } catch (error) {
    console.error('❌ 登录失败:', error)
  }
}
```

#### 方法二：使用Pinia Store管理

```javascript
// src/store/auth.js
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: ''
  }),
  
  actions: {
    setUser(user, token) {
      this.user = user
      this.token = token
      
      // 同步到localStorage以便CourseList组件读取
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token)
        localStorage.setItem('auth_token', token)
        
        // 可选：保存用户信息
        localStorage.setItem('user_info', JSON.stringify(user))
      }
    },
    
    logout() {
      this.user = null
      this.token = ''
      
      // 清除localStorage中的认证信息
      localStorage.removeItem('token')
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
      
      // 跳转到登录页
      router.push('/login')
    }
  },
  
  getters: {
    isAuthenticated: (state) => !!state.token,
    userRole: (state) => state.user?.role || 'visitor'
  }
})
```

#### 方法三：手动设置Token（测试用）

```javascript
// 在浏览器控制台中临时设置token（仅用于测试）
localStorage.setItem('token', 'your-jwt-token-here')

// 或者设置多个key以确保兼容性
localStorage.setItem('token', 'your-jwt-token-here')
localStorage.setItem('auth_token', 'your-jwt-token-here')
```

## 🛠️ 调试认证问题

### 1. 检查Token是否设置正确

```javascript
// 在浏览器控制台中运行
console.log('🔍 检查Token存储:')
console.log('   token key:', localStorage.getItem('token'))
console.log('   auth_token key:', localStorage.getItem('auth_token'))
console.log('   Cookie token:', document.cookie.match(/token=([^;]+)/)?.[1])

// 检查API请求头
fetch(import.meta.env.VITE_API_BASE_URL + '/course/teacher_id/')
  .then(res => res.clone().json())
  .then(data => console.log('API响应:', data))
  .catch(err => console.error('API错误:', err))
```

### 2. 常见问题排查

#### 问题：401 Unauthorized
**症状**: API返回401错误
**解决方案**:
```javascript
// 1. 检查Token是否存在
if (!localStorage.getItem('token')) {
  console.warn('❌ 未找到token，请重新登录')
  router.push('/login')
  return
}

// 2. 检查Token格式
const token = localStorage.getItem('token')
if (!token.startsWith('eyJ')) {
  console.warn('❌ Token格式不正确')
  return
}

// 3. 尝试刷新Token
refreshToken().then(() => {
  // 重新发起请求
})
```

#### 问题：Token过期
**症状**: 登录一段时间后无法获取数据
**解决方案**:
```javascript
// 监听401错误
const checkAuthError = (error) => {
  if (error.message.includes('401')) {
    console.warn('🔄 Token过期，正在刷新...')
    refreshToken().then(success => {
      if (success) {
        // 重新获取数据
        courseListComponent.fetchCourses()
      } else {
        // Token无法刷新，重新登录
        router.push('/login')
      }
    })
  }
}
```

## 📱 移动端注意事项

### 1. 存储限制处理

```javascript
// 安全的存储方法
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    console.warn('存储失败，可能超出配额:', e)
    
    // 回退方案：使用内存存储
    window.__tempStorage = window.__tempStorage || {}
    window.__tempStorage[key] = value
    return false
  }
}

// 使用示例
safeSetItem('token', jwtToken)
```

### 2. 应用生命周期管理

```javascript
// 页面卸载时清理敏感数据
window.addEventListener('beforeunload', () => {
  // 保留必要的token，清理其他敏感信息
  const keysToKeep = ['token']
  Object.keys(localStorage).forEach(key => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key)
    }
  })
})

// 应用启动时恢复状态
window.addEventListener('load', () => {
  if (!localStorage.getItem('token')) {
    // 没有token，可能是首次访问或已退出登录
    router.push('/login')
  }
})
```

## 🔒 安全最佳实践

### 1. HTTPS强制

```javascript
// 在生产环境中强制HTTPS
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  location.href = location.href.replace('http:', 'https:')
}
```

### 2. Token过期时间检查

```javascript
// 检查Token有效期（如果有exp字段）
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload.exp * 1000 // 转换为毫秒
    return Date.now() >= exp
  } catch (e) {
    return true // 如果解析失败，认为是过期的
  }
}

// 使用示例
const token = localStorage.getItem('token')
if (isTokenExpired(token)) {
  console.warn('🔄 Token已过期，需要重新登录')
  router.push('/login')
}
```

### 3. 敏感信息保护

```javascript
// 不要在日志中输出完整的token
console.log('Token存在:', !!localStorage.getItem('token')) // ✅ 安全
console.log('完整Token:', localStorage.getItem('token'))   // ❌ 不安全

// 使用哈希或截断显示
const shortToken = localStorage.getItem('token')?.substring(0, 10) + '...'
console.log('Token前缀:', shortToken)
```

## 🚀 生产环境建议

### 1. 环境变量配置

```env
# .env.development
VITE_API_BASE_URL=http://localhost:9000
VITE_AUTH_ENABLED=true

# .env.production
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_AUTH_ENABLED=true
VITE_TOKEN_KEY=token # 可以自定义token的key名
```

### 2. 错误监控

```javascript
// 集成错误监控系统
function reportAuthError(error, context = {}) {
  if (window.Sentry) {
    Sentry.withScope(scope => {
      scope.setContext('auth', context)
      Sentry.captureException(error)
    })
  }
  
  console.group('🔐 认证错误')
  console.error('错误:', error)
  console.error('上下文:', context)
  console.groupEnd()
}
```

---

**🎉 现在你的CourseList组件已经完全支持认证了！**

记得在登录成功后调用：
```javascript
localStorage.setItem('token', 'your-jwt-token')
// 或者使用Pinia store管理
```

如有问题，请检查：
- 浏览器控制台中的认证日志
- Network面板中的HTTP请求和响应头
- Token是否正确设置和存储

如有需要，可以使用调试工具查看详细的认证过程。