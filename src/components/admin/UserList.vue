<template>
  <a-card title="人员列表" class="panel-card">
    <div class="search-toolbar">
      <a-space wrap>
        <a-input-search
          v-model:value="searchForm.real_name"
          placeholder="搜索姓名"
          style="width: 120px"
          @search="handleSearch"
        />
        <a-input-search
          v-model:value="searchForm.username"
          placeholder="搜索账号"
          style="width: 120px"
          @search="handleSearch"
        />
        <a-select
          v-model:value="searchForm.user_type"
          placeholder="选择角色"
          style="width: 120px"
          allow-clear
          @change="handleSearch"
        >
          <a-select-option value="student">学生</a-select-option>
          <a-select-option value="teacher">教师</a-select-option>
          <a-select-option value="admin">管理员</a-select-option>
          <a-select-option value="visitor">游客</a-select-option>
        </a-select>
        <a-button type="primary" @click="showAddUserModal">新增人员</a-button>
        <a-button type="primary" @click="openImportModal">批量导入用户</a-button>
        <a-button @click="resetSearch">重置搜索</a-button>
      </a-space>
    </div>

    <div class="table-container">
      <a-table
        :columns="userColumns"
        :data-source="users"
        :rowKey="(record) => String(record.id)"
        :loading="loading"
        :pagination="{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: handlePageChange,
          onShowSizeChange: handlePageSizeChange,
          pageSizeOptions: [10, 20, 50]
        }"
        class="scrollable-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'id'">
            <span>{{ String(record.id) }}</span>
          </template>

          <template v-if="column.key === 'role'">
            <a-tag :color="roleColorMap[record.user_type]">
              {{ roleNameMap[record.user_type] || record.user_type }}
            </a-tag>
          </template>

          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.is_disabled)">
              {{ getStatusText(record.is_disabled) }}
            </a-tag>
          </template>

          <template v-if="column.key === 'action'">
            <a-button type="link" @click="editUser(record)">编辑</a-button>
            <a-button type="link" danger @click="deleteUser(record)">删除</a-button>
          </template>
        </template>
      </a-table>
    </div>
  </a-card>

  <!-- 编辑用户模态框 -->
  <EditUserModal
    :visible="editModalVisible"
    :user-data="selectedUser"
    @update:visible="editModalVisible = $event"
    @refresh="fetchUsers"
  />

  <!-- 批量导入用户模态框 -->
  <a-modal
    v-model:open="importModalVisible"
    title="批量导入用户"
    :width="1000"
    :footer="null"
    @cancel="importModalVisible = false"
  >
    <a-space direction="vertical" style="width: 100%" :size="16">
      <!-- 说明区域 -->
      <a-alert message="Excel 模板说明" type="info" show-icon>
        <template #description>
          <div class="template-help">
            <ul class="template-rules">
              <li>支持的表头：用户名(账号)、密码、姓名(真实姓名)、手机号(手机)、邮箱、用户类型(角色)</li>
              <li>用户类型支持：学生(student)、教师(teacher/老师)、管理员(admin)、游客(visitor)</li>
              <li>必填字段：用户名、姓名、用户类型</li>
              <li>密码为空时，默认密码=用户名</li>
            </ul>
            <a-button type="primary" ghost class="template-download-button" @click="downloadImportTemplate">
              <template #icon><download-outlined /></template>
              下载示例模板
            </a-button>
          </div>
        </template>
      </a-alert>

      <div class="template-example">
        <div class="example-title">模板字段示例</div>
        <div class="example-grid">
          <span>用户名：123</span>
          <span>密码：123456</span>
          <span>姓名：张三</span>
          <span>用户类型：学生</span>
        </div>
      </div>

      <!-- 上传区域 -->
      <div class="upload-panel">
        <div>
          <div class="upload-title">上传用户表</div>
          <div class="upload-desc">请选择按示例模板整理好的 .xlsx 或 .xls 文件，上传后会先校验再导入。</div>
        </div>
        <a-upload
          v-model:file-list="uploadFileList"
          :before-upload="handleBeforeUpload"
          :max-count="1"
          accept=".xlsx,.xls"
          :disabled="importLoading"
        >
          <a-button type="primary" :loading="importLoading">
            <template #icon><upload-outlined /></template>
            选择 Excel 文件
          </a-button>
        </a-upload>
      </div>

      <!-- 数据预览区域 -->
      <div v-if="parsedUsers.length > 0" class="import-preview">
        <a-divider>数据预览</a-divider>
        <div class="table-container">
          <a-table
            :columns="previewColumns"
            :data-source="parsedUsers"
            :row-key="(record) => record.rowIndex"
            :pagination="{ pageSize: 5 }"
            size="small"
            class="scrollable-table"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'validationStatus'">
                <a-tag :color="record.valid ? 'success' : 'error'">
                  {{ record.valid ? '通过' : '失败' }}
                </a-tag>
              </template>
              <template v-if="column.key === 'errors'">
                <span v-if="record.errors.length > 0" style="color: #ff4d4f">
                  {{ record.errors.join('; ') }}
                </span>
              </template>
              <template v-if="column.key === 'importStatus'">
                <a-tag
                  v-if="record.importStatus !== 'pending'"
                  :color="record.importStatus === 'success' ? 'success' : 'error'"
                >
                  {{ record.importStatus === 'success' ? '成功' : '失败' }}
                </a-tag>
                <span v-else>-</span>
              </template>
              <template v-if="column.key === 'importMessage'">
                <span v-if="record.importMessage" :style="{ color: record.importStatus === 'failed' ? '#ff4d4f' : 'inherit' }">
                  {{ record.importMessage }}
                </span>
                <span v-else>-</span>
              </template>
            </template>
          </a-table>
        </div>
      </div>

      <!-- 导入结果统计 -->
      <div v-if="importSummary" class="import-summary">
        <a-divider>导入结果</a-divider>
        <a-space>
          <a-statistic title="总条数" :value="importSummary.total" />
          <a-statistic title="成功" :value="importSummary.success" :value-style="{ color: '#52c41a' }" />
          <a-statistic title="失败" :value="importSummary.failed" :value-style="{ color: '#ff4d4f' }" />
        </a-space>
      </div>

      <!-- 操作按钮 -->
      <div class="import-actions" style="text-align: right">
        <a-space>
          <a-button @click="resetImportData" :disabled="importLoading">
            清空数据
          </a-button>
          <a-button
            type="primary"
            @click="handleConfirmImport"
            :loading="importLoading"
            :disabled="parsedUsers.length === 0 || parsedUsers.some(u => !u.valid) || !!importSummary"
          >
            确认导入
          </a-button>
        </a-space>
      </div>
    </a-space>
  </a-modal>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import * as XLSX from 'xlsx'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { getUserListApi, getUserCountApi, deleteUserApi, createUserApi, updateUserApi } from '@/api/user'
