import { PANEL_STORAGE_KEY, readPanelCollapsed } from '../ui/panel.js'
import { DEFAULTS, sanitize } from '../world/config.js'

export const USER_STORAGE_KEY = 'gaia-user'

export const USER_DEFAULTS = {
  ...DEFAULTS,
  muted: false,
  panelCollapsed: null,
  camera: null,
  layer: 'natural',
}

/** Limits used by tests / UI clamps (Gaya world params). */
export const USER_LIMITS = {
  seed: { min: 1, max: 999999, integer: true },
  amplitude: { min: 0, max: 48, integer: true },
  scale: { min: 18, max: 120, integer: true },
  octaves: { min: 1, max: 7, integer: true },
  persistence: { min: 0.2, max: 0.8, integer: false },
  water: { min: -14, max: 22, integer: true },
  falloff: { min: 0, max: 100, integer: true },
  warp: { min: 0, max: 35, integer: true },
  resolution: { min: 32, max: 128, integer: true },
  pollution: { min: 0, max: 100, integer: true },
}

/**
 * @param {unknown} value
 * @param {{ min: number, max: number, integer: boolean }} limits
 * @param {number} fallback
 */
export function clampUserNumber(value, limits, fallback) {
  const n = +value
  if (!(n === n) || n === Infinity || n === -Infinity) return fallback
  const clamped = Math.min(limits.max, Math.max(limits.min, n))
  return limits.integer ? Math.trunc(clamped) : clamped
}

/**
 * @param {unknown} value
 * @param {number[] | null} fallback
 * @returns {number[] | null}
 */
export function sanitizeVec3(value, fallback = null) {
  if (!Array.isArray(value) || value.length !== 3) return fallback
  const nums = value.map((v) => +v)
  if (nums.some((n) => !Number.isFinite(n))) return fallback
  return nums
}

/**
 * @typedef {ReturnType<typeof sanitizeUserData>} UserData
 */

/**
 * @param {unknown} raw
 */
export function sanitizeUserData(raw) {
  const input = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
  const world = sanitize({
    seed: input.seed,
    amplitude: input.amplitude,
    scale: input.scale,
    octaves: input.octaves,
    persistence: input.persistence,
    water: input.water,
    falloff: input.falloff,
    warp: input.warp,
    resolution: input.resolution,
    pollution: input.pollution,
    wireframe: input.wireframe,
  })
  const cameraRaw =
    input.camera && typeof input.camera === 'object'
      ? /** @type {Record<string, unknown>} */ (input.camera)
      : null
  const position = cameraRaw ? sanitizeVec3(cameraRaw.position, null) : null
  const target = cameraRaw ? sanitizeVec3(cameraRaw.target, null) : null
  return {
    ...world,
    muted: !!input.muted,
    panelCollapsed: typeof input.panelCollapsed === 'boolean' ? input.panelCollapsed : null,
    camera: position && target ? { position, target } : null,
    layer: typeof input.layer === 'string' ? input.layer : 'natural',
  }
}

/**
 * @param {Storage} storage
 * @param {number} [viewportWidth]
 */
export function loadUserData(storage, viewportWidth = 1024) {
  const fallbackCollapsed = () => {
    try {
      return readPanelCollapsed(storage, viewportWidth)
    } catch {
      return viewportWidth < 720
    }
  }
  try {
    const raw = storage.getItem(USER_STORAGE_KEY)
    if (!raw) {
      return {
        ...sanitizeUserData({}),
        panelCollapsed: fallbackCollapsed(),
      }
    }
    const data = sanitizeUserData(JSON.parse(raw))
    if (data.panelCollapsed === null) {
      data.panelCollapsed = fallbackCollapsed()
    }
    return data
  } catch {
    return {
      ...sanitizeUserData({}),
      panelCollapsed: fallbackCollapsed(),
    }
  }
}

/**
 * Persist world config + UI prefs only (never game progress).
 * @param {Storage} storage
 * @param {Record<string, unknown>} data
 */
export function saveUserData(storage, data) {
  const sanitized = sanitizeUserData(data)
  try {
    storage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        ...sanitize(sanitized),
        muted: sanitized.muted,
        panelCollapsed: sanitized.panelCollapsed,
        camera: sanitized.camera,
        layer: sanitized.layer,
      }),
    )
    if (typeof sanitized.panelCollapsed === 'boolean') {
      storage.setItem(PANEL_STORAGE_KEY, sanitized.panelCollapsed ? '1' : '0')
    }
  } catch {
    /* private / blocked storage */
  }
}

/** @param {Storage} storage */
export function clearUserData(storage) {
  try {
    storage.removeItem(USER_STORAGE_KEY)
    storage.removeItem(PANEL_STORAGE_KEY)
  } catch {
    /* private / blocked storage */
  }
}
