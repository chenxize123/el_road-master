# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Development Commands

### Core Development
- `npm run dev` - Start development server (http://localhost:5173)
- `npm run build` - Build production version to dist/
- `npm run preview` - Preview production build locally
- `npm install` - Install all dependencies

### Code Quality
- `npm run lint` - Lint and auto-fix code issues
- `npm run format` - Format code with Prettier

## 🏗️ Architecture Overview

This is a **Vue 3 + Vite + Ant Design Vue + Pinia** enterprise-grade online education platform frontend.

### Key Features
- **Composition API** - All components use `<script setup>` with Composition API patterns
- **State Management** - Pinia stores for global state management
- **API Layer** - Centralized API service with authentication and error handling
- **Authentication System** - JWT-based auth with token storage and user state management
- **Permission System** - Role-based access control with PermissionGuard component
- **Router-first SPA** - Single Page Application using Vue Router v4 with history mode
- **Enterprise UI Integration** - Full integration with Ant Design Vue component library
- **AI Chat Widget** - Integrated LLM-based chat assistant for Q&A
- **Knowledge Graph** - Visual knowledge graph representation for courses
- **Exam System** - Complete exam management and taking functionality
- **Discussion Forum** - Class-based discussion modules
- **Multi-role Support** - Admin, Teacher, and Student roles with dedicated dashboards

### File Structure (Current Implementation)
```
src/
├── api/                  # API abstraction layer
│   ├── index.js         # Base API service with interceptors
│   ├── auth.js          # Authentication endpoints
│   ├── course.js        # Course management endpoints
│   ├── class.js         # Class management endpoints
│   ├── dashboard.js     # Dashboard endpoints
│   ├── exam.js          # Exam management endpoints
│   ├── examTake.js      # Exam taking endpoints
│   ├── examPaper.js     # Exam paper endpoints
│   ├── paperDetail.js   # Paper detail endpoints
│   ├── questionBank.js  # Question bank endpoints
│   ├── file.js          # File upload endpoints
│   ├── conversation.js  # AI chat conversation endpoints
│   └── discussion.js    # Class discussion endpoints
├── assets/              # Static resources
│   └── images/          # Image assets
├── components/          # Reusable UI components
│   ├── admin/           # Admin components (UserList, AddUser, EditUserModal)
│   ├── auth/            # Auth components (LoginModal)
│   ├── class/           # Class components
│   │   ├── ClassList.vue
│   │   ├── ClassTabs.vue
│   │   ├── CreateClassModal.vue
│   │   ├── detail/      # Class detail sub-components
│   │   └── modules/     # Class feature modules
│   ├── course/          # Course components
│   │   ├── CourseHeader.vue
│   │   ├── CourseTabs.vue
│   │   └── modules/     # Course feature modules
│   ├── knowledge/       # Knowledge graph components
│   ├── common/          # Shared components (ChatWidget, LogoutButton, etc.)
│   └── PermissionGuard.vue
├── composables/         # Vue composables
│   ├── useClassDetail.js
│   └── useCourseVideos.js
├── router/              # Routing configuration
│   ├── index.js        # Main router with route guards
│   └── guard.js        # Auth and permission guards
├── store/               # Pinia state management
│   ├── index.js        # Pinia configuration
│   ├── user.js         # User auth state
│   └── permission.js   # Permission state
├── styles/              # Global styles
├── utils/               # Utility functions
│   ├── index.js        # General utilities
│   ├── debug.js        # Debug utilities
│   └── classStats.js   # Class statistics utilities
├── views/               # Page views
│   ├── Home.vue        # Landing page
│   ├── Profile.vue     # User profile page
│   ├── admin/          # Admin pages
│   ├── teacher/        # Teacher pages
│   ├── student/        # Student pages
│   ├── course/         # Course pages
│   ├── class/          # Class pages
│   ├── exam/           # Exam pages
│   ├── paper/          # Paper pages
│   ├── question-bank/  # Question bank pages
│   ├── Forbidden.vue   # 403 page
│   └── NotFound.vue    # 404 page
├── App.vue             # Root component
└── main.js             # Application entry point
```

### Key Dependencies
- **Vue 3.5** - Progressive JavaScript framework
- **Vite 8.0** - Next-generation frontend tooling
- **Ant Design Vue 4.2** - Enterprise UI component library
- **Pinia 3.0** - Intuitive Vue state management
- **Vue Router 4.6** - Official router for Vue
- **marked 18.0** - Markdown parser
- **dompurify 3.4** - XSS sanitizer
- **json-bigint 1.0** - JSON big integer handling
- **xlsx 0.18** - Excel file parsing

### Routing System
- Routes defined in `src/router/index.js` with history mode
- Role-based routes: `/admin/*`, `/teacher/*`, `/student/*`
- Lazy loading via dynamic imports
- Route guards validate authentication and permissions

### AI Chat Integration
- **ChatWidget** component in `src/components/common/ChatWidget.vue`
- API endpoint: `/v1/llm/chat` for LLM conversations
- Integrated in class video modules and detail pages
- Uses marked for markdown rendering and dompurify for sanitization

### API Layer Architecture
- Centralized API service in `src/api/index.js`
- Automatic token injection and error handling
- Big integer handling via json-bigint
- Separate modules for each feature domain

### Authentication & Authorization
- Multi-role system: admin, teacher, student
- JWT token stored in localStorage
- Route guards and component-level permission checks

## 📝 Recent Updates

### Discussion Module (2026-05-26)
- New API: `src/api/discussion.js`
- New component: `ClassDiscussionModule.vue`
- Features: Create discussions, post comments, delete (logical)

### AI Chat Widget
- Integrated LLM chat assistant
- Markdown rendering with sanitization
- Available in class and course modules

## 🔧 Deployment

Builds to `dist/` directory, ready for static hosting.
