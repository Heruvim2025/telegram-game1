import * as THREE from 'three';
import { backgroundMusic } from './assets/sounds/background.js';
import { soundEffects } from './assets/sounds/effects.js';
import { characterTextures } from './assets/textures/characters.js';
import { environmentTextures } from './assets/textures/environment.js';

// Initialize Telegram Game
if (window.TelegramGameProxy) {
  TelegramGameProxy.initParams();
}

// Audio setup
const audioListener = new THREE.AudioListener();
const gameAudio = {
  collect: new THREE.Audio(audioListener),
  crash: new THREE.Audio(audioListener),
  powerup: new THREE.Audio(audioListener),
};

const bgMusic = new THREE.Audio(audioListener);
const audioLoader = new THREE.AudioLoader();

// Load audio files from base64
async function loadAudio(audioElement, base64Url) {
  try {
    const response = await fetch(base64Url);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    audioElement.src = url;
    return new Promise((resolve) => {
      audioElement.oncanplaythrough = () => resolve();
    });
  } catch (error) {
    console.warn('Error loading audio:', error);
    return Promise.resolve(); // Continue even if audio fails
  }
}

// Create HTML audio elements
const audioElements = {
  collect: new Audio(),
  crash: new Audio(),
  powerup: new Audio(),
  background: new Audio()
};

// Load sound effects
Promise.all([
  ...Object.entries(soundEffects).map(([key, base64]) => 
    loadAudio(audioElements[key], base64)
  ),
  loadAudio(audioElements.background, backgroundMusic)
]).then(() => {
  // Setup background music
  audioElements.background.loop = true;
  audioElements.background.volume = 0.5;
  
  // Replace Three.js audio with HTML Audio API
  gameAudio.collect.play = () => audioElements.collect.play();
  gameAudio.crash.play = () => audioElements.crash.play();
  gameAudio.powerup.play = () => audioElements.powerup.play();
  bgMusic.play = () => audioElements.background.play();
  bgMusic.stop = () => {
    audioElements.background.pause();
    audioElements.background.currentTime = 0;
  };
});

// Game state
let gameActive = false;
let currentCharacter = 'crocodilo';
let score = 0;
let baseSpeed = 0.3;
let currentSpeed = baseSpeed;
let obstacles = [];
let bonuses = [];
let tunnelSegments = [];
let playerVelocity = new THREE.Vector3();
let gameStartTime = 0;

// Scene setup
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 10, 50);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x444444);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Character models
const characters = {
  crocodilo: createCharacter('crocodilo', 0x00ff00),
  capibara: createCharacter('capibara', 0x8B4513),
  gatto: createCharacter('gatto', 0xFFA500),
};

function createCharacter(type) {
  const geometry = new THREE.Group();
  
  // Load character texture
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(characterTextures[type].body);
  const material = new THREE.MeshPhongMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  });
  
  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.5, 1),
    material
  );
  
  // Head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    material
  );
  head.position.z = 0.7;
  head.position.y = 0.1;
  
  geometry.add(body);
  geometry.add(head);
  
  // Add character-specific features
  switch (type) {
    case 'crocodilo':
      const snout = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.2, 0.5),
        new THREE.MeshPhongMaterial({ color: color })
      );
      snout.position.z = 0.9;
      geometry.add(snout);
      break;
    case 'capibara':
      const ears = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.2, 0.2),
        new THREE.MeshPhongMaterial({ color: color })
      );
      ears.position.y = 0.3;
      geometry.add(ears);
      break;
    case 'gatto':
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.4),
        new THREE.MeshPhongMaterial({ color: color })
      );
      tail.position.z = -0.7;
      tail.position.y = 0.1;
      geometry.add(tail);
      break;
  }
  
  return geometry;
}

// Create tunnel
const tunnelRadius = 5;
const tunnelLength = 50;
const tunnelSegmentCount = 20;

function createTunnelSegment() {
  const geometry = new THREE.CylinderGeometry(
    tunnelRadius, tunnelRadius,
    tunnelLength / tunnelSegmentCount,
    16, 1, true
  );
  
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(environmentTextures.tunnel);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  
  const material = new THREE.MeshPhongMaterial({
    map: texture,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.8
  });
  
  const segment = new THREE.Mesh(geometry, material);
  return segment;
}

