import * as THREE from 'three';
import { uiState } from '../ui.js';

export class Level3 {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.isActive = false;
        
        this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false, ' ': false, shift: false };
        this.shiftPressed = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetPitch = 0;
        this.targetYaw = 0;
        
        this.handleKeyDown = (e) => { 
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(e.key)) { this.keys[e.key] = true; }
            if (this.keys.hasOwnProperty(key)) { this.keys[key] = true; }
            if (e.code === 'Space') { this.keys[' '] = true; }
            
            if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.keys['shift'] = true;
                if (!this.shiftPressed) {
                    this.shiftPressed = true;
                }
                e.preventDefault();
            }
        };
        this.handleKeyUp = (e) => { 
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = false;
            if (this.keys.hasOwnProperty(key)) this.keys[key] = false;
            if (e.code === 'Space') { this.keys[' '] = false; }
            
            if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.keys['shift'] = false;
                this.shiftPressed = false;
                e.preventDefault();
            }
        };

        this.handleMouseMove = (e) => {
            if (document.pointerLockElement === document.body) {
                this.targetYaw -= e.movementX * 0.002;
                this.targetPitch -= e.movementY * 0.002;
                this.targetPitch = Math.max(-Math.PI/2.1, Math.min(Math.PI/2.1, this.targetPitch));
            }
        };

        this.handleClick = (e) => {
            if (e && e.target && e.target.tagName !== 'CANVAS') return;
            if (this.isActive && !this.minigame.active && document.pointerLockElement !== document.body) {
                document.body.requestPointerLock();
            }
        };

        this.handleMouseDown = (e) => {
            if (e.button === 0 && this.minigame && this.minigame.active) {
                this.minigame.progress += this.minigame.gainPerPress;
                this.minigame.progress = Math.min(1, this.minigame.progress);
            }
        };

        this.handleContextMenu = (e) => {
            if (this.minigame && this.minigame.active) {
                e.preventDefault();
            }
        };
    }

    start() {
        this.isActive = true;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        this.scene.background = new THREE.Color(0x1a3c40); 
        this.scene.fog = new THREE.FogExp2(0x1a3c40, 0.005); 
        
        this.playerStats = { 
            velocity: 0, 
            maxSpeed: 80, 
            acceleration: 40, 
            deceleration: 30,
            boostEnergy: 100 
        };
        this.time = 0;
        
        this.flags = {
            passedZone1: false,
            passedZone2: false
        };

        this.minigame = {
            active: false,
            type: null,
            progress: 0,
            smoothProgress: 0,
            decayRate: 0.08,
            gainPerPress: 0.035
        };
        
        this.targetPitch = 0;
        this.targetYaw = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Default forward
        this.currentMoveDir = new THREE.Vector3(0, 0, -1);

        this.createEnvironment();
        this.createPlayer();
        this.createZones();
        this.createUI();

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('click', this.handleClick);
        window.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('contextmenu', this.handleContextMenu);
    }

    createEnvironment() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.group.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(50, 100, 50);
        this.group.add(dirLight);
        
        const capsuleGeo = new THREE.CapsuleGeometry(3, 8, 16, 16);
        const capsuleMat = new THREE.MeshStandardMaterial({ color: 0xff5555, roughness: 0.8 });
        
        const knotGeo = new THREE.TorusKnotGeometry(5, 1.5, 64, 8);
        const knotMat = new THREE.MeshStandardMaterial({ color: 0x00ffaa, roughness: 0.7 });
        
        const sphereGeo = new THREE.SphereGeometry(4, 16, 16);
        const sphereMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, transparent: true, opacity: 0.8 });

        this.organelles = [];
        for (let i = 0; i < 500; i++) {
            const rand = Math.random();
            let mesh;
            if (rand < 0.33) {
                mesh = new THREE.Mesh(capsuleGeo, capsuleMat);
            } else if (rand < 0.66) {
                mesh = new THREE.Mesh(knotGeo, knotMat);
            } else {
                mesh = new THREE.Mesh(sphereGeo, sphereMat);
            }
            
            const x = (Math.random() - 0.5) * 800;
            const y = (Math.random() - 0.5) * 800;
            const z = 100 - Math.random() * 800;
            
            // keep the spawn area clear
            if (Math.abs(x) < 20 && Math.abs(y) < 20 && z > -20) continue;
            
            mesh.position.set(x, y, z);
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            
            const scale = 0.5 + Math.random() * 2;
            mesh.scale.set(scale, scale, scale);
            
            this.group.add(mesh);
            this.organelles.push({ mesh, rx: (Math.random()-0.5)*0.04, ry: (Math.random()-0.5)*0.04 });
        }
    }

    createPlayer() {
        this.player = new THREE.Group();
        this.player.position.set(0, 0, 0); 
        
        this.playerVisual = new THREE.Group();
        this.player.add(this.playerVisual);
        
        this.actors = {};
        this.actors.ranBase = new THREE.Group();
        
        const ranGeo = new THREE.BoxGeometry(2, 2.5, 2);
        const ranMat = new THREE.MeshStandardMaterial({ color: 0x88cc88 }); 
        this.ranMesh = new THREE.Mesh(ranGeo, ranMat);
        
        const gdpGeo = new THREE.CapsuleGeometry(0.8, 1.5, 8, 8);
        const gdpMat = new THREE.MeshStandardMaterial({ color: 0xffa500 });
        this.gdpMesh = new THREE.Mesh(gdpGeo, gdpMat);
        this.gdpMesh.rotation.z = Math.PI / 2;
        this.gdpMesh.position.set(0, 2.2, 0); 
        this.gdpMesh.visible = false; 
        
        const gtpGeo = new THREE.IcosahedronGeometry(1.2, 0);
        const gtpMat = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        this.gtpMesh = new THREE.Mesh(gtpGeo, gtpMat);
        this.gtpMesh.position.set(0, 2.2, 0);
        
        const piGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const piMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
        this.piMesh = new THREE.Mesh(piGeo, piMat);
        this.piMesh.position.set(0, 2.2, 0);
        this.piMesh.visible = false;
        
        this.actors.ranBase.add(this.ranMesh);
        this.actors.ranBase.add(this.gdpMesh);
        this.actors.ranBase.add(this.gtpMesh);
        this.actors.ranBase.add(this.piMesh);
        
        const impGeo = new THREE.TorusGeometry(2.5, 1, 16, 32, Math.PI);
        const impMat = new THREE.MeshStandardMaterial({ color: 0x8a2be2 });
        this.importinMesh = new THREE.Mesh(impGeo, impMat);
        this.importinMesh.rotation.z = Math.PI / 2;
        this.importinMesh.position.set(-1.2, 0, 0);
        
        this.playerVisual.add(this.actors.ranBase);
        this.playerVisual.add(this.importinMesh);
        
        const boostGeo = new THREE.ConeGeometry(1, 4, 16);
        this.boostMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 });
        this.boostFire = new THREE.Mesh(boostGeo, this.boostMat);
        this.boostFire.rotation.x = Math.PI / 2;
        this.boostFire.position.set(0, 0, 3);
        this.playerVisual.add(this.boostFire);
        
        this.group.add(this.player);
    }

    createZones() {
        const gapGeo = new THREE.TorusGeometry(3, 1, 16, 32);
        const gapMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
        this.gapMolecule = new THREE.Mesh(gapGeo, gapMat);
        
        const edges = new THREE.EdgesGeometry(gapGeo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
        this.gapMolecule.add(line);
        this.gapOutline = line;
        
        const spawnX = (Math.random() - 0.5) * 200;
        const spawnY = (Math.random() - 0.5) * 200;
        const spawnZ = -150 - Math.random() * 150;
        
        this.gapMolecule.position.set(spawnX, spawnY, spawnZ);
        this.group.add(this.gapMolecule);
        
        this.importinLabel = this.createLabel("Importin", "#c084fc");
        this.ranGTPLabel = this.createLabel("RanGTP", "#ffff00");
        this.ranGDPLabel = this.createLabel("RanGDP", "#ff9900");
        this.piLabel = this.createLabel("Pi", "#ff4444");
        this.gapLabel = this.createLabel("RanGAP", "#00ffcc");
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
        div.style.display = 'none';
        document.body.appendChild(div);
        return div;
    }

    updateLabels() {
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;
        
        // RanGAP target label with distance
        if (this.gapMolecule && this.gapMolecule.visible && !this.flags.passedZone1) {
            const dist = this.player.position.distanceTo(this.gapMolecule.position);
            const pos = this.gapMolecule.position.clone();
            pos.y += 6; 
            pos.project(this.camera);
            if (pos.z < 1 && pos.z > -1) {
                this.gapLabel.style.display = 'block';
                this.gapLabel.style.left = (pos.x * widthHalf + widthHalf) + 'px';
                this.gapLabel.style.top = (-pos.y * heightHalf + heightHalf) + 'px';
                this.gapLabel.innerText = 'RanGAP';
            } else {
                this.gapLabel.style.display = 'none';
            }
        } else {
            if (this.gapLabel) this.gapLabel.style.display = 'none';
        }
        
        const updateMeshLabel = (mesh, label, offsetX, offsetY) => {
            if (!mesh || !mesh.visible) {
                if (label) label.style.display = 'none';
                return;
            }
            const pos = new THREE.Vector3();
            mesh.getWorldPosition(pos);
            const upVec = new THREE.Vector3(0, 1, 0).applyEuler(this.player.rotation);
            const rightVec = new THREE.Vector3(1, 0, 0).applyEuler(this.player.rotation);
            pos.addScaledVector(rightVec, offsetX);
            pos.addScaledVector(upVec, offsetY);
            pos.project(this.camera);
            if (pos.z < 1 && pos.z > -1) {
                label.style.display = 'block';
                label.style.left = (pos.x * widthHalf + widthHalf) + 'px';
                label.style.top = (-pos.y * heightHalf + heightHalf) + 'px';
            } else {
                label.style.display = 'none';
            }
        };

        // Distinct left/right offsets so Importin and RanGTP/RanGDP don't collide
        updateMeshLabel(this.importinMesh, this.importinLabel, -4, 4);
        updateMeshLabel(this.gtpMesh, this.ranGTPLabel, 4, 4);
        updateMeshLabel(this.gdpMesh, this.ranGDPLabel, 4, 4);
        updateMeshLabel(this.piMesh, this.piLabel, 0, 3);
    }

    createUI() {
        this.uiContainer = document.createElement('div');
        this.uiContainer.style.position = 'absolute';
        this.uiContainer.style.bottom = '20px';
        this.uiContainer.style.left = '20px';
        this.uiContainer.style.color = 'white';
        this.uiContainer.style.fontFamily = 'monospace';
        this.uiContainer.style.fontSize = '24px';
        this.uiContainer.style.textShadow = '2px 2px 0 #000';
        this.uiContainer.style.zIndex = '1000';
        this.uiContainer.innerHTML = 'Boost: <span id="l3-boost">100</span>%<br/><span style="font-size:16px;">Move: WASD | Look: Mouse (Click to Lock) | Boost: Shift</span>';
        document.body.appendChild(this.uiContainer);
        
        this.spamBarContainer = document.createElement('div');
        this.spamBarContainer.style.position = 'absolute';
        this.spamBarContainer.style.top = '85%';
        this.spamBarContainer.style.left = '50%';
        this.spamBarContainer.style.transform = 'translate(-50%, -50%)';
        this.spamBarContainer.style.width = '400px';
        this.spamBarContainer.style.height = '40px';
        this.spamBarContainer.style.border = '4px solid white';
        this.spamBarContainer.style.borderRadius = '20px';
        this.spamBarContainer.style.display = 'none';
        this.spamBarContainer.style.boxShadow = '0 0 10px #fff';
        this.spamBarContainer.style.zIndex = '1000';
        document.body.appendChild(this.spamBarContainer);
        
        this.spamBarFill = document.createElement('div');
        this.spamBarFill.style.width = '0%';
        this.spamBarFill.style.height = '100%';
        this.spamBarFill.style.backgroundColor = '#00ffcc';
        this.spamBarFill.style.borderRadius = '15px';
        this.spamBarFill.style.transition = 'width 0.1s linear';
        this.spamBarContainer.appendChild(this.spamBarFill);
        
        this.spamPrompt = document.createElement('div');
        this.spamPrompt.style.position = 'absolute';
        this.spamPrompt.style.top = '-60px';
        this.spamPrompt.style.left = '50%';
        this.spamPrompt.style.transform = 'translateX(-50%)';
        this.spamPrompt.style.width = 'auto';
        this.spamPrompt.style.textAlign = 'center';
        this.spamPrompt.style.whiteSpace = 'nowrap';
        this.spamPrompt.style.color = 'white';
        this.spamPrompt.style.fontFamily = 'monospace';
        this.spamPrompt.style.fontSize = '24px';
        this.spamPrompt.style.textShadow = '2px 2px 0 #000';
        this.spamPrompt.innerText = 'SPAM [SHIFT]!';
        this.spamBarContainer.appendChild(this.spamPrompt);
        
        this.messageBanner = document.createElement('div');
        this.messageBanner.style.position = 'absolute';
        this.messageBanner.style.top = '100px';
        this.messageBanner.style.width = '100%';
        this.messageBanner.style.textAlign = 'center';
        this.messageBanner.style.color = '#00ffcc';
        this.messageBanner.style.fontFamily = 'monospace';
        this.messageBanner.style.fontSize = '40px';
        this.messageBanner.style.fontWeight = 'bold';
        this.messageBanner.style.textShadow = '2px 2px 4px #000';
        this.messageBanner.style.display = 'none';
        document.body.appendChild(this.messageBanner);

        this.reticle = document.createElement('div');
        this.reticle.style.position = 'absolute';
        this.reticle.style.top = '50%';
        this.reticle.style.left = '50%';
        this.reticle.style.width = '10px';
        this.reticle.style.height = '10px';
        this.reticle.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        this.reticle.style.borderRadius = '50%';
        this.reticle.style.transform = 'translate(-50%, -50%)';
        this.reticle.style.pointerEvents = 'none';
        document.body.appendChild(this.reticle);
    }

    cleanup() {
        this.isActive = false;
        this.scene.remove(this.group);
        if (this.uiContainer && this.uiContainer.parentNode) this.uiContainer.parentNode.removeChild(this.uiContainer);
        if (this.spamBarContainer && this.spamBarContainer.parentNode) this.spamBarContainer.parentNode.removeChild(this.spamBarContainer);
        if (this.messageBanner && this.messageBanner.parentNode) this.messageBanner.parentNode.removeChild(this.messageBanner);
        if (this.importinLabel && this.importinLabel.parentNode) this.importinLabel.parentNode.removeChild(this.importinLabel);
        if (this.ranGTPLabel && this.ranGTPLabel.parentNode) this.ranGTPLabel.parentNode.removeChild(this.ranGTPLabel);
        if (this.ranGDPLabel && this.ranGDPLabel.parentNode) this.ranGDPLabel.parentNode.removeChild(this.ranGDPLabel);
        if (this.piLabel && this.piLabel.parentNode) this.piLabel.parentNode.removeChild(this.piLabel);
        if (this.gapLabel && this.gapLabel.parentNode) this.gapLabel.parentNode.removeChild(this.gapLabel);
        if (this.reticle && this.reticle.parentNode) this.reticle.parentNode.removeChild(this.reticle);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('click', this.handleClick);
        window.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('contextmenu', this.handleContextMenu);
        try {
            document.exitPointerLock();
        } catch(e) {}
        document.body.style.cursor = 'default';
    }

    showMessage(msg, persist=false) {
        this.messageBanner.innerText = msg;
        this.messageBanner.style.display = 'block';
        if (!persist) {
            setTimeout(() => {
                this.messageBanner.style.display = 'none';
            }, 4000);
        }
    }

    startMinigame(type) {
        this.minigame.active = true;
        this.minigame.type = type;
        this.minigame.progress = 0;
        this.minigame.smoothProgress = 0;
        this.spamBarContainer.style.display = 'block';
        
        if (type === 'gap') {
            this.spamPrompt.innerText = "SPAM [LEFT CLICK] TO DETACH RanGAP & HYDROLYZE!";
        } else if (type === 'release') {
            this.spamPrompt.innerText = "SPAM [LEFT CLICK] TO RELEASE IMPORTIN!";
        }
    }

    endMinigame() {
        const finishedType = this.minigame.type;
        this.minigame.active = false;
        this.spamBarContainer.style.display = 'none';
        this.minigame.type = null;
        
        if (finishedType === 'gap') {
            this.flags.passedZone1 = true;
            this.gtpMesh.visible = false;
            this.gdpMesh.visible = true;
            
            // Remove the glowing outline when collected/finished
            if (this.gapOutline) {
                this.gapMolecule.remove(this.gapOutline);
                this.gapOutline = null;
            }
            this.gapMolecule.material.emissive.setHex(0x000000);
            
            this.piMesh.visible = true;
            this.piVelocity = new THREE.Vector3((Math.random()-0.5)*10, 10, (Math.random()-0.5)*10);
            
            this.gapVelocity = new THREE.Vector3(0, 15, -10);
            
            this.showMessage("Once more!!!", false);
            this.startMinigame('release');
        } else if (finishedType === 'release') {
            this.flags.passedZone2 = true;
            
            this.ranVelocity = new THREE.Vector3(10, 10, 0); 
            this.ranVelocity.applyEuler(this.player.rotation);
            this.showMessage("Congrats on completing the game!", true);
            
            setTimeout(() => {
                this.winLevel();
            }, 6000);
        }
    }

    handleMinigame(delta) {
        this.minigame.progress -= this.minigame.decayRate * delta;
        this.minigame.progress = Math.max(0, this.minigame.progress);
        
        this.minigame.smoothProgress = THREE.MathUtils.lerp(this.minigame.smoothProgress, this.minigame.progress, 4 * delta);
        
        this.spamBarFill.style.width = (this.minigame.smoothProgress * 100) + '%';
        
        if (this.minigame.type === 'gap') {
            const up = new THREE.Vector3(0, 1, 0).applyEuler(this.player.rotation);
            const forward = new THREE.Vector3(0, 0, -5).applyEuler(this.player.rotation);
            const targetPos = this.player.position.clone().add(forward);
            const heightOffset = 15 * (1 - this.minigame.smoothProgress);
            targetPos.addScaledVector(up, heightOffset);
            
            this.gapMolecule.position.lerp(targetPos, 8 * delta);
            
        } else if (this.minigame.type === 'release') {
            const startX = 0;
            const targetX = 5;
            this.actors.ranBase.position.x = startX + (targetX - startX) * this.minigame.smoothProgress;
        }
        
        if (this.minigame.progress >= 0.99) {
            this.endMinigame();
        }
    }

    handleInput(delta) {
        // Rotation is now handled directly by PointerLock in handleMouseMove
        
        this.player.rotation.set(this.targetPitch, this.targetYaw, 0, 'YXZ');

        const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.player.rotation);
        const right = new THREE.Vector3(1, 0, 0).applyEuler(this.player.rotation);
        
        let moveDir = new THREE.Vector3();
        if (this.keys['w'] || this.keys['ArrowUp']) moveDir.add(forward);
        if (this.keys['s'] || this.keys['ArrowDown']) moveDir.sub(forward);
        if (this.keys['a'] || this.keys['ArrowLeft']) moveDir.sub(right);
        if (this.keys['d'] || this.keys['ArrowRight']) moveDir.add(right);
        
        if (moveDir.length() > 0) moveDir.normalize();

        let currentMaxSpeed = this.playerStats.maxSpeed;
        if (this.keys['shift'] && this.playerStats.boostEnergy > 0) {
            currentMaxSpeed = 160; 
            this.playerStats.boostEnergy = Math.max(0, this.playerStats.boostEnergy - 50 * delta);
            this.boostMat.opacity = 1;
        } else {
            this.boostMat.opacity = 0;
            if (!this.keys['shift']) {
                this.playerStats.boostEnergy = Math.min(100, this.playerStats.boostEnergy + 10 * delta);
            }
        }

        const boostSpan = document.getElementById('l3-boost');
        if (boostSpan) boostSpan.innerText = Math.floor(this.playerStats.boostEnergy);

        if (moveDir.length() > 0) {
            this.playerStats.velocity += this.playerStats.acceleration * delta;
            this.currentMoveDir.copy(moveDir);
        } else {
            this.playerStats.velocity -= this.playerStats.deceleration * delta;
        }

        this.playerStats.velocity = Math.max(0, Math.min(currentMaxSpeed, this.playerStats.velocity));
        
        if (this.playerStats.velocity > 0) {
            this.player.position.addScaledVector(this.currentMoveDir, this.playerStats.velocity * delta);
        }
        
        const limit = 1500;
        if(this.player.position.x > limit) this.player.position.x = limit;
        if(this.player.position.x < -limit) this.player.position.x = -limit;
        if(this.player.position.y > limit) this.player.position.y = limit;
        if(this.player.position.y < -limit) this.player.position.y = -limit;
        if(this.player.position.z > limit) this.player.position.z = limit;
        if(this.player.position.z < -limit) this.player.position.z = -limit;
    }

    update(delta, time) {
        if (!this.isActive) return;
        this.time = time;
        
        if (!this.flags.passedZone2) {
            this.handleInput(delta);
        }
        
        if (this.minigame.active) {
            this.handleMinigame(delta);
        }
        
        this.playerVisual.position.y = Math.sin(time * 5) * 0.2;
        this.playerVisual.rotation.z = Math.sin(time * 3) * 0.05; 
        
        if (this.gapMolecule && !this.flags.passedZone1 && !this.minigame.active) {
            this.gapMolecule.rotation.y += delta;
            this.gapMolecule.rotation.z += delta * 0.5;
            
            // Make GAP slowly move away from the player
            const dist = this.player.position.distanceTo(this.gapMolecule.position);
            if (dist < 300) { // Start fleeing sooner
                const fleeDir = new THREE.Vector3().subVectors(this.gapMolecule.position, this.player.position).normalize();
                this.gapMolecule.position.addScaledVector(fleeDir, 50 * delta); // Slightly decreased flee speed
                
                // Keep it strictly within the dense organelle area
                this.gapMolecule.position.x = Math.max(-250, Math.min(250, this.gapMolecule.position.x));
                this.gapMolecule.position.y = Math.max(-250, Math.min(250, this.gapMolecule.position.y));
                this.gapMolecule.position.z = Math.max(-500, Math.min(-50, this.gapMolecule.position.z));
            }
            
            if (dist < 25) {
                this.startMinigame('gap');
            }
        }
        
        this.organelles.forEach(org => {
            org.mesh.rotation.x += org.rx;
            org.mesh.rotation.y += org.ry;
        });
        
        if (this.flags.passedZone1) {
            if (this.piVelocity) {
                this.piMesh.position.addScaledVector(this.piVelocity, delta);
                this.piVelocity.y -= 20 * delta;
            }
            if (this.gapVelocity) {
                this.gapMolecule.position.addScaledVector(this.gapVelocity, delta);
                this.gapMolecule.rotation.x += delta * 5;
            }
        }
        
        if (this.flags.passedZone2) {
            if (this.ranVelocity) {
                this.actors.ranBase.position.addScaledVector(this.ranVelocity, delta);
                this.ranVelocity.y += 5 * delta;
            }
            const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.player.rotation);
            this.player.position.addScaledVector(forward, 150 * delta);
        }

        const localOffset = new THREE.Vector3(0, 8, 25);
        localOffset.applyEuler(this.player.rotation);
        const targetCamPos = this.player.position.clone().add(localOffset);
        
        this.camera.position.lerp(targetCamPos, 8 * delta);
        
        const lookAhead = new THREE.Vector3(0, 3, -10).applyEuler(this.player.rotation);
        const lookTarget = this.player.position.clone().add(lookAhead);
        
        this.camera.lookAt(lookTarget);

        this.updateLabels();
    }

    winLevel() {
        this.isActive = false;
        
        this.cleanup();
        if (window.quitLevel3) window.quitLevel3();
        if (window.showVictoryScreen) window.showVictoryScreen();
    }
}
