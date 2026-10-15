<template>
  <div class="user-avatar">
    <a-dropdown :trigger="['click']">
      <a-upload
        name="avatar"
        :showUploadList="false"
        :beforeUpload="beforeUpload"
        :customRequest="customUpload"
        :disabled="uploading"
        class="avatar-uploader"
      >
        <a-avatar
          :src="avatarUrl"
          :size="40"
          style="cursor: pointer"
          @error="handleAvatarError"
        >
          {{ initials }}
        </a-avatar>
      </a-upload>

      <template #overlay>
        <a-menu>
          <a-menu-item key="profile" @click="goToProfile">
            <template #icon><UserOutlined /></template>
            个人资料
          </a-menu-item>
          <a-menu-item key="settings" @click="goToSettings">
            <template #icon><SettingOutlined /></template>
            账户设置
          </a-menu-item>
          <a-divider />
          <a-menu-item key="logout" @click="handleLogout">
            <template #icon><LogoutOutlined /></template>
            退出登录
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>

    <div v-if="showUserInfo" class="user-info">
      <div class="username">{{ userStore.userInfo?.username }}</div>
      <div class="role">{{ roleText }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '../store/user'
import { uploadAvatarApi, getAvatarUrlApi } from '../api/file'

const props = defineProps({
  showUserInfo: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()
const userStore = useUserStore()
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

// 处理头像加载失败
const handleAvatarError = () => {
  // 可以设置默认头像或显示用户名首字母
}

// 获取姓名首字母
const initials = computed(() => {
  if (!userStore.userInfo?.username) return ''
  return userStore.userInfo.username.slice(0, 1).toUpperCase()
})

// 角色文本映射
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

// 跳转到个人资料页
const goToProfile = () => {
  router.push('/profile')
}

// 跳转到设置页
const goToSettings = () => {
  router.push('/settings')
}

// 处理退出登录
const handleLogout = () => {
  userStore.logout()
}
</script>

<style scoped>
.user-avatar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar-uploader {
  display: inline-block;
}

.avatar-uploader:hover .ant-avatar {
  opacity: 0.8;
  transition: opacity 0.3s;
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.username {
  font-weight: 500;
  color: #333;
}

.role {
  font-size: 12px;
  color: #666;
}

@media screen and (max-width: 768px) {
  .user-info {
    display: none;
  }
}
</style>
