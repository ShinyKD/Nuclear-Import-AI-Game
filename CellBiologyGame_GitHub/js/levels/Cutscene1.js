import * as THREE from 'three';
import { uiState } from '../ui.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export class Cutscene1 {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.isActive = false;
        
        this.actors = {};
        this.labels = [];
        this.time = 0;
        this.duration = 26; 
    }

    start() {
        this.isActive = true;
        this.isPaused = false;
        this.time = 0;
        this.camera.position.set(-30, 0, 50); 
        this.camera.lookAt(-30, 0, 0);

        this.scene.background = new THREE.Color(0x1a3c40); // Cytoplasm
        this.scene.fog = new THREE.FogExp2(0x1a3c40, 0.010);

        this.createActors();

        this.phases = [0, 2, 5, 7.5, 10.5, 14, 17.5, 20.5];
        this.jumpToPhase = (targetTime) => {
            this.time = 0;
            this.actors.ntf2.position.set(-45, 0, 0);
            this.actors.ranBase.position.set(-30, 0.5, 0);
            this.actors.gef.position.set(30, 15, 0);
            this.actors.importin.position.set(45, 0, 0);
            this.actors.importin.rotation.set(0, 0, Math.PI / 2);
            this.actors.cargo.position.set(45, 0, 0);
            this.camera.position.set(-30, 0, 50);
            
            this.gdpMesh.visible = true;
            this.gtpMesh.visible = false;
            if(this.ranLabel) {
                this.ranLabel.innerText = "RanGDP";
                this.ranLabel.style.color = "#ff6666";
            }
            this.scene.background = new THREE.Color(0x1a3c40);
            
            const simStep = 0.05; // 20 ticks per second is enough for rough positions
            this.isSimulating = true;
            while (this.time < targetTime) {
                this.update(simStep);
            }
            this.isSimulating = false;
        };

        this.updateControlsHint = () => {
            const hint = document.getElementById('cutscene-controls-hint');
            if (!hint) return;
            if (this.isPaused) {
                hint.innerHTML = '<span style="color: #ffeb3b; font-weight: bold; background: rgba(255, 235, 59, 0.2); padding: 2px 8px; border-radius: 4px;">PAUSED</span> &nbsp;|&nbsp; Press <span style="color: #00ffff; font-weight: bold;">SPACE</span> to Resume &nbsp;|&nbsp; <span style="color: #00ffff; font-weight: bold;">&larr; / &rarr;</span> Steps';
                hint.style.borderColor = '#ffeb3b';
                hint.style.boxShadow = '0 0 15px rgba(255, 235, 59, 0.4)';
            } else {
                hint.innerHTML = '<span style="color: #00ffff; font-weight: bold;">SPACE</span>: Pause &nbsp;|&nbsp; <span style="color: #00ffff; font-weight: bold;">&larr;</span> Prev Step &nbsp;|&nbsp; <span style="color: #00ffff; font-weight: bold;">&rarr;</span> Next Step';
                hint.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                hint.style.boxShadow = '0 0 12px rgba(0,255,255,0.25)';
            }
        };
        this.updateControlsHint();

        this.keydownHandler = (e) => {
            if (e.code === 'Space') {
                this.isPaused = !this.isPaused;
                this.updateControlsHint();
            } else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
                let currentPhaseIndex = 0;
                for (let i = 0; i < this.phases.length; i++) {
                    // Find which phase we are currently in
                    const phaseStart = this.phases[i];
                    const phaseEnd = (i + 1 < this.phases.length) ? this.phases[i+1] : Infinity;
                    if (this.time >= phaseStart && this.time < phaseEnd) {
                        currentPhaseIndex = i;
                        break;
                    }
                }
                
                if (e.code === 'ArrowRight') {
                    if (currentPhaseIndex + 1 < this.phases.length) {
                        this.jumpToPhase(this.phases[currentPhaseIndex + 1]);
                    }
                } else if (e.code === 'ArrowLeft') {
                    const prevIndex = Math.max(0, currentPhaseIndex - 1);
                    this.jumpToPhase(this.phases[prevIndex]);
                }
                this.updateControlsHint();
            }
        };
        
        // Delay keydown attachment slightly so space press from tutorial screen doesn't immediately pause
        this.keydownTimeout = setTimeout(() => {
            if (this.isActive) {
                window.addEventListener('keydown', this.keydownHandler);
            }
        }, 150);
    }

    createLabel(text, color) {
        const div = document.createElement('div');
        div.className = 'actor-label';
        div.innerText = text;
        div.style.position = 'absolute';
        div.style.color = color;
        div.style.fontWeight = 'bold';
        div.style.fontSize = '1.2rem';
        div.style.textShadow = '1px 1px 2px black';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.zIndex = '1000';
        document.body.appendChild(div);
        return div;
    }

    createActors() {
        this.group = new THREE.Group();
        
        // 1. Horizontal Nuclear Pore (x = -17 to 17)
        const poreGroup = new THREE.Group();
        
        // Massive rounded membrane blocks (part of a giant sphere)
        const wallGeo = new RoundedBoxGeometry(34, 50, 20, 16, 10); 
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5 });
        
        // Top massive wall
        const topWall = new THREE.Mesh(wallGeo, wallMat);
        topWall.position.set(0, 33, 0); // Bottom edge around y=8 (33 - 25)
        poreGroup.add(topWall);
        
        // Bottom massive wall
        const bottomWall = new THREE.Mesh(wallGeo, wallMat);
        bottomWall.position.set(0, -33, 0); // Top edge around y=-8
        poreGroup.add(bottomWall);

        // FG repeats (wiggly like level 2)
        const fgMat = new THREE.MeshStandardMaterial({ color: 0x22ff22, emissive: 0x005500, roughness: 0.4 });
        const fgGeo = new THREE.CylinderGeometry(0.3, 0.3, 6, 6, 8, false);
        fgGeo.translate(0, 3, 0); // shift pivot to base
        const posAttribute = fgGeo.attributes.position;
        for (let i = 0; i < posAttribute.count; i++) {
            const vY = posAttribute.getY(i);
            posAttribute.setX(i, posAttribute.getX(i) + Math.sin(vY) * 0.6);
        }
        fgGeo.computeVertexNormals();

        this.fgRepeatsList = [];
        // Only place FG repeats on the flat central part so they don't float
        for(let i=0; i<6; i++) {
            const fgTop = new THREE.Mesh(fgGeo, fgMat);
            fgTop.position.set(-7.5 + i*3, 8, 0);
            fgTop.rotation.z = Math.PI; // point downwards
            fgTop.userData.baseRotZ = Math.PI;
            
            const fgBot = new THREE.Mesh(fgGeo, fgMat);
            fgBot.position.set(-7.5 + i*3, -8, 0);
            fgBot.userData.baseRotZ = 0;
            
            poreGroup.add(fgTop);
            poreGroup.add(fgBot);
            this.fgRepeatsList.push(fgTop, fgBot);
        }
        
        this.actors.pore = poreGroup;

        // 2. NTF-2 (Blue Cone)
        this.actors.ntf2 = new THREE.Group();
        const ntf2Geo = new THREE.CylinderGeometry(2.5, 1.2, 3.5, 32, 1, true);
        const ntf2Mat = new THREE.MeshStandardMaterial({ color: 0x6699ff, side: THREE.DoubleSide });
        const ntf2Shell = new THREE.Mesh(ntf2Geo, ntf2Mat);
        const ntf2BaseGeo = new THREE.CircleGeometry(1.2, 32);
        const ntf2Base = new THREE.Mesh(ntf2BaseGeo, ntf2Mat);
        ntf2Base.rotation.x = Math.PI / 2;
        ntf2Base.position.y = -1.75;
        this.actors.ntf2.add(ntf2Shell);
        this.actors.ntf2.add(ntf2Base);
        this.actors.ntf2.position.set(-45, 0, 0); // Start far left
        
        // 3. RanBase (Bumpy Green Ball)
        this.actors.ranBase = new THREE.Group();
        const ranGeo = new THREE.DodecahedronGeometry(1.4, 1);
        const ranMat = new THREE.MeshStandardMaterial({ color: 0x88dd88 }); 
        const ranMesh = new THREE.Mesh(ranGeo, ranMat);
        
        const gdpGeo = new THREE.CapsuleGeometry(0.5, 1.0, 8, 8);
        const gdpMat = new THREE.MeshStandardMaterial({ color: 0xff6666 }); 
        this.gdpMesh = new THREE.Mesh(gdpGeo, gdpMat);
        this.gdpMesh.rotation.z = Math.PI / 2;
        this.gdpMesh.position.set(0, 1.2, 1.0); 
        
        const gtpGeo = new THREE.CapsuleGeometry(0.5, 1.0, 8, 8);
        const gtpMat = new THREE.MeshStandardMaterial({ color: 0xffff00 }); 
        this.gtpMesh = new THREE.Mesh(gtpGeo, gtpMat); 
        this.gtpMesh.rotation.z = Math.PI / 2;
        this.gtpMesh.position.set(0, 1.2, 1.0);
        this.gtpMesh.visible = false;
        
        this.actors.ranBase.add(ranMesh);
        this.actors.ranBase.add(this.gdpMesh);
        this.actors.ranBase.add(this.gtpMesh);
        this.actors.ranBase.position.set(-30, 0.5, 0); 
        
        // 4. GEF (Orange Ring)
        const gefGeo = new THREE.TorusGeometry(2.5, 1, 16, 32);
        const gefMat = new THREE.MeshStandardMaterial({ color: 0xff8800 });
        this.actors.gef = new THREE.Mesh(gefGeo, gefMat);
        this.actors.gef.position.set(30, 15, 0); // Hidden initially

        // 5. Importin (Purple Crescent)
        const impGeo = new THREE.TorusGeometry(3, 1.2, 16, 32, Math.PI);
        const impMat = new THREE.MeshStandardMaterial({ color: 0x8a2be2 });
        this.actors.importin = new THREE.Mesh(impGeo, impMat);
        this.actors.importin.rotation.z = Math.PI / 2; 
        this.actors.importin.position.set(45, 0, 0); // Hidden right initially
        
        // 6. Cargo (Orange Ball)
        const cargoGeo = new THREE.SphereGeometry(1.8, 16, 16);
        const cargoMat = new THREE.MeshStandardMaterial({ color: 0xffa500 });
        this.actors.cargo = new THREE.Mesh(cargoGeo, cargoMat);
        this.actors.cargo.position.set(45, 0, 0);

        Object.values(this.actors).forEach(actor => this.group.add(actor));
        this.scene.add(this.group);
        
        // Enable shadows and enhance materials for all cutscene meshes
        this.group.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                    child.material.metalness = 0.2;
                    child.material.roughness = 0.4;
                }
            }
        });
        
        // Labels
        this.labels.push({ mesh: this.actors.ntf2, div: this.createLabel("NTF-2", "#6699ff") });
        this.ranLabel = this.createLabel("RanGDP", "#ff6666");
        this.labels.push({ mesh: this.actors.ranBase, div: this.ranLabel });
        this.gefLabel = this.createLabel("RanGEF", "#ff8800");
        this.labels.push({ mesh: this.actors.gef, div: this.gefLabel });
        this.labels.push({ mesh: this.actors.importin, div: this.createLabel("Importin", "#8a2be2") });
        this.labels.push({ mesh: this.actors.cargo, div: this.createLabel("Cargo", "#ffa500") });
    }

    updateLabels() {
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;
        
        this.labels.forEach(item => {
            if (!item.mesh.visible || item.mesh.position.y > 10 || item.mesh.position.y < -10) {
                item.div.style.display = 'none';
                // Only show if roughly in view
            }
            item.div.style.display = 'block';
            const pos = item.mesh.position.clone();
            pos.project(this.camera);
            
            // Hide if offscreen
            if (pos.x < -1.1 || pos.x > 1.1 || pos.y < -1.1 || pos.y > 1.1) {
                item.div.style.display = 'none';
            } else {
                item.div.style.display = 'block';
                item.div.style.left = (pos.x * widthHalf + widthHalf) + 'px';
                item.div.style.top = (-pos.y * heightHalf + heightHalf - 40) + 'px';
            }
        });
    }

    cleanup() {
        this.isActive = false;
        if (this.keydownTimeout) clearTimeout(this.keydownTimeout);
        if (this.keydownHandler) {
            window.removeEventListener('keydown', this.keydownHandler);
        }
        this.scene.remove(this.group);
        this.labels.forEach(item => {
            if (item.div.parentNode) item.div.parentNode.removeChild(item.div);
        });
        this.labels = [];
    }

    update(delta) {
        if (!this.isActive) return;
        if (this.isPaused && !this.isSimulating) return; // Pause cutscene if space is pressed
        this.time += delta;
        const subtitles = document.getElementById('cutscene-subtitles');

        if (this.time < 2) {
            subtitles.innerText = "Cytoplasm: Ran-GDP is bound by NTF-2.";
            this.scene.background.lerpColors(new THREE.Color(0x1a3c40), new THREE.Color(0x1a3c40), 1);
            this.actors.ntf2.position.lerp(new THREE.Vector3(-30, 0, 0), 2.5 * delta);
        }
        else if (this.time < 5) {
            subtitles.innerText = "Complex enters the Nuclear Pore...";
            this.camera.position.lerp(new THREE.Vector3(0, 0, 50), 1.5 * delta);
            this.scene.background.lerpColors(new THREE.Color(0x1a3c40), new THREE.Color(0x20a096), (this.time - 2)/3);
            
            this.actors.ntf2.position.lerp(new THREE.Vector3(0, -0.5, 0), 1.5 * delta);
            this.actors.ranBase.position.copy(this.actors.ntf2.position);
            this.actors.ranBase.position.y += 0.5;
        }
        else if (this.time < 7.5) {
            subtitles.innerText = "Inside Nucleus: Complex breaks. NTF-2 leaves, Ran-GDP enters Nucleoplasm.";
            this.camera.position.lerp(new THREE.Vector3(30, 0, 50), 1.5 * delta);
            this.scene.background.lerpColors(new THREE.Color(0x20a096), new THREE.Color(0xa080ff), (this.time - 5)/2.5);
            
            this.actors.ntf2.position.lerp(new THREE.Vector3(15, -3, 0), 2.0 * delta); 
            this.actors.ranBase.position.lerp(new THREE.Vector3(30, 0, 0), 1.5 * delta);
        }
        else if (this.time < 10.5) {
            subtitles.innerText = "RanGEF appears and converts Ran-GDP to Ran-GTP.";
            this.actors.ntf2.position.x -= 15 * delta; 
            this.actors.gef.position.lerp(new THREE.Vector3(30, 0, -2), 2.0 * delta); 
            if (this.time > 8.5) {
                this.gdpMesh.visible = false;
                this.gtpMesh.visible = true;
                this.ranLabel.innerText = "RanGTP";
                this.ranLabel.style.color = "#ffff00";
            }
        }
        else if (this.time < 14) {
            subtitles.innerText = "Ran-GTP binds Importin-Cargo complex, releasing Cargo.";
            this.actors.ntf2.position.x -= 15 * delta; 
            this.actors.gef.position.lerp(new THREE.Vector3(30, 15, 0), 1.5 * delta); 
            
            this.actors.importin.position.lerp(new THREE.Vector3(30, 0, 0), 2.5 * delta);
            this.actors.cargo.position.lerp(new THREE.Vector3(30, 0, 0), 2.5 * delta);
            
            if (this.time > 12) {
                this.actors.ranBase.position.lerp(new THREE.Vector3(30, 0, 0), 2.5 * delta);
                this.actors.importin.rotation.z = 0; 
                this.actors.cargo.position.lerp(new THREE.Vector3(40, -10, 0), 2.5 * delta);
            }
        }
        else if (this.time < 17.5) {
            subtitles.innerText = "Ran-GTP + Importin complex leaves via Nuclear Pore.";
            this.camera.position.lerp(new THREE.Vector3(0, 0, 50), 1.5 * delta);
            this.scene.background.lerpColors(new THREE.Color(0xa080ff), new THREE.Color(0x20a096), (this.time - 14)/3.5);
            
            this.actors.ranBase.position.lerp(new THREE.Vector3(0, 0, 0), 1.8 * delta);
            this.actors.importin.position.lerp(new THREE.Vector3(0, 0, 0), 1.8 * delta);
        }
        else if (this.time < 20.5) {
            subtitles.innerText = "Back to Cytoplasm!";
            this.camera.position.lerp(new THREE.Vector3(-30, 0, 50), 1.5 * delta);
            this.scene.background.lerpColors(new THREE.Color(0x20a096), new THREE.Color(0x1a3c40), (this.time - 17.5)/3);
            
            this.actors.ranBase.position.lerp(new THREE.Vector3(-30, 0, 0), 1.8 * delta);
            this.actors.importin.position.lerp(new THREE.Vector3(-30, 0, 0), 1.8 * delta);
        }
        else {
            if (!this.isSimulating && window.quitCutscene) window.quitCutscene();
        }

        // Idle floating
        Object.values(this.actors).forEach(actor => {
            if (actor !== this.actors.pore && actor !== this.actors.cargo && actor !== this.actors.importin) {
                actor.rotation.y += delta * 0.5;
                actor.rotation.z += delta * 0.2;
            }
        });

        // Sway FG repeats
        if (this.fgRepeatsList) {
            this.fgRepeatsList.forEach((fg) => {
                fg.rotation.z = fg.userData.baseRotZ + Math.sin(this.time * 2) * 0.25;
                fg.rotation.x = Math.cos(this.time * 1.5) * 0.25;
            });
        }

        if (!this.isSimulating) this.updateLabels();
    }
}
