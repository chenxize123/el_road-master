export function extractQuestionWindowData(response) {
  let data = response?.data?.data ?? response?.data ?? response ?? {}
  if (Array.isArray(data)) data = data[0] || {}
  return data && typeof data === 'object' ? data : {}
}

export function normalizeQuestionWindowStatus(response, fetchedAt = Date.now()) {
  const data = extractQuestionWindowData(response)
  const remainingValue = data.remaining_sec ?? data.remaining_seconds
  const questionOpen = data.question_open ?? data.is_open ?? null
  const withinWindow = data.within_window ?? null
  const openedAt = data.question_start_time ?? data.opened_at ?? data.start_time ?? null
  const remainingSec = remainingValue === undefined || remainingValue === null
    ? null
    : Number(remainingValue)
  return {
    question_open: questionOpen,
    within_window: withinWindow ?? (questionOpen === true ? true : null),
    remaining_sec: Number.isFinite(remainingSec) ? Math.max(0, remainingSec) : null,
    opened_at: openedAt,
    ends_at: data.question_end_time ?? data.ends_at ?? data.end_time ?? null,
    duration_min: data.question_duration_min ?? data.duration_min ?? null,
    closed: data.closed ?? data.is_closed ?? false,
    ended: data.ended ?? data.is_ended ?? false,
    status: String(data.status || '').toLowerCase(),
    fetched_at: fetchedAt
  }
}

export function getQuestionWindowRemainingSec(status, now = Date.now()) {
  if (!status || status.remaining_sec === null || status.remaining_sec === undefined) return null
  const remainingSec = Number(status.remaining_sec)
  if (!Number.isFinite(remainingSec)) return null
  const fetchedAt = Number(status.fetched_at)
  const elapsedSec = Number.isFinite(fetchedAt)
    ? Math.floor(Math.max(0, now - fetchedAt) / 1000)
    : 0
  return Math.max(0, remainingSec - elapsedSec)
}

export function isQuestionWindowOpen(status, now = Date.now()) {
  if (!status) return false
  const remainingSec = getQuestionWindowRemainingSec(status, now)
  if (remainingSec === 0) return false
  if (status.within_window === false || status.closed || status.ended) return false
  if (status.within_window === true) return true
  return status.question_open === true && (remainingSec === null || remainingSec > 0)
}

export function getQuestionWindowLabel(status, now = Date.now()) {
  if (isQuestionWindowOpen(status, now)) return '进行中'
  if (!status) return '未开启'
  const remainingSec = getQuestionWindowRemainingSec(status, now)
  if (
    status.closed ||
    status.ended ||
    (status.opened_at && status.question_open !== true) ||
    ['closed', 'ended', 'expired', 'finished'].includes(status.status) ||
    remainingSec === 0 ||
    (status.question_open === true && status.within_window === false)
  ) {
    return '已结束'
  }
  return '未开启'
}

export function canEnterExperimentQuestionAnswer(record, status, now = Date.now()) {
  if (record?.question_state === '已回答' || record?.question_state === '已批改') return true
  const score = Number(record?.analysis?.score)
  return Number.isFinite(score) &&
    score >= 80 &&
    Boolean(record?.question) &&
    isQuestionWindowOpen(status, now)
}

export function formatQuestionWindowRemaining(status, now = Date.now()) {
  const remainingSec = getQuestionWindowRemainingSec(status, now)
  if (remainingSec === null) return ''
  const minutes = Math.floor(remainingSec / 60)
  const seconds = remainingSec % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
