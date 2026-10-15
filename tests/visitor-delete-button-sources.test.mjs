import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const classListSource = readFileSync('src/components/class/ClassList.vue', 'utf8')
const courseListSource = readFileSync('src/components/courses/CourseList.vue', 'utf8')

test('class list delete button applies visitor gray class directly', () => {
  assert.match(classListSource, /:class="\{ 'visitor-delete-button-muted': isVisitor \}"/)
})

test('course list delete button applies visitor gray class directly', () => {
  assert.match(courseListSource, /:class="\{ 'visitor-delete-button-muted': isVisitor \}"/)
})