import { USER_IMPORT_TEMPLATE_URL, getExcelRowNumber } from '@/utils/userImport'
import EditUserModal from './EditUserModal.vue'

const emit = defineEmits(['refresh', 'showAddUserModal'])

const users = ref([])
const loading = ref(false)

// 分页状态
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 搜索表单数据
const searchForm = reactive({
  real_name: '',
  username: '',
  user_type: undefined
})

const userColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: '姓名', dataIndex: 'real_name', key: 'real_name' },
  { title: '账号', dataIndex: 'username', key: 'username' },
  { title: '角色', dataIndex: 'user_type', key: 'role' },
  { title: '手机号', dataIndex: 'mobile', key: 'mobile' },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '状态', dataIndex: 'is_disabled', key: 'status' },
  { title: '操作', key: 'action' }
]

const roleNameMap = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
  visitor: '游客'
}

const roleColorMap = {
  student: 'blue',
  teacher: 'green',
  admin: 'red',
  visitor: 'orange'
}

const getStatusText = (status) => {
  switch (status) {
    case '正常':
      return '正常'
    case '禁用':
      return '禁用'
    default:
      return status || '未知'
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case '正常':
      return 'success'
    case '禁用':
      return 'error'
    default:
      return 'default'
  }
}

const cleanQueryParams = (values) => {
  const result = {}
  Object.keys(values).forEach(key => {
    const value = values[key]
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value
    }
  })
  return result
}

