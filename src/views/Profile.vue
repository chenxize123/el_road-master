<template>
  <div class="profile-page">
    <div class="profile-header">
      <div class="header-content">
        <a-button
          type="text"
          class="back-btn"
          @click="goBack"
        >
          <template #icon>
            <LeftOutlined />
          </template>
          返回
        </a-button>
        <h1 class="page-title">个人资料</h1>
      </div>
    </div>

    <div class="profile-container">
      <a-row :gutter="[32, 32]" class="profile-content">
        <!-- 左侧 - 用户信息卡片 -->
        <a-col :xs="24" :lg="8">
          <div class="user-card-wrapper">
            <a-card class="user-info-card" :bordered="false">
              <div class="avatar-section">
                <div class="avatar-container">
                  <a-upload
                    name="avatar"
                    :showUploadList="false"
                    :beforeUpload="beforeUpload"
                    :customRequest="customUpload"
                    :disabled="uploading"
                    class="avatar-uploader"
                  >
                    <a-avatar
                      :size="120"
                      :src="avatarUrl"
                      @error="handleAvatarError"
                      class="user-avatar"
                    >
                      {{ avatarInitials }}
                    </a-avatar>
                    <div class="avatar-overlay">
                      <CameraOutlined class="camera-icon" />
                    </div>
                  </a-upload>
                </div>
                <h2 class="user-name">{{ userStore.userInfo?.real_name || userStore.userInfo?.username }}</h2>
                <a-tag :class="['role-tag', `role-${userStore.userInfo?.user_type}`]">
                  {{ roleText }}
                </a-tag>
              </div>

              <a-divider class="info-divider" />

              <div class="info-list">
                <div class="info-item">
                  <UserOutlined class="info-icon" />
                  <div class="info-content">
                    <div class="info-label">用户名</div>
                    <div class="info-value">{{ userStore.userInfo?.username || '未设置' }}</div>
                  </div>
                </div>
                <div class="info-item">
                  <PhoneOutlined class="info-icon" />
                  <div class="info-content">
                    <div class="info-label">手机号</div>
                    <div class="info-value">{{ userStore.userInfo?.mobile || '未绑定' }}</div>
                  </div>
                </div>
                <div class="info-item">
                  <MailOutlined class="info-icon" />
                  <div class="info-content">
                    <div class="info-label">邮箱</div>
                    <div class="info-value">{{ userStore.userInfo?.email || '未绑定' }}</div>
                  </div>
                </div>
                <div class="info-item">
                  <ClockCircleOutlined class="info-icon" />
                  <div class="info-content">
                    <div class="info-label">注册时间</div>
                    <div class="info-value">{{ userStore.userInfo?.created_at ? formatDate(userStore.userInfo.created_at) : '-' }}</div>
                  </div>
                </div>
              </div>
            </a-card>
          </div>
        </a-col>

        <!-- 右侧 - 编辑表单 -->
        <a-col :xs="24" :lg="16">
          <div class="form-card-wrapper">
            <a-card title="编辑个人信息" :bordered="false" class="edit-form-card">
              <div class="card-header">
                <EditOutlined class="header-icon" />
                <span>基本信息设置</span>
              </div>

              <a-form
                ref="formRef"
                :model="formData"
                :rules="rules"
                layout="vertical"
                autocomplete="off"
                class="profile-form"
              >
                <div class="form-section">
                  <h3 class="section-title">基本信息</h3>
                  <a-row :gutter="16">
                    <a-col :xs="24" :md="12">
                      <a-form-item label="真实姓名" name="real_name" class="custom-form-item">
                        <a-input
                          v-model:value="formData.real_name"
                          placeholder="请输入真实姓名"
                          class="custom-input"
                          :disabled="['student', 'teacher', 'admin'].includes(userStore.userInfo?.user_type)"
                        >
                          <template #prefix>
                            <UserOutlined />
                          </template>
                        </a-input>
                      </a-form-item>
                    </a-col>
                    <a-col :xs="24" :md="12">
                      <a-form-item label="手机号" name="mobile" class="custom-form-item">
                        <a-input
                          v-model:value="formData.mobile"
                          placeholder="请输入手机号"
                          class="custom-input"
                        >
                          <template #prefix>
                            <PhoneOutlined />
                          </template>
                        </a-input>
                      </a-form-item>
                    </a-col>
                  </a-row>

                  <a-row :gutter="16">
                    <a-col :span="24">
                      <a-form-item label="邮箱" name="email" class="custom-form-item">
                        <a-input
                          v-model:value="formData.email"
                          placeholder="请输入邮箱地址"
                          class="custom-input"
                        >
                          <template #prefix>
                            <MailOutlined />
                          </template>
                        </a-input>
                      </a-form-item>
                    </a-col>
                  </a-row>
                </div>

                <div class="form-section">
                  <h3 class="section-title">安全设置</h3>
                  <div class="password-section">
                    <a-collapse
                      v-model:activeKey="activeKeys"
                      class="password-collapse"
                      :bordered="false"
                    >
                      <a-collapse-panel key="1" class="password-panel">
                        <template #header>
                          <div class="password-header">
                            <KeyOutlined class="password-icon" />
                            <span>修改密码</span>
                            <SafetyOutlined class="security-icon" />
                          </div>
                        </template>

                        <div class="password-fields">
                          <a-row :gutter="16">
                            <a-col :xs="24" :md="12">
                              <a-form-item
                                label="旧密码"
                                name="old_password"
                                v-if="showPasswordFields"
                                class="custom-form-item"
                              >
                                <a-input-password
                                  v-model:value="formData.old_password"
                                  placeholder="请输入旧密码"
                                  class="custom-input"
                                />
                              </a-form-item>
                            </a-col>
                            <a-col :xs="24" :md="12">
                              <a-form-item
                                label="新密码"
                                name="password"
                                v-if="showPasswordFields"
                                class="custom-form-item"
                              >
                                <a-input-password
                                  v-model:value="formData.password"
                                  placeholder="请输入新密码"
                                  class="custom-input"
                                />
                              </a-form-item>
                            </a-col>
                          </a-row>

                          <a-row :gutter="16">
                            <a-col :span="24">
                              <a-form-item
                                label="确认新密码"
                                name="confirm_password"
                                v-if="showPasswordFields"
                                class="custom-form-item"
                              >
                                <a-input-password
                                  v-model:value="formData.confirm_password"
                                  placeholder="请再次输入新密码"
                                  class="custom-input"
                                />
                              </a-form-item>
                            </a-col>
                          </a-row>
                        </div>
                      </a-collapse-panel>
                    </a-collapse>
                  </div>
                </div>

                <div class="form-actions-wrapper">
                  <div class="form-actions">
                    <a-button
                      type="primary"
                      :loading="loading"
                      @click="handleSubmit"
                      class="save-btn"
                    >
                      <template #icon>
                        <SaveOutlined />
                      </template>
                      保存修改
                    </a-button>
                    <a-button
                      @click="goBack"
                      class="back-btn-secondary"
                    >
                      <template #icon>
                        <HomeOutlined />
                      </template>
                      返回首页
                    </a-button>
                  </div>
                </div>
              </a-form>
            </a-card>
          </div>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useUserStore } from '@/store/user'
