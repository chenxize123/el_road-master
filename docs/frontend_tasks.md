# 前端改造任务清单

> 后端已全部就绪，本文档梳理前端需要做的改动，包括 API 对接、页面改造、表单新增、权限控制等。

---

## 一、需要修改的页面

### 1.1 课程详情页（核心改造）

**新增 Tab：** 在课程详情页增加「实验列表」和「考试列表」两个 Tab

```
课程详情
├── 基本信息（已有）
├── 班级列表（已有）
├── 🆕 实验列表 Tab
│     ├── 实验模板表格
│     │     ├── 列：标题 | 总分 | 起止时间 | LLM配置 | 发布状态 | 操作
│     │     └── 发布状态：未发布 / 已发布(N个班级) / 定时发布
│     ├── 顶部操作栏
│     │     ├── 🆕 新建实验 按钮（弹窗表单）
│     │     └── 筛选：全部 / 已发布 / 未发布
│     └── 每行操作：编辑 | 删除 | 🆕 发布到班级 | 🆕 管理发布
└── 🆕 考试列表 Tab（结构同实验列表）
      ├── 考试模板表格
      └── 新建考试 / 编辑 / 删除 / 发布到班级 / 管理发布
```

**新建实验表单字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| course_id | 隐藏 | 是 | 自动从路由参数获取 |
| title | 文本 | 是 | 实验标题 |
| explanation | 富文本 | 是 | 实验说明 |
| score | 数字 | 是 | 实验总分 |
| start_time | 日期时间 | 是 | 开始时间 |
| end_time | 日期时间 | 是 | 结束时间 |
| question_config | 表单对象 | 否 | LLM 出题配置（见下文） |

**LLM 出题配置（question_config）：**

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

UI 建议：一组 Checkbox 勾选需要的题型 + 旁边的数量输入框。

**新建考试表单字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| course_id | 隐藏 | 是 | 自动获取 |
| title | 文本 | 是 | 考试标题 |
| paper_id | 选择器 | 是 | 关联的试卷（现有试卷选择器） |
| total_duration | 数字 | 是 | 考试时长（分钟） |
| passing_score | 数字 | 是 | 及格分 |
| description | 富文本 | 否 | 考试说明 |
| start_time | 日期时间 | 是 | 开始时间 |
| end_time | 日期时间 | 是 | 结束时间 |

### 1.2 发布弹窗（新增组件）

点击「发布到班级」按钮弹出：

```
┌──────────────────────────────────────┐
│ 发布实验/考试                          │
├──────────────────────────────────────┤
│ 📌 发布目标：                         │
│   [班级多选下拉框]                     │
│   数据来源：GET /class/teacher_id      │
│                                      │
│ ⏰ 发布时间：                         │
│   ○ 立即发布                          │
│   ○ 定时发布  [日期时间选择器]          │
│                                      │
│ 注意：选择定时发布后，到点自动激活        │
│                                      │
│              [取消]    [确认发布]       │
└──────────────────────────────────────┘
```

### 1.3 管理发布弹窗（新增组件）

显示当前实验/考试已发布到哪些班级，可取消发布：

```
┌──────────────────────────────────────┐
│ 发布管理 - 实验xxx                     │
├──────────────────────────────────────┤
│  班级A   状态：已发布    [取消发布]     │
│  班级B   状态：定时发布  [取消发布]     │
│  班级C   状态：已发布    [取消发布]     │
│                                      │
│  [+ 发布到更多班级]                    │
│                                      │
│                           [关闭]       │
└──────────────────────────────────────┘
```

### 1.4 班级页面（教师端 + 学生端）

**改造：** 班级页面的「实验」Tab 和「考试」Tab 改为调用**发布记录接口**

```
班级详情
├── 基本信息（已有）
├── 成员列表（已有）
├── 实验 Tab（🆕 数据源切换）
│     └── GET /experiment/class_published/{class_id}
└── 考试 Tab（🆕 数据源切换）
      └── GET /exam/class_published/{class_id}
```

**展示逻辑：**
- 教师端：显示已发布的实验/考试列表（+ 可管理发布）
- 学生端：只显示已发布的，点击进入答题页面