const fetchUserList = async () => {
  loading.value = true
  try {
    const queryBody = cleanQueryParams(searchForm)
    const result = await getUserListApi({
      page: currentPage.value,
      page_size: pageSize.value
    }, queryBody)

    users.value = result.data || []
  } catch (error) {
    console.error('获取用户列表失败:', error)
    message.error('获取用户列表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const fetchUserCount = async () => {
  try {
    const queryBody = cleanQueryParams(searchForm)
    const result = await getUserCountApi(queryBody)
    total.value = result.data || 0
  } catch (error) {
    console.error('获取用户总数失败:', error)
  }
}

const fetchUsers = async () => {
  await Promise.all([fetchUserList(), fetchUserCount()])
}

const showAddUserModal = () => {
  emit('showAddUserModal')
}

// 搜索相关函数
const handleSearch = () => {
  currentPage.value = 1
  fetchUsers()
}

const resetSearch = () => {
  searchForm.real_name = ''
  searchForm.username = ''
  searchForm.user_type = undefined
  handleSearch()
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchUsers()
}

const handlePageSizeChange = (current, size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchUsers()
}

const deleteUser = async (record) => {
  // 添加确认对话框
  const confirmDelete = window.confirm(`确定要删除用户 "${record.real_name}" 吗？此操作不可撤销。`)

  if (!confirmDelete) {
    return
  }

  try {
    loading.value = true
    const result = await deleteUserApi(record.id)

    if (result.code === 200) {
      message.success('用户删除成功')
      fetchUsers() // 重新获取用户列表
      emit('refresh') // 通知父组件刷新
    } else {
      message.error(result.message || '删除失败')
    }
  } catch (error) {
    console.error('删除用户失败:', error)
    message.error('删除用户失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const editUser = (record) => {
  selectedUser.value = record
  editModalVisible.value = true
}

// 编辑用户相关的响应式数据
const selectedUser = ref({})
const editModalVisible = ref(false)

// 监听编辑模态框的visible变化，用于重置表单
watch(
  () => editModalVisible.value,
  (newVal) => {
    if (!newVal) {
      selectedUser.value = {}
    }
  }
)

// 批量导入相关状态
const importModalVisible = ref(false)
const importLoading = ref(false)
const uploadFileList = ref([])
const parsedUsers = ref([])
const importSummary = ref(null)

// 预览表格列配置
const previewColumns = [
  { title: '行号', dataIndex: 'rowIndex', key: 'rowIndex', width: 60 },
  { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
  { title: '密码', dataIndex: 'password', key: 'password', width: 100 },
  { title: '真实姓名', dataIndex: 'real_name', key: 'real_name', width: 120 },
  { title: '手机号', dataIndex: 'mobile', key: 'mobile', width: 120 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
  { title: '用户类型', dataIndex: 'user_type', key: 'user_type', width: 100 },
  { title: '校验状态', key: 'validationStatus', width: 100 },
  { title: '错误原因', key: 'errors', width: 200 },
  { title: '导入状态', key: 'importStatus', width: 100 },
  { title: '导入信息', key: 'importMessage', width: 200 }
]

const openImportModal = () => {
  resetImportData()
  importModalVisible.value = true
}

const resetImportData = () => {
  uploadFileList.value = []
  parsedUsers.value = []
  importSummary.value = null
}

const downloadImportTemplate = () => {
  const link = document.createElement('a')
  link.href = USER_IMPORT_TEMPLATE_URL
  link.download = '批量导入用户示例.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const normalizeHeader = (header) => {
  const headerMap = {
    '用户名': 'username',
    '账号': 'username',
    'password': 'password',
    '密码': 'password',
    'real_name': 'real_name',
    '真实姓名': 'real_name',
    '姓名': 'real_name',
    'mobile': 'mobile',
    '手机号': 'mobile',
    '手机': 'mobile',
    'email': 'email',
    '邮箱': 'email',
    'user_type': 'user_type',
    '用户类型': 'user_type',
    '角色': 'user_type',
    '类型': 'user_type'
  }

  const key = String(header || '').trim()
  return headerMap[key] || key
}

const normalizeUserType = (value) => {
  if (!value) return ''
  const v = String(value).trim().toLowerCase()
  const typeMap = {
    'student': 'student',
    '学生': 'student',
    'teacher': 'teacher',
    '教师': 'teacher',
    '老师': 'teacher',
    'admin': 'admin',
    '管理员': 'admin',
    'visitor': 'visitor',
    '游客': 'visitor'
  }
  return typeMap[v] || v
}

const handleBeforeUpload = (file) => {
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel' ||
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.xls')

  if (!isExcel) {
    message.error('只能上传 .xlsx 或 .xls 文件!')
    return false
  }

  parseExcelFile(file)
  return false
}

const parseExcelFile = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

      if (jsonData.length < 2) {
        message.error('Excel 文件中没有可导入的数据')
        return
      }

      // 处理表头
      const headers = jsonData[0].map(h => normalizeHeader(h))

      // 处理数据行
      const rows = []
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === '')) {
          continue
        }

        const user = {
          rowIndex: getExcelRowNumber(i),
          username: '',
          password: '',
          real_name: '',
          mobile: '',
          email: '',
          user_type: '',
          valid: true,
          errors: [],
          importStatus: 'pending',
          importMessage: ''
        }

        headers.forEach((header, idx) => {
          const value = row[idx]
          switch (header) {
            case 'username':
              user.username = String(value || '').trim()
              break
            case 'password':
              user.password = String(value || '').trim()
              break
            case 'real_name':
              user.real_name = String(value || '').trim()
              break
            case 'mobile':
              user.mobile = String(value || '').trim()
              break
            case 'email':
              user.email = String(value || '').trim()
              break
            case 'user_type':
              user.user_type = normalizeUserType(value)
              break
          }
        })

        // 如果密码为空，则密码=用户名
        if (!user.password && user.username) {
          user.password = user.username
        }

        rows.push(user)
      }

      validateImportRows(rows)
    } catch (error) {
      console.error('Excel 解析失败:', error)
      message.error('Excel 解析失败，请检查文件格式')
    }
  }
  reader.readAsArrayBuffer(file)
}

