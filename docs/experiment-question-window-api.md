# 实验代码问答开放窗口：后端接口说明

## 1. 背景与目的

教师需要为某个实验开启一个限时的代码问答窗口，学生只有在代码评分达到 80 分且窗口处于开放状态时才能进入未完成的问答。教师可以提前关闭窗口。前端每 15 秒查询一次状态，并显示剩余时间。

前端请求以下路由；`/api/v1` 等 API 前缀由项目 API 基础地址配置添加：

| 方法 | 路由 | 用途 |
| --- | --- | --- |
| `GET` | `/experiment/question-status?experiment_id={id}` | 查询实验的问答窗口状态 |
| `POST` | `/experiment/question-open?experiment_id={id}&duration_min={minutes}` | 开启或重开限时窗口 |
| `POST` | `/experiment/question-close?experiment_id={id}` | 立即关闭窗口 |

对应完整请求路径示例为 `/api/v1/experiment/question-status`、`/api/v1/experiment/question-open` 和 `/api/v1/experiment/question-close`。

## 2. 通用约定

- 所有接口需要登录认证。
- `experiment_id` 使用字符串传输，避免长整型 ID 在 JavaScript 中精度丢失。
- JSON 响应采用项目通用格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

- 请求实验不存在时返回 `404`；未登录返回 `401`；无权操作返回 `403`；参数错误返回 `400`。
- 开放/关闭接口成功后，`data` 可返回最新状态，便于前端即时刷新。

## 3. 查询状态

### 请求

```http
GET /api/v1/experiment/question-status?experiment_id=7518638...
Authorization: Bearer <token>
```

此接口需要允许有权访问该实验的学生读取状态；拥有实验管理权限的教师/管理员也可读取。不能因学生没有教师管理权限而拒绝状态查询。

### 响应：尚未开启

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "experiment_id": "7518638...",
    "question_open": false,
    "within_window": false,
    "remaining_sec": 0,
    "question_start_time": null,
    "question_duration_min": null,
    "question_end_time": null,
    "closed": false,
    "ended": false
  }
}
```

### 响应：开放中

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "experiment_id": "7518638...",
    "question_open": true,
    "within_window": true,
    "remaining_sec": 125,
    "question_start_time": "2026-11-06T09:00:00",
    "question_duration_min": 30,
    "question_end_time": "2026-11-06T09:30:00",
    "closed": false,
    "ended": false
  }
}
```

### 响应：教师提前关闭

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "experiment_id": "7518638...",
    "question_open": false,
    "within_window": false,
    "remaining_sec": 0,
    "question_start_time": "2026-11-06T09:00:00",
    "question_duration_min": 30,
    "question_end_time": "2026-11-06T09:30:00",
    "closed": true,
    "ended": false
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `experiment_id` | string | 实验 ID |
| `question_open` | boolean | 窗口是否已开启且未被关闭/超时 |
| `within_window` | boolean | 当前是否在可答题时间内；这是前端开放判断的权威字段 |
| `remaining_sec` | integer | 剩余秒数；未开启、已关闭或超时返回 `0` |
| `question_start_time` | string/null | 最近一次开启时间；未开启时为 `null` |
| `question_duration_min` | integer/null | 本次开放时长（分钟） |
| `question_end_time` | string/null | 本次窗口截止时间 |
| `closed` | boolean | 是否由教师/管理员主动关闭 |
| `ended` | boolean | 是否因时限到期结束 |

状态判断要求：

- 未开启：`question_open=false`、`within_window=false`、`opened_at=null`。
- 开放中：`question_open=true`、`within_window=true`、`remaining_sec > 0`。
- 超时：`question_open=false`、`within_window=false`、`remaining_sec=0`、`ended=true`。
- 主动关闭：`question_open=false`、`within_window=false`、`remaining_sec=0`、`closed=true`。
- `remaining_sec` 必须为有限数值，不能返回 `null`、`NaN` 或数字字符串以外的非数字内容。

