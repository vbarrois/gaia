export const PANEL_STORAGE_KEY = 'gaia-panel-collapsed'
export const PANEL_MOBILE_BREAKPOINT = 720

/**
 * Collapsed by default on narrow viewports unless the user already chose a mode.
 * @param {Pick<Storage, 'getItem'>} storage
 * @param {number} viewportWidth
 * @param {number} [breakpoint]
 * @returns {boolean}
 */
export function readPanelCollapsed(storage, viewportWidth, breakpoint = PANEL_MOBILE_BREAKPOINT) {
  const stored = storage.getItem(PANEL_STORAGE_KEY)
  if (stored === '1') return true
  if (stored === '0') return false
  return viewportWidth < breakpoint
}

/**
 * @param {Pick<Storage, 'setItem'>} storage
 * @param {boolean} collapsed
 */
export function writePanelCollapsed(storage, collapsed) {
  storage.setItem(PANEL_STORAGE_KEY, collapsed ? '1' : '0')
}
