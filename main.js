import * as THREE from 'three';

// Initialize Telegram Game
if (window.TelegramGameProxy) {
  TelegramGameProxy.initParams();
}

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create player cube
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Add lights
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1);
scene.add(light);
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// Position camera
camera.position.z = 5;

// Game state
let score = 0;
const speed = 0.1;
const gameState = {
  left: false,
  right: false,
  up: false,
  down: false
};

// Handle keyboard input
window.addEventListener('keydown', (e) => {
  switch(e.key) {
    case 'ArrowLeft': gameState.left = true; break;
    case 'ArrowRight': gameState.right = true; break;
    case 'ArrowUp': gameState.up = true; break;
    case 'ArrowDown': gameState.down = true; break;
  }
});

window.addEventListener('keyup', (e) => {
  switch(e.key) {
    case 'ArrowLeft': gameState.left = false; break;
    case 'ArrowRight': gameState.right = false; break;
    case 'ArrowUp': gameState.up = false; break;
    case 'ArrowDown': gameState.down = false; break;
  }
});

// Handle touch input
let touchStartX = 0;
let touchStartY = 0;
const touchThreshold = 30; // минимальное расстояние для определения свайпа

window.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

window.addEventListener('touchmove', (e) => {
  e.preventDefault(); // Предотвращаем прокрутку страницы
  const touchX = e.touches[0].clientX;
  const touchY = e.touches[0].clientY;
  
  const diffX = touchX - touchStartX;
  const diffY = touchY - touchStartY;
  
  // Сбрасываем все состояния
  gameState.left = false;
  gameState.right = false;
  gameState.up = false;
  gameState.down = false;
  
  // Определяем направление с наибольшим отклонением
  if (Math.abs(diffX) > Math.abs(diffY)) {
    if (Math.abs(diffX) > touchThreshold) {
      if (diffX > 0) {
        gameState.right = true;
      } else {
        gameState.left = true;
      }
    }
  } else {
    if (Math.abs(diffY) > touchThreshold) {
      if (diffY > 0) {
        gameState.down = true;
      } else {
        gameState.up = true;
      }
    }
  }
});

window.addEventListener('touchend', () => {
  gameState.left = false;
  gameState.right = false;
  gameState.up = false;
  gameState.down = false;
});

// Handle window resize
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

// Game loop
function animate() {
  requestAnimationFrame(animate);

  // Update cube position based on input
  if (gameState.left) cube.position.x -= speed;
  if (gameState.right) cube.position.x += speed;
  if (gameState.up) cube.position.y += speed;
  if (gameState.down) cube.position.y -= speed;

  // Rotate cube
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  // Update score
  score += 0.1;
  if (window.TelegramGameProxy) {
    TelegramGameProxy.setScore(Math.floor(score));
  }

  renderer.render(scene, camera);
}

animate();
