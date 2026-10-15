import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: {
      title: '首页',
      requiresAuth: false,
      permissions: []
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: {
      title: '个人资料',
      requiresAuth: true,
      permissions: ['admin', 'teacher', 'student', 'visitor']
    }
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/Forbidden.vue'),
    meta: {
      title: '无权限',
      requiresAuth: false,
      permissions: []
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面不存在',
      requiresAuth: false,
      permissions: []
    }
  },
  {
    path: '/student',
    name: 'StudentHome',
    component: () => import('@/views/student/StudentHome.vue'),
    meta: {
      title: '学生首页',
      requiresAuth: true,
      permissions: ['student']
    }
  },
  {
    path: '/resource-recommendation',
    name: 'ResourceRecommendation',
    component: () => import('@/views/student/ResourceRecommendation.vue'),
    meta: {
      title: '教学资源推荐',
      requiresAuth: true,
      permissions: ['student']
    }
  },
  {
    path: '/teacher',
    name: 'TeacherHome',
    component: () => import('@/views/teacher/TeacherHome.vue'),
    meta: {
      title: '教师首页',
      requiresAuth: true,
      permissions: ['teacher', 'visitor']
    }
  },
  {
    path: '/admin',
    name: 'AdminHome',
    component: () => import('@/views/admin/AdminHome.vue'),
    meta: {
      title: '管理员首页',
      requiresAuth: true,
      permissions: ['admin']
    }
  },
  {
    path: '/course/:id',
    name: 'CourseDetail',
    component: () => import('@/views/course/CourseDetail.vue'),
    meta: {
      title: '课程详情',
      requiresAuth: true,
      permissions: ['teacher', 'admin', 'visitor']
    }
  },
  {
    path: '/question-bank/:id',
    name: 'QuestionBankDetail',
    component: () => import('@/views/question-bank/QuestionBankDetail.vue'),
    meta: {
      title: '题库详情',
      requiresAuth: true,
      permissions: ['teacher', 'admin', 'visitor']
    }
  },
  {
    path: '/paper/create',
    name: 'PaperCreate',
    component: () => import('@/components/course/modules/CreatePaper.vue'),
    meta: {
      title: '新建试卷',
      requiresAuth: true,
      permissions: ['teacher', 'admin']
    }
  },
  {
    path: '/paper/one-click',
    name: 'PaperOneClick',
    component: () => import('@/components/course/modules/OneClickPaper.vue'),
    meta: {
      title: '一键组卷',
      requiresAuth: true,
      permissions: ['teacher', 'admin']
    }
  },
  {
    path: '/class/detail/:classId',
    name: 'ClassDetail',
    component: () => import('@/views/class/ClassDetail.vue'),
    meta: {
      title: '班级详情',
      requiresAuth: true,
      permissions: ['admin', 'teacher', 'student', 'visitor']
    }
  },
  {
    path: '/paper/detail/:paperId',
    name: 'PaperDetail',
    component: () => import('@/views/paper/PaperDetail.vue'),
    meta: {
      title: '试卷详情',
      requiresAuth: true,
      permissions: ['teacher', 'admin', 'visitor']
    }
  },
  {
    path: '/exam/take/:examId',
    name: 'ExamTake',
    component: () => import('@/views/exam/ExamTake.vue'),
    meta: {
      title: '参加考试',
      requiresAuth: true,
      permissions: ['student']
    }
  },
  {
    path: '/exam/result/:examId',
    name: 'ExamResult',
    component: () => import('@/views/exam/ExamResult.vue'),
    meta: {
      title: '考试结果',
      requiresAuth: true,
      permissions: ['admin', 'teacher', 'student', 'visitor']
    }
  },
  {
    path: '/experiment/question-answer/:resultId',
    name: 'ExperimentQuestionAnswer',
    component: () => import('@/views/experiment/ExperimentQuestionAnswer.vue'),
    meta: {
      title: '代码问答',
      requiresAuth: true,
      permissions: ['student']
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || '大模型智慧助教系统'

  // 当前首页所有人可访问
  if (!to.meta.requiresAuth) {
    next()
    return
  }

  // 保留权限守卫扩展点
  next()
})

export default router
