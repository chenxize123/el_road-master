<template>
  <a-card :bordered="false" class="course-resource-module">
    <div class="module-toolbar">
      <span class="toolbar-title">课程资料</span>
      <a-upload
        v-if="editable"
        multiple
        :show-upload-list="false"
        :before-upload="beforeUpload"
      >
        <a-button type="primary">
          <template #icon><UploadOutlined/></template>
          上传资料
        </a-button>
      </a-upload>
    </div>

    <a-table
      :data-source="list"
      :loading="loading"
      :columns="columns"
      row-key="id"
      :pagination="false"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <FileTextOutlined/>
          <span class="file-name">{{ record.name }}</span>
        </template>

        <template v-else-if="column.key === 'create_time'">
          {{ formatTime(record.create_time) }}
        </template>

        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" @click="handleDownload(record)">下载</a-button>
            <a-button
              v-if="editable"
              type="link"
              @click="handleRename(record)"
            >
              重命名
            </a-button>
            <a-popconfirm
              v-if="editable"
              title="确定删除这份资料吗？"
              @confirm="handleDelete(record)"
            >
              <a-button type="link" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-empty
      v-if="!loading && !list.length"
      description="暂无课程资料"
    />
  </a-card>
</template>

<script setup>
import { ref, watch, onMounted, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  UploadOutlined,
  FileTextOutlined
} from '@ant-design/icons-vue'
import {
  getCourseResources,
  uploadCourseResource,
  renameCourseResource,
  deleteCourseResource,
  getCourseResourceDownloadUrl
} from '@/api/courseResource'

const props = defineProps({
  courseId: { type: [String, Number], required: true },
  editable: { type: Boolean, default: false }
})

const list = ref([])
const loading = ref(false)

const columns = [
  { title: '资料名称', key: 'name', dataIndex: 'name' },
  { title: '大小', key: 'size', dataIndex: 'size', width: 120 },
  { title: '上传人', key: 'create_by', dataIndex: 'create_by', width: 140 },
  { title: '上传时间', key: 'create_time', width: 180 },
  { title: '操作', key: 'action', width: props.editable ? 220 : 100 }
]

function formatTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN')
}

async function loadList() {
  if (!props.courseId) return
  loading.value = true
  try {
    const res = await getCourseResources(props.courseId)
    if (res.code === 200) {
      list.value = res.data || []
    }
  } catch (e) {
    message.error('获取课程资料失败')
  } finally {
    loading.value = false
  }
}

async function beforeUpload(file) {
  // 与 nginx client_max_body_size 保持一致，当前为 100MB
  if (file.size > 100 * 1024 * 1024) {
    message.error('单个文件不能超过 100MB')
    return false
  }
  try {
    const res = await uploadCourseResource(props.courseId, file)
    if (res.code === 200) {
      message.success(`${file.name} 上传成功`)
      await loadList()
    }
  } catch (e) {
    message.error(`${file.name} 上传失败`)
  }
  return false
}

async function handleDownload(row) {
  const res = await getCourseResourceDownloadUrl(row.resource)
  if (res.code !== 200 || !res.data) {
    message.error('获取下载地址失败')
    return
  }
  const blob = await fetch(res.data).then(r => r.blob())
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = row.name
  a.click()
  URL.revokeObjectURL(url)
}

function handleRename(row) {
  const inputRef = ref(null)
  let newName = row.name

  Modal.confirm({
    title: '重命名资料',
    content: h('div', { style: { width: '100%' } }, [
      h('input', {
        ref: inputRef,
        value: row.name,
        style: { width: '100%' },
        onInput: (event) => {
          newName = event.target.value
        },
        onMounted: () => {
          setTimeout(() => inputRef.value?.focus(), 0)
        }
      })
    ]),
    onOk: async () => {
      const trimmedName = String(newName || '').trim()
      if (!trimmedName || trimmedName === row.name) return

      const res = await renameCourseResource(row.id, trimmedName)
      if (res.code === 200) {
        message.success('重命名成功')
        await loadList()
      }
    }
  })
}

async function handleDelete(row) {
  const res = await deleteCourseResource(row.id)
  if (res.code === 200) {
    message.success('删除成功')
    await loadList()
  }
}

onMounted(loadList)
watch(() => props.courseId, loadList)
</script>

<style scoped>
.module-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.toolbar-title {
  font-size: 16px;
  font-weight: 600;
}
.file-name {
  margin-left: 8px;
}
</style>
