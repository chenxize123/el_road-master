import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const courseApi = readFileSync(resolve(root, 'src/api/course.js'), 'utf8')
const classApi = readFileSync(resolve(root, 'src/api/class.js'), 'utf8')

function assertContains(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label} should contain ${expected}`)
  }
}

assertContains(courseApi, 'export function deleteCourseApi(courseId)', 'course API')
assertContains(courseApi, '`/course/?course_id=${courseId}`', 'course delete endpoint')
assertContains(classApi, 'export async function deleteClassApi(classId)', 'class API')
assertContains(classApi, '`/class/?class_id=${classId}`', 'class delete endpoint')

console.log('delete API contracts are present')
