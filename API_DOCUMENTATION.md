# API Documentation

This document provides a comprehensive overview of all backend API methods available in the `src/api` folder.

## Table of Contents

1. [Base API Service](#base-api-service)
2. [Authentication APIs](#authentication-apis)
3. [Course Management APIs](#course-management-apis)
4. [Class Management APIs](#class-management-apis)
5. [User Management APIs](#user-management-apis)
6. [Dashboard APIs](#dashboard-apis)
7. [Question Bank APIs](#question-bank-apis)
8. [Exam Management APIs](#exam-management-apis)
9. [Exam Paper APIs](#exam-paper-apis)
10. [Student Exam APIs](#student-exam-apis)
11. [Paper Detail APIs](#paper-detail-apis)

---

## Base API Service

Located in: `src/api/index.js`

Provides the foundational API service with automatic token management and JSON-bigint support for handling large integers.

### Core Methods

- **`request(url, options)`** - Base request method with authentication and timeout handling
- **`get(url)`** - Perform GET request
- **`post(url, data)`** - Perform POST request
- **`put(url, data)`** - Perform PUT request
- **`delete(url)`** - Perform DELETE request

### Configuration
- **Base URL**: `import.meta.env.VITE_API_BASE_URL` or `/api`
- **Timeout**: `import.meta.env.VITE_API_TIMEOUT` or 10000ms
- **Authentication**: Automatically includes Bearer token from localStorage
- **JSON Handling**: Uses JSON-bigint to preserve precision for large integers

---

## Authentication APIs

Located in: `src/api/auth.js`

### Login & User Info

- **`loginApi(data)`** → `POST /auth/login`
  - Authenticates user and returns token + user info
  - **Parameters**: `{ username, password }`
  - **Returns**: `{ token, userInfo }`

- **`getUserInfoApi()`** → `GET /auth/user-info`
  - Gets current user information
  - **Returns**: User object

- **`logoutApi()`** → `POST /auth/logout`
  - Logs out current user
  - **Returns**: Response object

### User Management

- **`getUserListApi()`** → `GET /user`
  - Gets list of all users
  - **Returns**: Array of user objects

- **`addUserApi(data)`** → `POST /user`
  - Creates new user
  - **Parameters**: User data object; new users should send `is_disabled: false`
  - **Returns**: Response object

---

## Course Management APIs

Located in: `src/api/course.js`

### Core Course Operations

- **`getTeacherCourses(teacherIdOrParams)`** → `GET /course/teacher_id`
  - Gets courses for a specific teacher
  - **Parameters**: Teacher ID or params object with `teacher_id`, `page`, `page_size`
  - **Returns**: Course list with pagination

- **`getAllCourses()`** → `GET /course/`
  - Gets all courses (admin access)
  - **Returns**: Array of all courses

- **`createCourseApi(data)`** → `POST /course/`
  - Creates new course
  - **Parameters**: Course data object

- **`getCourseDetailApi(courseId)`** → `GET /course/{courseId}`
  - Gets detailed information for a specific course

- **`updateCourseApi(courseId, data)`** → `PUT /course/{courseId}`
  - Updates course information

- **`deleteCourseApi(courseId)`** → `DELETE /course/{courseId}`
  - Deletes a course

### Course Information APIs

- **`getCourseBasicInfoApi(courseId)`** → `GET /course/course_id?course_id={courseId}`
  - Gets basic course information

- **`getCourseByClassIdApi(classId)`** → `GET /course/class_id?class_id={classId}`
  - Gets course information by class ID

- **`getKnowledgePointApi(courseId)`** → `GET /course/point/course_id?course_id={courseId}`
  - Gets knowledge points for a course

- **`updateCourseBasicInfoApi(data)`** → `PUT /course/`
  - Updates basic course information

### Course Analytics & Data

- **`getKnowledgeGraphApi(courseId)`** → `GET /course/{courseId}/knowledge-graph`
  - Gets knowledge graph data for course

- **`getCourseStatsApi(courseId)`** → `GET /course/{courseId}/stats`
  - Gets course statistics

- **`getCourseClassesApi(courseId)`** → `GET /course/{courseId}/classes`
  - Gets list of classes for a course

- **`getCourseVideosApi(courseId)`** → `GET /course/{courseId}/videos`
  - Gets list of videos for a course

### AI Question Generation

- **`generateGapFillQuestion(pointList)`** → `POST /llm/gap_fill`
  - Generates fill-in-the-blank questions

- **`generateTrueFalseQuestion(pointList)`** → `POST /llm/true_or_false`
  - Generates true/false questions

- **`generateSingleChoiceQuestion(pointList)`** → `POST /llm/single_choice`
  - Generates single choice questions

- **`generateMultipleChoiceQuestion(pointList)`** → `POST /llm/multiple_choice`
  - Generates multiple choice questions

### Utility Functions

- **`refreshUserCourses(userRole, teacherId)`** - Refreshes cached course data
- **`clearCache()`** - Clears all cached course data
- **`getCacheStats()`** - Gets cache statistics

---

## Class Management APIs

Located in: `src/api/class.js`

### Class Operations

- **`getClassListApi(params)`** → `GET /class/user_id`
  - Gets class list with optional pagination
  - **Parameters**: `{ page, page_size }`

- **`createClassApi(data)`** → `POST /class/`
  - Creates new class
  - **Parameters**: Class data object

- **`getClassDetailApi(classId)`** → `GET /class/class_id?class_id={classId}`
  - Gets detailed class information

- **`getClassStudentsApi(classId)`** → `GET /user/class_id?class_id={classId}`
  - Gets list of students in a class

- **`addStudentToClassApi(classId, studentId)`** → `POST /class/student?class_id={classId}&student_id={studentId}`
  - Adds student to class

### Student-Specific APIs

- **`getStudentClassListApi(params)`** → `GET /class/user_id`
  - Gets classes that student has joined
  - **Parameters**: Optional pagination `{ page, page_size }`

### Course-Connected APIs

- **`getClassListByCourseId(courseId)`** → `GET /class/course_id?course_id={courseId}`
  - Gets classes for a specific course

---

## User Management APIs

Located in: `src/api/dashboard.js` (also see auth.js for basic user operations)

### User CRUD Operations

- **`createUserApi(userData)`** → `POST /user/`
  - Creates new user

- **`updateUserApi(userData)`** → `PUT /user/`
  - Updates user information, including `user_type` and `is_disabled`
  - **Note**: `is_disabled` must be sent as a boolean. The user list may return display text such as `正常` or `禁用`; these values must be normalized before submitting an update.

- **`deleteUserApi(user_id)`** → `DELETE /user/?user_id={user_id}`
  - Deletes user

- **`getUserListApi()`** → `GET /user`
  - Gets list of all users

### Class-Connected User APIs

- **`getUsersByClassId(classId)`** → `GET /user/class_id?class_id={classId}`
  - Gets users in a specific class

---

## Dashboard APIs

Located in: `src/api/dashboard.js`

### Dashboard Data

- **`getMyClassListApi()`** → `GET /user`
  - Gets current user's class list

- **`getCourseListApi(params)`**
  - Gets course list (delegates to course.js)

- **`createCourseApi(courseData)`** → `POST /course/`
  - Creates new course

---

## Question Bank APIs

Located in: `src/api/questionBank.js`

### Question Bank Management

- **`getQuestionBankList(courseId)`** → `GET /repo/course_id?course_id={courseId}`
  - Gets question banks for a course

- **`getQuestionBankDetail(id)`** → `GET /repo/repo_id?repo_id={id}`
  - Gets detailed question bank information

- **`createQuestionBank(data)`** → `POST /repo/`
  - Creates new question bank
  - **Parameters**: `{ title, description, is_open, courseId }`

- **`updateQuestionBank(id, data)`** → `PUT /repo/{id}`
  - Updates question bank

- **`deleteQuestionBank(id)`** → `DELETE /repo/{id}`
  - Deletes question bank (logical delete)

### Question Management

- **`getQuestionList(repoId)`** → `GET /question/repo_id?repo_id={repoId}`
  - Gets questions in a question bank

- **`createQuestion(data)`** → `POST /question/`
  - Creates new question
  - **Parameters**: `{ question, type_, repo_id }`

- **`updateQuestion(data)`** → `PUT /question/`
  - Updates question
  - **Parameters**: `{ id, question, repo_id }`

- **`deleteQuestion(questionId)`** → `DELETE /question/?question_id={questionId}`
  - Deletes question (logical delete)

### Question Types

```javascript
export const QUESTION_TYPES = {
  FILL_BLANK: 0,       // 填空题
  JUDGMENT: 1,         // 判断题
  SINGLE_CHOICE: 2,    // 单选题
  MULTIPLE_CHOICE: 3,  // 多选题
  ESSAY: 4             // 简答题
}
```

---

## Exam Management APIs

Located in: `src/api/exam.js`

### Exam Operations

- **`getExamList(courseId)`** → `GET /exam?courseId={courseId}`
  - Gets exams for a course

- **`getExamListByClassId(classId)`** → `GET /exam/class_id?class_id={classId}`
  - Gets exams for a class

- **`createExam(data)`** → `POST /exam/`
  - Creates new exam

- **`updateExam(data)`** → `PUT /exam/`
  - Updates exam

- **`deleteExam(id)`** → `DELETE /exam/{id}`
  - Deletes exam

### Exam Results

- **`getExamResultMe(examId)`** → `GET /exam/result/me?exam_id={examId}`
  - Gets current student's exam result

- **`getExamResultAll(examId)`** → `GET /exam/result/all?exam_id={examId}`
  - Gets all students' exam results (teacher/admin)

- **`getExamDetail(examId)`** → `GET /exam/{examId}`
  - Gets detailed exam information

---

## Exam Paper APIs

Located in: `src/api/examPaper.js`

### Paper Operations

- **`getExamPaperList(courseId)`** → `GET /paper/course_id?course_id={courseId}`
  - Gets exam papers for a course

- **`createExamPaper(data)`** → `POST /paper/`
  - Creates new exam paper

- **`updateExamPaper(id, data)`** → `PUT /exam-paper/{id}`
  - Updates exam paper

- **`deleteExamPaper(id)`** → `DELETE /exam-paper/{id}`
  - Deletes exam paper

---

## Student Exam APIs

Located in: `src/api/examTake.js`

### Student Exam Operations

- **`getExamDetail(examId)`** → `GET /exam/exam_id?exam_id={examId}`
  - Gets exam details for student

- **`getExamQuestions(examId)`** → `GET /question/exam_id?exam_id={examId}`
  - Gets exam questions

- **`getExamPaper(examId)`** → `GET /paper/exam_id?exam_id={examId}`
  - Gets exam paper information

- **`submitExam(data)`** → `POST /exam/submit`
  - Submits exam answers

---

## Paper Detail APIs

Located in: `src/api/paperDetail.js`

### Paper Information

- **`getPaperDetail(paperId)`** → `GET /paper/paper_id?paper_id={paperId}`
  - Gets detailed paper information

- **`getPaperQuestions(paperId)`** → `GET /question/paper_id?paper_id={paperId}`
  - Gets questions in a paper

---

## Common Response Format

All API responses follow this general structure:

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

- **`code`**: HTTP-like status code (200 for success)
- **`message`**: Human-readable message
- **`data`**: Response payload

## Error Handling

All API methods include error handling that:
- Throws descriptive Error objects for failed requests
- Includes original error messages from the backend
- Handles network timeouts (10s default)
- Validates response structure

## Authentication

Most APIs require authentication via Bearer token:
- Token is automatically retrieved from `localStorage.getItem('token')`
- Added to request headers as `Authorization: Bearer {token}`
- Token management is handled by the base API service

## Environment Configuration

- **API Base URL**: Set via `VITE_API_BASE_URL` environment variable
- **Timeout**: Set via `VITE_API_TIMEOUT` environment variable (default: 10000ms)
- **Development**: Uses `.env.development`
- **Production**: Uses `.env.production`
