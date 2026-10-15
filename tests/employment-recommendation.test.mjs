import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  DEFAULT_EMPLOYMENT_RECOMMENDATION_TIMEOUT_MS,
  EMPLOYMENT_RECOMMENDATION_ORIGIN,
  EMPLOYMENT_RECOMMENDATION_URL,
  buildEmploymentRecommendationUrl,
  openEmploymentRecommendation
} from '../src/utils/employmentRecommendation.js'

test('builds employment recommendation url with username as student id', () => {
  assert.equal(
    buildEmploymentRecommendationUrl('202211040484'),
    'http://10.21.22.111:5174/employment?student_id=202211040484'
  )
})

test('opens employment recommendation directly without probing local network', async () => {
  const opened = []
  const result = await openEmploymentRecommendation({
    fetchImpl: () => assert.fail('fetch probing should not be used'),
    studentId: '202211040484',
    openWindow: (...args) => opened.push(args),
    messageApi: { warning: () => assert.fail('warning should not be shown') }
  })

  assert.equal(result, true)
  assert.equal(DEFAULT_EMPLOYMENT_RECOMMENDATION_TIMEOUT_MS, 5000)
  assert.equal(EMPLOYMENT_RECOMMENDATION_ORIGIN, 'http://10.21.22.111:5174')
  assert.equal(EMPLOYMENT_RECOMMENDATION_URL, 'http://10.21.22.111:5174/employment')
  assert.deepEqual(opened, [['http://10.21.22.111:5174/employment?student_id=202211040484', '_blank', 'noopener']])
})
