<template>
  <a-modal
    :open="props.visible"
    title="编辑用户信息"
    :confirm-loading="loading"
    @update:open="emit('update:visible', $event)"
    @ok="handleSubmit"
    @cancel="handleCancel"
    width="600px"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      layout="vertical"
      autocomplete="off"
    >
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="用户名" name="username">
            <a-input v-model:value="formData.username" placeholder="请输入用户名" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="真实姓名" name="real_name">
            <a-input v-model:value="formData.real_name" placeholder="请输入真实姓名" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="手机号" name="mobile">
            <a-input v-model:value="formData.mobile" placeholder="请输入手机号" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="邮箱" name="email">
            <a-input v-model:value="formData.email" placeholder="请输入邮箱" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="角色" name="user_type">
            <a-select v-model:value="formData.user_type" placeholder="请选择角色">
              <a-select-option value="student">学生</a-select-option>
              <a-select-option value="teacher">教师</a-select-option>
              <a-select-option value="admin">管理员</a-select-option>
              <a-select-option value="visitor">游客</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="状态" name="is_disabled">
            <a-switch v-model:checked="formData.is_disabled" checked-children="禁用" un-checked-children="正常" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="密码" name="password">
        <a-input-password v-model:value="formData.password" placeholder="留空表示不修改密码" />
        <div class="form-tip">留空表示不修改密码</div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { updateUserApi } from '@/api/user'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  userData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:visible', 'refresh'])

const formRef = ref()
const loading = ref(false)
const formData = reactive({
  id: null,
  username: '',
  password: '',
  is_disabled: false,
  real_name: '',
  mobile: '',
  email: '',
  user_type: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  real_name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  mobile: [
    {
      validator: (rule, value) => {
        // 如果为空、"暂无"或者什么都没有，则不验证
        if (!value || value.trim() === '' || value.trim() === '暂无') {
          return Promise.resolve()
        }
        // 验证手机号格式
        const mobilePattern = /^1[3-9]\d{9}$/
        if (!mobilePattern.test(value)) {
          return Promise.reject('请输入正确的手机号格式')
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ],
  email: [
    {
      validator: (rule, value) => {
        // 如果为空、"暂无"或者什么都没有，则不验证
        if (!value || value.trim() === '' || value.trim() === '暂无') {
          return Promise.resolve()
        }
        // 验证邮箱格式
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailPattern.test(value)) {
          return Promise.reject('请输入正确的邮箱格式')
        }
        return Promise.resolve()
      },
      trigger: ['blur', 'change']
    }
  ],
  user_type: [{ required: true, message: '请选择角色', trigger: 'change' }],
  is_disabled: [{ required: true, message: '请选择用户状态', trigger: 'change' }]
}

const normalizeDisabledStatus = (value) => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  const normalizedValue = String(value ?? '').trim().toLowerCase()
  if (['true', '1', '禁用', 'disabled'].includes(normalizedValue)) {
    return true
  }

  if (['false', '0', '正常', '启用', 'enabled', ''].includes(normalizedValue)) {
    return false
  }

  return false
}

// 监听用户数据变化，更新表单
watch(
  () => props.userData,
  (newVal) => {
    console.log('userData changed:', newVal)
    if (newVal && Object.keys(newVal).length > 0) {
      // 使用更明确的赋值方式避免reactivity问题
      formData.id = newVal.id
      formData.username = newVal.username || ''
      formData.real_name = newVal.real_name || ''
      formData.mobile = newVal.mobile || ''
      formData.email = newVal.email || ''
      formData.user_type = newVal.user_type || ''
      formData.is_disabled = normalizeDisabledStatus(newVal.is_disabled)
      console.log('Set is_disabled to:', formData.is_disabled)
    }
  },
  { immediate: true, deep: true }
)

// 监听visible变化，重置表单
watch(
  () => props.visible,
  (newVal) => {
    if (!newVal) {
      resetForm()
    }
  }
)

const resetForm = () => {
  Object.assign(formData, {
    id: null,
    username: '',
    password: '',
    is_disabled: false,
    real_name: '',
    mobile: '',
    email: '',
    user_type: ''
  })
  formRef.value?.resetFields()
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    loading.value = true

    console.log('formData.is_disabled:', formData.is_disabled, 'type:', typeof formData.is_disabled)

    const submitData = {
      id: formData.id || 0,
      username: formData.username,
      real_name: formData.real_name,
      mobile: formData.mobile,
      email: formData.email,
      user_type: formData.user_type,
      is_disabled: !!formData.is_disabled
    }

    console.log('submitData:', submitData)

    // 如果提供了密码，则包含在提交数据中
    if (formData.password && formData.password.trim() !== '') {
      submitData.password = formData.password
    }

    const result = await updateUserApi(submitData)

    if (result.code === 200) {
      message.success('用户信息更新成功')
      emit('update:visible', false)
      emit('refresh')
    } else {
      message.error(result.message || '更新失败')
    }
  } catch (error) {
    console.error('更新用户失败:', error)
    console.error('错误详情:', error.data)
    const errorMsg = error.data?.detail || error.data?.message || error.message || '未知错误'
    message.error('更新用户失败: ' + errorMsg)
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>