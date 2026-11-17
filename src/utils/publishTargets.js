const LIST_KEYS = ['items', 'list', 'records', 'classes', 'class_list', 'classList', 'rows', 'result', 'data']
const CLASS_ID_KEYS = ['id', 'class_id', 'classId']
const COURSE_ID_KEYS = ['course_id', 'courseId']
const CLASS_NAME_KEYS = ['title', 'class_title', 'class_name', 'className', 'name']

export function extractPublishTargetList(response) {
  const pending = [{ value: response, depth: 0 }]
  const visited = new Set()

  while (pending.length) {
    const { value, depth } = pending.shift()
    if (Array.isArray(value)) return value
    if (!value || typeof value !== 'object' || visited.has(value) || depth >= 6) continue

    visited.add(value)
    for (const key of LIST_KEYS) {
      if (value[key] !== undefined && value[key] !== null) {
        pending.push({ value: value[key], depth: depth + 1 })
      }
    }
  }

  return []
}

export function normalizePublishTargets(response, courseId) {
  const expectedCourseId = courseId === undefined || courseId === null
    ? ''
    : String(courseId)

  return extractPublishTargetList(response)
    .map(item => {
      const id = CLASS_ID_KEYS.map(key => item?.[key]).find(value =>
        value !== undefined && value !== null && String(value).trim() !== ''
      )
      const itemCourseId = COURSE_ID_KEYS.map(key => item?.[key]).find(value =>
        value !== undefined && value !== null && String(value).trim() !== ''
      )
      const title = CLASS_NAME_KEYS.map(key => item?.[key]).find(value =>
        typeof value === 'string' && value.trim() !== ''
      )

      return {
        id: id === undefined ? '' : String(id),
        courseId: itemCourseId === undefined ? '' : String(itemCourseId),
        title: title?.trim() || ''
      }
    })
    .filter(item =>
      item.id &&
      (!expectedCourseId || !item.courseId || item.courseId === expectedCourseId)
    )
    .map(item => ({
      value: item.id,
      label: item.title || `班级 ${item.id}`
    }))
}
