import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export const DEFAULT_CAMERA = {
  position: [140, 120, 155],
  target: [0, 1, 0],
}

export class SceneManager {
  /**
   * @param {HTMLElement} host
   */
  constructor(host) {
    this.host = host
    this.scene = new THREE.Scene()
    // Gaya: ciel / brouillard #bdcfc8 (le fond CSS du viewport reste #b9c9c4).
    this.scene.background = new THREE.Color(0xbdcfc8)
    this.scene.fog = new THREE.Fog(0xbdcfc8, 340, 610)

    this.camera = new THREE.PerspectiveCamera(39, 1, 0.5, 1000)
    this.camera.position.fromArray(DEFAULT_CAMERA.position)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.08
    this.renderer.domElement.setAttribute('aria-label', 'Terrain Gaïa en trois dimensions')
    this.renderer.domElement.tabIndex = 0
    // Keep HUD overlays above the canvas
    host.prepend(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.09
    this.controls.target.fromArray(DEFAULT_CAMERA.target)
    this.controls.maxPolarAngle = Math.PI * 0.47
    this.controls.minPolarAngle = 0.035
    this.controls.minDistance = 42
    this.controls.maxDistance = 470
    this.controls.screenSpacePanning = false
    this.controls.rotateSpeed = 0.64
    this.controls.zoomSpeed = 0.85
    this.controls.panSpeed = 0.8

    this.scene.add(new THREE.HemisphereLight(0xeaf5df, 0x6a7463, 2.2))
    const sun = new THREE.DirectionalLight(0xfff0cc, 2.5)
    sun.position.set(-65, 110, 65)
    this.scene.add(sun)

    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()

    this.boundResize = () => this.resize()
    window.addEventListener('resize', this.boundResize)
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(host)
    this.resize()
  }

  /**
   * @param {THREE.Object3D} object
   */
  add(object) {
    this.scene.add(object)
  }

  /**
   * @param {{ position: number[], target: number[] } | null | undefined} camera
   */
  applyCamera(camera) {
    if (!camera?.position || !camera?.target) return
    this.camera.position.fromArray(camera.position)
    this.controls.target.fromArray(camera.target)
    this.controls.update()
  }

  resetCamera(top = false) {
    const aspect = this.camera.aspect || 1
    const d = 247 * Math.max(1, 0.92 / aspect)
    this.controls.target.set(0, 1, 0)
    if (top) this.camera.position.set(0, d, 0.1)
    else this.camera.position.set(d * 0.56, d * 0.53, d * 0.635)
    this.controls.update()
  }

  getCameraState() {
    return {
      position: this.camera.position.toArray(),
      target: this.controls.target.toArray(),
    }
  }

  /**
   * @param {PointerEvent} event
   * @param {THREE.Object3D} mesh
   * @returns {{ x: number, y: number, z: number } | null}
   */
  pickTerrain(event, mesh) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObject(mesh, false)
    if (!hits.length) return null
    const p = hits[0].point
    return { x: p.x, y: p.y, z: p.z }
  }

  resize() {
    const width = Math.max(1, Math.round(this.host.clientWidth))
    const height = Math.max(1, Math.round(this.host.clientHeight))
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  render() {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
}
