import { ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  getClassDetailApi,
  getClassStudentsApi,
  addStudentToClassApi
} from '@/api/class'
import { getUserListApi } from '@/api/user'

export function useClassDetail(classId) {
  const loading = ref(false)
  const loadingStudents = ref(false)
  const classInfo = ref(null)
  const studentsList = ref([])
  const addingStudent = ref(false)

  // 获取班级详情
  const fetchClassDetail = async () => {
    loading.value = true
    try {
      const res = await getClassDetailApi(classId)
      console.log('📦 fetchClassDetail API 返回:', res)
      classInfo.value = res.data?.data || res.data || res
      console.log('✅ 解析后的 classInfo:', classInfo.value)
      console.log('🔍 检查课程ID字段:', {
        course_id: classInfo.value?.course_id,
        courseId: classInfo.value?.courseId,
        course: classInfo.value?.course
      })
    } catch (error) {
      console.error('获取班级详情失败:', error)
      message.error('获取班级详情失败: ' + (error.message || '未知错误'))
    } finally {
      loading.value = false
    }
  }

  // 获取班级学生列表
  const fetchClassStudents = async () => {
    loadingStudents.value = true
    try {
      const res = await getClassStudentsApi(classId)
      if (res.code === 200 && Array.isArray(res.data)) {
        studentsList.value = res.data.map(student => ({
          id: student.id,
          name: student.real_name || student.nickname || '未知',
          username: student.username || student.account || '',
          student_number: student.student_number || student.studentNumber || '',
          mobile: student.mobile || '',
          email: student.email || '',
          user_type: student.user_type || 'student',
          is_disabled: student.is_disabled || '正常'
        }))
      } else if (Array.isArray(res.data)) {
        studentsList.value = res.data.map(student => ({
          id: student.id,
          name: student.name || student.nickname || '未知',
          username: student.username || student.account || '',
          student_number: student.student_number || student.studentNumber || ''
        }))
      } else if (res.data?.list) {
        studentsList.value = res.data.list.map(student => ({
          id: student.id,
          name: student.name || student.nickname || '未知',
          username: student.username || student.account || '',
          student_number: student.student_number || student.studentNumber || ''
        }))
      } else {
        studentsList.value = []
      }
    } catch (error) {
      console.error('获取学生列表失败:', error)
      studentsList.value = []
    } finally {
      loadingStudents.value = false
    }
  }

  // 添加学生到班级 - 返回 { success: boolean, message: string, studentNumber?: string, name?: string, isAlreadyExists?: boolean }
  const handleAddStudent = async (studentNumber, showMessage = true) => {
    if (!studentNumber) {
      if (showMessage) message.warning('请输入学号')
      return { success: false, message: '请输入学号', studentNumber }
    }

    const trimmedStudentNumber = studentNumber.trim()
    if (!trimmedStudentNumber) {
      if (showMessage) message.warning('请输入有效的学号')
      return { success: false, message: '请输入有效的学号', studentNumber }
    }

    addingStudent.value = true
    try {
      // 首先通过学号查询用户ID
      const userRes = await getUserListApi(
        { page: 1, page_size: 100 },
        { username: trimmedStudentNumber, user_type: 'student' }
      )

      let targetUserId = null
      let matchedUserName = ''

      if (userRes.code === 200 && Array.isArray(userRes.data) && userRes.data.length > 0) {
        // 精确匹配学号
        const matchedUser = userRes.data.find(user =>
          user.username === trimmedStudentNumber ||
          user.student_number === trimmedStudentNumber
        )

        if (matchedUser) {
          targetUserId = matchedUser.id
          matchedUserName = matchedUser.real_name || matchedUser.username
        } else {
          // 如果没有精确匹配，尝试模糊匹配结果中的第一个
          targetUserId = userRes.data[0].id
          matchedUserName = userRes.data[0].real_name || userRes.data[0].username
          if (showMessage) message.warning(`未找到学号"${trimmedStudentNumber}"的精确匹配，已使用用户名"${matchedUserName}"`)
        }
      } else {
        // 尝试不限制 user_type 查询
        const userRes2 = await getUserListApi(
          { page: 1, page_size: 100 },
          { username: trimmedStudentNumber }
        )

        if (userRes2.code === 200 && Array.isArray(userRes2.data) && userRes2.data.length > 0) {
          targetUserId = userRes2.data[0].id
          matchedUserName = userRes2.data[0].real_name || userRes2.data[0].username
        } else {
          throw new Error(`未找到学号为"${trimmedStudentNumber}"的学生`)
        }
      }

      // 使用查询到的用户ID添加学生到班级
      const res = await addStudentToClassApi(classId, String(targetUserId))
      const successMsg = res.data || '学生添加成功'
      if (showMessage) message.success(successMsg)
      await fetchClassStudents()
      return {
        success: true,
        message: successMsg,
        studentNumber: trimmedStudentNumber,
        name: matchedUserName
      }
    } catch (error) {
      console.error('添加学生失败:', error)
      const errorMsg = error?.response?.data?.message || error.message || '未知错误'
      // 检测是否是"已存在"的错误
      const isAlreadyExists = errorMsg.includes('已存在') || errorMsg.includes('already') || errorMsg.includes('exist')
      if (showMessage && !isAlreadyExists) {
        message.error('添加学生失败: ' + errorMsg)
      }
      return {
        success: isAlreadyExists,
        message: errorMsg,
        studentNumber: trimmedStudentNumber,
        isAlreadyExists
      }
    } finally {
      addingStudent.value = false
    }
  }

  // 批量添加学生
  const batchAddStudents = async (studentNumbers) => {
    const results = []
    for (const studentNumber of studentNumbers) {
      const result = await handleAddStudent(studentNumber, false)
      results.push(result)
    }
    return results
  }

  // 初始化数据
  const initData = async () => {
    await Promise.all([
      fetchClassDetail(),
      fetchClassStudents()
    ])
  }

  return {
    loading,
    loadingStudents,
    classInfo,
    studentsList,
    addingStudent,
    fetchClassDetail,
    fetchClassStudents,
    handleAddStudent,
    batchAddStudents,
    initData
  }
}
