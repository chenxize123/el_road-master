/**
 * 调试工具 - 用于查看API返回结果
 */

// 全局API监控
let apiDebugEnabled = false

export const debugAPI = {
  // 启用API调试
  enable() {
    if (typeof window !== 'undefined' && window.fetch) {
      apiDebugEnabled = true
      this.setupFetchInterceptor()
      console.log('🔍 API调试已启用')
    }
  },

  // 禁用API调试
  disable() {
    apiDebugEnabled = false
    console.log('🔍 API调试已禁用')
  },

  // 设置fetch拦截器
  setupFetchInterceptor() {
    const originalFetch = window.fetch

    window.fetch = async function(url, options = {}) {
      if (!apiDebugEnabled) return originalFetch.call(this, url, options)

      console.log('📡 发起请求:', {
        url,
        method: options.method || 'GET',
        headers: options.headers
      })

      try {
        const response = await originalFetch.call(this, url, options)
        const responseClone = response.clone()

        // 尝试解析JSON响应
        let data
        try {
          data = await responseClone.json()
        } catch (e) {
          // 如果不是JSON，读取文本
          const text = await responseClone.text()
          console.log('📋 响应内容 (文本):', text.substring(0, 200) + (text.length > 200 ? '...' : ''))
          return response
        }

        // 打印完整的JSON响应
        console.log('✅ 响应状态:', response.status, response.statusText)
        console.log('📋 响应数据:', JSON.stringify(data, null, 2))

        // 特别关注课程相关的API
        if (url.includes('/course/')) {
          console.log('🎯 检测到课程API调用:')
          if (data && data.data && data.data.list) {
            console.log('   📚 找到课程列表:', data.data.list.length, '门课程')
            console.log('   📊 总条数:', data.data.total)
          }
        }

        return response
      } catch (error) {
        console.error('❌ 请求失败:', error)
        throw error
      }
    }
  },

  // 手动触发调试信息
  logCurrentData(courseList, loading) {
    console.log('📊 当前组件状态:')
    console.log('   加载状态:', loading)
    console.log('   课程数量:', courseList?.length || 0)
    console.log('   课程数据:', JSON.stringify(courseList?.slice(0, 3), null, 2)) // 只显示前3条
  },

  // 检查数据格式
  validateCourseData(course) {
    const requiredFields = ['id', 'title']
    const missing = requiredFields.filter(field => !course[field])

    if (missing.length > 0) {
      console.warn('⚠️ 课程数据缺少必要字段:', missing)
      return false
    }

    return true
  },

  // 生成测试数据
  generateTestData() {
    return {
      code: 200,
      message: "success",
      data: {
        list: [
          {
            id: 1,
            title: "高等数学基础",
            courseCode: "MATH101",
            create_by: "张教授",
            classCount: 3,
            cover: null,
            description: "高等数学是理工科学生必修的基础课程",
            teacher_name: "张教授",
            create_time: "2024-09-01T08:00:00Z",
            status: "published"
          },
          {
            id: 2,
            title: "线性代数",
            courseCode: "MATH102",
            create_by: "李教授",
            classCount: 2,
            cover: null,
            description: "线性代数的理论与实践应用",
            teacher_name: "李教授",
            create_time: "2024-09-05T09:30:00Z",
            status: "published"
          }
        ],
        total: 2
      }
    }
  }
}

// 导出便捷函数
export const debug = {
  enable: () => debugAPI.enable(),
  disable: () => debugAPI.disable(),
  log: (courseList, loading) => debugAPI.logCurrentData(courseList, loading),
  testData: () => debugAPI.generateTestData(),
  validate: (course) => debugAPI.validateCourseData(course)
}