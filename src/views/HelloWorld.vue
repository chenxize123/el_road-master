<template>
  <div class="hello-world">
    <a-card title="Hello World" style="width: 100%">
      <p>项目页面已清空，当前保留基础工程能力。</p>
      <p>这是一个最小化的可运行页面，用于验证项目基础架构是否正常。</p>

      <a-space direction="vertical" style="width: 100%;">
        <a-typography-title :level="4">工程能力验证</a-typography-title>

        <a-list :data-source="features">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta
                :title="item.title"
                :description="item.description"
              />
            </a-list-item>
          </template>
        </a-list>

        <a-button type="primary" @click="showInfo = true">
          查看项目信息
        </a-button>

        <PermissionGuard permission="basic_view">
          <a-alert
            message="权限系统正常工作"
            description="您当前拥有 basic_view 权限，这是游客级别的基础权限。"
            type="success"
            show-icon
          />
        </PermissionGuard>
      </a-space>
    </a-card>

    <a-modal
      v-model:open="showInfo"
      title="项目信息"
      @ok="showInfo = false"
    >
      <p>这是一个基于 Vue 3 + Vite + Ant Design Vue 构建的最小化助教系统项目。</p>
      <ul>
        <li>Vite 构建工具 - 极速开发体验</li>
        <li>Vue 3 - 渐进式 JavaScript 框架</li>
        <li>Ant Design Vue - 企业级 UI 组件库</li>
        <li>Vue Router - 单页面应用路由管理</li>
        <li>Pinia - 状态管理系统</li>
        <li>四级权限控制体系</li>
      </ul>
    </a-modal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import PermissionGuard from '../components/PermissionGuard.vue'

const showInfo = ref(false)

const features = [
  {
    title: 'Vue 3',
    description: '使用 Composition API 和最新的 Vue 3 特性'
  },
  {
    title: 'Vite',
    description: '超快的开发服务器和热模块替换'
  },
  {
    title: 'Ant Design Vue',
    description: '美观且功能丰富的 UI 组件库'
  },
  {
    title: '路由保护',
    description: '完整的路由守卫和权限控制系统'
  }
]
</script>

<style scoped>
.hello-world {
  max-width: 800px;
  margin: 0 auto;
}
</style>