import {
  LeftOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  EditOutlined,
  KeyOutlined,
  SafetyOutlined,
  SaveOutlined,
  HomeOutlined,
  CameraOutlined
} from '@ant-design/icons-vue'
import { uploadAvatarApi, getAvatarUrlApi } from '@/api/file'

const userStore = useUserStore()
const router = useRouter()
const formRef = ref()
const loading = ref(false)
const activeKeys = ref([])
const uploading = ref(false)
const avatarUrl = ref('')

// 获取临时头像 URL
const fetchAvatarUrl = async () => {
  const objectName = userStore.userInfo?.avatar
  if (!objectName) {
    avatarUrl.value = ''
    return
  }
  try {
    avatarUrl.value = await getAvatarUrlApi(objectName, 10)
  } catch (error) {
    console.error('获取头像URL失败:', error)
    avatarUrl.value = ''
  }
}

// 监听 avatar 变化
watch(() => userStore.userInfo?.avatar, () => {
  fetchAvatarUrl()
}, { immediate: true })

onMounted(() => {
  fetchAvatarUrl()
})

// 文件上传前验证
const beforeUpload = (file) => {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
  if (!isJpgOrPng) {
    message.error('只支持 JPG/PNG 格式图片!')
    return false
  }
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isLt2M) {
    message.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

// 自定义上传
const customUpload = async ({ file }) => {
  if (uploading.value) return
  uploading.value = true

  try {
    await uploadAvatarApi(file)
    message.success('头像上传成功')
    // 注意：由于后端没有 /auth/user-info 接口，用户信息不会自动刷新
    // 刷新页面后会看到新头像
  } catch (error) {
    message.error('头像上传失败: ' + (error.message || '未知错误'))
  } finally {
    uploading.value = false
  }
}

const showPasswordFields = computed(() => {
  return activeKeys.value.includes('1')
})

const formData = reactive({
  real_name: '',
  mobile: '',
  email: '',
  old_password: '',
  password: '',
  confirm_password: ''
})

const validatePasswordConfirm = (rule, value) => {
  if (showPasswordFields.value && formData.password && value !== formData.password) {
    return Promise.reject('两次输入的密码不一致')
  }
  return Promise.resolve()
}

const validatePasswordRequired = (rule, value) => {
  if (showPasswordFields.value && formData.password && !value) {
    return Promise.reject('请输入旧密码')
  }
  return Promise.resolve()
}

const rules = {
  real_name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  mobile: [
    {
      validator: (rule, value) => {
        if (!value || value.trim() === '' || value.trim() === '暂无') {
          return Promise.resolve()
        }
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
        if (!value || value.trim() === '' || value.trim() === '暂无') {
          return Promise.resolve()
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailPattern.test(value)) {
          return Promise.reject('请输入正确的邮箱格式')
        }
        return Promise.resolve()
      },
      trigger: ['blur', 'change']
    }
  ],
  old_password: [{ validator: validatePasswordRequired, trigger: 'blur' }],
  confirm_password: [{ validator: validatePasswordConfirm, trigger: 'blur' }]
}

const avatarInitials = computed(() => {
  if (!userStore.userInfo?.username) return ''
  return userStore.userInfo.username.slice(0, 1).toUpperCase()
})

const roleText = computed(() => {
  const roleMap = {
    admin: '管理员',
    teacher: '教师',
    student: '学生',
    user: '普通用户',
    visitor: '访客'
  }
  return roleMap[userStore.userInfo?.user_type] || '未知角色'
})

const handleAvatarError = () => {
  // 使用默认头像
}

const goBack = () => {
  // 根据用户角色跳转到对应首页
  const user = userStore.userInfo || {}
  const role = user.user_type || 'student'

  switch (role) {
    case 'admin':
      router.push('/admin')
      break
    case 'teacher':
      router.push('/teacher')
      break
    case 'student':
    default:
      router.push('/student')
      break
  }
}

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

const initFormData = () => {
  if (userStore.userInfo) {
    formData.real_name = userStore.userInfo.real_name || ''
    formData.mobile = userStore.userInfo.mobile || ''
    formData.email = userStore.userInfo.email || ''
  }
  formData.old_password = ''
  formData.password = ''
  formData.confirm_password = ''
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    loading.value = true

    const submitData = {
      id: userStore.userInfo.id,
      real_name: formData.real_name,
      mobile: formData.mobile,
      email: formData.email
    }

    // 如果展开了密码区域且输入了新密码，则包含密码修改
    if (showPasswordFields.value && formData.password && formData.password.trim() !== '') {
      submitData.password = formData.password
      // 如果后端需要验证旧密码，也需要提交
      // submitData.old_password = formData.old_password
    }

    await userStore.updateUserInfo(submitData)

    message.success('个人信息更新成功')

    // 重置密码相关字段
    formData.old_password = ''
    formData.password = ''
    formData.confirm_password = ''
    // 收起密码区域
    activeKeys.value = []

    // 自动导航回对应角色的首页
    setTimeout(() => {
      goBack()
    }, 1500)
  } catch (error) {
    console.error('更新失败:', error)
    message.error('更新失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  initFormData()
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  position: relative;
}

.profile-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  font-size: 16px;
  color: #1890ff;
  border: none;
  transition: all 0.3s ease;
}

.back-btn:hover {
  color: #40a9ff;
  background: rgba(24, 144, 255, 0.1);
  transform: translateX(-2px);
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #262626;
  flex: 1;
}

.profile-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.profile-content {
  margin: 0;
}

/* User Info Card Styles */
.user-card-wrapper {
  position: sticky;
  top: 100px;
}

.user-info-card {
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
}

.avatar-section {
  text-align: center;
  padding: 32px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: relative;
}

.avatar-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  opacity: 0.3;
}