const validateImportRows = (rows) => {
  const usernameSet = new Set()
  const duplicateUsernames = new Set()

  // 第一次遍历：检查必填字段和格式，并收集重复用户名
  rows.forEach(user => {
    const errors = []

    // 检查用户名
    if (!user.username) {
      errors.push('用户名不能为空')
      user.valid = false
    } else {
      if (usernameSet.has(user.username)) {
        duplicateUsernames.add(user.username)
      }
      usernameSet.add(user.username)
    }

    // 检查真实姓名
    if (!user.real_name) {
      errors.push('真实姓名不能为空')
      user.valid = false
    }

    // 检查用户类型
    if (!user.user_type) {
      errors.push('用户类型不能为空')
      user.valid = false
    } else if (!['student', 'teacher', 'admin', 'visitor'].includes(user.user_type)) {
      errors.push(`用户类型不合法: ${user.user_type}`)
      user.valid = false
    }

    // 检查邮箱格式
    if (user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(user.email)) {
        errors.push('邮箱格式不正确')
        user.valid = false
      }
    }

    // 检查手机号格式
    if (user.mobile) {
      const mobileRegex = /^1[3-9]\d{9}$/
      if (!mobileRegex.test(user.mobile)) {
        errors.push('手机号格式不正确')
        user.valid = false
      }
    }

    user.errors = errors
  })

  // 第二次遍历：标记重复用户名
  rows.forEach(user => {
    if (user.username && duplicateUsernames.has(user.username)) {
      if (!user.errors.includes('Excel 内用户名重复')) {
        user.errors.push('Excel 内用户名重复')
        user.valid = false
      }
    }
  })

  parsedUsers.value = rows
}

const handleConfirmImport = async () => {
  if (parsedUsers.value.length === 0) {
    message.warning('没有可导入的数据')
    return
  }

  const invalidUsers = parsedUsers.value.filter(u => !u.valid)
  if (invalidUsers.length > 0) {
    message.error('存在校验失败的数据，请修正后重新上传')
    return
  }

  importLoading.value = true
  importSummary.value = {
    total: parsedUsers.value.length,
    success: 0,
    failed: 0
  }

  try {
    for (const user of parsedUsers.value) {
      try {
        const result = await createUserApi({
          username: user.username,
          password: user.password,
          real_name: user.real_name,
          mobile: user.mobile,
          email: user.email,
          user_type: user.user_type,
          is_disabled: false
        })

        if (result.code === 200) {
          user.importStatus = 'success'
          user.importMessage = '导入成功'
          importSummary.value.success++
        } else {
          user.importStatus = 'failed'
          user.importMessage = result.message || '创建用户失败'
          importSummary.value.failed++
        }
      } catch (error) {
        user.importStatus = 'failed'
        user.importMessage = error?.response?.data?.message || error?.message || '创建用户失败'
        importSummary.value.failed++
      }
    }

    // 显示结果消息
    if (importSummary.value.failed === 0) {
      message.success(`全部导入成功，共 ${importSummary.value.success} 条`)
    } else {
      message.warning(`导入完成，成功 ${importSummary.value.success} 条，失败 ${importSummary.value.failed} 条`)
    }

    // 刷新用户列表
    fetchUsers()
  } catch (error) {
    console.error('导入过程出错:', error)
    message.error('导入过程出错')
  } finally {
    importLoading.value = false
  }
}

onMounted(fetchUsers)
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
}

.toolbar {
  margin-bottom: 16px;
}

.search-toolbar {
  margin-bottom: 16px;
}

.template-help {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.template-rules {
  margin: 0;
  padding-left: 18px;
}

.template-download-button {
  flex: 0 0 auto;
}

.template-example {
  padding: 14px 16px;
  border: 1px solid #e6f4ff;
  border-radius: 8px;
  background: #f8fbff;
}

.example-title {
  margin-bottom: 10px;
  color: #1f1f1f;
  font-weight: 600;
}

.example-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  color: #4b5563;
}

.upload-panel {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px dashed #91caff;
  border-radius: 8px;
  background: #f5faff;
}

.upload-title {
  color: #1f1f1f;
  font-weight: 600;
}

.upload-desc {
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
}

/* Add horizontal scroll for small screens */
.table-container {
  overflow-x: auto;
}

.scrollable-table {
  min-width: max-content;
}

.import-preview {
  margin-top: 16px;
}

.import-summary {
  margin-top: 16px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 4px;
}

.import-actions {
  margin-top: 16px;
}

@media screen and (max-width: 768px) {
  .template-help,
  .upload-panel {
    align-items: stretch;
    flex-direction: column;
  }

  .example-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
