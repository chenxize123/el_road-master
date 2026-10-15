/**
 * 工具函数集合
 */

/**
 * 格式化日期为指定格式
 * @param {Date|string} date - 日期对象或日期字符串
 * @param {string} format - 格式化模式，默认为 'YYYY-MM-DD'
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return ''

  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
}

/**
 * 防抖函数
 * @param {Function} fn - 需要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖处理后的函数
 */
export const debounce = (fn, delay = 300) => {
  let timer = null
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 * @param {Function} fn - 需要节流的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 节流处理后的函数
 */
export const throttle = (fn, delay = 300) => {
  let canRun = true
  return function (...args) {
    if (!canRun) return
    canRun = false
    setTimeout(() => {
      fn.apply(this, args)
      canRun = true
    }, delay)
  }
}

/**
 * 深拷贝对象
 * @param {Object} obj - 需要拷贝的对象
 * @returns {Object} 深拷贝后的对象
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (typeof obj === 'object') {
    const clonedObj = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
export const generateId = () => {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * 确保树中的所有节点都有ID
 * @param {Array} tree - 树结构数据
 * @returns {Array} 处理后的树数据
 */
export const ensureTreeIds = (tree) => {
  if (!tree || !Array.isArray(tree)) return []

  const idSet = new Set()

  const processNode = (node) => {
    const processedNode = { ...node }

    // 确保有id
    if (!processedNode.id) {
      processedNode.id = generateId()
    }

    // 避免重复id
    while (idSet.has(processedNode.id)) {
      processedNode.id = generateId()
    }
    idSet.add(processedNode.id)

    // 处理子节点
    if (processedNode.children && Array.isArray(processedNode.children)) {
      processedNode.children = processedNode.children.map(processNode)
    }

    return processedNode
  }

  return tree.map(processNode)
}

/**
 * 检查是否为移动端设备
 * @returns {boolean} 是否为移动设备
 */
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}