import * as THREE from 'three';
import { uiState } from '../ui.js';
import { playJumpSound, playDeathSound } from '../audio.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export class Level2 {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.isActive = false;
        this.isDead = false;
        
        this.player = null;
        this.playerMat = null;
        this.platforms = [];
        this.floatingRings = [];
        this.portals = this.floatingRings;
        this.backgroundScrollers = [];
        
        this.jumpForce = 55; // Bigger jump
        this.playerVelY = 0;
        this.isGrounded = false;
        
        this.gravityMode = 'down'; // 'down' or 'up'
        this.currentGravity = -110; // Floatier jump
        
        this.levelDistance = 0; 
        this.maxDistance = 1000; 
        this.scrollSpeed = 30; 
        
        this.keys = { ' ': false };
        this.spacePressed = false; 
        
        this.hud = document.getElementById('level2-hud');
        this.progressDisplay = document.getElementById('l2-progress');
        
        this.importinCargoLabel = null;
        this.fgRepeatBottomLabel = null;
        this.fgRepeatTopLabel = null;
        this.labelTimer = 0;
        this.floorPlatformMesh = null;
        this.ceilPlatformMesh = null;
        
        this.floorY = -10;
        this.ceilY = 10;
    }

    start() {
        this.isActive = true;
        this.hud.style.display = 'block';
        this.levelDistance = 0;
        this.playerVelY = 0;
        this.gravityMode = 'down';
        this.currentGravity = -110;
        
        this.isWinning = false;
        this.winSpeed = this.scrollSpeed;
        this.spinSpeed = 0;
        this.bgLerp = 0;
        
        if (this.scene) {
            this.scene.background = new THREE.Color(0x20a096); // Reset to Turquoise
        }
        
        this.platforms = [];
        this.floatingRings = [];
        this.portals = this.floatingRings;
        this.backgroundScrollers = [];
        
        this.camera.position.set(0, 0, 30);
        this.camera.lookAt(0, 0, 0);

        // Turquoise background
        this.scene.background = new THREE.Color(0x20a096);
        this.scene.fog = new THREE.FogExp2(0x20a096, 0.015);

        this.initSharedAssets();
        this.createEnvironment();
        this.createPlayer();
        
        this.labelTimer = 4.5;
        this.importinCargoLabel = this.createLabel("Importin-Cargo Complex", "#c084fc");
        this.fgRepeatBottomLabel = this.createLabel("FG-repeats", "#22ff22");
        this.fgRepeatTopLabel = this.createLabel("FG-repeats", "#22ff22");

        const styleFG = (lbl) => {
            lbl.style.fontSize = '1.7rem';
            lbl.style.padding = '8px 20px';
            lbl.style.letterSpacing = '2px';
            lbl.style.border = '2px solid #22ff22';
            lbl.style.boxShadow = '0 0 15px rgba(34, 255, 34, 0.7)';
        };
        styleFG(this.fgRepeatBottomLabel);
        styleFG(this.fgRepeatTopLabel);

        const floorP = this.platforms.find(p => p.y < 0);
        const ceilP = this.platforms.find(p => p.y > 0);
        if (floorP) this.floorPlatformMesh = floorP.mesh;
        if (ceilP) this.ceilPlatformMesh = ceilP.mesh;

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

    initSharedAssets() {
        // Strand geometry needs unique instances because its vertices are modified (bent by wind)
        // However, we can cache the base geometry and clone it, or at least cache the material
        this.sharedMats = {
            strand: new THREE.MeshStandardMaterial({ color: 0x22ff22, emissive: 0x005500, roughness: 0.4 }),
            portalOuter: new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
            portalInnerUp: new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide }),
            portalInnerDown: new THREE.MeshBasicMaterial({ color: 0xff8800, side: THREE.DoubleSide })
        };
        
        this.sharedGeos = {
            portalOuter: new THREE.TorusGeometry(3.5, 0.4, 8, 24),
            portalInner: new THREE.CircleGeometry(3.2, 24),
            explosionPart: new THREE.TetrahedronGeometry(1)
        };
    }

    cleanup() {
        this.isActive = false;
        this.hud.style.display = 'none';
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        
        if (this.importinCargoLabel && this.importinCargoLabel.parentNode) {
            this.importinCargoLabel.parentNode.removeChild(this.importinCargoLabel);
            this.importinCargoLabel = null;
        }
        if (this.fgRepeatBottomLabel && this.fgRepeatBottomLabel.parentNode) {
            this.fgRepeatBottomLabel.parentNode.removeChild(this.fgRepeatBottomLabel);
            this.fgRepeatBottomLabel = null;
        }
        if (this.fgRepeatTopLabel && this.fgRepeatTopLabel.parentNode) {
            this.fgRepeatTopLabel.parentNode.removeChild(this.fgRepeatTopLabel);
            this.fgRepeatTopLabel = null;
        }

        if (this.player) this.scene.remove(this.player);
        this.platforms.forEach(p => this.scene.remove(p.mesh));
        this.floatingRings.forEach(r => this.scene.remove(r.mesh));
        this.backgroundScrollers.forEach(bg => this.scene.remove(bg.mesh));
    }

    createEnvironment() {
        // Continuous Nuclear Membrane (Red, Rounded)
        const membraneLength = this.maxDistance * 1.01 + 50; 
        const centerX = (this.maxDistance * 1.01 - 50) / 2;
        const membraneGeo = new RoundedBoxGeometry(membraneLength, 74, 12, 8, 5);
        const membraneMat = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5 }); 
        
        const floorMembrane = new THREE.Mesh(membraneGeo, membraneMat);
        floorMembrane.castShadow = true;
        floorMembrane.receiveShadow = true;
        floorMembrane.position.set(centerX, -52, 0); // Z=0 perfectly engulfs the strands
        this.scene.add(floorMembrane);
        this.backgroundScrollers.push({ mesh: floorMembrane });

        const ceilMembrane = new THREE.Mesh(membraneGeo, membraneMat);
        ceilMembrane.castShadow = true;
        ceilMembrane.receiveShadow = true;
        ceilMembrane.position.set(centerX, 52, 0);
        this.scene.add(ceilMembrane);
        this.backgroundScrollers.push({ mesh: ceilMembrane });

        this.generateSide(this.floorY);
        this.generateSide(this.ceilY);
        
        this.spawnFloatingRing(200);
        this.spawnFloatingRing(400);
        this.spawnFloatingRing(600);
        this.spawnFloatingRing(800);
    }

    generateSide(y) {
        let currentX = -30;
        let isFirst = true;
        
        while (currentX < this.maxDistance) {
            let length = 15 + Math.random() * 20; // Slightly longer platforms (15 to 35)
            let gap = 12 + Math.random() * 12; 
            
            if (isFirst) {
                length = 90; // 3 seconds at 30 speed = 90 units
                gap = 12;
                isFirst = false;
            }
            
            // Continuous sequence at the end (from 95% to 100%)
            if (currentX > this.maxDistance * 0.90) {
                length = this.maxDistance - currentX;
                gap = 0;
            } else {
                // Do NOT create massive stretches near flips, just a medium guarantee
                let nextX = currentX + length + gap;
                for (let flip = 200; flip <= 800; flip += 200) {
                    if (currentX < flip && nextX > flip - 10) {
                        length = 20; // Just a medium landing pad
                        gap = 0;
                    }
                }
            }

            // Cap the platform length so it doesn't stick out past the end
            if (currentX + length > this.maxDistance) {
                length = this.maxDistance - currentX;
            }
            
            if (length > 0) {
                this.spawnPlatform(y, currentX, length);
            }
            currentX += length + gap;
        }
    }

    spawnPlatform(y, startX, length) {
        const platformGroup = new THREE.Group();
        const numStrands = Math.max(2, Math.floor(length / 1.5));
        const isFloor = (y < 0);
        const strandHeight = 12; 
        
        const strandGeo = new THREE.CylinderGeometry(0.3, 0.3, strandHeight, 6, 8, false);
        const posAttribute = strandGeo.attributes.position;
        for (let i = 0; i < posAttribute.count; i++) {
            const vY = posAttribute.getY(i);
            posAttribute.setX(i, posAttribute.getX(i) + Math.sin(vY) * 0.6);
        }
        strandGeo.computeVertexNormals();
        
        // Store original positions for wind/bending animation
        strandGeo.userData.originalPositions = Float32Array.from(posAttribute.array);

        const strandMat = this.sharedMats.strand;
        
        for (let i = 0; i <= numStrands; i++) {
            const strand = new THREE.Mesh(strandGeo, strandMat);
            strand.castShadow = true;
            strand.receiveShadow = true;
            const localX = - (length / 2) + (i * (length / numStrands));
            const localY = isFloor ? y - (strandHeight/2) + 1 : y + (strandHeight/2) - 1;
            
            strand.position.set(localX, localY, (Math.random() - 0.5) * 3);
            // DO NOT rotate around Y! Random Y rotation causes local X geometry bending to point in random world directions.
            strand.rotation.z = (Math.random() - 0.5) * 0.1; 
            
            platformGroup.add(strand);
        }

        platformGroup.position.set(startX + length / 2, 0, 0);
        this.scene.add(platformGroup);
        // Save geo reference for vertex animation
        this.platforms.push({ mesh: platformGroup, geo: strandGeo, length: length, y: y, startX: startX });
    }

    spawnFloatingRing(x) {
        const geo = new THREE.TorusGeometry(6, 0.8, 16, 32);
        // Luminous cyan floating ring in the nuclear pore
        const color = 0x00ffff;
        const mat = new THREE.MeshStandardMaterial({ 
            color: color, 
            emissive: color, 
            emissiveIntensity: 0.5, 
            roughness: 0.2 
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.scale.set(0.4, 1, 1);
        mesh.position.set(x, 0, 0);
        this.scene.add(mesh);
        this.floatingRings.push({ mesh: mesh });
    }

    spawnGravityPortal(x, mode) {
        this.spawnFloatingRing(x);
    }

    createPlayer() {
        this.player = new THREE.Group();

        let playerMat;
        if (uiState.skin === 'magma') {
            playerMat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff3300, emissiveIntensity: 0.8, roughness: 0.9 });
        } else if (uiState.skin === 'metal') {
            playerMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 1.0, roughness: 0.2 });
        } else {
            playerMat = new THREE.MeshPhysicalMaterial({ color: 0x8a2be2, clearcoat: 1.0 });
        }
        this.playerMat = playerMat;

        const impCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(1.5, 1, 0), new THREE.Vector3(0, 1, 0.5), 
            new THREE.Vector3(-1.5, 0, 0), new THREE.Vector3(0, -1, -0.5), new THREE.Vector3(1.5, -1, 0)
        ], false, 'chordal', 0.8);
        const impGeo = new THREE.TubeGeometry(impCurve, 32, 0.5, 16, false);
        const importin = new THREE.Mesh(impGeo, playerMat);
        importin.castShadow = true;
        importin.receiveShadow = true;
        
        const nlsGroup = new THREE.Group();
        const bodyGeo = new THREE.IcosahedronGeometry(1.5, 1);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.3 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        body.receiveShadow = true;
        const tailCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(1.0, 0, 0), new THREE.Vector3(1.5, 0.5, 0), new THREE.Vector3(2.5, 0, 0)
        ]);
        const tailGeo = new THREE.TubeGeometry(tailCurve, 10, 0.2, 8, false);
        const tailMat = new THREE.MeshBasicMaterial({ color: 0x55ff55 }); 
        const tail = new THREE.Mesh(tailGeo, tailMat);
        tail.castShadow = true;
        tail.receiveShadow = true;
        
        nlsGroup.add(body);
        nlsGroup.add(tail);
        nlsGroup.position.set(0, 0, 0);

        this.player.add(importin);
        this.player.add(nlsGroup);
        
        this.player.position.set(0, this.floorY + 2, 0); // Player stays at X=0
        this.scene.add(this.player);
    }

    onKeyDown = (e) => {
        if(this.keys.hasOwnProperty(e.key)) {
            if (e.key === ' ' && !this.keys[' ']) {
                this.spacePressed = true;
            }
            this.keys[e.key] = true;
        }
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

        this.levelDistance += this.scrollSpeed * delta;
        const progressRaw = this.levelDistance / this.maxDistance;
        const progressPct = Math.min(100, progressRaw * 100);
        this.progressDisplay.innerText = `Distance: ${Math.floor(progressPct)}%`;

        if (progressRaw >= 0.98) {
            if (!this.bgLerp) this.bgLerp = 0;
            this.bgLerp += delta * 0.4; // 2.5 seconds to fully transition
            if (this.bgLerp > 1) this.bgLerp = 1;
            
            const startColor = new THREE.Color(0x20a096); // Turquoise
            const endColor = new THREE.Color(0xa080ff);   // Lavender
            this.scene.background.copy(startColor).lerp(endColor, this.bgLerp);
        }

        if (this.levelDistance >= this.maxDistance && !this.isWinning) {
            this.isWinning = true;
            this.winTimer = 0;
            this.winSpeed = this.scrollSpeed;
            this.spinSpeed = 0;
            this.winTriggered = false;
            this.portals.forEach(p => p.mesh.visible = false);
            if (window.flashText) window.flashText("Successfully entered the nucleus", "#33ff33");
        }

        if (this.isWinning) {
            this.winTimer += delta;
            
            // Decelerate the world scroll to smoothly stop
            if (this.winSpeed > 0) {
                this.winSpeed -= 10 * delta; 
                if (this.winSpeed < 0) this.winSpeed = 0;
            }
            // Smoothly ramp up the spin
            if (this.spinSpeed < 3.0) {
                this.spinSpeed += 1.5 * delta;
            }
            
            // MC slowly drifts off and rotates
            this.player.position.x += 8 * delta; // Drifting rightwards off screen
            this.player.rotation.z -= this.spinSpeed * delta;
            this.player.rotation.x += this.spinSpeed * 0.7 * delta;
            
            // Keep scrolling platforms at slowing speed
            for (let p of this.platforms) {
                p.mesh.position.x -= this.winSpeed * delta;
            }
            // Keep scrolling portals at slowing speed
            for (let p of this.portals) {
                p.mesh.position.x -= this.winSpeed * delta;
            }
            // Keep scrolling background membranes at slowing speed
            for (let bg of this.backgroundScrollers) {
                bg.mesh.position.x -= this.winSpeed * delta;
            }
            
            if (this.winTimer > 3.0 && !this.winTriggered) {
                this.winTriggered = true;
                this.win();
            }
            return; // Skip normal gameplay logic (gravity, jumping, death)
        }

        if (uiState.skin === 'magma' && this.playerMat) {
            this.playerMat.emissiveIntensity = 0.5 + Math.sin(time * 5) * 0.5;
        }

        // Auto Gravity Flip Logic
        const currentPhase = Math.floor(this.levelDistance / 200);
        const targetGravityMode = (currentPhase % 2 === 0) ? 'down' : 'up';
        if (this.gravityMode !== targetGravityMode) {
            this.gravityMode = targetGravityMode;
            this.currentGravity = (this.gravityMode === 'down') ? -110 : 110;
        }

        // Jump
        if (this.spacePressed) {
            this.spacePressed = false;
            if (this.isGrounded) {
                playJumpSound();
                this.playerVelY = (this.gravityMode === 'down') ? this.jumpForce : -this.jumpForce;
                this.isGrounded = false;
            }
        }

        this.playerVelY += this.currentGravity * delta;
        this.player.position.y += this.playerVelY * delta;

        // Predict jump landing position for FG reactivity
        let focusX = 0;
        if (!this.isGrounded) {
            const a = 0.5 * this.currentGravity;
            const v = this.playerVelY;
            const targetY = (this.gravityMode === 'down') ? this.floorY + 1.5 : this.ceilY - 1.5;
            const dy = targetY - this.player.position.y;
            
            // a t^2 + v t - dy = 0
            const discriminant = v * v + 4 * a * dy;
            if (discriminant >= 0) {
                const t1 = (-v + Math.sqrt(discriminant)) / (2 * a);
                const t2 = (-v - Math.sqrt(discriminant)) / (2 * a);
                const t = Math.max(t1, t2); // Future time to land
                if (t > 0 && t < 2) { // Cap prediction at 2 seconds
                    focusX = t * this.scrollSpeed;
                }
            }
        }

        // Platform Collision & Animation
        let grounded = false;
        for (let p of this.platforms) {
            p.mesh.position.x -= this.scrollSpeed * delta;
            
            const pStart = p.mesh.position.x - p.length / 2;
            const pEnd = p.mesh.position.x + p.length / 2;
            
            // Check if player (at X=0) is horizontally over the platform
            if (0 >= pStart && 0 <= pEnd) {
                if (this.gravityMode === 'down' && p.y === this.floorY) {
                    if (this.player.position.y <= this.floorY + 1.5 && this.playerVelY <= 0) {
                        this.player.position.y = this.floorY + 1.5;
                        this.playerVelY = 0;
                        grounded = true;
                    }
                } else if (this.gravityMode === 'up' && p.y === this.ceilY) {
                    if (this.player.position.y >= this.ceilY - 1.5 && this.playerVelY >= 0) {
                        this.player.position.y = this.ceilY - 1.5;
                        this.playerVelY = 0;
                        grounded = true;
                    }
                }
            }

            // FG Reactivity Animation (Bend like grass)
            const isFloorPlatform = (p.y < 0);
            const isPlayerOnFloor = (this.gravityMode === 'down');
            
            // Distance relative to the predicted landing spot!
            const dist = p.mesh.position.x - focusX; 
            
            let bend = 0;
            // Expanded radius for magnetic attraction feel
            if (isFloorPlatform === isPlayerOnFloor && Math.abs(dist) < 35) {
                const normalizedDist = Math.abs(dist) / 35;
                const force = Math.pow(1 - normalizedDist, 2); // Quadratic falloff
                bend = -Math.sign(dist) * force * 5.0; // Max bend strength
            }
            
            const geo = p.geo;
            const orig = geo.userData.originalPositions;
            const pos = geo.attributes.position.array;
            
            let changed = false;
            for (let i = 0; i < pos.length; i += 3) {
                const origX = orig[i];
                const vY = pos[i+1];
                
                // Weight: 0 at base, 1 at tip
                const weight = isFloorPlatform ? Math.max(0, (vY + 6) / 12) : Math.max(0, (6 - vY) / 12);
                const targetX = origX + bend * Math.pow(weight, 3); // Cubic curve for top-heavy bend
                
                // Slower lerp for a smooth magnetic pull and release
                if (Math.abs(pos[i] - targetX) > 0.005) {
                    pos[i] += (targetX - pos[i]) * 3.5 * delta; 
                    changed = true;
                }
            }
            if (changed) {
                geo.attributes.position.needsUpdate = true;
            }
        }
        this.isGrounded = grounded;

        // Player rotation based on velocity
        this.player.rotation.z = this.playerVelY * 0.015;

        // Floating rings update
        for (let r of this.floatingRings) {
            r.mesh.position.x -= this.scrollSpeed * delta;
            r.mesh.rotation.x += delta * 2;
        }

        // Background Scrollers update
        for (let bg of this.backgroundScrollers) {
            bg.mesh.position.x -= this.scrollSpeed * delta;
        }

        // Death by touching the red membrane (at y = -12 and y = 12)
        // Player radius is 1, so touching happens at -11 and 11.
        if (this.player.position.y < -11 || this.player.position.y > 11) {
            this.die();
            return;
        }

        this.updateLabels(delta);
    }

    updateLabels(delta) {
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;

        if (this.labelTimer > 0) {
            this.labelTimer -= delta;
            const opacity = this.labelTimer <= 1.2 ? Math.max(0, this.labelTimer / 1.2).toFixed(2) : '1';
            
            // 1. Importin-Cargo Complex label
            if (this.player && this.player.visible && this.importinCargoLabel) {
                this.importinCargoLabel.style.opacity = opacity;
                const pos = this.player.position.clone();
                pos.y += 3.5;
                pos.project(this.camera);
                if (pos.z < 1 && pos.z > -1) {
                    this.importinCargoLabel.style.display = 'block';
                    this.importinCargoLabel.style.left = (pos.x * widthHalf + widthHalf) + 'px';
                    this.importinCargoLabel.style.top = (-pos.y * heightHalf + heightHalf) + 'px';
                } else {
                    this.importinCargoLabel.style.display = 'none';
                }
            } else if (this.importinCargoLabel) {
                this.importinCargoLabel.style.display = 'none';
            }
            
            // 2. FG-repeats Bottom label (covers directly over the bottom strands)
            if (this.floorPlatformMesh && this.fgRepeatBottomLabel) {
                this.fgRepeatBottomLabel.style.opacity = opacity;
                const pos = this.floorPlatformMesh.position.clone();
                pos.y = this.floorY - 1.5;
                pos.x -= 12;
                pos.project(this.camera);
                if (pos.z < 1 && pos.z > -1) {
                    this.fgRepeatBottomLabel.style.display = 'block';
                    this.fgRepeatBottomLabel.style.left = (pos.x * widthHalf + widthHalf) + 'px';
                    this.fgRepeatBottomLabel.style.top = (-pos.y * heightHalf + heightHalf) + 'px';
                } else {
                    this.fgRepeatBottomLabel.style.display = 'none';
                }
            } else if (this.fgRepeatBottomLabel) {
                this.fgRepeatBottomLabel.style.display = 'none';
            }

            // 3. FG-repeats Top label (covers directly over the top strands)
            if (this.ceilPlatformMesh && this.fgRepeatTopLabel) {
                this.fgRepeatTopLabel.style.opacity = opacity;
                const pos = this.ceilPlatformMesh.position.clone();
                pos.y = this.ceilY + 1.5;
                pos.x -= 12;
                pos.project(this.camera);
                if (pos.z < 1 && pos.z > -1) {
                    this.fgRepeatTopLabel.style.display = 'block';
                    this.fgRepeatTopLabel.style.left = (pos.x * widthHalf + widthHalf) + 'px';
                    this.fgRepeatTopLabel.style.top = (-pos.y * heightHalf + heightHalf) + 'px';
                } else {
                    this.fgRepeatTopLabel.style.display = 'none';
                }
            } else if (this.fgRepeatTopLabel) {
                this.fgRepeatTopLabel.style.display = 'none';
            }
        } else {
            if (this.importinCargoLabel) this.importinCargoLabel.style.display = 'none';
            if (this.fgRepeatBottomLabel) this.fgRepeatBottomLabel.style.display = 'none';
            if (this.fgRepeatTopLabel) this.fgRepeatTopLabel.style.display = 'none';
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        
        if (this.importinCargoLabel) this.importinCargoLabel.style.display = 'none';
        if (this.fgRepeatBottomLabel) this.fgRepeatBottomLabel.style.display = 'none';
        if (this.fgRepeatTopLabel) this.fgRepeatTopLabel.style.display = 'none';
        
        if (window.flashText) window.flashText("CRASHED!", "#ff3333");
        playDeathSound();
        this.createExplosion(this.player.position, this.playerMat.color);
        this.player.visible = false;
        setTimeout(() => {
            // Restart level logic
            this.isDead = false;
            this.cleanup();
            this.start();
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
        
        if (this.importinCargoLabel) this.importinCargoLabel.style.display = 'none';
        if (this.fgRepeatBottomLabel) this.fgRepeatBottomLabel.style.display = 'none';
        if (this.fgRepeatTopLabel) this.fgRepeatTopLabel.style.display = 'none';
        
        setTimeout(() => {
            this.cleanup();
            if (window.showTutorial) {
                window.showTutorial('cutscene');
            } else {
                uiState.currentScreen = 'cutscene-screen';
                Object.values(document.querySelectorAll('.screen')).forEach(s => s.classList.remove('active'));
                document.getElementById('cutscene-screen').classList.add('active');
                if (window.startCutscene1) window.startCutscene1();
            }
        }, 500);
    }
}

