<!--
 * @Description  : 学生列表和添加学生组件
 * @FilePath     : ClassStudentCard.vue
-->
<template>
  <a-card title="学生列表" class="students-card">
    <div class="add-student-section">
      <a-alert
        v-if="!classInfo?.id"
        message="请先加载班级信息"
        type="warning"
        show-icon
        style="margin-bottom: 16px"
      />
      <a-form v-else layout="inline" @finish="handleFormSubmit" :model="addStudentForm">
        <a-form-item
          label="学号"
          name="studentId"
          :rules="[{ required: true, message: '请输入学号' }]"
        >
          <a-input
            v-model:value="addStudentForm.studentId"
            placeholder="请输入学号"
            style="width: 200px"
            :disabled="addingStudent || batchImporting"
          />
        </a-form-item>
        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            :loading="addingStudent"
            :disabled="!classInfo?.id || batchImporting"
          >
            添加学生到班级
          </a-button>
        </a-form-item>
        <a-form-item>
          <a-button
            @click="downloadTemplate"
            :disabled="!classInfo?.id || batchImporting"
          >
            下载导入模板
          </a-button>
        </a-form-item>
        <a-form-item>
          <a-upload
            :show-upload-list="false"
            :before-upload="handleBeforeUpload"
            :custom-request="handleCustomRequest"
            accept=".xlsx,.xls"
            :disabled="!classInfo?.id || batchImporting"
          >
            <a-button type="dashed" :loading="batchImporting">
              批量导入
            </a-button>
          </a-upload>
        </a-form-item>
      </a-form>
    </div>

    <div v-if="loadingStudents" class="loading-container">
      <a-spin tip="加载学生列表中..." />
    </div>
    <a-table
      v-else
      :columns="studentColumns"
      :data-source="studentsList"
      row-key="id"
      :pagination="false"
      :scroll="{ x: 800, y: 400 }"
    >
      <template #emptyText>
        <a-empty
          image="https://gw.alipayobjects.com/minuscule/2.3.0/1676633489859-empty.svg"
          :image-style="{ height: '60px' }"
          description="暂无学生数据"
        >
          <a-button type="primary" @click="() => addStudentForm.studentId = ''">
            添加第一个学生
          </a-button>
        </a-empty>
      </template>
    </a-table>

    <!-- 导入结果 Modal -->
    <a-modal
      v-model:open="importResultModalVisible"
      title="批量导入结果"
      :footer="null"
      width="800px"
    >
      <a-row :gutter="16" style="margin-bottom: 16px;">
        <a-col :span="8">
          <a-statistic title="总条数" :value="importStats.total" />
        </a-col>
        <a-col :span="8">
          <a-statistic title="成功" :value="importStats.success" value-style="color: #3f8600;" />
        </a-col>
        <a-col :span="8">
          <a-statistic title="失败" :value="importStats.failed" value-style="color: #cf1322;" />
        </a-col>
      </a-row>
      <a-table
        :columns="importResultColumns"
        :data-source="importResults"
        row-key="studentNumber"
        :pagination="{ pageSize: 10 }"
        :scroll="{ y: 400 }"
        size="small"
      />
    </a-modal>
  </a-card>
</template>

<script setup>
import { ref, h } from 'vue'
import { message } from 'ant-design-vue'
import * as XLSX from 'xlsx'
import { getUserListApi } from '@/api/user'
import { addStudentToClassApi } from '@/api/class'

const props = defineProps({
  classInfo: Object,
  studentsList: {
    type: Array,
    default: () => []
  },
  loadingStudents: {
    type: Boolean,
    default: false
  },
  addingStudent: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['add-student', 'refresh-students'])

const addStudentForm = ref({
  studentId: ''
})

const batchImporting = ref(false)
const importResultModalVisible = ref(false)
const importResults = ref([])
const importStats = ref({ total: 0, success: 0, failed: 0 })

const studentColumns = [
  { title: '学生姓名', dataIndex: 'name', key: 'name' },
  { title: '用户名', dataIndex: 'username', key: 'username' },
  { title: '手机号', dataIndex: 'mobile', key: 'mobile' },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  {
    title: '状态',
    dataIndex: 'is_disabled',
    key: 'is_disabled',
    customRender: ({ text }) => {
      const color = text === '正常' ? 'green' : 'error'
      return h('a-tag', { color }, () => text)
    }
  }
]

const importResultColumns = [
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber' },
  { title: '姓名', dataIndex: 'name', key: 'name', customRender: ({ text }) => text || '-' },
  {
    title: '状态',
    dataIndex: 'success',
    key: 'status',
    customRender: ({ text, record }) => {
      const statusColor = record.isAlreadyExists ? 'orange' : (text ? 'green' : 'red')
      const statusText = record.isAlreadyExists ? '已存在' : (text ? '成功' : '失败')
      return h('a-tag', { color: statusColor }, () => statusText)
    }
  },
  { title: '消息', dataIndex: 'message', key: 'message' }
]

const handleFormSubmit = () => {
  emit('add-student', addStudentForm.value.studentId)
  addStudentForm.value.studentId = ''
}

const downloadTemplate = () => {
  const data = [
    ['学号', '姓名'],
    ['2024001', '张三'],
    ['2024002', '李四'],
    ['2024003', '王五']
  ]
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '学生导入模板')
  worksheet['!cols'] = [{ wch: 15 }, { wch: 15 }]
  XLSX.writeFile(workbook, '班级学生导入模板.xlsx')
}

