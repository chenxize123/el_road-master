import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildCreateResourcePayload,
  buildDeleteResourcePath,
  buildResourceDetailPath,
  buildResourceListPath,
  buildResourceRecommendOptions,
  buildResourceRecommendPath,
  buildTopicPreKnowledgeOptions,
  buildTopicPreKnowledgePath,
  extractKnowledgeOptions,
  extractResourceResultContent,
  extractStructuredResourceRecommendation,
  groupKnowledgeOptions,
  normalizeResourceId,
  normalizeWeakKnowledgePoints,
  parseKnowledgeOption,
  RESOURCE_RECOMMENDATION_TIMEOUT_MS
} from '../src/utils/resourceRecommendation.js'

test('normalizes resource ids as strings so large ids are not treated as numbers', () => {
  assert.equal(normalizeResourceId(12345678901234567890n), '12345678901234567890')
  assert.equal(normalizeResourceId({ data: { id: 1213 } }), '1213')
  assert.equal(normalizeResourceId({ data: { resource_id: '001213' } }), '001213')
})

test('builds resource recommendation api paths', () => {
  assert.equal(buildResourceListPath(), '/resource/user')
  assert.equal(buildResourceDetailPath('12313'), '/resource/id?resource_id=12313')
  assert.equal(buildDeleteResourcePath('1212423'), '/resource/?resource_id=1212423')
  assert.equal(buildTopicPreKnowledgePath('123'), '/llm/topic_pre_knowledge?resource_id=123')
  assert.equal(buildResourceRecommendPath('1213'), '/llm/resource_recommend?resource_id=1213')
})

test('trims topics and filters empty weak knowledge point selections', () => {
  assert.deepEqual(buildCreateResourcePayload('  机器学习  '), { topic: '机器学习' })
  assert.deepEqual(
    normalizeWeakKnowledgePoints(['  线性代数  ', '', '概率论', null, undefined, 42]),
    ['线性代数', '概率论', '42']
  )
})

test('uses long request options for AI resource recommendation steps', () => {
  assert.equal(RESOURCE_RECOMMENDATION_TIMEOUT_MS, 600000)
  assert.deepEqual(buildTopicPreKnowledgeOptions(), {
    method: 'POST',
    body: '',
    timeout: 600000
  })
  assert.deepEqual(buildResourceRecommendOptions(['  线性代数  ']), {
    method: 'POST',
    body: JSON.stringify({ weak_knowledge_points: ['线性代数'] }),
    timeout: 600000
  })
})

test('extracts nested resource detail response returned by resource id api', () => {
  const response = {
    code: 200,
    message: 'success',
    data: {
      id: '7500140749569302528',
      topic: '大模型电力，电力调度',
      resource: {
        reason: '推荐理由内容',
        resources: [],
        pre_knowledge: [
          '[前置知识] 知识点名称：基础编程与数据结构。内容说明：掌握Python。掌握理由：基础工具。',
          '[必须掌握] 知识点名称：电力系统基础。内容说明：了解电力系统组成。掌握理由：业务基础。'
        ],
        selected_knowledge: []
      }
    }
  }

  assert.deepEqual(extractKnowledgeOptions(response), [
    {
      label: '[前置知识] 知识点名称：基础编程与数据结构。内容说明：掌握Python。掌握理由：基础工具。',
      value: '[前置知识] 知识点名称：基础编程与数据结构。内容说明：掌握Python。掌握理由：基础工具。'
    },
    {
      label: '[必须掌握] 知识点名称：电力系统基础。内容说明：了解电力系统组成。掌握理由：业务基础。',
      value: '[必须掌握] 知识点名称：电力系统基础。内容说明：了解电力系统组成。掌握理由：业务基础。'
    }
  ])
  assert.equal(extractResourceResultContent(response), '推荐理由内容')
})

test('groups knowledge options by bracket category for accordion display', () => {
  const groups = groupKnowledgeOptions([
    { label: '[前置知识] 知识点名称：基础编程。', value: 'a' },
    { label: '[必须掌握] 知识点名称：电力系统基础。', value: 'b' },
    { label: '[拓展知识] 知识点名称：电力市场。', value: 'c' },
    { label: '没有分类的知识点', value: 'd' }
  ])

  assert.deepEqual(groups.map(group => ({
    key: group.key,
    title: group.title,
    count: group.options.length
  })), [
    { key: 'pre_knowledge', title: '前置知识', count: 1 },
    { key: 'required', title: '必须掌握', count: 1 },
    { key: 'extension', title: '拓展知识', count: 1 },
    { key: 'other', title: '其他知识点', count: 1 }
  ])
})

test('parses one-line knowledge summary and expandable details', () => {
  assert.deepEqual(parseKnowledgeOption({
    label: '[前置知识] 知识点名称：基础编程与数据结构。内容说明：掌握Python及列表、字典。掌握理由：这是算法实现基础。',
    value: 'raw'
  }), {
    category: '前置知识',
    title: '基础编程与数据结构',
    content: '掌握Python及列表、字典。',
    reason: '这是算法实现基础。',
    raw: '[前置知识] 知识点名称：基础编程与数据结构。内容说明：掌握Python及列表、字典。掌握理由：这是算法实现基础。',
    value: 'raw'
  })

  assert.deepEqual(parseKnowledgeOption({
    label: '【必须掌握】电力系统调度运行与控制：深入理解发电计划、自动发电控制。掌握理由：这是核心领域对象。',
    value: 'cn'
  }), {
    category: '必须掌握',
    title: '电力系统调度运行与控制',
    content: '',
    reason: '这是核心领域对象。',
    raw: '【必须掌握】电力系统调度运行与控制：深入理解发电计划、自动发电控制。掌握理由：这是核心领域对象。',
    value: 'cn'
  })
})

test('extracts structured resource cards from recommendation response', () => {
  const result = extractStructuredResourceRecommendation({
    data: {
      resource: {
        reason: '推荐理由',
        selected_knowledge: ['电力系统基础'],
        resources: [
          {
            knowledge_point: '电力系统基础',
            videos: [{ title: '视频课', url: 'https://example.com/video', reason: '系统', description: '课程简介' }],
            blog_articles: [{ title: '图文课', url: 'https://example.com/article', reason: '清晰', summary: '文章摘要' }]
          }
        ]
      }
    }
  })

  assert.deepEqual(result, {
    reason: '推荐理由',
    selectedKnowledge: ['电力系统基础'],
    resourceGroups: [
      {
        knowledgePoint: '电力系统基础',
        videos: [{ title: '视频课', url: 'https://example.com/video', reason: '系统', description: '课程简介' }],
        blogArticles: [{ title: '图文课', url: 'https://example.com/article', reason: '清晰', summary: '文章摘要' }]
      }
    ]
  })
})
