<template>
  <a-tooltip :title="drawSoftwareUrl ? '在新标签页打开子路AI电路实验' : '子路AI电路实验链接尚未配置'">
    <span class="draw-software-tooltip-trigger">
      <a-button
        class="draw-software-button"
        type="primary"
        :href="drawSoftwareUrl || undefined"
        target="_blank"
        rel="noopener noreferrer"
        :disabled="!drawSoftwareUrl"
      >
        <span class="draw-software-content">
          <ThunderboltOutlined class="power-icon" />
          <span class="draw-software-label">子路AI电路实验</span>
        </span>
      </a-button>
    </span>
  </a-tooltip>
</template>

<script setup>
import { ThunderboltOutlined } from '@ant-design/icons-vue'

const drawSoftwareUrl = import.meta.env.VITE_DRAW_SOFTWARE_URL?.trim() || 'https://voltora.cn'
</script>

<style scoped>
.draw-software-tooltip-trigger {
  display: inline-flex;
}

.draw-software-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  min-width: 138px;
  padding: 0 18px;
  border: 0;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  background: linear-gradient(135deg, #1677ff 0%, #28a9c7 100%);
  box-shadow: 0 8px 18px rgba(22, 119, 255, 0.22);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.draw-software-button:hover,
.draw-software-button:focus {
  color: #fff;
  background: linear-gradient(135deg, #2f86ff 0%, #32b8d6 100%);
  box-shadow: 0 10px 22px rgba(22, 119, 255, 0.3);
  transform: translateY(-1px);
}

.draw-software-button :deep(.anticon) {
  display: inline-flex;
  align-items: center;
}

.draw-software-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5715;
}

.draw-software-content :deep(.power-icon) {
  width: 14px;
  height: 22px;
  justify-content: center;
  line-height: 1;
}

.draw-software-content :deep(.power-icon svg) {
  display: block;
  width: 14px;
  height: 14px;
}

.draw-software-button:disabled {
  color: #fff;
  opacity: 0.72;
}
</style>
