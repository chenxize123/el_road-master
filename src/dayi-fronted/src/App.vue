<template>
  <div class="edu-home">
    <header class="edu-header">
      <h1>智慧教育平台</h1>
      <p>让学习更高效，让知识更易得</p>
    </header>
    <main class="edu-main">
      <div class="placeholder-content">
        <p>欢迎访问智慧教育平台</p>
      </div>
    </main>
    <ChatWidget />
  </div>
</template>

<script setup>
import ChatWidget from './components/ChatWidget.vue'
</script>

<style>
.edu-home {
  min-height: 100vh;
  background: #ffffff;
}

.edu-header {
  text-align: center;
  padding: 60px 20px 30px;
}

.edu-header h1 {
  font-size: 32px;
  color: #1a1a2e;
  font-weight: 700;
}

.edu-header p {
  margin-top: 12px;
  font-size: 16px;
  color: #6b7280;
}

.edu-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.placeholder-content {
  text-align: center;
  padding: 80px 20px;
  color: #9ca3af;
  font-size: 18px;
}
</style>
