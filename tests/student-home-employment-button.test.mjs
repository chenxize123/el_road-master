import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const studentHomeSource = readFileSync('src/views/student/StudentHome.vue', 'utf8')

test('employment recommendation button renders its visible label directly', () => {
  assert.match(studentHomeSource, /<a-button[\s\S]*class="employment-button"[\s\S]*就业推荐[\s\S]*<\/a-button>/)
  assert.doesNotMatch(studentHomeSource, /employmentButtonText/)
})