## 4. 开启/重开窗口

### 请求

```http
POST /api/v1/experiment/question-open?experiment_id=7518638...&duration_min=30
Authorization: Bearer <teacher-or-admin-token>
```

`duration_min` 必须是整数，范围 `1` 至 `180` 分钟。教师只能操作其有权管理的课程/班级实验；管理员可按项目现有管理规则操作。

再次调用表示重新开放，并从本次请求时间重新计算窗口结束时间。

### 响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "experiment_id": "7518638...",
    "question_open": true,
    "within_window": true,
    "remaining_sec": 1800,
    "question_start_time": "2026-11-06T09:00:00",
    "question_duration_min": 30,
    "question_end_time": "2026-11-06T09:30:00",
    "closed": false,
    "ended": false
  }
}
```

## 5. 关闭窗口

### 请求

```http
POST /api/v1/experiment/question-close?experiment_id=7518638...
Authorization: Bearer <teacher-or-admin-token>
```

关闭操作应使 `within_window=false` 并立即令剩余时间归零。重复关闭应安全处理，不应造成 500 错误。

### 响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "experiment_id": "7518638...",
    "question_open": false,
    "within_window": false,
    "remaining_sec": 0,
    "opened_at": "2026-11-06T09:00:00Z",
    "closed": true,
    "ended": false
  }
}
```

## 6. 权限及答题规则

- 只有教师/管理员可开启或关闭窗口，并且后端必须检查其对目标实验的管理权限。
- 学生可查询其有权访问的实验状态。
- 未完成问答的学生仅在代码分析分数 `>= 80`、已有问答题目且 `within_window=true` 时可进入问答。
- 前端会在页面入口进行检查，但前端校验不能替代后端鉴权。若需防止绕过页面直接提交，请在现有 `POST /llm/experiment/analysis` 处理逻辑中校验：
  - 已完成的问答仍允许读取/查看结果；
  - 未完成的问答必须检查学生身份、实验提交归属、代码分数及开放窗口；
  - 窗口关闭或超时后拒绝新的问答提交。
- 不要改变实验创建、实验发布、学生代码/报告提交或 AI 代码评分的现有接口和流程。

## 7. 状态保存建议

状态至少要能按 `experiment_id` 保存：

- 最近一次开启时间；
- 窗口截止时间；
- 是否被教师主动关闭。

窗口是否有效应由服务端时间判断，不应依赖浏览器计时器。过期后即使没有定时任务更新记录，状态查询也必须返回 `within_window=false`、`remaining_sec=0`、`ended=true`。

## 8. 联调验收清单

1. 三个路由均不再返回 `404 Not Found`。
2. 教师以 `duration_min=30` 开启后，状态接口返回 `within_window=true`，`remaining_sec` 从约 `1800` 秒递减。
3. 学生能读取该状态；无权学生不能查询无关实验。
4. 学生在未开放、已关闭或已超时状态下不能开始/提交新的代码问答。
5. 教师提前关闭后，状态立即变为 `within_window=false`、`remaining_sec=0`、`closed=true`。
6. 用 1 分钟窗口验证到期后状态自动变为 `within_window=false`、`remaining_sec=0`、`ended=true`。
7. 验证 `duration_min` 为 `0`、`181`、小数或非数字时返回 `400`。
8. 未登录或无管理权限的用户调用开启/关闭接口时分别返回 `401` 或 `403`。
9. 既有实验提交、自动评分、题目生成、答题评分和查看历史结果功能仍可正常使用。

## 9. 前端对应文件

- API 调用：`src/api/experimentQuestionWindow.js`
- 状态字段解析与倒计时：`src/utils/experimentQuestionWindow.js`
- 教师操作、提交列表状态、学生入口：`src/components/class/modules/ClassExperimentModule.vue`
- 直接访问问答页面的检查：`src/views/experiment/ExperimentQuestionAnswer.vue`
