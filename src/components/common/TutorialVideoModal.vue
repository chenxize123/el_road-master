<!--
 * @Description: 教程视频播放弹窗
-->
<template>
  <a-modal
    :open="open"
    title="使用帮助 - 视频教程"
    :width="800"
    :footer="null"
    :destroy-on-close="true"
    @cancel="handleClose"
  >
    <div class="video-container">
      <video
        ref="videoRef"
        src="/videos/tutorial.mp4"
        controls
        autoplay
        class="tutorial-video"
      >
        您的浏览器不支持视频播放
      </video>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:open'])
const videoRef = ref(null)

const handleClose = () => {
  // 关闭时暂停视频
  if (videoRef.value) {
    videoRef.value.pause()
  }
  emit('update:open', false)
}

// 弹窗关闭时也暂停视频
watch(
  () => props.open,
  (val) => {
    if (!val && videoRef.value) {
      videoRef.value.pause()
    }
  }
)
</script>

<style scoped>
.video-container {
  width: 100%;
  display: flex;
  justify-content: center;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.tutorial-video {
  width: 100%;
  max-height: 70vh;
  outline: none;
}
</style>
