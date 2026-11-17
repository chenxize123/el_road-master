import test from 'node:test'
import assert from 'node:assert/strict'
import { hasPublishPermission } from '../src/utils/publishPermissions.js'

test('shows publication controls only when teachers have the matching permission', () => {
  const teacher = {
    user_type: 'teacher',
    permissions: ['experiment:publish', { permission_code: 'exam:unpublish' }]
  }

  assert.equal(hasPublishPermission(teacher, 'experiment:publish'), true)
  assert.equal(hasPublishPermission(teacher, 'exam:unpublish'), true)
  assert.equal(hasPublishPermission(teacher, 'experiment:unpublish'), false)
  assert.equal(hasPublishPermission(teacher, 'exam:publish'), false)
})

test('does not show publication controls when teacher permissions are absent', () => {
  assert.equal(hasPublishPermission({ user_type: 'teacher' }, 'experiment:publish'), false)
  assert.equal(hasPublishPermission({ user_type: 'teacher', permissions: [] }, 'exam:publish'), false)
})

test('does not show publication controls to admins, students, or visitors', () => {
  const permission = 'exam:publish'

  assert.equal(hasPublishPermission({ user_type: 'admin', permissions: [permission] }, permission), false)
  assert.equal(hasPublishPermission({ user_type: 'student', permissions: [permission] }, permission), false)
  assert.equal(hasPublishPermission({ user_type: 'visitor', permissions: [permission] }, permission), false)
})