---

## 二、新增后端 API 清单

### 2.1 实验相关（新增）

| 方法 | 路径 | 权限 scope | 说明 |
|------|------|------------|------|
| `GET` | `/api/v1/experiment/course/{course_id}` | `experiment:get` | 课程下所有实验模板（含草稿） |
| `GET` | `/api/v1/experiment/class_published/{class_id}` | `experiment:get` | 班级下已发布的实验 |
| `POST` | `/api/v1/experiment/publish` | `experiment:publish` | 发布实验到班级（即时/定时） |
| `POST` | `/api/v1/experiment/unpublish` | `experiment:unpublish` | 取消实验在某班级的发布 |
| `GET` | `/api/v1/experiment/publishes/{experiment_id}` | `experiment:get` | 获取实验的发布记录 |

### 2.2 考试相关（新增）

| 方法 | 路径 | 权限 scope | 说明 |
|------|------|------------|------|
| `GET` | `/api/v1/exam/course/{course_id}` | `exam:get` | 课程下所有考试模板 |
| `GET` | `/api/v1/exam/class_published/{class_id}` | `exam:get` | 班级下已发布的考试 |
| `POST` | `/api/v1/exam/publish` | `exam:publish` | 发布考试到班级 |
| `POST` | `/api/v1/exam/unpublish` | `exam:unpublish` | 取消发布 |
| `GET` | `/api/v1/exam/publishes/{exam_id}` | `exam:get` | 获取发布记录 |

### 2.3 请求/响应示例

#### POST /api/v1/experiment/publish

```json
// 请求 - 即时发布
{
  "experiment_id": 7487411944241143808,
  "class_ids": [7457968331845443585, 7457968331845443586],
  "publish_time": null
}

// 请求 - 定时发布
{
  "experiment_id": 7487411944241143808,
  "class_ids": [7457968331845443585],
  "publish_time": "2026-10-30T10:00:00"
}

// 响应
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 7521564000000000001,
      "experiment_id": 7487411944241143808,
      "class_id": 7457968331845443585,
      "class_title": "计算机一班",
      "status": "published",
      "scheduled_publish_at": null,
      "actual_publish_at": "2026-10-29T21:30:00"
    }
  ]
}
```

#### GET /api/v1/experiment/course/{course_id}

```json
// 响应（每个实验新增了 publish_count / publish_status 字段）
{
  "code": 200,
  "data": [
    {
      "id": 7487411944241143808,
      "course_id": 7457968331845443001,
      "course_title": "计算机基础",
      "title": "Python 基础实验",
      "explanation": "...",
      "score": 100,
      "start_time": "2026-11-01T00:00:00",
      "end_time": "2026-12-01T00:00:00",
      "question_config": { "types": [...] },
      "create_by": "张老师",
      "publish_count": 3,
      "publish_status": "已发布"
    }
  ]
}
```

#### POST /api/v1/experiment/unpublish

```json
// 请求
{
  "experiment_id": 7487411944241143808,
  "class_id": 7457968331845443585
}

// 响应
{ "code": 200, "message": "success", "data": "取消发布成功" }
```

### 2.4 创建接口变更（需注意）

**原有 CreateExperimentReq 新增了必填字段：**

```json
// 以前（class_id 必填）
{ "class_id": 123, "title": "...", ... }

// 现在（course_id 必填，class_id 可选）
{ "course_id": 456, "title": "...", ... }
```

前端需要把所有调用 `POST /experiment/` 和 `POST /exam/` 的地方：
1. **新增 `course_id` 参数**（从路由参数或课程选择器获取）
2. `class_id` 改为**可选**（发布时再指定）

---

## 三、新增前端 API 方法

建议在前端 API 文件中追加以下方法：