const handleBeforeUpload = (file) => {
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                 file.type === 'application/vnd.ms-excel' ||
                 file.name.endsWith('.xlsx') ||
                 file.name.endsWith('.xls')
  if (!isExcel) {
    message.error('只能上传 Excel 文件!')
    return false
  }
  return true
}

const parseExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        const studentNumbers = []
        const seen = new Set()
        for (let i = 1; i < json.length; i++) {
          const row = json[i]
          if (row && row[0]) {
            const studentNumber = String(row[0]).trim()
            if (studentNumber && !seen.has(studentNumber)) {
              seen.add(studentNumber)
              studentNumbers.push(studentNumber)
            }
          }
        }
        resolve(studentNumbers)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

const internalBatchAddStudent = async (studentNumber) => {
  if (!studentNumber) return { success: false, message: '请输入学号', studentNumber }
  const trimmedStudentNumber = studentNumber.trim()
  if (!trimmedStudentNumber) return { success: false, message: '请输入有效的学号', studentNumber }
  try {
    let targetUserId = null
    let matchedUserName = ''
    const userRes = await getUserListApi(
      { page: 1, page_size: 100 },
      { username: trimmedStudentNumber, user_type: 'student' }
    )
    if (userRes.code === 200 && Array.isArray(userRes.data) && userRes.data.length > 0) {
      const matchedUser = userRes.data.find(user =>
        user.username === trimmedStudentNumber ||
        user.student_number === trimmedStudentNumber
      )
      if (matchedUser) {
        targetUserId = matchedUser.id
        matchedUserName = matchedUser.real_name || matchedUser.username
      } else {
        targetUserId = userRes.data[0].id
        matchedUserName = userRes.data[0].real_name || userRes.data[0].username
      }
    } else {
      const userRes2 = await getUserListApi(
        { page: 1, page_size: 100 },
        { username: trimmedStudentNumber }
      )
      if (userRes2.code === 200 && Array.isArray(userRes2.data) && userRes2.data.length > 0) {
        targetUserId = userRes2.data[0].id
        matchedUserName = userRes2.data[0].real_name || userRes2.data[0].username
      } else {
        throw new Error(`未找到学号为"${trimmedStudentNumber}"的学生`)
      }
    }
    const res = await addStudentToClassApi(props.classInfo?.id, String(targetUserId))
    return {
      success: true,
      message: res.data || '学生添加成功',
      studentNumber: trimmedStudentNumber,
      name: matchedUserName
    }
  } catch (error) {
    const errorMsg = error?.response?.data?.message || error.message || '未知错误'
    const isAlreadyExists = errorMsg.includes('已存在') || errorMsg.includes('already') || errorMsg.includes('exist')
    return {
      success: isAlreadyExists,
      message: errorMsg,
      studentNumber: trimmedStudentNumber,
      isAlreadyExists
    }
  }
}

const handleCustomRequest = async ({ file }) => {
  try {
    const studentNumbers = await parseExcel(file)
    if (studentNumbers.length === 0) {
      message.warning('Excel 中没有找到有效的学号')
      return
    }
    batchImporting.value = true
    message.info(`开始批量导入 ${studentNumbers.length} 个学生...`)
    const results = []
    for (const sn of studentNumbers) {
      const result = await internalBatchAddStudent(sn)
      results.push(result)
    }
    emit('refresh-students')
    showImportResult(results)
    message.success('批量导入完成')
  } catch (error) {
    console.error('解析 Excel 失败:', error)
    message.error('解析 Excel 失败，请确保使用正确的模板')
  } finally {
    batchImporting.value = false
  }
}

const showImportResult = (results) => {
  importResults.value = results
  importStats.value = {
    total: results.length,
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success && !r.isAlreadyExists).length
  }
  importResultModalVisible.value = true
}
</script>

<style scoped>
.students-card {
  margin-top: 16px;
  border-radius: 16px;
}

.add-student-section {
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

@media screen and (max-width: 900px) {
  .students-card {
    margin-top: 12px;
    border-radius: 12px;
  }

  .add-student-section :deep(.ant-form-inline) {
    flex-wrap: wrap;
  }
}

@media screen and (max-width: 768px) {
  .add-student-section {
    margin-bottom: 12px;
  }

  .add-student-section :deep(.ant-form-inline) {
    flex-direction: column;
    gap: 8px;
  }

  .add-student-section :deep(.ant-form-item) {
    margin-right: 0;
    margin-bottom: 0;
    width: 100%;
  }

  .add-student-section :deep(.ant-input),
  .add-student-section :deep(.ant-button) {
    width: 100%;
  }
}
</style>
