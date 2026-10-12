import { PANEL_STORAGE_KEY, readPanelCollapsed } from '../ui/panel.js'

export const USER_STORAGE_KEY = 'gaia-user'

export const USER_DEFAULTS = {
  seed: 1,
  scale: 28,
  octaves: 5,
  persistence: 0.5,
  lacunarity: 2.1,
  amplitude: 20,
  warp: 0.35,
  waterLevel: 0.2,
  hydrometry: 0.5,
  pollution: 0.15,
  cloudAltitude: 24,
  cloudCoverage: 0.42,
  wireframe: false,
  muted: false,
  panelCollapsed: null,
  camera: null,
}

export const USER_LIMITS = {
  seed: { min: 0, max: 999_999_999, integer: true },
  scale: { min: 12, max: 80, integer: true },
  octaves: { min: 1, max: 8, integer: true },
  persistence: { min: 0.2, max: 0.85, integer: false },
  lacunarity: { min: 1.4, max: 3.2, integer: false },
  amplitude: { min: 4, max: 36, integer: true },
  warp: { min: 0, max: 0.8, integer: false },
  waterLevel: { min: 0, max: 0.6, integer: false },
  hydrometry: { min: 0, max: 1, integer: false },
  pollution: { min: 0, max: 1, integer: false },
  cloudAltitude: { min: 8, max: 48, integer: true },
  cloudCoverage: { min: 0, max: 1, integer: false },
}

/**
 * @param {unknown} value
 * @param {{ min: number, max: number, integer: boolean }} limits
 * @param {number} fallback
 * @returns {number}
 */
export function clampUserNumber(value, limits, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
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
  const nums = value.map(Number)
  if (nums.some((n) => !Number.isFinite(n))) return fallback
  return nums
}

/**
 * @typedef {{
 *   seed: number,
 *   scale: number,
 *   octaves: number,
 *   persistence: number,
 *   lacunarity: number,
 *   amplitude: number,
 *   warp: number,
 *   waterLevel: number,
 *   hydrometry: number,
 *   pollution: number,
 *   cloudAltitude: number,
 *   cloudCoverage: number,
 *   wireframe: boolean,
 *   muted: boolean,
 *   panelCollapsed: boolean | null,
 *   camera: { position: number[], target: number[] } | null,
 * }} UserData
 */

/**
 * @param {unknown} raw
 * @returns {UserData}
 */
export function sanitizeUserData(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  /** @type {Record<string, unknown>} */
  const rec = /** @type {Record<string, unknown>} */ (source)
  const cameraRaw =
    rec.camera && typeof rec.camera === 'object' && !Array.isArray(rec.camera)
      ? /** @type {Record<string, unknown>} */ (rec.camera)
      : null

  return {
    seed: clampUserNumber(rec.seed, USER_LIMITS.seed, USER_DEFAULTS.seed),
    scale: clampUserNumber(rec.scale, USER_LIMITS.scale, USER_DEFAULTS.scale),
    octaves: clampUserNumber(rec.octaves, USER_LIMITS.octaves, USER_DEFAULTS.octaves),
    persistence: clampUserNumber(rec.persistence, USER_LIMITS.persistence, USER_DEFAULTS.persistence),
    lacunarity: clampUserNumber(rec.lacunarity, USER_LIMITS.lacunarity, USER_DEFAULTS.lacunarity),
    amplitude: clampUserNumber(rec.amplitude, USER_LIMITS.amplitude, USER_DEFAULTS.amplitude),
    warp: clampUserNumber(rec.warp, USER_LIMITS.warp, USER_DEFAULTS.warp),
    waterLevel: clampUserNumber(rec.waterLevel, USER_LIMITS.waterLevel, USER_DEFAULTS.waterLevel),
    hydrometry: clampUserNumber(rec.hydrometry, USER_LIMITS.hydrometry, USER_DEFAULTS.hydrometry),
    pollution: clampUserNumber(rec.pollution, USER_LIMITS.pollution, USER_DEFAULTS.pollution),
    cloudAltitude: clampUserNumber(
      rec.cloudAltitude,
      USER_LIMITS.cloudAltitude,
      USER_DEFAULTS.cloudAltitude,
    ),
    cloudCoverage: clampUserNumber(
      rec.cloudCoverage,
      USER_LIMITS.cloudCoverage,
      USER_DEFAULTS.cloudCoverage,
    ),
    wireframe: rec.wireframe === true,
    muted: rec.muted === true,
    panelCollapsed:
      rec.panelCollapsed === true ? true : rec.panelCollapsed === false ? false : null,
    camera:
      cameraRaw == null
        ? null
        : {
            position: sanitizeVec3(cameraRaw.position, [62, 26, 52]) ?? [62, 26, 52],
            target: sanitizeVec3(cameraRaw.target, [0, 5, -6]) ?? [0, 5, -6],
          },
  }
}

/**
 * @param {Pick<Storage, 'getItem'>} storage
 * @param {number} viewportWidth
 * @returns {UserData}
 */
export function loadUserData(storage, viewportWidth) {
  const raw = storage.getItem(USER_STORAGE_KEY)
  let data = sanitizeUserData(USER_DEFAULTS)
  if (raw) {
    try {
      data = sanitizeUserData(JSON.parse(raw))
    } catch {
      data = sanitizeUserData(USER_DEFAULTS)
    }
  }
  if (data.panelCollapsed == null) {
    data.panelCollapsed = readPanelCollapsed(storage, viewportWidth)
  }
  return data
}

/**
 * @param {Pick<Storage, 'setItem'>} storage
 * @param {unknown} data
 */
export function saveUserData(storage, data) {
  storage.setItem(USER_STORAGE_KEY, JSON.stringify(sanitizeUserData(data)))
}

/**
 * @param {Pick<Storage, 'removeItem'>} storage
 */
export function clearUserData(storage) {
  storage.removeItem(USER_STORAGE_KEY)
  storage.removeItem(PANEL_STORAGE_KEY)
}
