import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  USER_IMPORT_TEMPLATE_URL,
  getExcelRowNumber
} from '../src/utils/userImport.js'

test('uses the public batch user import example workbook as template url', () => {
  assert.equal(USER_IMPORT_TEMPLATE_URL, '/批量导入用户示例.xlsx')
})

test('maps zero-based data array index to actual Excel row number', () => {
  assert.equal(getExcelRowNumber(1), 2)
})
