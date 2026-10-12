import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export const DEFAULT_CAMERA = {
  position: [62, 26, 52],
  target: [0, 5, -6],
}

export class SceneManager {
  /**
   * @param {HTMLElement} host
   */
  constructor(host) {
    this.host = host
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a1620)
    this.scene.fog = new THREE.Fog(0x0a1620, 180, 420)

    this.camera = new THREE.PerspectiveCamera(50, host.clientWidth / host.clientHeight, 0.1, 600)
    this.camera.position.fromArray(DEFAULT_CAMERA.position)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(host.clientWidth, host.clientHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.25
    host.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.fromArray(DEFAULT_CAMERA.target)
    this.controls.maxPolarAngle = Math.PI * 0.46
    this.controls.minDistance = 18
    this.controls.maxDistance = 200

    this.scene.add(new THREE.HemisphereLight(0xd7ebff, 0x4a3724, 1.05))
    const sun = new THREE.DirectionalLight(0xfff3d0, 1.85)
    sun.position.set(55, 90, 28)
    this.scene.add(sun)
    const fill = new THREE.DirectionalLight(0x7ea8c9, 0.45)
    fill.position.set(-40, 25, -50)
    this.scene.add(fill)
    this.scene.add(new THREE.AmbientLight(0x243830, 0.35))

    this.boundResize = () => this.resize()
    window.addEventListener('resize', this.boundResize)
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
    if (!camera) return
    this.camera.position.fromArray(camera.position)
    this.controls.target.fromArray(camera.target)
    this.controls.update()
  }

  resetCamera() {
    this.applyCamera(DEFAULT_CAMERA)
  }

  getCameraState() {
    return {
      position: this.camera.position.toArray(),
      target: this.controls.target.toArray(),
    }
  }

  resize() {
    const width = this.host.clientWidth
    const height = this.host.clientHeight
    this.camera.aspect = width / Math.max(height, 1)
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  render() {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
}
