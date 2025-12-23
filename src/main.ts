import * as THREE from 'three'
import './style.css'

type KeyState = Record<string, boolean>

const canvas = document.querySelector<HTMLCanvasElement>('#game')
const fpsLabel = document.querySelector<HTMLDivElement>('#fps')
const instructions = document.querySelector<HTMLDivElement>('#instructions')

if (!canvas || !fpsLabel || !instructions) {
  throw new Error('Missing required DOM elements')
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)

const scene = new THREE.Scene()
scene.background = new THREE.Color('#0a0f1f')

const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 200)

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(8, 12, 6)
scene.add(directionalLight)

const floorGeometry = new THREE.PlaneGeometry(50, 50)
const floorMaterial = new THREE.MeshStandardMaterial({ color: '#1f2937' })
const floor = new THREE.Mesh(floorGeometry, floorMaterial)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

const pillarGeometry = new THREE.CylinderGeometry(1.2, 1.2, 6, 16)
const pillarMaterial = new THREE.MeshStandardMaterial({ color: '#334155' })
const pillarPositions = [
  new THREE.Vector3(-8, 3, -6),
  new THREE.Vector3(8, 3, -6),
  new THREE.Vector3(-8, 3, 6),
  new THREE.Vector3(8, 3, 6)
]

pillarPositions.forEach((pos) => {
  const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial)
  pillar.position.copy(pos)
  scene.add(pillar)
})

const rampGeometry = new THREE.BoxGeometry(6, 0.5, 8)
const rampMaterial = new THREE.MeshStandardMaterial({ color: '#4b5563' })
const ramp = new THREE.Mesh(rampGeometry, rampMaterial)
ramp.position.set(0, 1.5, -12)
ramp.rotation.x = -Math.PI / 10
scene.add(ramp)

const player = {
  position: new THREE.Vector3(0, 1.6, 10),
  velocity: new THREE.Vector3(),
  yaw: 0,
  pitch: 0
}

const keyState: KeyState = {}
let isPointerLocked = false
let fpsVisible = false

const movementConfig = {
  speed: 8,
  friction: 10,
  gravity: 20,
  jumpVelocity: 8
}

let onGround = true

function updateSize() {
  const { innerWidth, innerHeight } = window
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
}

updateSize()
window.addEventListener('resize', updateSize)

document.addEventListener('click', () => {
  if (!isPointerLocked) {
    canvas.requestPointerLock()
  }
})

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = document.pointerLockElement === canvas
  instructions.textContent = isPointerLocked
    ? 'WASD to move · Mouse to look · Esc to unlock · F to toggle FPS'
    : 'Click to lock pointer · WASD to move · F to toggle FPS'
})

document.addEventListener('mousemove', (event) => {
  if (!isPointerLocked) return
  const sensitivity = 0.002
  player.yaw -= event.movementX * sensitivity
  player.pitch -= event.movementY * sensitivity
  const maxPitch = Math.PI / 2 - 0.01
  player.pitch = Math.max(-maxPitch, Math.min(maxPitch, player.pitch))
})

document.addEventListener('keydown', (event) => {
  keyState[event.code] = true
  if (event.code === 'KeyF') {
    fpsVisible = !fpsVisible
    fpsLabel.classList.toggle('hidden', !fpsVisible)
  }
  if (event.code === 'Space' && onGround) {
    player.velocity.y = movementConfig.jumpVelocity
    onGround = false
  }
})

document.addEventListener('keyup', (event) => {
  keyState[event.code] = false
})

function updateMovement(delta: number) {
  const direction = new THREE.Vector3(
    Number(keyState.KeyD) - Number(keyState.KeyA),
    0,
    Number(keyState.KeyS) - Number(keyState.KeyW)
  )

  if (direction.lengthSq() > 0) {
    direction.normalize()
    const yawMatrix = new THREE.Matrix4().makeRotationY(player.yaw)
    direction.applyMatrix4(yawMatrix)
    player.velocity.x += direction.x * movementConfig.speed * delta
    player.velocity.z += direction.z * movementConfig.speed * delta
  }

  const frictionFactor = Math.exp(-movementConfig.friction * delta)
  player.velocity.x *= frictionFactor
  player.velocity.z *= frictionFactor

  player.velocity.y -= movementConfig.gravity * delta

  player.position.addScaledVector(player.velocity, delta)

  if (player.position.y <= 1.6) {
    player.position.y = 1.6
    player.velocity.y = 0
    onGround = true
  }
}

let lastTime = performance.now()
let fpsFrameCount = 0
let fpsTimer = 0

function animate(now = performance.now()) {
  const delta = (now - lastTime) / 1000
  lastTime = now

  updateMovement(delta)

  camera.position.copy(player.position)
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ')

  renderer.render(scene, camera)

  fpsFrameCount += 1
  fpsTimer += delta
  if (fpsTimer >= 0.5) {
    const fps = Math.round(fpsFrameCount / fpsTimer)
    fpsLabel.textContent = `FPS: ${fps}`
    fpsTimer = 0
    fpsFrameCount = 0
  }

  requestAnimationFrame(animate)
}

animate()
