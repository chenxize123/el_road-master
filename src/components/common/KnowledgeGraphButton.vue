<template>
  <a-tooltip title="只有在燕山大学校园网环境下才可使用此功能">
    <span class="knowledge-graph-tooltip-trigger">
      <a-button class="knowledge-graph-button" @click="openKnowledgeGraph">
        <template #icon>
          <RocketOutlined />
        </template>
        专业知识图谱
      </a-button>
    </span>
  </a-tooltip>
</template>

<script setup>
import { RocketOutlined } from '@ant-design/icons-vue'

const openKnowledgeGraph = () => {
  window.open('http://10.21.22.123:8001', '_blank', 'noopener')
}
</script>

<style scoped>
.knowledge-graph-button {
  height: 36px;
  min-width: 138px;
  padding: 0 18px;
  border: 0;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  background: linear-gradient(135deg, #1677ff 0%, #28c7a7 100%);
  box-shadow: 0 8px 18px rgba(22, 119, 255, 0.22);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.knowledge-graph-tooltip-trigger {
  display: inline-flex;
}

.knowledge-graph-button:hover,
.knowledge-graph-button:focus {
  color: #fff;
  background: linear-gradient(135deg, #2f86ff 0%, #32d6b5 100%);
  box-shadow: 0 10px 22px rgba(22, 119, 255, 0.3);
  transform: translateY(-1px);
  filter: saturate(1.05);
}

.knowledge-graph-button:active {
  color: #fff;
  transform: translateY(0);
  box-shadow: 0 6px 14px rgba(22, 119, 255, 0.22);
}

.knowledge-graph-button:disabled {
  color: #fff;
  background: linear-gradient(135deg, #1677ff 0%, #28c7a7 100%);
  box-shadow: 0 8px 18px rgba(22, 119, 255, 0.18);
  cursor: wait;
  opacity: 0.82;
}

</style>
