// API调试脚本 - 用于查看实际的API返回结果
console.log('🔍 API调试工具已启动...')

// 全局fetch拦截器，捕获所有网络请求
const originalFetch = window.fetch || fetch

window.fetch = function(url, options = {}) {
  console.log('📡 发起请求:', url)
  console.log('📤 请求选项:', JSON.stringify(options, null, 2))

  return originalFetch.call(this, url, options)
    .then(async response => {
      const responseClone = response.clone()
      try {
        const data = await responseClone.json()
        console.log('✅ 响应状态:', response.status)
        console.log('📋 响应数据:', JSON.stringify(data, null, 2))
      } catch (e) {
        console.log('📝 响应文本:', await responseClone.text())
      }

      return response
    })
    .catch(error => {
      console.error('❌ 请求失败:', error)
      throw error
    })
}

console.log('💡 现在你可以打开浏览器控制台，查看所有API调用和返回的数据')
console.log('🎯 重点关注以下两个API端点:')
console.log('   - ' + (import.meta.env.VITE_API_BASE_URL ) + '/course/teacher_id/')
console.log('   - ' + (import.meta.env.VITE_API_BASE_URL ) + '/course/')