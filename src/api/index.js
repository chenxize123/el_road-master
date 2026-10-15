import JSONbig from 'json-bigint'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT || 10000)

class ApiService {
  async request(url, options = {}) {
    const token = localStorage.getItem('token')

    const controller = new AbortController()
    const timeout = options.timeout || TIMEOUT
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const headers = {}
      // 只有当 skipContentType 不为 true 时才设置 Content-Type
      if (!options.skipContentType) {
        headers['Content-Type'] = 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      // 合并用户自定义 headers
      if (options.headers) {
        Object.assign(headers, options.headers)
      }

      const response = await fetch(`${BASE_URL}${url}`, {
        ...options,
        signal: controller.signal,
        headers
      })

      let data

      try {
        // 不使用 response.json()
        // 否则大整数会丢失精度
        const text = await response.text()

        data = text
          ? JSONbig({ storeAsString: true }).parse(text)
          : {}
      } catch (e) {
        if (!response.ok) {
          throw new Error('请求失败: ' + response.statusText)
        }

        return {}
      }

      if (!response.ok) {
        // 抛出包含完整错误信息的对象
        const error = new Error(data?.message || '请求失败')
        error.data = data
        error.status = response.status
        throw error
      }

      return data
    } finally {
      clearTimeout(timer)
    }
  }

  get(url) {
    return this.request(url, {
      method: 'GET'
    })
  }

  /**
   * 支持带请求体的 GET 请求
   * 注意：这是非标准 HTTP 用法，用于与特定后端 API 兼容
   */
  getWithBody(url, data) {
    return this.request(url, {
      method: 'GET',
      body: JSON.stringify(data)
    })
  }

  post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  put(url, data) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  delete(url) {
    return this.request(url, {
      method: 'DELETE'
    })
  }

  postForm(url, formData) {
    return this.request(url, {
      method: 'POST',
      body: formData,
      skipContentType: true
    })
  }

  /**
   * 流式POST请求
   * 返回原始响应，方便调用者处理流式数据
   */
  async streamPost(url, data) {
    const token = localStorage.getItem('token')

    const headers = {
      'Content-Type': 'application/json'
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error('请求失败: ' + response.statusText)
    }

    return response
  }
}

const api = new ApiService()

export default api
