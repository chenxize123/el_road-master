import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  VISITOR_DELETE_BUTTON_CLASS,
  VISITOR_DELETE_NO_PERMISSION_MESSAGE,
  shouldBlockVisitorDeleteClick,
  updateVisitorDeleteButtonStyles
} from '../src/utils/visitorDeleteGuard.js'

const createTarget = button => ({
  closest: selector => selector.includes('button') ? button : null
})

test('blocks visitor delete button clicks by visible text', () => {
  const button = {
    textContent: '删除',
    getAttribute: () => '',
    querySelector: () => null
  }

  assert.equal(shouldBlockVisitorDeleteClick(createTarget(button), { user_type: 'visitor' }), true)
  assert.equal(VISITOR_DELETE_NO_PERMISSION_MESSAGE, '游客模式下没有权限执行删除操作')
})

test('blocks visitor delete button clicks when delete text contains spaces', () => {
  const button = {
    textContent: '删 除',
    getAttribute: () => '',
    querySelector: () => null
  }

  assert.equal(shouldBlockVisitorDeleteClick(createTarget(button), { user_type: 'visitor' }), true)
})

test('blocks visitor delete button clicks by delete icon', () => {
  const button = {
    textContent: '',
    getAttribute: () => '',
    querySelector: selector => selector === '[data-icon="delete"]' ? {} : null
  }

  assert.equal(shouldBlockVisitorDeleteClick(createTarget(button), { user_type: 'visitor' }), true)
})

test('does not block non visitor delete button clicks', () => {
  const button = {
    textContent: '删除',
    getAttribute: () => '',
    querySelector: () => null
  }

  assert.equal(shouldBlockVisitorDeleteClick(createTarget(button), { user_type: 'teacher' }), false)
})

test('marks visitor delete buttons with gray style class', () => {
  const deleteButton = createButton('删除')
  const normalButton = createButton('查看')
  const root = createRoot([deleteButton, normalButton])

  updateVisitorDeleteButtonStyles(root, { user_type: 'visitor' })

  assert.equal(deleteButton.classList.contains(VISITOR_DELETE_BUTTON_CLASS), true)
  assert.equal(normalButton.classList.contains(VISITOR_DELETE_BUTTON_CLASS), false)
})

test('removes gray style class when user is not visitor', () => {
  const deleteButton = createButton('删除')
  deleteButton.classList.add(VISITOR_DELETE_BUTTON_CLASS)
  const root = createRoot([deleteButton])

  updateVisitorDeleteButtonStyles(root, { user_type: 'teacher' })

  assert.equal(deleteButton.classList.contains(VISITOR_DELETE_BUTTON_CLASS), false)
})

function createRoot(buttons) {
  return {
    querySelectorAll: () => buttons
  }
}

function createButton(textContent) {
  const classes = new Set()

  return {
    textContent,
    getAttribute: () => '',
    querySelector: () => null,
    classList: {
      add: className => classes.add(className),
      remove: className => classes.delete(className),
      contains: className => classes.has(className)
    }
  }
}