```javascript
// ========== 实验新增方法 ==========

// 课程下所有实验模板
export function getExperimentsByCourse(courseId) {
  return request({ url: `/experiment/course/${courseId}`, method: 'get' })
}

// 班级下已发布实验
export function getExperimentsByClassPublished(classId) {
  return request({ url: `/experiment/class_published/${classId}`, method: 'get' })
}

// 发布实验（即时/定时）
export function publishExperiment(data) {
  return request({ url: '/experiment/publish', method: 'post', data })
}

// 取消发布
export function unpublishExperiment(data) {
  return request({ url: '/experiment/unpublish', method: 'post', data })
}

// 获取发布记录
export function getExperimentPublishes(experimentId) {
  return request({ url: `/experiment/publishes/${experimentId}`, method: 'get' })
}

// ========== 考试新增方法 ==========
// 结构与实验完全对称，把 experiment 换成 exam 即可
```

---

## 四、权限控制

新增 4 个后端权限，前端需要在按钮/操作处做权限判断：

| 权限 code | 控制元素 | 说明 |
|-----------|----------|------|
| `experiment:publish` | 发布按钮 | 是否能发布实验到班级 |
| `experiment:unpublish` | 取消发布按钮 | 是否能取消实验发布 |
| `exam:publish` | 发布按钮 | 是否能发布考试到班级 |
| `exam:unpublish` | 取消发布按钮 | 是否能取消考试发布 |

**所有用户可查看（`experiment:get` / `exam:get` 已存在）。**

---

## 五、字段变更速查

### ExperimentRes 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `course_id` | int | 归属课程 ID |
| `course_title` | string | 课程名称 |
| `publish_count` | int | 已发布到几个班级 |
| `publish_status` | string | 发布状态（未发布/已发布/定时发布/草稿） |

### ExamRes 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `course_id` | int | 归属课程 ID |
| `course_title` | string | 课程名称 |
| `publish_count` | int | 已发布到几个班级 |
| `publish_status` | string | 发布状态 |

### CreateExperimentReq 变更

| 字段 | 旧 | 新 |
|------|----|----|
| `course_id` | 无 | **新增，必填** |
| `class_id` | 必填 | 可选（发布时指定） |

### CreateExamReq 变更

| 字段 | 旧 | 新 |
|------|----|----|
| `course_id` | 无 | **新增，必填** |
| `class_id` | 必填 | 可选（发布时指定） |

---

## 六、发布状态枚举

| 后端值 | 前端展示 | 说明 |
|--------|----------|------|
| `draft` | 草稿 | 实验/考试刚创建，未发布 |
| `published` | 已发布 | 立即发布或定时到期激活 |
| `scheduled` | 定时发布 | 设置了发布时间，等待到期自动激活 |
| （无记录） | 未发布 | 新建模板，从未发布过 |

---

## 七、定时发布时间规则

- 后端调度器每 **30 秒**检查一次
- 设置 `publish_time` 大于当前时间 → 定时发布（`scheduled`）
- 设置 `publish_time` 为 null 或小于当前时间 → 立即发布（`published`）
- 到点后 **自动** 从 `scheduled` → `published`，设置 `actual_publish_at`

---

## 八、兼容说明

| 场景 | 处理方式 |
|------|----------|
| 旧前端硬编码 `class_id` 创建实验 | 后端已兼容旧逻辑，但会发出警告 |
| 旧接口 `/experiment/class_id` | 保持可用，但建议前端逐步切换到 `class_published/{class_id}` |
| 现有实验/考试无发布记录 | 后端迁移时已自动生成 11 条实验 + 8 条考试发布记录（状态=published） |

---

## 九、改造检查清单

- [ ] API 方法追加（见第三节）
- [ ] 课程详情页新增「实验列表」Tab
- [ ] 课程详情页新增「考试列表」Tab
- [ ] 新建实验表单（加 course_id + LLM 出题配置）
- [ ] 新建考试表单（加 course_id）
- [ ] 发布弹窗组件（多选班级 + 时间选择）
- [ ] 管理发布弹窗组件
- [ ] 班级页实验 Tab 数据源切换
- [ ] 班级页考试 Tab 数据源切换
- [ ] 发布状态标签展示（已发布/定时发布/未发布）
- [ ] 按钮权限控制（4 个新 scope）
- [ ] 构建部署

---

*文档生成时间：2026-10-29  |  后端接口版本：v1.0（2026-10-29 全量就绪）*
