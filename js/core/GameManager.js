import { readPanelCollapsed } from '../ui/panel.js'
import { USER_DEFAULTS, clearUserData, loadUserData, saveUserData } from '../store/userStore.js'
import { TerrainManager } from '../terrain/TerrainManager.js'
import { UiManager } from '../ui/UiManager.js'
import { DEFAULT_CAMERA, SceneManager } from './SceneManager.js'
import { InputManager } from './InputManager.js'
import { SoundManager } from './SoundManager.js'

export class GameManager {
  /**
   * @param {HTMLElement} host
   */
  constructor(host) {
    this.storage = window.localStorage
    this.user = loadUserData(this.storage, window.innerWidth)
    this.scene = new SceneManager(host)
    this.terrain = new TerrainManager()
    this.sound = new SoundManager()
    this.ui = new UiManager({
      onRebuild: () => this.rebuild(),
      onRandomSeed: () => this.randomSeed(),
      onReset: () => this.reset(),
      onTogglePanel: () => this.togglePanel(),
      onToggleMute: () => this.toggleMute(),
    })
    this.input = new InputManager((action) => this.handleAction(action))
    this.frame = 0
    this.running = false

    this.scene.add(this.terrain.mesh)
    this.scene.add(this.terrain.water)
    this.scene.add(this.terrain.clouds)
    this.scene.controls.addEventListener('end', () => this.persist())
    this.scene.renderer.domElement.addEventListener('pointerdown', () => this.sound.unlock())
  }

  start() {
    this.sound.setMuted(Boolean(this.user.muted))
    this.ui.applyUserData(this.user)
    this.scene.applyCamera(this.user.camera)
    this.ui.bind()
    this.input.bind()
    this.rebuild()
    this.running = true
    this.tick()
  }

  /**
   * @param {string} [reason]
   */
  rebuild(reason) {
    const options = this.ui.readWorldOptions()
    const stats = this.terrain.rebuild(options)
    this.ui.setStats(stats)
    this.persist()
    if (reason === 'generate') this.sound.play('generate')
    if (reason === 'ui') this.sound.play('ui')
  }

  randomSeed() {
    this.ui.setRandomSeed()
    this.rebuild('generate')
  }

  togglePanel() {
    this.ui.toggleCollapsed()
    this.sound.play('panel')
    this.persist()
  }

  toggleMute() {
    this.user.muted = !this.sound.muted
    this.sound.setMuted(this.user.muted)
    this.ui.setMuted(this.user.muted)
    if (!this.user.muted) this.sound.play('mute')
    this.persist()
  }

  reset() {
    clearUserData(this.storage)
    const collapsed = readPanelCollapsed(this.storage, window.innerWidth)
    this.user = {
      ...USER_DEFAULTS,
      panelCollapsed: collapsed,
      camera: DEFAULT_CAMERA,
      muted: false,
    }
    this.sound.setMuted(false)
    this.ui.applyUserData(this.user)
    this.scene.resetCamera()
    this.rebuild('generate')
  }

  /**
   * @param {string} action
   */
  handleAction(action) {
    if (action === 'randomSeed') this.randomSeed()
    if (action === 'toggleWireframe') {
      this.ui.toggleWireframe()
      this.rebuild('ui')
    }
    if (action === 'togglePanel') this.togglePanel()
    if (action === 'toggleMute') this.toggleMute()
    if (action === 'reset') this.reset()
  }

  persist() {
    const options = this.ui.readWorldOptions()
    saveUserData(this.storage, {
      ...options,
      muted: this.sound.muted,
      panelCollapsed: this.ui.isCollapsed(),
      camera: this.scene.getCameraState(),
    })
  }

  tick() {
    if (!this.running) return
    this.frame += 1
    this.terrain.update(this.frame)
    this.scene.render()
    requestAnimationFrame(() => this.tick())
  }
}
