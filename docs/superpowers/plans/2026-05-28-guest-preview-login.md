# 游客预览登录功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现游客预览登录功能，首页和登录弹窗都可以使用visitor/visitor账号登录并跳转到教师首页

**Architecture:** 复用现有的登录流程，在Home.vue和LoginModal.vue中添加游客预览入口，更新跳转逻辑

**Tech Stack:** Vue 3, Pinia, Ant Design Vue, Vue Router

---

## 文件结构

- **Modify:** `src/views/Home.vue` - 添加首页游客预览按钮逻辑
- **Modify:** `src/components/auth/LoginModal.vue` - 添加登录弹窗游客预览按钮和更新跳转逻辑

---

### Task 1: Home.vue 添加游客预览功能

**Files:**
- Modify: `src/views/Home.vue`

- [ ] **Step 1: 导入 useUserStore**

在 `<script setup>` 中添加 import 语句：

```javascript
import { useUserStore } from '@/store'
```

- [ ] **Step 2: 添加 loading 状态和 userStore**

在 `const loginVisible = ref(false)` 后面添加：

```javascript
const guestLoading = ref(false)
const userStore = useUserStore()
```

- [ ] **Step 3: 实现 handleGuestPreview 函数**

在 `handleLoginSuccess` 函数后面添加：

```javascript
const handleGuestPreview = async () => {
  guestLoading.value = true

  try {
    await userStore.login({
      username: 'visitor',
      password: 'visitor'
    })

    message.success('登录成功')
    router.push('/teacher')
  } catch (error) {
    message.error(error?.message || '登录失败，请检查账号或密码')
  } finally {
    guestLoading.value = false
  }
}
```

- [ ] **Step 4: 导入 message**

在 import 语句中添加：

```javascript
import { message } from 'ant-design-vue'
```

- [ ] **Step 5: 更新按钮模板**

找到"游客预览"按钮，添加点击事件和loading状态：

```vue
<a-button
  class="pill-button"
  :loading="guestLoading"
  @click="handleGuestPreview"
>
  游客预览
</a-button>
```

- [ ] **Step 6: 验证修改**

检查文件：
- 导入语句完整
- 函数实现正确
- 模板绑定正确

- [ ] **Step 7: Commit**

```bash
git add src/views/Home.vue
git commit -m "feat: add guest preview button on home page"
```

---

### Task 2: LoginModal.vue 添加游客预览功能

**Files:**
- Modify: `src/components/auth/LoginModal.vue`

- [ ] **Step 1: 更新 getHomePathByUserType 函数**

修改 `getHomePathByUserType` 函数，添加 visitor 映射：

```javascript
const getHomePathByUserType = userType => {
  const userTypePathMap = {
    student: '/student',
    teacher: '/teacher',
    admin: '/admin',
    visitor: '/teacher'
  }

  return userTypePathMap[userType] || '/'
}
```

- [ ] **Step 2: 添加 guestLoading 状态**

在 `const loading = ref(false)` 后面添加：

```javascript
const guestLoading = ref(false)
```

- [ ] **Step 3: 添加 handleGuestLogin 函数**

在 `handleCancel` 函数后面添加：

```javascript
const handleGuestLogin = async () => {
  guestLoading.value = true

  try {
    const result = await userStore.login({
      username: 'visitor',
      password: 'visitor'
    })

    message.success('登录成功')
    visible.value = false
    emit('success', result)

    const userType = userStore.userInfo?.user_type
    router.push(getHomePathByUserType(userType))
  } catch (error) {
    message.error(error?.message || '登录失败，请检查账号或密码')
  } finally {
    guestLoading.value = false
  }
}
```

- [ ] **Step 4: 在模板中添加游客预览按钮**

在登录按钮后面添加游客预览按钮：

```vue
<a-button
  block
  style="margin-top: 12px"
  :loading="guestLoading"
  @click="handleGuestLogin"
>
  游客预览
</a-button>
```

- [ ] **Step 5: 验证修改**

检查文件：
- getHomePathByUserType 已更新
- handleGuestLogin 函数正确
- 模板按钮已添加

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/LoginModal.vue
git commit -m "feat: add guest preview button in login modal"
```

---

## 验证清单

- [ ] 首页"游客预览"按钮可以点击并登录
- [ ] 登录成功后跳转到教师首页
- [ ] 登录弹窗中的"游客预览"按钮可以点击并登录
- [ ] 登录失败时有错误提示
- [ ] Loading状态正常显示

