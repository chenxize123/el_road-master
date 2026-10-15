export const RESOURCE_RECOMMENDATION_TIMEOUT_MS = 600000

export const normalizeResourceId = value => {
  const candidates = [
    value?.data?.resource_id,
    value?.data?.id,
    value?.resource_id,
    value?.id,
    value
  ]

  const found = candidates.find(item => item !== undefined && item !== null && item !== '')
  return found === undefined ? '' : String(found)
}

export const buildCreateResourcePayload = topic => ({
  topic: String(topic || '').trim()
})

export const buildResourceListPath = () => '/resource/user'

export const buildResourceDetailPath = resourceId =>
  `/resource/id?resource_id=${encodeURIComponent(normalizeResourceId(resourceId))}`

export const buildDeleteResourcePath = resourceId =>
  `/resource/?resource_id=${encodeURIComponent(normalizeResourceId(resourceId))}`

export const buildTopicPreKnowledgePath = resourceId =>
  `/llm/topic_pre_knowledge?resource_id=${encodeURIComponent(normalizeResourceId(resourceId))}`

export const buildResourceRecommendPath = resourceId =>
  `/llm/resource_recommend?resource_id=${encodeURIComponent(normalizeResourceId(resourceId))}`

export const normalizeWeakKnowledgePoints = points => {
  if (!Array.isArray(points)) return []

  return points
    .map(point => String(point ?? '').trim())
    .filter(Boolean)
}

export const buildResourceRecommendPayload = weakKnowledgePoints => ({
  weak_knowledge_points: normalizeWeakKnowledgePoints(weakKnowledgePoints)
})

export const buildTopicPreKnowledgeOptions = () => ({
  method: 'POST',
  body: '',
  timeout: RESOURCE_RECOMMENDATION_TIMEOUT_MS
})

export const buildResourceRecommendOptions = weakKnowledgePoints => ({
  method: 'POST',
  body: JSON.stringify(buildResourceRecommendPayload(weakKnowledgePoints)),
  timeout: RESOURCE_RECOMMENDATION_TIMEOUT_MS
})

export const extractResourcePayload = response => {
  const data = response?.data ?? response
  return data?.resource ?? data
}

export const extractKnowledgeOptions = response => {
  const data = response?.data ?? response
  const resource = extractResourcePayload(response)
  const candidates = [
    resource?.pre_knowledge,
    resource?.knowledge_points,
    resource?.knowledge_point,
    resource?.weak_knowledge_points,
    resource?.selected_knowledge,
    data?.pre_knowledge,
    data?.knowledge_points,
    data?.knowledge_point,
    data?.weak_knowledge_points,
    data?.result,
    data
  ]
  const list = candidates.find(Array.isArray) || []

  return list
    .map((item, index) => {
      if (typeof item === 'string' || typeof item === 'number') {
        const value = String(item)
        return { label: value, value }
      }

      const label = item?.label || item?.name || item?.title || item?.knowledge_point || item?.content
      const value = label || item?.id || `knowledge-${index}`
      return label ? { label: String(label), value: String(value) } : null
    })
    .filter(Boolean)
}

export const extractResourceResultContent = response => {
  const data = response?.data ?? response
  const resource = extractResourcePayload(response)
  if (typeof resource === 'string') return resource

  const resourcesContent = Array.isArray(resource?.resources) && resource.resources.length
    ? resource.resources
    : ''

  return (
    resource?.report ||
    resource?.content ||
    resource?.recommendation ||
    resource?.resource_recommendation ||
    resource?.result ||
    resourcesContent ||
    resource?.reason ||
    data?.report ||
    data?.content ||
    data?.recommendation ||
    data?.resource_recommendation ||
    data?.result ||
    data?.resources ||
    ''
  )
}

const KNOWLEDGE_GROUPS = [
  { key: 'pre_knowledge', title: '前置知识', marker: '[前置知识]' },
  { key: 'required', title: '必须掌握', marker: '[必须掌握]' },
  { key: 'extension', title: '拓展知识', marker: '[拓展知识]' },
  { key: 'other', title: '其他知识点', marker: '' }
]

export const groupKnowledgeOptions = options => {
  const buckets = new Map(KNOWLEDGE_GROUPS.map(group => [group.key, { ...group, options: [] }]))

  for (const option of Array.isArray(options) ? options : []) {
    const label = String(option?.label || '')
    const matched = KNOWLEDGE_GROUPS.find(group => group.marker && label.includes(group.marker))
    const key = matched?.key || 'other'
    buckets.get(key).options.push(option)
  }

  return KNOWLEDGE_GROUPS
    .map(group => buckets.get(group.key))
    .filter(group => group.options.length > 0)
}

const readBetween = (text, start, end) => {
  const startIndex = text.indexOf(start)
  if (startIndex < 0) return ''

  const valueStart = startIndex + start.length
  const endIndex = end ? text.indexOf(end, valueStart) : -1
  return text
    .slice(valueStart, endIndex >= 0 ? endIndex : undefined)
    .trim()
}

export const parseKnowledgeOption = option => {
  const raw = String(option?.label || '')
  const categoryMatch = raw.match(/^(?:\[([^\]]+)\]|【([^】]+)】)/)
  const category = categoryMatch?.[1] || categoryMatch?.[2] || '知识点'
  const textWithoutCategory = raw.replace(/^(?:\[[^\]]+\]|【[^】]+】)\s*/, '')
  const title = readBetween(raw, '知识点名称：', '。内容说明：') ||
    readBetween(raw, '知识点名称:', '。内容说明:') ||
    textWithoutCategory.split('：')[0] ||
    textWithoutCategory.split(':')[0] ||
    textWithoutCategory.split('。')[0] ||
    '未命名知识点'
  const content = readBetween(raw, '内容说明：', '掌握理由：') ||
    readBetween(raw, '内容说明:', '掌握理由:')
  const reason = readBetween(raw, '掌握理由：') ||
    readBetween(raw, '掌握理由:')

  return {
    category,
    title: title.replace(/。$/, ''),
    content,
    reason,
    raw,
    value: option?.value
  }
}

export const extractStructuredResourceRecommendation = response => {
  const resource = extractResourcePayload(response)
  const resources = Array.isArray(resource?.resources) ? resource.resources : []
  const selectedKnowledge = Array.isArray(resource?.selected_knowledge) ? resource.selected_knowledge : []

  return {
    reason: resource?.reason || '',
    selectedKnowledge,
    resourceGroups: resources.map(item => ({
      knowledgePoint: item?.knowledge_point || '推荐资源',
      videos: Array.isArray(item?.videos) ? item.videos : [],
      blogArticles: Array.isArray(item?.blog_articles) ? item.blog_articles : []
    }))
  }
}
