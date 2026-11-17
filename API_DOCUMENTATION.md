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
12. [Experiment Attachment APIs](#experiment-attachment-apis)
13. [Course Video Management API Proposal](#course-video-management-api-proposal)
14. [Course Experiment and Exam Publishing APIs](#course-experiment-and-exam-publishing-apis)

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

### Persistent Course Video Management (Proposed)

The current frontend API supports listing, playback URL retrieval, and upload only. Persistent reordering and deletion require backend support. See [Course Video Management API Proposal](./docs/course-video-management-api.md) for the proposed endpoints, authorization rules, validation, and response examples.

### AI Question Generation

- **`generateGapFillQuestion(pointList)`** → `POST /llm/gap_fill`
  - Generates fill-in-the-blank questions

- **`generateTrueFalseQuestion(pointList)`** → `POST /llm/true_or_false`
  - Generates true/false questions

- **`generateSingleChoiceQuestion(pointList)`** → `POST /llm/single_choice`
  - Generates single choice questions

- **`generateMultipleChoiceQuestion(pointList)`** → `POST /llm/multiple_choice`
  - Generates multiple choice questions

### Course Experiment and Exam Publishing APIs

These endpoints manage course-level experiment/exam templates and class-specific publication records. The frontend obtains publication targets by course, not by the current user's class list, so classes created by other teachers for the same course are included.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/experiment/course/{course_id}` | List course experiment templates, including draft templates |
| `GET` | `/class/user_id?course_id={course_id}` | List classes belonging to a course for publication targets |
| `GET` | `/experiment/class_published/{class_id}` | List experiments published to a class |
| `POST` | `/experiment/publish` | Publish an experiment to multiple classes, immediately or at a scheduled time |
| `POST` | `/experiment/unpublish` | Cancel an experiment publication for one class |
| `GET` | `/experiment/publishes/{experiment_id}` | List class publication records for an experiment |
| `GET` | `/exam/course/{course_id}` | List course exam templates |
| `GET` | `/exam/class_published/{class_id}` | List exams published to a class |
| `POST` | `/exam/publish` | Publish an exam to multiple classes, immediately or at a scheduled time |
| `POST` | `/exam/unpublish` | Cancel an exam publication for one class |
| `GET` | `/exam/publishes/{exam_id}` | List class publication records for an exam |

Create experiment templates with `course_id`; `class_id` is no longer selected in the course-level form. `question_config` is optional and contains a `types` array, for example:

```json
{
  "types": [
    { "type": "single_choice", "label": "单选题", "count": 3 },
    { "type": "multiple_choice", "label": "多选题", "count": 2 },
    { "type": "true_or_false", "label": "判断题", "count": 2 },
    { "type": "gap_fill", "label": "填空题", "count": 2 },
    { "type": "short_answer", "label": "简答题", "count": 1 }
  ]
}
```

The publish request is the same shape for experiments and exams (use `exam_id` for exams):

```json
{
  "experiment_id": "7487411944241143808",
  "class_ids": ["7457968331845443585", "7457968331845443586"],
  "publish_time": null
}
```

`publish_time: null` publishes immediately; otherwise it is a future ISO datetime such as `2026-11-05T10:00:00`. The response `data` is an array of publication records containing `id`, item ID, `class_id`, `class_title`, `status`, `scheduled_publish_at`, and `actual_publish_at`. Expected statuses are `published`, `scheduled`, and `unpublished`.

The corresponding unpublish body contains the item ID and one `class_id`, for example:

```json
{
  "experiment_id": "7487411944241143808",
  "class_id": "7457968331845443585"
}
```

Class publication endpoints should only return published, currently active records to students; teacher/admin responses may include publication status metadata for management. The backend must enforce course ownership and publication permissions, regardless of frontend role-based controls.

The frontend displays publication controls only when the logged-in teacher has the matching permission:

| Permission code | UI control |
| --- | --- |
| `experiment:publish` | Publish an experiment |
| `experiment:unpublish` | Cancel an experiment publication |
| `exam:publish` | Publish an exam |
| `exam:unpublish` | Cancel an exam publication |

Students and admins do not receive these publication controls. Backend authorization remains authoritative.

### Utility Functions

- **`refreshUserCourses(userRole, teacherId)`** - Refreshes cached course data
- **`clearCache()`** - Clears all cached course data
- **`getCacheStats()`** - Gets cache statistics

---

## Class Management APIs

Located in: `src/api/class.js`

### Class Operations

- **`getClassList(params)`** → `GET /class/user_id`
  - Gets a class list, optionally filtered by `course_id`.
  - **Parameters**: `{ course_id, page, page_size }`; the backend requires `page` and `page_size`.

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
  - **Parameters**: `{ page, page_size }`; the backend requires both pagination parameters.

### Course-Connected APIs

- **`getClassList({ course_id, page, page_size })`** → `GET /class/user_id?course_id={course_id}&page={page}&page_size={page_size}`
  - Gets classes for a specific course when selecting publication targets. The backend requires both pagination parameters.

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

- **`deleteQuestionBank(id)`** → `DELETE /repo/?repo_id={id}`
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

## Experiment Attachment APIs

Located in: `src/api/file.js`

The frontend uses the eight experiment attachment routes below. Upload requests use `multipart/form-data`; the API service leaves the multipart boundary to the browser.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/experiment/file/upload` | Upload teacher's experiment explanation; form fields: `experiment_id`, `file` |
| `GET` | `/experiment/file/list?experiment_id={id}` | List explanation attachments |
| `GET` | `/experiment/file/download?object_name={object_name}` | Get a temporary URL as a string in `data` |
| `DELETE` | `/experiment/file/delete?object_name={object_name}&experiment_id={id}` | Delete an explanation attachment |
| `POST` | `/experiment/result/file/upload` | Upload student's code/report; form fields: `result_id`, `file` |
| `GET` | `/experiment/result/file/list?result_id={id}` | List submission attachments |
| `GET` | `/experiment/result/file/download?object_name={object_name}` | Get a temporary URL as a string in `data` |
| `DELETE` | `/experiment/result/file/delete?object_name={object_name}&result_id={id}` | Delete a submission attachment |

Upload responses contain `{ data: { object_name, file_name } }`; list responses contain `{ data: [{ object_name, file_name, size }] }`. Download responses contain `{ data: "https://...signed-url..." }`. Delete responses contain `{ data: { id: object_name } }`.

Teacher experiments use `explanation` for text mode or `explanation_file` and `explanation_file_name` for attachment mode. Student submissions use `code` for text mode or `code_file` and `code_file_name` for file mode. The create experiment and create result routes must return the new record ID in `data.id` (or the corresponding `experiment_id` / `experiment_result_id`) so uploads can be associated with that record.

### Experiment Question-Answer Window

Located in: `src/api/experimentQuestionWindow.js`

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/question-status?experiment_id={id}` | Return whether the experiment's question-answer window is active and `remaining_sec` |
| `POST` | `/question-open?experiment_id={id}&duration_min={minutes}` | Open the window for 1-180 minutes |
| `POST` | `/question-close?experiment_id={id}` | Close the window immediately |

The status response should include `question_open`, `within_window`, and `remaining_sec`; include `opened_at`, `closed`, or `ended` to distinguish a manually closed window from one that has never been opened. Students may enter unanswered code Q&A only when their analysis score is at least 80 and `within_window` is true. Completed answers remain available for review after the window closes.

The frontend accepts PDF, Word, Excel, PowerPoint, and TXT files up to 512MB each; the backend and reverse proxy must allow the same maximum upload size. Students need permission to list and download experiment attachments for classes they belong to, while result attachment access should be limited to the submitting student and authorized class teachers/admins.

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
