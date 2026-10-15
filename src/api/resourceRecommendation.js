/*
 * @Date         : 2026-08-31
 * @Description  : 教学资源推荐相关 API
 * @FilePath     : resourceRecommendation.js
 * @Version      : V1.0.0
 */
import api from './index'
import {
  buildCreateResourcePayload,
  buildDeleteResourcePath,
  buildResourceDetailPath,
  buildResourceListPath,
  buildResourceRecommendOptions,
  buildResourceRecommendPath,
  buildTopicPreKnowledgeOptions,
  buildTopicPreKnowledgePath,
  normalizeResourceId
} from '@/utils/resourceRecommendation'

export async function createResourceRecommendationApi(topic) {
  const response = await api.post('/resource/', buildCreateResourcePayload(topic))
  return {
    ...response,
    resource_id: normalizeResourceId(response)
  }
}

export async function getTopicPreKnowledgeApi(resourceId) {
  return api.request(buildTopicPreKnowledgePath(resourceId), buildTopicPreKnowledgeOptions())
}

export async function recommendLearningResourcesApi(resourceId, weakKnowledgePoints) {
  return api.request(buildResourceRecommendPath(resourceId), buildResourceRecommendOptions(weakKnowledgePoints))
}

export async function getResourceRecommendationListApi() {
  return api.get(buildResourceListPath())
}

export async function getResourceRecommendationDetailApi(resourceId) {
  return api.get(buildResourceDetailPath(resourceId))
}

export async function deleteResourceRecommendationApi(resourceId) {
  return api.delete(buildDeleteResourcePath(resourceId))
}
