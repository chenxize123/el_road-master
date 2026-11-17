import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extractPublishTargetList,
  normalizePublishTargets
} from '../src/utils/publishTargets.js'

test('extracts class arrays from nested and paginated API responses', () => {
  const classes = [{ class_id: '7515343501467492352', class_name: '视觉一班' }]

  assert.deepEqual(
    extractPublishTargetList({ code: 200, data: { data: { class_list: classes } } }),
    classes
  )
  assert.deepEqual(
    extractPublishTargetList({ code: 200, data: { items: classes } }),
    classes
  )
})

test('normalizes class ids and labels and excludes explicitly mismatched courses', () => {
  assert.deepEqual(
    normalizePublishTargets({
      data: [
        { class_id: 7515343501467492352n, class_name: '视觉一班', course_id: 'course-a' },
        { id: 'class-b', title: '其他课程班级', course_id: 'course-b' },
        { id: 'class-c', course_id: 'course-a' }
      ]
    }, 'course-a'),
    [
      { value: '7515343501467492352', label: '视觉一班' },
      { value: 'class-c', label: '班级 class-c' }
    ]
  )
})

test('omits invalid class records and supports classId aliases', () => {
  assert.deepEqual(
    normalizePublishTargets([
      { classId: 'class-a', className: '一班' },
      { title: '缺少 ID' },
      null
    ]),
    [{ value: 'class-a', label: '一班' }]
  )
})