.avatar-container {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
}

.avatar-uploader {
  display: inline-block;
}

.avatar-uploader .user-avatar {
  border: 4px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.2);
  font-size: 32px;
  font-weight: 600;
}

.avatar-uploader:hover .user-avatar {
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.avatar-overlay {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0;
}

.avatar-container:hover .avatar-overlay {
  opacity: 1;
}

.camera-icon {
  color: white;
  font-size: 16px;
}

.user-name {
  margin: 12px 0 8px;
  font-size: 24px;
  font-weight: 600;
  color: white;
  position: relative;
  z-index: 1;
}

.role-tag {
  font-size: 14px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 20px;
  position: relative;
  z-index: 1;
}

.role-admin {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  color: white;
  border: none;
}

.role-teacher {
  background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
  color: white;
  border: none;
}

.role-student {
  background: linear-gradient(135deg, #45b7d1 0%, #96c93d 100%);
  color: white;
  border: none;
}


.info-divider {
  margin: 0;
  background: linear-gradient(to right, transparent, #e8e8e8, transparent);
}

.info-list {
  padding: 24px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.3s ease;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item:hover {
  background: rgba(24, 144, 255, 0.02);
  margin: 0 -16px;
  padding: 12px 16px;
  border-radius: 8px;
}

.info-icon {
  font-size: 18px;
  color: #1890ff;
  margin-top: 2px;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
}

.info-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 16px;
  color: #262626;
  font-weight: 500;
}

/* Form Card Styles */
.form-card-wrapper {
  height: fit-content;
}

.edit-form-card {
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  background: white;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 24px 0;
  font-size: 20px;
  font-weight: 600;
  color: #262626;
}

.header-icon {
  font-size: 24px;
  color: #1890ff;
}

.profile-form {
  padding: 24px;
}

.form-section {
  margin-bottom: 32px;
}

.form-section:last-of-type {
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, #1890ff, #52c41a);
}

.custom-form-item :deep(.ant-form-item-label > label) {
  font-weight: 500;
  color: #595959;
}

.custom-input {
  border-radius: 8px;
  border: 2px solid #f0f0f0;
  transition: all 0.3s ease;
  height: 44px;
}

.custom-input:hover {
  border-color: #d9d9d9;
}

.custom-input:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.password-section {
  background: #fafafa;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #f0f0f0;
}

.password-collapse {
  background: transparent;
}

.password-panel {
  border: none;
  background: transparent;
}

.password-panel :deep(.ant-collapse-header) {
  padding: 0 !important;
  border: none;
  background: transparent;
}

.password-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  cursor: pointer;
  transition: all 0.3s ease;
}

.password-header:hover {
  background: #f8f9fa;
  border-color: #1890ff;
}

.password-icon {
  font-size: 16px;
  color: #1890ff;
}

.security-icon {
  font-size: 14px;
  color: #52c41a;
  margin-left: auto;
}

.password-fields {
  margin-top: 16px;
}

.form-actions-wrapper {
  background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.02));
  margin: 0 -24px -24px;
  padding: 24px;
  border-top: 1px solid #f0f0f0;
}

