export const VISITOR_DELETE_NO_PERMISSION_MESSAGE = '游客模式下没有权限执行删除操作'
export const VISITOR_DELETE_BUTTON_CLASS = 'visitor-delete-button-muted'

export const isVisitorUser = userInfo => userInfo?.user_type === 'visitor'

const normalizeActionText = value => String(value || '').replace(/\s+/g, '')

export const isDeleteActionElement = element => {
  if (!element) return false

  const text = normalizeActionText(element.textContent)
  const title = normalizeActionText(element.getAttribute?.('title'))
  const ariaLabel = normalizeActionText(element.getAttribute?.('aria-label'))
  const hasDeleteIcon = Boolean(element.querySelector?.('[data-icon="delete"]'))

  return text.includes('删除') ||
    title.includes('删除') ||
    ariaLabel.includes('删除') ||
    hasDeleteIcon
}

export const shouldBlockVisitorDeleteClick = (target, userInfo) => {
  if (!isVisitorUser(userInfo)) return false

  const actionElement = target?.closest?.('button, .ant-btn, [role="button"]')
  return isDeleteActionElement(actionElement)
}

export const updateVisitorDeleteButtonStyles = (root, userInfo) => {
  const buttons = root?.querySelectorAll?.('button, .ant-btn, [role="button"]') || []

  buttons.forEach(button => {
    button.classList?.remove(VISITOR_DELETE_BUTTON_CLASS)

    if (isVisitorUser(userInfo) && isDeleteActionElement(button)) {
      button.classList?.add(VISITOR_DELETE_BUTTON_CLASS)
    }
  })
}
