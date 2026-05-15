import './style.css'
import * as THREE from 'three'

const app = document.querySelector('#app')

app.innerHTML = `
  <div class="hud">
    <h1>Max: La Menace</h1>
    <p>Click to enter. Move with WASD / Arrow keys. Hold Shift to sprint.</p>
    <p class="status" aria-live="polite">Survive the darkness.</p>
  </div>
  <div class="pulse" aria-hidden="true"></div>
`

const statusEl = app.querySelector('.status')
const pulseEl = app.querySelector('.pulse')

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x040307)
scene.fog = new THREE.Fog(0x040307, 8, 26)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 1.6, 8)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
app.append(renderer.domElement)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x0c0d12, roughness: 0.95, metalness: 0.05 }),
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x111119, roughness: 0.9 })
const wallGeometry = new THREE.BoxGeometry(30, 6, 0.8)

const northWall = new THREE.Mesh(wallGeometry, wallMaterial)
northWall.position.set(0, 3, -15)
scene.add(northWall)

const southWall = northWall.clone()
southWall.position.z = 15
scene.add(southWall)

const sideWallGeometry = new THREE.BoxGeometry(0.8, 6, 30)
const eastWall = new THREE.Mesh(sideWallGeometry, wallMaterial)
eastWall.position.set(15, 3, 0)
scene.add(eastWall)

const westWall = eastWall.clone()
westWall.position.x = -15
scene.add(westWall)

const ambientLight = new THREE.AmbientLight(0x28304f, 0.24)
scene.add(ambientLight)

const moonLight = new THREE.DirectionalLight(0x8090ff, 0.45)
moonLight.position.set(-6, 12, 4)
moonLight.castShadow = true
moonLight.shadow.mapSize.set(1024, 1024)
scene.add(moonLight)

const flickerLight = new THREE.PointLight(0x8fb2ff, 0.9, 16)
flickerLight.position.set(0, 2.8, 0)
scene.add(flickerLight)

const graveGeometry = new THREE.BoxGeometry(0.5, 1.3, 0.18)
const graveMaterial = new THREE.MeshStandardMaterial({ color: 0x30363e, roughness: 0.95 })
for (let i = 0; i < 32; i += 1) {
  const grave = new THREE.Mesh(graveGeometry, graveMaterial)
  const angle = Math.random() * Math.PI * 2
  const radius = 4 + Math.random() * 9
  grave.position.set(Math.cos(angle) * radius, 0.65, Math.sin(angle) * radius)
  grave.rotation.y = (Math.random() - 0.5) * 0.6
  grave.castShadow = true
  grave.receiveShadow = true
  scene.add(grave)
}

const menace = new THREE.Mesh(
  new THREE.SphereGeometry(0.55, 24, 24),
  new THREE.MeshStandardMaterial({ color: 0x1d0517, emissive: 0x560022, emissiveIntensity: 0.8, roughness: 0.7 }),
)
menace.position.set(0, 0.75, -9)
menace.castShadow = true
scene.add(menace)

const menaceLight = new THREE.PointLight(0xa0134f, 0.7, 5)
menace.add(menaceLight)

const keyState = new Set()
const look = { yaw: Math.PI, pitch: 0 }
const moveVector = new THREE.Vector3()
const nextPosition = new THREE.Vector3()
const menaceTarget = new THREE.Vector3()
const clock = new THREE.Clock()

let isLocked = false
let isCaught = false

const onResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

window.addEventListener('resize', onResize)

window.addEventListener('keydown', (event) => {
  keyState.add(event.code)
})

window.addEventListener('keyup', (event) => {
  keyState.delete(event.code)
})

app.addEventListener('click', async () => {
  if (!document.pointerLockElement) {
    await app.requestPointerLock({ unadjustedMovement: true }).catch(() => app.requestPointerLock())
  }
})

document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === app
  statusEl.textContent = isLocked
    ? 'The menace can hear you...'
    : 'Click to enter. Move with WASD / Arrow keys.'
})

window.addEventListener('mousemove', (event) => {
  if (!isLocked) {
    return
  }

  look.yaw -= event.movementX * 0.0024
  look.pitch -= event.movementY * 0.002
  look.pitch = THREE.MathUtils.clamp(look.pitch, -1.1, 1.1)
})

const respawn = () => {
  camera.position.set(0, 1.6, 8)
  menace.position.set((Math.random() - 0.5) * 8, 0.75, -9)
  isCaught = false
  statusEl.textContent = 'You escaped... for now.'
}

const updatePlayer = (deltaTime) => {
  moveVector.set(0, 0, 0)

  if (keyState.has('KeyW') || keyState.has('ArrowUp')) moveVector.z -= 1
  if (keyState.has('KeyS') || keyState.has('ArrowDown')) moveVector.z += 1
  if (keyState.has('KeyA') || keyState.has('ArrowLeft')) moveVector.x -= 1
  if (keyState.has('KeyD') || keyState.has('ArrowRight')) moveVector.x += 1

  if (moveVector.lengthSq() > 0) {
    moveVector.normalize()
    moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), look.yaw)

    const speed = keyState.has('ShiftLeft') || keyState.has('ShiftRight') ? 5.2 : 3.1
    nextPosition.copy(camera.position).addScaledVector(moveVector, speed * deltaTime)
    nextPosition.x = THREE.MathUtils.clamp(nextPosition.x, -14, 14)
    nextPosition.z = THREE.MathUtils.clamp(nextPosition.z, -14, 14)
    camera.position.copy(nextPosition)
  }

  camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ')
}

const updateMenace = (elapsedTime, deltaTime) => {
  menaceTarget.set(camera.position.x, menace.position.y, camera.position.z)
  menace.position.lerp(menaceTarget, deltaTime * 0.28)
  menace.position.y = 0.75 + Math.sin(elapsedTime * 4) * 0.12

  const distance = menace.position.distanceTo(camera.position)
  const pulse = THREE.MathUtils.clamp(1 - distance / 10, 0, 1)
  pulseEl.style.opacity = String(pulse * 0.85)

  if (distance < 1.25 && !isCaught) {
    isCaught = true
    statusEl.textContent = 'The menace found you. Reawakening...'

    window.setTimeout(respawn, 1800)
  }
}

const animate = () => {
  const deltaTime = clock.getDelta()
  const elapsedTime = clock.elapsedTime

  flickerLight.intensity = 0.65 + Math.sin(elapsedTime * 11) * 0.18 + Math.random() * 0.12

  if (!isCaught) {
    updatePlayer(deltaTime)
    updateMenace(elapsedTime, deltaTime)
  }

  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

animate()