// Initialize tunnel
for (let i = 0; i < tunnelSegmentCount; i++) {
  const segment = createTunnelSegment();
  segment.position.z = -(tunnelLength / tunnelSegmentCount) * i;
  scene.add(segment);
  tunnelSegments.push(segment);
}

// Create obstacles
function createObstacle() {
  const textureLoader = new THREE.TextureLoader();
  const types = [
    { 
      geo: new THREE.SphereGeometry(0.5), 
      texture: textureLoader.load(environmentTextures.obstacles.mozzarella),
      name: 'mozzarella' 
    },
    { 
      geo: new THREE.CylinderGeometry(0.5, 0, 0.5), 
      texture: textureLoader.load(environmentTextures.obstacles.pizza),
      name: 'pizza' 
    },
    { 
      geo: new THREE.BoxGeometry(0.7, 1.2, 0.2), 
      texture: textureLoader.load(environmentTextures.obstacles.violin),
      name: 'violin' 
    }
  ];
  
  const type = types[Math.floor(Math.random() * types.length)];
  const obstacle = new THREE.Mesh(
    type.geo,
    new THREE.MeshPhongMaterial({ 
      map: type.texture,
      transparent: true,
      side: THREE.DoubleSide
    })
  );
  
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * (tunnelRadius - 1);
  
  obstacle.position.set(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
    -tunnelLength
  );
  
  obstacle.userData.type = type.name;
  scene.add(obstacle);
  obstacles.push(obstacle);
}

// Create bonus items
function createBonus() {
  const bonus = new THREE.Mesh(
    new THREE.TetrahedronGeometry(0.3),
    new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0xffff00 })
  );
  
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * (tunnelRadius - 1);
  
  bonus.position.set(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
    -tunnelLength
  );
  
  bonus.userData.isBonus = true;
  scene.add(bonus);
  bonuses.push(bonus);
}

// Player setup
let player = characters[currentCharacter];
scene.add(player);
camera.position.z = 5;

// Game controls
const gameState = {
  left: false,
  right: false,
  up: false,
  down: false,
  boost: false
};

function handleInput(e, isKeyDown) {
  if (!gameActive) return;
  
  switch(e.key) {
    case 'ArrowLeft': gameState.left = isKeyDown; break;
    case 'ArrowRight': gameState.right = isKeyDown; break;
    case 'ArrowUp': gameState.up = isKeyDown; break;
    case 'ArrowDown': gameState.down = isKeyDown; break;
    case 'Shift': gameState.boost = isKeyDown; break;
  }
}

window.addEventListener('keydown', e => handleInput(e, true));
window.addEventListener('keyup', e => handleInput(e, false));

// Touch controls
let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', (e) => {
  if (!gameActive) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

