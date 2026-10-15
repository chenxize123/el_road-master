# 智慧教育 AI 答疑系统

## 项目概览

智慧教育平台的 AI 答疑模块前端，类似豆包的对话式答疑系统。悬浮按钮在页面右下角，点击展开聊天框，左侧有历史会话列表，支持 SSE 流式输出 AI 回复。支持多用户区分对话。

## 技术栈

- **前端**: Vue 3 + JavaScript + Vite

## 目录结构

```

├── dayi-frontend/                # Vue 前端
│   ├── src/
│   │   ├── App.vue          # 主页面（白底占位 + ChatWidget）
│   │   ├── main.js          # 入口
│   │   ├── style.css        # 全局样式
│   │   └── components/
│   │       └── ChatWidget.vue  # 核心聊天组件（答疑聊天框）
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json        #项目依赖
|   └── README.md
```

## 构建和运行命令

- **安装前端依赖**: `cd dayi-frontend && npm install`
- **构建前端**: `cd dayi-frontend && npm run build`