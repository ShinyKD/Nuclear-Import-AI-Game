import * as THREE from 'three';
import { uiState } from '../ui.js';
import { playBoostSound, playDeathSound } from '../audio.js';

export class Level1 {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.isActive = false;
        
        this.player = null;
        this.playerMat = null; // Store reference to animate emissive if magma
        this.enemies = []; 
        this.vacuoles = [];
        this.backgroundScrollers = [];
        this.nlsCargo = null;
        this.goalSpawned = false;
        
        this.basePlayerSpeed = 15;
        this.playerSpeed = 15;
        this.debuffTimer = 0;
        
        // Dash variables
        this.dashTimer = 0;
        this.dashDuration = 0;
        
        this.levelTime = 0; 
        this.survivalTime = 25; 
        this.enemySpawnTimer = 0;
        
        this.scrollSpeed = 15; 
        
        this.keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false, ' ': false };
        
        this.hud = document.getElementById('hud');
        this.timerDisplay = document.getElementById('timer-display');
        this.statusDisplay = document.getElementById('status-display');
        this.dashDisplay = document.getElementById('dash-display');
        this.gameArea = { minX: -25, maxX: 25, minY: -15, maxY: 15 };
        
        this.importinLabel = null;
        this.nonNlsLabel = null;
        this.firstEnemyMesh = null;
        this.firstEnemyLabeled = false;
        this.nonNlsLabelTimer = 0;
        this.incorrectNlsLabel = null;
        this.firstIncorrectEnemyMesh = null;
        this.firstIncorrectEnemyLabeled = false;
        this.incorrectNlsLabelTimer = 0;
        this.nlsCargoLabel = null;
        this.nlsCargoLabelTimer = 0;
        
        this.initSharedAssets();
    }

    initSharedAssets() {
        this.sharedGeos = {
            cargo: new THREE.IcosahedronGeometry(1.0, 1),
            vacuole: new THREE.SphereGeometry(1.5, 16, 16),
            mitochondria: new THREE.CapsuleGeometry(3, 8, 16, 16),
            golgi: new THREE.TorusGeometry(6, 2, 16, 32),
            cytoskeleton: new THREE.CylinderGeometry(0.5, 0.5, 30, 8),
            ribosome: new THREE.SphereGeometry(0.3, 8, 8),
            lysosome: new THREE.SphereGeometry(1.5, 16, 16),
            erFragment: new THREE.TorusGeometry(4, 1, 16, 32, Math.PI),
            explosionPart: new THREE.TetrahedronGeometry(1)
        };
        
        this.sharedMats = {
            vacuole: new THREE.MeshPhysicalMaterial({ color: 0x4488ff, transmission: 0.9, transparent: true, opacity: 0.5 }),
            mitochondria: new THREE.MeshStandardMaterial({ color: 0xff4422, roughness: 0.5 }),
            golgi: new THREE.MeshStandardMaterial({ color: 0x1188aa, roughness: 0.4 }),
            cytoskeleton: new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7 }),
            bgMito: new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.6 }),
            bgLysosome: new THREE.MeshStandardMaterial({ color: 0x00ffff, roughness: 0.4 }),
            bgRibosome: new THREE.MeshBasicMaterial({ color: 0xdddddd }),
            bgEr: new THREE.MeshStandardMaterial({ color: 0x22aa44, roughness: 0.3 })
        };
    }

    start() {
        this.isActive = true;
        this.hud.style.display = 'block';
        this.levelTime = 0;
        this.playerSpeed = this.basePlayerSpeed;
        this.debuffTimer = 0;
        this.dashTimer = 0;
        this.dashDuration = 0;
        
        this.enemies = [];
        this.vacuoles = [];
        this.backgroundScrollers = [];
        this.enemySpawnTimer = 0;
        this.goalSpawned = false;
        this.nlsCargo = null;
        
        this.camera.position.set(0, 0, 35);
        this.camera.lookAt(0, 0, 0);

        this.scene.background = new THREE.Color(0x1a3c40);
        this.scene.fog = new THREE.FogExp2(0x1a3c40, 0.015);

        this.createEnvironment();
        this.createPlayer();
        
        this.firstEnemyLabeled = false;
        this.firstEnemyMesh = null;
        this.nonNlsLabelTimer = 0;
        this.firstIncorrectEnemyLabeled = false;
        this.firstIncorrectEnemyMesh = null;
        this.incorrectNlsLabelTimer = 0;
        this.nlsCargoLabelTimer = 0;
        this.importinLabel = this.createLabel("Importin", "#c084fc");
        
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }

    createLabel(text, color) {
        const div = document.createElement('div');
        div.className = 'actor-label';
        div.innerText = text;
        div.style.position = 'absolute';
        div.style.color = color;
        div.style.fontWeight = 'bold';
        div.style.fontSize = '1.2rem';
        div.style.fontFamily = "'Orbitron', sans-serif";
        div.style.textShadow = '0 0 8px rgba(0,0,0,0.9), 2px 2px 4px black';
        div.style.background = 'rgba(0, 0, 0, 0.7)';
        div.style.padding = '4px 10px';
        div.style.borderRadius = '6px';
        div.style.border = `1.5px solid ${color}`;
        div.style.boxShadow = `0 0 10px ${color}55`;
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.zIndex = '1000';
        div.style.whiteSpace = 'nowrap';
        div.style.transition = 'opacity 0.8s ease-out';
        div.style.opacity = '1';
        div.style.display = 'none';
        document.body.appendChild(div);
        return div;
    }

    cleanup() {
        this.isActive = false;
        this.hud.style.display = 'none';
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        
        if (this.importinLabel && this.importinLabel.parentNode) {
            this.importinLabel.parentNode.removeChild(this.importinLabel);
            this.importinLabel = null;
        }
        if (this.nonNlsLabel && this.nonNlsLabel.parentNode) {
            this.nonNlsLabel.parentNode.removeChild(this.nonNlsLabel);
            this.nonNlsLabel = null;
        }
        if (this.incorrectNlsLabel && this.incorrectNlsLabel.parentNode) {
            this.incorrectNlsLabel.parentNode.removeChild(this.incorrectNlsLabel);
            this.incorrectNlsLabel = null;
        }
        if (this.nlsCargoLabel && this.nlsCargoLabel.parentNode) {
            this.nlsCargoLabel.parentNode.removeChild(this.nlsCargoLabel);
            this.nlsCargoLabel = null;
        }

        if (this.player) this.scene.remove(this.player);
        if (this.nlsCargo) this.scene.remove(this.nlsCargo);
        this.enemies.forEach(e => this.scene.remove(e.mesh));
        this.vacuoles.forEach(v => this.scene.remove(v.mesh));
        this.backgroundScrollers.forEach(bg => this.scene.remove(bg.mesh));
        if (this.bgOrganelles) {
            this.bgOrganelles.forEach(org => this.scene.remove(org.mesh));
            this.bgOrganelles = [];
        }
    }

    createEnvironment() {
        this.spawnBackgroundOrganelles();
        this.spawnBackgroundElement(0);
        this.spawnBackgroundElement(30);
        this.spawnVacuole(10);
        this.spawnVacuole(30);
    }

    spawnBackgroundElement(startX) {
        const rand = Math.random();
        let mesh;
        if (rand < 0.33) {
            // Mitochondria (Redish/Orange)
            const geo = this.sharedGeos.mitochondria;
            const mat = this.sharedMats.mitochondria;
            mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
        } else if (rand < 0.66) {
            // Golgi/ER (Teal/Green)
            const geo = this.sharedGeos.golgi;
            const mat = new THREE.MeshStandardMaterial({ color: 0x00ffaa, roughness: 0.7 });
            mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
        } else {
            // Lysosome/Vesicle (Cyan/Blue)
            const geo = new THREE.SphereGeometry(4, 32, 32);
            const mat = new THREE.MeshPhysicalMaterial({ color: 0x00aaff, transmission: 0.6, transparent: true, opacity: 0.8 });
            mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
        }
        
        // Keep them far in the background (Z between -20 and -50)
        const zPos = -20 - Math.random() * 30;
        mesh.position.set(startX, (Math.random() - 0.5) * 50, zPos);
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        
        this.scene.add(mesh);
        
        // Parallax speed based on Z distance
        const parallaxSpeed = (50 + zPos) / 50; 
        
        this.backgroundScrollers.push({ 
            mesh: mesh, 
            rotX: (Math.random() - 0.5) * 0.5, 
            rotY: (Math.random() - 0.5) * 0.5,
            speedMult: 0.2 + parallaxSpeed * 0.5
        });
    }

    spawnVacuole(startX) {
        const vacGeo = this.sharedGeos.vacuole;
        const vacMat = this.sharedMats.vacuole;
        const mesh = new THREE.Mesh(vacGeo, vacMat); mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.position.set(startX, (Math.random() - 0.5) * 30, 0);
        this.scene.add(mesh);
        this.vacuoles.push({ mesh: mesh });
    }

    createPlayer() {
        let playerMat;
        if (uiState.skin === 'magma') {
            playerMat = new THREE.MeshStandardMaterial({ 
                color: 0x220000, 
                emissive: 0xff3300, 
                emissiveIntensity: 0.8,
                roughness: 0.9 
            });
        } else if (uiState.skin === 'metal') {
            playerMat = new THREE.MeshStandardMaterial({ 
                color: 0x888888, 
                metalness: 1.0, 
                roughness: 0.2 
            });
        } else {
            // Default Purple Biological
            playerMat = new THREE.MeshPhysicalMaterial({ 
                color: 0x8a2be2, 
                clearcoat: 1.0 
            });
        }
        this.playerMat = playerMat;

        const impCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(1.5, 1, 0), new THREE.Vector3(0, 1, 0.5), 
            new THREE.Vector3(-1.5, 0, 0), new THREE.Vector3(0, -1, -0.5), new THREE.Vector3(1.5, -1, 0)
        ], false, 'chordal', 0.8);

        const impGeo = new THREE.TubeGeometry(impCurve, 32, 0.5, 16, false);
        this.player = new THREE.Mesh(impGeo, playerMat); this.player.castShadow = true; this.player.receiveShadow = true;
        this.player.position.set(-15, 0, 0); 
        
        this.player.geometry.computeBoundingBox();
        this.scene.add(this.player);
    }

    spawnEnemy() {
        const isIncorrectNls = Math.random() < 0.4;
        let mesh;
        
        if (isIncorrectNls) {
            // Cargo with incorrect NLS: protein body with a RED NLS-like structure
            mesh = new THREE.Group();
            
            const bodyGeo = new THREE.IcosahedronGeometry(1.2, 1);
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.3 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.castShadow = true;
            body.receiveShadow = true;
            mesh.add(body);
            
            // NLS-like structure, but colored RED
            const tailCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0.8, 0, 0),
                new THREE.Vector3(1.6, 0.6, 0),
                new THREE.Vector3(2.3, 0, 0.4),
                new THREE.Vector3(3.0, 0.8, 0)
            ]);
            const tailGeo = new THREE.TubeGeometry(tailCurve, 12, 0.25, 8, false);
            const tailMat = new THREE.MeshStandardMaterial({ 
                color: 0xff2222, 
                emissive: 0xff1111, 
                emissiveIntensity: 0.6, 
                roughness: 0.3 
            });
            const tail = new THREE.Mesh(tailGeo, tailMat);
            tail.castShadow = true;
            tail.receiveShadow = true;
            mesh.add(tail);
        } else {
            // Standard non-NLS cargo (yellow globular protein)
            const cargoGeo = this.sharedGeos.cargo;
            const cargoMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0 }); 
            mesh = new THREE.Mesh(cargoGeo, cargoMat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
        
        const spawnX = 60;
        const spawnY = this.player.position.y + (Math.random() - 0.5) * 20;
        
        mesh.position.set(spawnX, Math.max(this.gameArea.minY, Math.min(this.gameArea.maxY, spawnY)), 0);
        this.scene.add(mesh);
        
        const difficultyScale = Math.min(1.0, this.levelTime / this.survivalTime);
        const speed = 6 + (difficultyScale * 8); // Reduced max speed to 14 for fairer difficulty
        
        this.enemies.push({
            mesh: mesh,
            speed: speed,
            velX: -speed,
            velY: 0,
            isIncorrectNls: isIncorrectNls
        });

        if (!isIncorrectNls && !this.firstEnemyLabeled) {
            this.firstEnemyLabeled = true;
            this.firstEnemyMesh = mesh;
            this.nonNlsLabel = this.createLabel("Non-NLS Cargo", "#ffff00");
            this.nonNlsLabelTimer = 4.0;
        } else if (isIncorrectNls && !this.firstIncorrectEnemyLabeled) {
            this.firstIncorrectEnemyLabeled = true;
            this.firstIncorrectEnemyMesh = mesh;
            this.incorrectNlsLabel = this.createLabel("Incorrect NLS Cargo", "#ff4444");
            this.incorrectNlsLabelTimer = 4.0;
        }
    }

    spawnBackgroundOrganelles() {
        this.bgOrganelles = [];
        
        // Mitochondria (orange/red pill shapes)
        for(let i=0; i<15; i++) {
            const geo = this.sharedGeos.mitochondria;
            const mat = this.sharedMats.bgMito;
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 150, -20 - Math.random() * 30);
            mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
            this.scene.add(mesh);
            this.bgOrganelles.push({ mesh, speedX: (Math.random()-0.5)*2, rotSpeed: (Math.random()-0.5)*0.5 });
        }

        // Lysosomes (cyan spheres)
        for(let i=0; i<20; i++) {
            const geo = this.sharedGeos.lysosome;
            const mat = this.sharedMats.bgLysosome;
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 150, -15 - Math.random() * 40);
            this.scene.add(mesh);
            this.bgOrganelles.push({ mesh, speedX: (Math.random()-0.5)*1, rotSpeed: 0 });
        }

        // Ribosomes (tiny dots)
        for(let i=0; i<100; i++) {
            const geo = this.sharedGeos.ribosome;
            const mat = this.sharedMats.bgRibosome;
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 150, -10 - Math.random() * 40);
            this.scene.add(mesh);
            this.bgOrganelles.push({ mesh, speedX: (Math.random()-0.5)*3, rotSpeed: 0 });
        }

        // Golgi / ER fragments (flattened tubes - dark green)
        for(let i=0; i<10; i++) {
            const geo = this.sharedGeos.erFragment;
            const mat = this.sharedMats.bgEr;
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 150, -25 - Math.random() * 20);
            mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
            this.scene.add(mesh);
            this.bgOrganelles.push({ mesh, speedX: (Math.random()-0.5)*1, rotSpeed: (Math.random()-0.5)*0.2 });
        }
    }

    spawnNLSCargo() {
        this.goalSpawned = true;
        
        this.nlsCargo = new THREE.Group();
        
        // Main protein body (globular) - made highly emissive
        const bodyGeo = new THREE.IcosahedronGeometry(2.5, 2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 0.8, roughness: 0.2 });
        const body = new THREE.Mesh(bodyGeo, bodyMat); body.castShadow = true; body.receiveShadow = true;
        
        // NLS Tail (Glowing basic sequence)
        const tailCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(2.0, 0, 0),
            new THREE.Vector3(3.5, 1, 0),
            new THREE.Vector3(5.0, 0, 1),
            new THREE.Vector3(6.0, 1.5, 0)
        ]);
        const tailGeo = new THREE.TubeGeometry(tailCurve, 20, 0.4, 8, false);
        const tailMat = new THREE.MeshBasicMaterial({ color: 0x55ff55 }); // Glowing green
        const tail = new THREE.Mesh(tailGeo, tailMat);
        
        // PointLight to illuminate the area
        const cargoLight = new THREE.PointLight(0x4488ff, 100.0, 30);
        this.nlsCargo.add(cargoLight);

        this.nlsCargo.add(body);
        this.nlsCargo.add(tail);
        
        this.nlsCargo.position.set(60, 0, 0);
        this.scene.add(this.nlsCargo);

        this.nlsCargoLabel = this.createLabel("NLS Cargo", "#00ffcc");
        this.nlsCargoLabelTimer = 4.0;
    }

    onKeyDown = (e) => {
        if(this.keys.hasOwnProperty(e.key)) this.keys[e.key] = true;
    }
    
    onKeyUp = (e) => {
        if(this.keys.hasOwnProperty(e.key)) this.keys[e.key] = false;
    }

    update(delta, time) {
        if (!this.isActive || uiState.currentScreen !== 'gameplay') return;

        if (this.explosionParts) {
            for (let i = this.explosionParts.length - 1; i >= 0; i--) {
                const part = this.explosionParts[i];
                part.mesh.position.addScaledVector(part.vel, delta);
                part.mesh.rotation.x += part.rot.x * delta;
                part.mesh.rotation.y += part.rot.y * delta;
                part.mesh.rotation.z += part.rot.z * delta;
                part.mesh.scale.multiplyScalar(0.95);
                if (part.mesh.scale.x < 0.01) {
                    this.scene.remove(part.mesh);
                    // part.mesh.geometry.dispose(); // Shared geometry, do not dispose
                    // part.mesh.material.dispose(); // Let GC handle it
                    this.explosionParts.splice(i, 1);
                }
            }
            if (this.explosionParts.length === 0) {
                this.explosionParts = null;
            }
        }

        if (this.isDead) return;

        this.levelTime += delta;
        
        if (uiState.skin === 'magma' && this.playerMat) {
            this.playerMat.emissiveIntensity = 0.5 + Math.sin(time * 5) * 0.5;
        }
        
        if (this.levelTime >= this.survivalTime && !this.goalSpawned) {
            this.spawnNLSCargo();
        }

        if (!this.goalSpawned) {
            this.timerDisplay.innerText = `Time: ${Math.floor(this.levelTime)} / ${this.survivalTime}s`;
        } else {
            this.timerDisplay.innerText = "REACH THE NLS CARGO!";
            this.timerDisplay.style.color = "#00ff00";
        }

        if (!this.goalSpawned) {
            this.enemySpawnTimer += delta;
            const spawnRate = Math.max(1.5, 3.5 - (this.levelTime / 20.0)); 
            if (this.enemySpawnTimer > spawnRate) {
                this.enemySpawnTimer = 0;
                this.spawnEnemy();
            }
        }

        if (this.dashTimer > 0) {
            this.dashTimer -= delta;
            this.dashDisplay.innerText = `DASH CD: ${Math.ceil(this.dashTimer)}s`;
            this.dashDisplay.style.color = "#888";
        } else {
            this.dashDisplay.innerText = "DASH READY (SPACE)";
            this.dashDisplay.style.color = "#00ffff";
        }
        
        if (this.keys[' '] && this.dashTimer <= 0) {
            playBoostSound();
            this.dashDuration = 0.3; // slightly longer duration
            this.dashTimer = 3.0; 
            // Give instant huge speed burst
            this.playerSpeed = this.basePlayerSpeed * 5.0; 
        }

        // Determine baseline speed based on debuff
        let targetSpeed = this.basePlayerSpeed;
        if (this.debuffTimer > 0) {
            this.debuffTimer -= delta;
            this.statusDisplay.innerText = `Slowed! (${Math.ceil(this.debuffTimer)}s)`;
            targetSpeed = this.basePlayerSpeed * 0.4;
        } else {
            this.statusDisplay.innerText = "";
        }

        if (this.dashDuration > 0) {
            this.dashDuration -= delta;
            // Let it decay naturally to targetSpeed from the huge burst
        } else {
            // Smoothly lerp down back to normal or debuffed speed
            this.playerSpeed = THREE.MathUtils.lerp(this.playerSpeed, targetSpeed, 5.0 * delta);
        }

        let moveX = 0; let moveY = 0;
        if (this.keys.w || this.keys.ArrowUp) moveY += 1;
        if (this.keys.s || this.keys.ArrowDown) moveY -= 1;
        if (this.keys.a || this.keys.ArrowLeft) moveX -= 1;
        if (this.keys.d || this.keys.ArrowRight) moveX += 1;
        
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.707;
            moveY *= 0.707;
        }

        this.player.position.x += moveX * this.playerSpeed * delta;
        this.player.position.y += moveY * this.playerSpeed * delta;

        this.player.position.x = Math.max(this.gameArea.minX, Math.min(this.gameArea.maxX, this.player.position.x));
        this.player.position.y = Math.max(this.gameArea.minY, Math.min(this.gameArea.maxY, this.player.position.y));

        this.player.rotation.z = moveX * -0.2;
        this.player.rotation.x = moveY * 0.2;

        const playerBox = new THREE.Box3().setFromObject(this.player);

        for (let i = this.backgroundScrollers.length - 1; i >= 0; i--) {
            let bg = this.backgroundScrollers[i];
            bg.mesh.position.x -= this.scrollSpeed * delta * bg.speedMult;
            bg.mesh.rotation.x += delta * bg.rotX;
            bg.mesh.rotation.y += delta * bg.rotY;
            
            if (bg.mesh.position.x < -150) {
                this.scene.remove(bg.mesh);
                this.backgroundScrollers.splice(i, 1);
                this.spawnBackgroundElement(150);
            }
        }

        for (let i = this.vacuoles.length - 1; i >= 0; i--) {
            let vac = this.vacuoles[i];
            vac.mesh.position.x -= this.scrollSpeed * delta;
            vac.mesh.position.y += Math.sin(time * 2 + vac.mesh.position.x) * 0.05;
            
            const vacBox = new THREE.Box3().setFromObject(vac.mesh);
            vacBox.expandByScalar(-0.3);
            if (playerBox.intersectsBox(vacBox)) {
                if (this.debuffTimer <= 0) this.debuffTimer = 5.0; 
            }
            
            if (vac.mesh.position.x < -150) {
                this.scene.remove(vac.mesh);
                this.vacuoles.splice(i, 1);
                this.spawnVacuole(150 + Math.random() * 20);
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let enemy = this.enemies[i];
            
            if (enemy.mesh.position.x > this.player.position.x) {
                const dirX = this.player.position.x - enemy.mesh.position.x;
                const dirY = this.player.position.y - enemy.mesh.position.y;
                const dist = Math.sqrt(dirX*dirX + dirY*dirY);
                
                if (dist > 12) {
                    const targetVelX = (dirX / dist) * enemy.speed;
                    const targetVelY = (dirY / dist) * enemy.speed;
                    enemy.velX = THREE.MathUtils.lerp(enemy.velX, targetVelX, 0.5 * delta);
                    enemy.velY = THREE.MathUtils.lerp(enemy.velY, targetVelY, 0.5 * delta);
                }
            } else {
                enemy.velX = THREE.MathUtils.lerp(enemy.velX, -3, 2.0 * delta);
                enemy.velY = THREE.MathUtils.lerp(enemy.velY, 0, 2.0 * delta);
            }
            
            enemy.mesh.position.x += enemy.velX * delta;
            enemy.mesh.position.y += enemy.velY * delta;

            enemy.mesh.rotation.x += delta;
            enemy.mesh.rotation.y += delta;
            
            // Indicator pulsing effect (gradual)
            const pulse = (Math.sin(time * 8 + i) + 1) / 2; 
            if (enemy.mesh.material && enemy.mesh.material.emissive) {
                enemy.mesh.material.emissiveIntensity = pulse * 0.8;
            } else if (enemy.mesh.isGroup) {
                enemy.mesh.traverse(child => {
                    if (child.isMesh && child.material && child.material.emissive) {
                        child.material.emissiveIntensity = pulse * 0.8;
                    }
                });
            }

            const enemyBox = new THREE.Box3().setFromObject(enemy.mesh);
            enemyBox.expandByScalar(-0.2); 
            
            if (playerBox.intersectsBox(enemyBox)) {
                this.die();
                return;
            }

            if (enemy.mesh.position.x < -60) {
                this.scene.remove(enemy.mesh);
                this.enemies.splice(i, 1);
            }
        }

        if (this.goalSpawned && this.nlsCargo) {
            if (this.nlsCargo.position.x > 0) {
                this.nlsCargo.position.x -= 8 * delta; 
            }
            
            this.nlsCargo.rotation.y += delta * 2;
            this.nlsCargo.rotation.x += delta * 1;
            this.nlsCargo.scale.setScalar(1.0 + Math.sin(time * 5) * 0.2);
            
            const goalBox = new THREE.Box3().setFromObject(this.nlsCargo);
            if (playerBox.intersectsBox(goalBox)) {
                this.win();
            }
        }

        if (this.bgOrganelles) {
            for (let org of this.bgOrganelles) {
                org.mesh.position.x += org.speedX * delta;
                org.mesh.rotation.x += org.rotSpeed * delta;
                org.mesh.rotation.y += org.rotSpeed * delta;
                if (org.mesh.position.x > 150) org.mesh.position.x = -150;
                if (org.mesh.position.x < -150) org.mesh.position.x = 150;
            }
        }

        this.updateLabels(delta);
    }

    updateLabels(delta) {
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;
        
        // 1. Importin label (stays permanently on player)
        if (this.player && this.player.visible && this.importinLabel) {
            const pos = this.player.position.clone();
            pos.y += 3.5;
            pos.project(this.camera);
            if (pos.z < 1 && pos.z > -1) {
                this.importinLabel.style.display = 'block';
                this.importinLabel.style.left = (pos.x * widthHalf + widthHalf) + 'px';
                this.importinLabel.style.top = (-pos.y * heightHalf + heightHalf) + 'px';
            } else {
                this.importinLabel.style.display = 'none';
            }
        } else if (this.importinLabel) {
            this.importinLabel.style.display = 'none';
        }
        
        // 2. First Non-NLS Cargo label (fades away after a few seconds)
        if (this.nonNlsLabel && this.firstEnemyMesh) {
            if (this.nonNlsLabelTimer > 0) {
                this.nonNlsLabelTimer -= delta;
                if (this.nonNlsLabelTimer <= 1.0) {
                    this.nonNlsLabel.style.opacity = Math.max(0, this.nonNlsLabelTimer).toFixed(2);
                }
                const pos = this.firstEnemyMesh.position.clone();
                pos.y += 2.5;
                pos.project(this.camera);
                if (pos.z < 1 && pos.z > -1 && pos.x >= -1.5) {
                    this.nonNlsLabel.style.display = 'block';
                    this.nonNlsLabel.style.left = (pos.x * widthHalf + widthHalf) + 'px';
                    this.nonNlsLabel.style.top = (-pos.y * heightHalf + heightHalf) + 'px';
                } else {
                    this.nonNlsLabel.style.display = 'none';
                }
            } else {
                this.nonNlsLabel.style.display = 'none';
            }
        }
        
        // 2b. First Incorrect NLS Cargo label (fades away after a few seconds)
        if (this.incorrectNlsLabel && this.firstIncorrectEnemyMesh) {
            if (this.incorrectNlsLabelTimer > 0) {
                this.incorrectNlsLabelTimer -= delta;
                if (this.incorrectNlsLabelTimer <= 1.0) {
                    this.incorrectNlsLabel.style.opacity = Math.max(0, this.incorrectNlsLabelTimer).toFixed(2);
                }
                const pos = this.firstIncorrectEnemyMesh.position.clone();
                pos.y += 2.5;
                pos.project(this.camera);
                if (pos.z < 1 && pos.z > -1 && pos.x >= -1.5) {
                    this.incorrectNlsLabel.style.display = 'block';
                    this.incorrectNlsLabel.style.left = (pos.x * widthHalf + widthHalf) + 'px';
                    this.incorrectNlsLabel.style.top = (-pos.y * heightHalf + heightHalf) + 'px';
                } else {
                    this.incorrectNlsLabel.style.display = 'none';
                }
            } else {
                this.incorrectNlsLabel.style.display = 'none';
            }
        }
        
        // 3. NLS Cargo label (fades away after a few seconds)
        if (this.nlsCargoLabel && this.nlsCargo) {
            if (this.nlsCargoLabelTimer > 0) {
                this.nlsCargoLabelTimer -= delta;
                if (this.nlsCargoLabelTimer <= 1.0) {
                    this.nlsCargoLabel.style.opacity = Math.max(0, this.nlsCargoLabelTimer).toFixed(2);
                }
                const pos = this.nlsCargo.position.clone();
                pos.y += 4.5;
                pos.project(this.camera);
                if (pos.z < 1 && pos.z > -1) {
                    this.nlsCargoLabel.style.display = 'block';
                    this.nlsCargoLabel.style.left = (pos.x * widthHalf + widthHalf) + 'px';
                    this.nlsCargoLabel.style.top = (-pos.y * heightHalf + heightHalf) + 'px';
                } else {
                    this.nlsCargoLabel.style.display = 'none';
                }
            } else {
                this.nlsCargoLabel.style.display = 'none';
            }
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        
        if (this.importinLabel) this.importinLabel.style.display = 'none';
        if (this.nonNlsLabel) this.nonNlsLabel.style.display = 'none';
        if (this.incorrectNlsLabel) this.incorrectNlsLabel.style.display = 'none';
        if (this.nlsCargoLabel) this.nlsCargoLabel.style.display = 'none';
        if (window.flashText) window.flashText("Too Bad!", "#ff3333");
        playDeathSound();
        this.createExplosion(this.player.position, this.playerMat.color);
        this.player.visible = false;
        
        setTimeout(() => {
            this.player.position.set(-15, 0, 0);
            this.player.visible = true;
            this.levelTime = 0; 
            this.debuffTimer = 0;
            this.dashTimer = 0;
            this.dashDuration = 0;
            this.goalSpawned = false;
            
            if (this.nlsCargo) {
                this.scene.remove(this.nlsCargo);
                this.nlsCargo = null;
            }
            
            this.enemies.forEach(e => this.scene.remove(e.mesh));
            this.enemies = [];
            this.timerDisplay.style.color = "#fff";
            this.isDead = false;
        }, 1200);
    }

    createExplosion(pos, color) {
        this.explosionParts = [];
        const particleCount = 12;
        const expMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 });
        for (let i = 0; i < particleCount; i++) {
            const geo = this.sharedGeos.explosionPart;
            const mat = expMat;
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 40
            );
            const rot = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15
            );
            
            this.scene.add(mesh);
            this.explosionParts.push({ mesh, vel, rot });
        }
    }

    win() {
        if(!this.isActive) return;
        this.isActive = false;
        
        if (this.importinLabel) this.importinLabel.style.display = 'none';
        if (this.nonNlsLabel) this.nonNlsLabel.style.display = 'none';
        if (this.incorrectNlsLabel) this.incorrectNlsLabel.style.display = 'none';
        if (this.nlsCargoLabel) this.nlsCargoLabel.style.display = 'none';
        
        if (window.flashText) window.flashText("Congrats!!!", "#33ff33");
        
        setTimeout(() => {
            this.cleanup();
            uiState.currentScreen = 'next-level-popup';
            Object.values(document.querySelectorAll('.screen')).forEach(s => s.classList.remove('active'));
            document.getElementById('next-level-popup').classList.add('active');
            
            this.statusDisplay.innerText = "";
            this.timerDisplay.style.color = "#fff";
        }, 1500);
    }
}