window.addEventListener('touchmove', (e) => {
  if (!gameActive) return;
  const touchX = e.touches[0].clientX;
  const touchY = e.touches[0].clientY;
  
  gameState.left = touchX < touchStartX - 30;
  gameState.right = touchX > touchStartX + 30;
  gameState.up = touchY < touchStartY - 30;
  gameState.down = touchY > touchStartY + 30;
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

// Menu handling
const menuElement = document.getElementById('menu');
const gameOverElement = document.getElementById('gameOver');
const characterSelectElement = document.getElementById('characterSelect');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('finalScore');

document.getElementById('playButton').addEventListener('click', startGame);
document.getElementById('restartButton').addEventListener('click', startGame);
document.getElementById('characterButton').addEventListener('click', showCharacterSelect);
document.getElementById('backButton').addEventListener('click', () => {
  characterSelectElement.style.display = 'none';
  menuElement.style.display = 'block';
});

document.querySelectorAll('.character-option').forEach(option => {
  option.addEventListener('click', () => {
    currentCharacter = option.dataset.character;
    scene.remove(player);
    player = characters[currentCharacter];
    scene.add(player);
    characterSelectElement.style.display = 'none';
    menuElement.style.display = 'block';
  });
});

function showCharacterSelect() {
  menuElement.style.display = 'none';
  characterSelectElement.style.display = 'block';
}

function startGame() {
  menuElement.style.display = 'none';
  gameOverElement.style.display = 'none';
  scoreElement.style.display = 'block';
  
  // Reset game state
  score = 0;
  currentSpeed = baseSpeed;
  gameStartTime = Date.now();
  gameActive = true;
  
  // Reset player position
  player.position.set(0, 0, 0);
  playerVelocity.set(0, 0, 0);
  
  // Clear obstacles and bonuses
  obstacles.forEach(obs => scene.remove(obs));
  bonuses.forEach(bonus => scene.remove(bonus));
  obstacles = [];
  bonuses = [];
  
  // Start background music
  if (bgMusic.isPlaying) bgMusic.stop();
  bgMusic.play();
}

function gameOver() {
  gameActive = false;
  bgMusic.stop();
  soundEffects.crash.play();
  
  gameOverElement.style.display = 'block';
  finalScoreElement.textContent = Math.floor(score);
  
  if (window.TelegramGameProxy) {
    TelegramGameProxy.setScore(Math.floor(score));
  }
}

function checkCollisions() {
  const playerBox = new THREE.Box3().setFromObject(player);
  
  // Check obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];
    const obstacleBox = new THREE.Box3().setFromObject(obstacle);
    
    if (playerBox.intersectsBox(obstacleBox)) {
      gameOver();
      return;
    }
  }
  
  // Check bonuses
  for (let i = bonuses.length - 1; i >= 0; i--) {
    const bonus = bonuses[i];
    const bonusBox = new THREE.Box3().setFromObject(bonus);
    
    if (playerBox.intersectsBox(bonusBox)) {
      scene.remove(bonus);
      bonuses.splice(i, 1);
      score += 100;
      soundEffects.collect.play();
    }
  }
}

// Game loop
function animate() {
  requestAnimationFrame(animate);
  
  if (gameActive) {
    // Update player position
    if (gameState.left) playerVelocity.x -= 0.01;
    if (gameState.right) playerVelocity.x += 0.01;
    if (gameState.up) playerVelocity.y += 0.01;
    if (gameState.down) playerVelocity.y -= 0.01;
    
    // Apply drag
    playerVelocity.multiplyScalar(0.95);
    
    // Update player position
    player.position.add(playerVelocity);
    
    // Constrain player to tunnel
    const maxRadius = tunnelRadius - 1;
    const playerRadius = Math.sqrt(
      player.position.x * player.position.x +
      player.position.y * player.position.y
    );
    
    if (playerRadius > maxRadius) {
      const angle = Math.atan2(player.position.y, player.position.x);
      player.position.x = Math.cos(angle) * maxRadius;
      player.position.y = Math.sin(angle) * maxRadius;
    }
    
    // Move tunnel segments
    tunnelSegments.forEach(segment => {
      segment.position.z += currentSpeed;
      if (segment.position.z > 5) {
        segment.position.z -= tunnelLength;
      }
    });
    
    // Move and remove obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i];
      obstacle.position.z += currentSpeed;
      
      if (obstacle.position.z > 5) {
        scene.remove(obstacle);
        obstacles.splice(i, 1);
      }
    }
    
    // Move and remove bonuses
    for (let i = bonuses.length - 1; i >= 0; i--) {
      const bonus = bonuses[i];
      bonus.position.z += currentSpeed;
      bonus.rotation.x += 0.02;
      bonus.rotation.y += 0.02;
      
      if (bonus.position.z > 5) {
        scene.remove(bonus);
        bonuses.splice(i, 1);
      }
    }
    
    // Spawn new obstacles and bonuses
    if (Math.random() < 0.02) createObstacle();
    if (Math.random() < 0.01) createBonus();
    
    // Increase difficulty over time
    const timePlayed = (Date.now() - gameStartTime) / 1000;
    currentSpeed = baseSpeed + (timePlayed * 0.001);
    
    // Update score
    score += currentSpeed;
    scoreElement.textContent = `Score: ${Math.floor(score)}`;
    
    // Check collisions
    checkCollisions();
    
    // Rotate player for visual effect
    player.rotation.z = playerVelocity.x * 0.5;
    player.rotation.x = playerVelocity.y * 0.5;
  }
  
  renderer.render(scene, camera);
}

animate();
