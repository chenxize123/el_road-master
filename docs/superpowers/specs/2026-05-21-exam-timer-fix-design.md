---
name: exam-timer-fix
description: 修复考试计时器在页面切换后停止的问题，采用基于绝对时间的计算方案
metadata:
  type: design
---

# 考试计时器修复方案设计

## 问题描述
当前考试页面在用户切出标签页/浏览器后，`setInterval` 会被浏览器降频或暂停，导致倒计时不准确，学生实际做题时长可能超过设定的考试时长。

## 方案选择

### 备选方案
1. **基于绝对时间的计时（推荐）** - 使用 examStartTime + Date.now() 实时计算
2. **visibilitychange 事件即时修正** - 页面恢复可见时修正时间
3. **Web Worker 后台计时** - 独立线程运行计时器（过度设计）

### 推荐方案理由
- 最准确可靠，不受页面切换/休眠影响
- 实现简单，性能好
- 与现有保存/恢复逻辑兼容

## 架构设计

### 核心改动
将 `timeLeft` 从被动递减的 `ref` 改为实时计算的 `computed` 属性。

### 数据结构
```javascript
// 保持不变
examStartTime.value = Date.now()  // 考试开始的绝对时间戳

// 改为 computed
timeLeft = computed(() => {
  if (!examStartTime.value || !examDetail.value?.total_duration) return 0
  const elapsed = Math.floor((Date.now() - examStartTime.value) / 1000)
  const total = examDetail.value.total_duration * 60
  return Math.max(0, total - elapsed)
})
```

### 关键函数改动

#### 1. startTimer()
```javascript
// 不再递减 timeLeft，只用于每秒检查时间并保存状态
const startTimer = () => {
  if (timerRef.value) clearInterval(timerRef.value)
  timerRef.value = setInterval(() => {
    saveExamState()
    if (timeLeft.value <= 0) {
      handleSubmit(true)
    }
  }, 1000)
}
```

#### 2. restoreExamState()
保持现有逻辑不变，因为已经是基于时间戳计算的。

#### 3. visibilitychange 处理
可选增强：页面恢复可见时可以加个提示，但时间计算本身不需要修正。

## 兼容性
- 与现有 localStorage 状态保存/恢复完全兼容
- 与自动交卷逻辑兼容
- 与实际用时计算逻辑兼容（已有 `examStartTime`）

## 测试要点
1. 开始考试后切出页面，等待一段时间再切回，验证时间正确流逝
2. 刷新页面后恢复状态，验证时间计算正确
3. 考试时间到自动交卷功能正常