.form-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
}

.save-btn {
  min-width: 140px;
  height: 44px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 16px;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
  transition: all 0.3s ease;
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(24, 144, 255, 0.4);
}

.back-btn-secondary {
  min-width: 120px;
  height: 44px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 16px;
  border: 2px solid #d9d9d9;
  transition: all 0.3s ease;
}

.back-btn-secondary:hover {
  border-color: #1890ff;
  color: #1890ff;
  background: rgba(24, 144, 255, 0.05);
}

/* Responsive Design */
@media screen and (max-width: 992px) {
  .profile-container {
    padding: 24px 16px;
  }

  .user-card-wrapper {
    position: static;
    margin-bottom: 24px;
  }
}

@media screen and (max-width: 768px) {
  .profile-container {
    padding: 16px;
  }

  .profile-content {
    gap: 24px !important;
  }

  .header-content {
    padding: 12px 16px;
  }

  .page-title {
    font-size: 20px;
  }

  .avatar-section {
    padding: 24px 16px;
  }

  .user-avatar {
    width: 80px !important;
    height: 80px !important;
    font-size: 24px !important;
  }

  .user-name {
    font-size: 20px;
  }

  .card-header {
    padding: 16px 16px 0;
    font-size: 18px;
  }

  .profile-form {
    padding: 16px;
  }

  .form-actions {
    flex-direction: column;
  }

  .save-btn,
  .back-btn-secondary {
    width: 100%;
  }

  .info-list {
    padding: 16px;
  }

  .password-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .security-icon {
    margin-left: 0;
  }
}

@media screen and (max-width: 480px) {
  .password-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .security-icon {
    margin-left: 0;
  }
}

/* Animation Classes */
.profile-page {
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-info-card,
.edit-form-card {
  animation: slideUp 0.8s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
