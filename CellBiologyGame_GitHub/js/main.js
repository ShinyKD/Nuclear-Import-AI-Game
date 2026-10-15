import * as THREE from 'three';
import { uiState, initUI, crossfadeMusic, levelMusic } from './ui.js';
import { TitleBackground } from './background.js';
import { Level1 } from './levels/Level1.js?v=4';
import { Level2 } from './levels/Level2.js?v=5';
import { Level3 } from './levels/Level3.js?v=5';
import { Cutscene1 } from './levels/Cutscene1.js?v=3';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, composer;
let titleBg;
let level1;
let level2;
let cutscene1;
let level3;
let clock;

function init() {
    // 1. Initialize UI
    initUI();

    // 2. Setup Three.js Scene
    const container = document.getElementById('game-container');
    
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 3. Post-Processing (Bloom for that polished, glowing ambiance)
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.8; // Only bloom bright objects
    bloomPass.strength = 1.0;  // Softer glow
    bloomPass.radius = 0.5;

    const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { samples: 4 });
    composer = new EffectComposer(renderer, renderTarget);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    clock = new THREE.Clock();

    // 4. Setup Title Screen Background
    titleBg = new TitleBackground(scene, camera);
    level1 = new Level1(scene, camera);
    level2 = new Level2(scene, camera);
    cutscene1 = new Cutscene1(scene, camera);
    level3 = new Level3(scene, camera);

    window.level1 = level1;
    window.level2 = level2;
    window.cutscene1 = cutscene1;
    window.level3 = level3;

    // Attach start game function to window for UI to trigger
    window.startGameLevel1 = () => {
        // Clear title background
        titleBg.cleanup && titleBg.cleanup(); // Optional if we want to remove title meshes
        scene.clear();
        crossfadeMusic(levelMusic.l1);
        
        // Modern Lighting Setup for Level 1
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(50, 100, 60);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 300;
        const d = 150;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.001;
        scene.add(dirLight);

        // Add a secondary light for rim illumination
        const rimLight = new THREE.DirectionalLight(0x88ccff, 0.6);
        rimLight.position.set(-50, -20, -50);
        scene.add(rimLight);

        level1.start();
    };

    window.quitLevel1 = () => {
        if (level1.isActive) {
            level1.cleanup();
        }
        scene.clear();
        titleBg.show();
    };
    
    window.startGameLevel2 = () => {
        if (level1.isActive) level1.cleanup();
        titleBg.cleanup && titleBg.cleanup();
        scene.clear();
        uiState.currentScreen = 'gameplay';
        try {
            levelMusic.l2.currentTime = 0;
        } catch (e) {}
        crossfadeMusic(levelMusic.l2);
        
        // Modern Lighting Setup for Level 2
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(10, 40, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 150;
        const d2 = 80;
        dirLight.shadow.camera.left = -d2;
        dirLight.shadow.camera.right = d2;
        dirLight.shadow.camera.top = d2;
        dirLight.shadow.camera.bottom = -d2;
        dirLight.shadow.bias = -0.001;
        scene.add(dirLight);

        const rimLight = new THREE.DirectionalLight(0xffaa88, 0.8);
        rimLight.position.set(-20, -10, -30);
        scene.add(rimLight);
        
        level2.start();
    };

    window.quitLevel2 = () => {
        if (level2.isActive) {
            level2.cleanup();
        }
        scene.clear();
        titleBg.show();
    };

    window.startCutscene1 = () => {
        if (level2.isActive) level2.cleanup();
        scene.clear();
        crossfadeMusic(levelMusic.cutscene);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(20, 50, 40);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 150;
        const d = 50;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.001;
        scene.add(dirLight);

        const rimLight = new THREE.DirectionalLight(0x88bbff, 0.8);
        rimLight.position.set(-20, -10, -30);
        scene.add(rimLight);
        cutscene1.start();
    };

    window.quitCutscene = () => {
        if (cutscene1.isActive) cutscene1.cleanup();
        scene.clear();
        // Transition to Level 3 Tutorial instead of level
        document.getElementById('cutscene-screen').classList.remove('active');
        if (window.showTutorial) window.showTutorial(3);
    };

    window.startGameLevel3 = () => {
        if (level1.isActive) level1.cleanup();
        if (level2.isActive) level2.cleanup();
        if (cutscene1.isActive) cutscene1.cleanup();
        titleBg.cleanup && titleBg.cleanup();
        scene.clear();
        crossfadeMusic(levelMusic.l3);
        level3.start();
        uiState.currentScreen = 'gameplay';
    };

    window.quitLevel3 = () => {
        if (level3.isActive) {
            level3.cleanup();
        }
        scene.clear();
        titleBg.show();
    };

    // 5. Handle Window Resize
    window.addEventListener('resize', onWindowResize);

    // 6. Start Game Loop
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// FPS Calculation
let frames = 0;
let prevTime = performance.now();
const fpsCounter = document.getElementById('fps-counter');

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // Update FPS
    frames++;
    const current = performance.now();
    if (current > prevTime + 1000) {
        if (uiState.showFps) {
            fpsCounter.innerText = `FPS: ${Math.round((frames * 1000) / (current - prevTime))}`;
        }
        prevTime = current;
        frames = 0;
    }

    // Update Game State
    if (uiState.currentScreen === 'main-menu' || uiState.currentScreen === 'settings-menu' || uiState.currentScreen === 'credits-menu') {
        titleBg.update(delta, time);
    } else if (uiState.currentScreen === 'gameplay' && level1.isActive) {
        level1.update(delta, time);
    } else if (uiState.currentScreen === 'gameplay' && level2.isActive) {
        level2.update(delta, time);
    } else if (uiState.currentScreen === 'cutscene-screen' && cutscene1.isActive) {
        cutscene1.update(delta);
    } else if (uiState.currentScreen === 'gameplay' && level3.isActive) {
        level3.update(delta, time);
    }

    // Use composer instead of renderer for bloom effect
    composer.render();
}

// Initialize on load
window.onload = init;





