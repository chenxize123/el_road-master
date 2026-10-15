<template>
  <div class="tree-node-wrapper">
    <div v-if="isEditing" class="tree-node editing-node">
      <span class="expand-placeholder"></span>
      <div class="edit-form">
        <div class="edit-field">
          <a-input
            v-model:value="localLabel"
            placeholder="知识点名称"
            size="small"
            @click.stop
          />
        </div>
        <div class="edit-field">
          <a-textarea
            v-model:value="localContent"
            placeholder="知识点内容"
            :auto-size="{ minRows: 2, maxRows: 6 }"
            @click.stop
          />
        </div>
        <div class="edit-actions">
          <a-button
            type="primary"
            size="small"
            :loading="saving"
            @click.stop="handleSave"
          >
            保存
          </a-button>
          <a-button
            size="small"
            :disabled="saving"
            @click.stop="handleCancel"
          >
            取消
          </a-button>
        </div>
      </div>
    </div>

    <div v-else
      class="tree-node"
      :class="{ 'has-children': hasChildren, 'is-expanded': isExpanded }"
      @click="handleClick"
    >
      <span v-if="hasChildren" class="expand-icon" :class="{ expanded: isExpanded }">
        <span class="icon-arrow">
          <svg viewBox="0 0 1024 1024" width="12" height="12" fill="currentColor">
            <path d="M715.8 493.5L335 154.6c-14.2-12.7-35-12.7-49.2 0-14.2 12.7-14.2 33.3 0 46l343.5 307.2c14.2 12.7 35 12.7 49.2 0l343.5-307.2c14.2-12.7-14.2-33.3 0-46-14.2-12.7-35-12.7-49.2 0L715.8 493.5z" />
          </svg>
        </span>
      </span>
      <span v-else class="expand-placeholder"></span>

      <span class="node-content">
        <span class="node-label">{{ node.label }}</span>
        <a-tag :color="getTypeColor(node.type)" class="node-type" size="small">
          {{ getTypeLabel(node.type) }}
        </a-tag>
      </span>

      <span class="edit-icon" @click.stop="handleStartEdit">
        <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
          <path d="M257.7 752c2 0 4-.2 6-.5L431.9 672l294.5-294.5c5.2-5.2 5.2-13.8 0-19L524.3 154.5c-5.2-5.2-13.8-5.2-19 0L210.8 449c-2.6 2.6-4 6.1-4 9.8V736c0 8.8 7.2 16 16 16h54.9z m55.5-64h-39.5v-39.5l208-208 39.5 39.5-208 208zM832 298.5l-70.9 70.9 77.5 77.5L909.5 376l-77.5-77.5z m-328 264l-77.5 77.5L736 864h128V736l-360-360z" />
        </svg>
      </span>
    </div>

    <div v-if="hasChildren && isExpanded" class="tree-children">
      <knowledge-node
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :expanded-keys="expandedKeys"
        :editing-node-id="editingNodeId"
        :edit-form="editForm"
        :saving="saving"
        @toggle-expand="$emit('toggle-expand', $event)"
        @select-node="$emit('select-node', $event)"
        @start-edit="$emit('start-edit', $event)"
        @save-edit="$emit('save-edit', $event)"
        @cancel-edit="$emit('cancel-edit', $event)"
        @update-label="$emit('update-label', $event)"
        @update-content="$emit('update-content', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  expandedKeys: {
    type: Array,
    default: () => []
  },
  editingNodeId: {
    type: [String, Number],
    default: null
  },
  editForm: {
    type: Object,
    default: () => ({ label: '', content: '' })
  },
  saving: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-expand', 'select-node', 'start-edit', 'save-edit', 'cancel-edit', 'update-label', 'update-content'])

const typeLabels = {
  chapter: '章节',
  sub_chapter: '子章节',
  point: '知识点'
}

const typeColors = {
  chapter: 'blue',
  sub_chapter: 'cyan',
  point: 'green'
}

const hasChildren = computed(() => props.node.children && props.node.children.length > 0)
const isExpanded = computed(() => props.expandedKeys.includes(props.node.id))
const isEditing = computed(() => String(props.editingNodeId) === String(props.node.id))
const isPoint = computed(() => props.node.type === 'point')

const localLabel = ref('')
const localContent = ref('')

watch(() => props.editForm, (newForm) => {
  localLabel.value = newForm.label || ''
  localContent.value = newForm.content || ''
}, { immediate: true, deep: true })

watch(localLabel, (value) => emit('update-label', value))
watch(localContent, (value) => emit('update-content', value))

function getTypeLabel(type) { return typeLabels[type] || type }
function getTypeColor(type) { return typeColors[type] || 'default' }

function handleClick() {
  if (hasChildren.value) emit('toggle-expand', props.node.id)
  emit('select-node', props.node.id)
}

function handleStartEdit() { emit('start-edit', props.node) }
function handleSave() { emit('save-edit', props.node) }
function handleCancel() { emit('cancel-edit') }
</script>

<style scoped>
.tree-node-wrapper { position: relative; }
.tree-node {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  gap: 8px;
}
.tree-node:hover { background-color: #f5f5f5; }
.expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #8c8c8c;
  flex-shrink: 0;
}
.expand-icon .icon-arrow {
  display: block;
  transition: transform 0.2s ease;
}
.expand-icon.expanded .icon-arrow { transform: rotate(90deg); }
.expand-placeholder { width: 20px; flex-shrink: 0; }
.node-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.node-label {
  font-size: 14px;
  color: #262626;
  line-height: 1.5;
}
.node-type {
  flex-shrink: 0;
  font-size: 12px;
}
.tree-children {
  padding-left: 28px;
  border-left: 1px dashed #e8e8e8;
  margin-left: 10px;
}
.edit-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #8c8c8c;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease, color 0.2s ease;
  flex-shrink: 0;
}
.tree-node:hover .edit-icon { opacity: 1; }
.edit-icon:hover { color: #1890ff; }
.editing-node {
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
}
.edit-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.edit-field { width: 100%; }
.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
