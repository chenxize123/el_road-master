---
name: guest-preview-login-design
description: 游客预览登录功能设计文档
metadata:
  type: design
---

# 游客预览登录功能设计

## 概述
在首页添加"游客预览"按钮，点击后使用visitor/visitor账号自动登录并跳转到教师首页；同时在登录弹窗中也添加游客预览快捷入口。

## 功能需求

### 1. 首页游客预览按钮
- 位置：Home.vue的"游客预览"按钮
- 行为：点击后自动使用账号visitor、密码visitor进行登录
- 登录成功后跳转到教师首页(/teacher)
- 显示loading状态和错误提示

### 2. 登录弹窗游客预览按钮
- 位置：LoginModal.vue登录表单下方
- 样式：次要按钮
- 行为：点击后自动使用账号visitor、密码visitor进行登录
- 登录成功后关闭弹窗并跳转到教师首页(/teacher)

### 3. 路由跳转逻辑更新
- 更新LoginModal.vue中的getHomePathByUserType函数
- 添加visitor用户类型到/teacher的映射

## 实现细节

### 修改文件清单
1. `src/views/Home.vue`
2. `src/components/auth/LoginModal.vue`

### Home.vue 修改点
- 导入useUserStore
- 给"游客预览"按钮添加点击事件和loading状态
- 实现handleGuestPreview函数

### LoginModal.vue 修改点
- 添加游客预览按钮UI
- 添加handleGuestLogin函数
- 更新getHomePathByUserType函数，添加visitor: '/teacher'映射

## 非目标
- 不修改后端API
- 不修改权限store逻辑（已有visitor权限配置）
- 不修改路由配置（已有visitor权限配置）

