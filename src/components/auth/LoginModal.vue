<!--
 * @Date         : 2026-05-08 16:25:30
 * @Description  : 
 * @FilePath     : LoginModal.vue
 * @LastEditTime : 2026-05-08 17:20:22
 * @Version      : V1.0.0
 * Copyright 2026 ZST, All Rights Reserved. 
 * 2026-05-08 16:25:30
-->
<template>
  <a-modal
    v-model:open="visible"
    title="登录使用"
    width="420px"
    centered
    :footer="null"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      layout="vertical"
      :model="form"
      @finish="handleSubmit"
    >
      <a-form-item
        label="账号"
        name="username"
        :rules="[{ required: true, message: '请输入账号' }]"
      >
        <a-input
          v-model:value="form.username"
          placeholder="请输入账号"
          allow-clear
        />
      </a-form-item>

      <a-form-item
        label="密码"
        name="password"
        :rules="[{ required: true, message: '请输入密码' }]"
      >
        <a-input-password
          v-model:value="form.password"
          placeholder="请输入密码"
        />
      </a-form-item>

      <a-form-item>
        <a-checkbox v-model:checked="form.remember">
          记住密码
        </a-checkbox>
      </a-form-item>

      <a-button
        type="primary"
        html-type="submit"
        block
        :loading="loading"
      >
        登录
      </a-button>

      <a-button
        block
        style="margin-top: 12px"
        :loading="guestLoading"
        @click="handleGuestLogin"
      >
        游客预览
      </a-button>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useUserStore } from '@/store'
import { useRouter } from 'vue-router'
const props = defineProps({
  open: {
    type: Boolean,
    default: false
  }
})
const router = useRouter()

const getHomePathByUserType = userType => {
  const userTypePathMap = {
    student: '/student',
    teacher: '/teacher',
    admin: '/admin',
    visitor: '/teacher'
  }

  return userTypePathMap[userType] || '/'
}
const emit = defineEmits(['update:open', 'success'])

const userStore = useUserStore()

const loading = ref(false)
const guestLoading = ref(false)

const visible = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const form = reactive({
  username: '',
  password: '',
  remember: false
})

const loadSavedLogin = () => {
  const savedLogin = localStorage.getItem('remember_login')

  if (savedLogin) {
    try {
      const data = JSON.parse(savedLogin)
      form.username = data.username || ''
      form.password = data.password || ''
      form.remember = true
    } catch (e) {
      console.error('Failed to parse saved login info:', e)
      localStorage.removeItem('remember_login')
    }
  }
}

watch(
  () => props.open,
  value => {
    if (value) {
      loadSavedLogin()
    }
  },
  { immediate: true }
)

const handleSubmit = async () => {
  loading.value = true

  try {
    const result = await userStore.login({
      username: form.username,
      password: form.password
    })

    if (form.remember) {
      localStorage.setItem(
        'remember_login',
        JSON.stringify({
          username: form.username,
          password: form.password
        })
      )
    } else {
      localStorage.removeItem('remember_login')
    }

    message.success('登录成功')
    visible.value = false
    emit('success', result)

    const userType = userStore.userInfo?.user_type
    router.push(getHomePathByUserType(userType))
  } catch (error) {
    message.error(error?.message || '登录失败，请检查账号或密码')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  visible.value = false
}

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
</script>