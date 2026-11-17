import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canEnterExperimentQuestionAnswer,
  formatQuestionWindowRemaining,
  getQuestionWindowRemainingSec,
  getQuestionWindowLabel,
  isQuestionWindowOpen,
  normalizeQuestionWindowStatus
} from '../src/utils/experimentQuestionWindow.js'

test('requires a passing analysis score and an open question window', () => {
  const result = {
    analysis: { score: 80 },
    question: { questions: [{}] }
  }
  const openWindow = normalizeQuestionWindowStatus({
    code: 200,
    data: { question_open: true, within_window: true, remaining_sec: 90 }
  }, 1000)

  assert.equal(canEnterExperimentQuestionAnswer(result, openWindow, 1000), true)
  assert.equal(canEnterExperimentQuestionAnswer({
    ...result,
    analysis: { score: 79 }
  }, openWindow, 1000), false)
  assert.equal(canEnterExperimentQuestionAnswer(result, null, 1000), false)
})

test('labels unopened, active, and expired windows and counts down to expiry', () => {
  const unopened = normalizeQuestionWindowStatus({
    data: { question_open: false, within_window: false }
  }, 1000)
  const active = normalizeQuestionWindowStatus({
    data: { question_open: true, within_window: true, remaining_sec: 61 }
  }, 1000)
  const expired = normalizeQuestionWindowStatus({
    data: { question_open: true, within_window: false, remaining_sec: 0 }
  }, 1000)
  const manuallyClosed = normalizeQuestionWindowStatus({
    data: { question_open: false, within_window: false, opened_at: '2026-11-06T09:00:00' }
  }, 1000)

  assert.equal(getQuestionWindowLabel(unopened, 1000), '未开启')
  assert.equal(getQuestionWindowLabel(active, 1000), '进行中')
  assert.equal(formatQuestionWindowRemaining(active, 1000), '01:01')
  assert.equal(isQuestionWindowOpen(active, 62000), false)
  assert.equal(getQuestionWindowLabel(active, 62000), '已结束')
  assert.equal(getQuestionWindowLabel(expired, 1000), '已结束')
  assert.equal(getQuestionWindowLabel(manuallyClosed, 1000), '已结束')
})

test('normalizes the backend question_start_time and question_end_time response fields', () => {
  const status = normalizeQuestionWindowStatus({
    code: 200,
    data: {
      experiment_id: '7524055829872549888',
      question_open: true,
      within_window: true,
      question_start_time: '2026-11-06T16:48:03',
      question_duration_min: 5,
      question_end_time: '2026-11-06T16:53:03',
      remaining_sec: 299
    }
  }, 1000)

  assert.equal(status.opened_at, '2026-11-06T16:48:03')
  assert.equal(status.ends_at, '2026-11-06T16:53:03')
  assert.equal(status.duration_min, 5)
  assert.equal(status.within_window, true)
  assert.equal(formatQuestionWindowRemaining(status, 1000), '04:59')
})

test('completed question answers remain accessible after the window closes', () => {
  assert.equal(canEnterExperimentQuestionAnswer({
    question_state: '已回答',
    analysis: { score: 42 }
  }, null), true)
})

test('does not render a NaN countdown when status loading fails or omits remaining time', () => {
  assert.equal(formatQuestionWindowRemaining({ error: 'request failed' }, 1000), '')
  assert.equal(getQuestionWindowRemainingSec({
    remaining_sec: undefined,
    fetched_at: 1000
  }, 1000), null)
  assert.equal(getQuestionWindowRemainingSec({
    remaining_sec: 'not-a-number',
    fetched_at: 1000
  }, 1000), null)
})
