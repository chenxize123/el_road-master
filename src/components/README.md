# 组件库总览

本项目的组件库按照功能模块进行组织，提供了完整的用户界面解决方案。

## 目录结构

```
src/components/
├── courses/                    # 课程管理相关组件
│   ├── CourseCreateModal.vue   # 新建课程模态框
│   ├── CourseList.vue         # 课程列表组件
│   └── README.md             # 使用说明文档
│
├── course/                     # 课程详情相关组件
│   ├── CourseHeader.vue       # 课程信息头部
│   ├── CourseTabs.vue         # 功能标签页导航
│   ├── modules/              # 各功能模块
│   │   ├── BasicInfoModule.vue     # 基本信息模块（已完善）
│   │   ├── VideoModule.vue         # 课程视频模块
│   │   ├── KnowledgeGraphModule.vue # 知识图谱模块
│   │   └── ManagementModule.vue    # 课程管理模块
│   └── README.md            # 组件说明文档
│
├── admin/                    # 管理员相关组件
│   ├── UserList.vue         # 用户列表组件
│   ├── AddUser.vue          # 添加用户组件
│   └── EditUserModal.vue    # 编辑用户模态框
│
├── class/                    # 班级相关组件
│   └── CreateClassModal.vue  # 创建班级模态框
│
├── auth/                     # 认证相关组件
│   └── LoginModal.vue        # 登录模态框
│
├── common/                   # 通用组件
│   └── DashboardBanner.vue   # 仪表板横幅组件
│
└── PermissionGuard.vue      # 权限控制组件
```

## 主要组件分类

### 1. 课程管理组件 (`courses/`)

**用途**: 教师和管理员用于课程管理的核心组件

**组件说明**:
- **CourseList.vue**: 显示课程列表，支持卡片和表格两种布局，适用于教师和管理员查看自己的课程
- **CourseCreateModal.vue**: 创建新课程的模态框，包含表单验证和角色差异化字段

**使用场景**:
- 教师首页的课程管理
- 管理员首页的课程管理
- 需要展示课程列表的任何页面

### 2. 课程详情组件 (`course/`)

**用途**: 展示单个课程的详细信息和功能模块

**核心组件**:
- **CourseHeader.vue**: 课程信息头部，展示封面、标题、描述、统计数据等
- **CourseTabs.vue**: 功能标签页导航，提供四个主要功能入口
- **BasicInfoModule.vue**: 基本信息模块（已完善），包含学习统计、进度分析、教师信息等

**其他模块**:
- **VideoModule.vue**: 课程视频播放和管理
- **KnowledgeGraphModule.vue**: 知识图谱可视化
- **ManagementModule.vue**: 课程管理功能

### 3. 管理组件 (`admin/`)

**用途**: 管理员专用的用户和系统管理功能

**组件说明**:
- **UserList.vue**: 用户列表展示和管理
- **AddUser.vue**: 添加新用户的功能组件
- **EditUserModal.vue**: 编辑用户信息的模态框

### 4. 认证组件 (`auth/`)

**用途**: 用户身份验证相关功能

**组件说明**:
- **LoginModal.vue**: 用户登录模态框，包含表单验证和API调用

### 5. 班级管理组件 (`class/`)

**用途**: 班级相关的创建和管理功能

**组件说明**:
- **CreateClassModal.vue**: 创建新班级的模态框组件

### 6. 通用组件 (`common/`)

**用途**: 项目通用的UI组件

**组件说明**:
- **DashboardBanner.vue**: 仪表板顶部的横幅组件，用于展示重要信息

### 7. 权限控制组件

**用途**: 基于角色的访问控制

**组件说明**:
- **PermissionGuard.vue**: 路由级别和组件级别的权限验证

## API集成

所有组件都通过统一的API层与后端通信：

```javascript
// 课程相关API
import { getCourseListApi, createCourseApi } from '@/api/course'
import { getUserListApi } from '@/api/dashboard'

// 用户相关API
import { deleteUserApi, updateUserApi } from '@/api/dashboard'
```

## 设计规范

### 样式设计
- **圆角系统**: 使用12px-16px的圆角半径，营造现代感
- **色彩系统**: 遵循Ant Design规范，主色为#1890ff
- **阴影效果**: 悬停时添加柔和阴影，提升交互反馈
- **渐变背景**: 在统计卡片中使用蓝绿色渐变，增加视觉层次
- **响应式布局**: 全面适配桌面端、平板和移动端

### 交互设计
- **加载状态**: 合理使用loading属性，提供良好的用户体验
- **错误处理**: 统一的错误提示机制
- **空数据状态**: 友好的空状态展示
- **操作反馈**: 点击后的视觉反馈和状态变化

## 开发指南

### 添加新组件
1. 根据功能选择合适的目录位置
2. 遵循现有的命名规范和代码结构
3. 使用Composition API编写组件逻辑
4. 确保样式使用scoped CSS避免冲突
5. 提供完整的props和emits定义

### 组件复用
- 优先使用现有的通用组件
- 对于相似功能的组件，考虑提取公共部分到mixins或composables
- 保持组件的单一职责原则

### 测试建议
- 对复杂业务逻辑进行单元测试
- 对API调用进行mock测试
- 对响应式布局进行多设备测试

## 维护说明

### 依赖更新
- 定期检查Ant Design Vue版本更新
- 更新相关的图标库和样式文件
- 同步API接口定义

### 性能优化
- 对于大数据量的展示考虑分页或虚拟滚动
- 合理使用v-if和v-show优化渲染性能
- 对静态内容进行缓存处理

### 可访问性
- 确保组件支持键盘导航
- 提供适当的ARIA标签
- 支持屏幕阅读器

## 常见问题

**Q: 如何添加新的课程模块？**
A: 在`src/components/course/modules/`目录下创建新的.vue文件，然后在CourseTabs.vue中添加对应的标签页，并在相应的插槽中引入新模块。

**Q: 组件样式冲突怎么办？**
A: 确保使用scoped CSS，或者为特定组件添加唯一的前缀类名来避免样式污染。

**Q: 如何处理跨组件的状态共享？**
A: 推荐使用Pinia进行全局状态管理，而不是通过props层层传递。

**Q: 如何国际化这些组件？**
A: 将文本内容提取到i18n资源文件中，组件内部使用t()函数获取翻译文本。