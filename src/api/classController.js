/*
 * @Date         : 2026-06-12
 * @Description  : 班级控制器 API
 * @FilePath     : classController.js
 */
import api from './index'

/**
 * 获取班级控制器配置
 * @param {Number|String} classId - 班级 ID
 */
export async function getClassControllerApi(classId) {
  return api.get(`/class/controller/class?class_id=${classId}`)
}

/**
 * 更新班级控制器配置
 * @param {Object} data - 控制器数据
 */
export async function updateClassControllerApi(data) {
  return api.put('/class/controller/', data)
}
