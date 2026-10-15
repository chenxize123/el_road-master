<!--
 * @Description  : 班级详情页头部组件
 * @FilePath     : ClassDetailHeader.vue
-->
<template>
  <a-page-header
    :title="classInfo?.title || '班级详情'"
    :sub-title="`班级ID: ${classId}`"
    @back="$emit('back')"
  >
    <template #extra>
      <a-button @click="$emit('back')">返回</a-button>
    </template>
  </a-page-header>
</template>

<script setup>
defineProps({
  classInfo: Object,
  classId: {
    type: [String, Number],
    required: true
  }
})

defineEmits(['back'])
</script>

<style scoped>
</style>
