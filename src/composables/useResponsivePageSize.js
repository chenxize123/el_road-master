import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'

export function useResponsivePageSize({ gridRef, enabled, items, pageSize, onPageSizeChange }) {
  let resizeObserver
  let animationFrame
  let updateTimer

  const updatePageSize = () => {
    animationFrame = undefined
    const grid = gridRef.value
    if (!enabled() || !grid || !items().length || !grid.clientWidth) return

    const columns = window.getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length
    const nextPageSize = columns * 2
    if (nextPageSize !== pageSize()) {
      onPageSizeChange(nextPageSize)
    }
  }

  const scheduleUpdate = () => {
    if (!enabled()) return
    window.clearTimeout(updateTimer)
    updateTimer = window.setTimeout(() => {
      if (animationFrame === undefined) {
        animationFrame = window.requestAnimationFrame(updatePageSize)
      }
    }, 120)
  }

  const observeGrid = (grid) => {
    resizeObserver?.disconnect()
    if (grid) resizeObserver?.observe(grid)
  }

  onMounted(() => {
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleUpdate)
      observeGrid(gridRef.value)
    }
    window.addEventListener('resize', scheduleUpdate)
    scheduleUpdate()
  })

  watch(gridRef, observeGrid)
  watch([enabled, items, pageSize], async () => {
    await nextTick()
    scheduleUpdate()
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    window.removeEventListener('resize', scheduleUpdate)
    window.clearTimeout(updateTimer)
    if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame)
  })
}
