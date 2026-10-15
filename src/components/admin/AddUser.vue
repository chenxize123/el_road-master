<template>
  <a-modal
    v-model:open="visible"
    title="添加用户"
    width="500px"
    centered
    :footer="null"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      layout="vertical"
      :model="form"
      :rules="rules"
      @finish="handleSubmit"
    >
      <a-form-item label="用户名" name="username" :rules="[{ required: true, message: '请输入用户名' }]">
        <a-input
          v-model:value="form.username"
          placeholder="请输入用户名"
          allow-clear
        />
      </a-form-item>

      <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
        <a-input-password
          v-model:value="form.password"
          placeholder="请输入密码"
        />
      </a-form-item>

      <a-form-item label="真实姓名" name="real_name" :rules="[{ required: true, message: '请输入真实姓名' }]">
        <a-input
          v-model:value="form.real_name"
          placeholder="请输入真实姓名"
          allow-clear
        />
      </a-form-item>

      <a-form-item label="手机号" name="mobile">
        <a-input
          v-model:value="form.mobile"
          placeholder="请输入手机号"
          allow-clear
        />
      </a-form-item>

      <a-form-item label="邮箱" name="email">
        <a-input
          v-model:value="form.email"
          placeholder="请输入邮箱"
          allow-clear
        />
      </a-form-item>

      <a-form-item label="用户类型" name="user_type">
        <a-select v-model:value="form.user_type" placeholder="请选择用户类型">
          <a-select-option value="student">学生</a-select-option>
          <a-select-option value="teacher">教师</a-select-option>
          <a-select-option value="admin">管理员</a-select-option>
          <a-select-option value="visitor">游客</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item>
        <a-space>
          <a-button type="primary" html-type="submit" :loading="loading">
            确认添加
          </a-button>
          <a-button @click="handleCancel">
            取消
          </a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { addUserApi } from '@/api/auth'

const emit = defineEmits(['update:open', 'success'])

const visible = ref(false)
const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  real_name: '',
  mobile: '',
  email: '',
  user_type: 'student',
  is_disabled: false
})

const rules = {
  username: [{ required: true, message: '请输入用户名' }],
  password: [{ required: true, message: '请输入密码' }],
  real_name: [{ required: true, message: '请输入真实姓名' }]
}

const handleCancel = () => {
  visible.value = false
  formRef.value.resetFields()
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    await addUserApi(form)

    message.success('用户添加成功')
    visible.value = false
    formRef.value.resetFields()
    emit('success')
  } catch (error) {
    message.error(error?.message || '添加用户失败')
  } finally {
    loading.value = false
  }
}

defineExpose({
  open() {
    visible.value = true
  }
})
</script>