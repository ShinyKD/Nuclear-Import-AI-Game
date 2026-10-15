import * as THREE from 'three';

export class TitleBackground {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.time = 0;
        this.sceneIndex = 0;
        this.sceneTimer = 0;
        this.group = new THREE.Group();
        
        this.cameraPositions = [
            { pos: new THREE.Vector3(20, 5, 40), look: new THREE.Vector3(0, 10, 0) },   // Scene 1: Kinesin
            { pos: new THREE.Vector3(200, 5, 40), look: new THREE.Vector3(200, 10, 0) }, // Scene 2: Rough ER
            { pos: new THREE.Vector3(400, 5, 40), look: new THREE.Vector3(400, 10, 0) }  // Scene 3: Nucleus
        ];
        
        this.init();
    }

    init() {
        const bgColor = new THREE.Color(0x1a3c40);
        this.scene.background = bgColor;
        this.scene.add(this.group);
        this.scene.fog = new THREE.FogExp2(bgColor, 0.012);

        // --- SCENE 1: Kinesin & Microtubule (X = 0) ---
        // 1. Lipid Bilayer (Ceiling)
        const membraneGeo = new THREE.PlaneGeometry(200, 200, 32, 32);
        const membraneMat = new THREE.MeshStandardMaterial({ 
            color: 0x4aa6a1, roughness: 0.6, transparent: true, opacity: 0.8, side: THREE.DoubleSide
        });
        const posAttr = membraneGeo.attributes.position;
        for(let i=0; i<posAttr.count; i++) {
            const z = posAttr.getZ(i); const x = posAttr.getX(i); const y = posAttr.getY(i);
            posAttr.setZ(i, z + Math.sin(x*0.1)*3 + Math.cos(y*0.1)*3);
        }
        membraneGeo.computeVertexNormals();
        this.membrane = new THREE.Mesh(membraneGeo, membraneMat);
        this.membrane.rotation.x = Math.PI / 2;
        this.membrane.position.set(0, 25, 0);
        this.membrane.receiveShadow = true;
        this.group.add(this.membrane);

        // 2. Microtubule
        const mtCurve = new THREE.LineCurve3(new THREE.Vector3(-60, -10, -20), new THREE.Vector3(60, -2, 20));
        const mtGeo = new THREE.TubeGeometry(mtCurve, 64, 2.5, 16, false);
        const mtMat = new THREE.MeshStandardMaterial({ color: 0x5a9a6c, roughness: 0.7 });
        this.microtubule = new THREE.Mesh(mtGeo, mtMat);
        this.microtubule.castShadow = true; this.microtubule.receiveShadow = true;
        this.group.add(this.microtubule);

        // 3. Kinesin & Vesicle
        this.kinesinGroup = new THREE.Group();
        const vesGeo = new THREE.SphereGeometry(8, 32, 32);
        const vesMat = new THREE.MeshPhysicalMaterial({ color: 0x8a2be2, transmission: 0.8, opacity: 1.0, roughness: 0.2, ior: 1.5 });
        this.vesicle = new THREE.Mesh(vesGeo, vesMat);
        this.vesicle.position.set(0, 15, 0); this.vesicle.castShadow = true;
        this.kinesinGroup.add(this.vesicle);

        const stalkGeo = new THREE.CylinderGeometry(0.3, 0.3, 10, 8);
        const stalkMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        this.stalk = new THREE.Mesh(stalkGeo, stalkMat);
        this.stalk.position.set(0, 8, 0); this.stalk.castShadow = true;
        this.kinesinGroup.add(this.stalk);

        this.legs = [];
        const legGeo = new THREE.CapsuleGeometry(0.5, 3, 8, 8);
        const legMat = new THREE.MeshStandardMaterial({ color: 0xffaaaa });
        for(let i=0; i<2; i++) {
            const leg = new THREE.Mesh(legGeo, legMat); leg.castShadow = true;
            this.legs.push(leg); this.kinesinGroup.add(leg);
        }
        this.group.add(this.kinesinGroup);

        // 4. Actin Network
        this.actinGroup = new THREE.Group();
        const actinMat = new THREE.MeshStandardMaterial({ color: 0xc14b51, roughness: 0.8 });
        for(let i=0; i<30; i++) {
            const start = new THREE.Vector3((Math.random()-0.5)*150, (Math.random()-0.5)*80, -30 - Math.random()*50);
            const end = new THREE.Vector3((Math.random()-0.5)*150, (Math.random()-0.5)*80, -30 - Math.random()*50);
            const curve = new THREE.LineCurve3(start, end);
            const geo = new THREE.TubeGeometry(curve, 8, 0.4, 6, false);
            const mesh = new THREE.Mesh(geo, actinMat);
            mesh.castShadow = true; mesh.receiveShadow = true;
            this.actinGroup.add(mesh);
        }
        this.group.add(this.actinGroup);

        // --- SCENE 2: Rough ER & Translation (X = 200) ---
        this.erGroup = new THREE.Group();
        this.erGroup.position.set(200, 0, 0);
        const erMat = new THREE.MeshStandardMaterial({ color: 0x00b4d8, roughness: 0.6, side: THREE.DoubleSide });
        
        // Folded ER sheets
        for(let i=0; i<6; i++) {
            const sheetGeo = new THREE.PlaneGeometry(60, 40, 16, 16);
            const posAttr = sheetGeo.attributes.position;
            for(let j=0; j<posAttr.count; j++) {
                posAttr.setZ(j, Math.sin(posAttr.getX(j)*0.2)*4 + Math.cos(posAttr.getY(j)*0.2)*4);
            }
            sheetGeo.computeVertexNormals();
            const sheet = new THREE.Mesh(sheetGeo, erMat);
            sheet.position.z = -20 + i * 8;
            sheet.rotation.x = Math.PI / 2 + (Math.random()-0.5)*0.2;
            sheet.rotation.y = (Math.random()-0.5)*0.2;
            sheet.castShadow = true; sheet.receiveShadow = true;
            this.erGroup.add(sheet);
        }
        this.group.add(this.erGroup);

        // --- SCENE 3: Nuclear Pore Complex (X = 400) ---
        this.nucleusGroup = new THREE.Group();
        this.nucleusGroup.position.set(400, 0, 0);
        
        const nucMat = new THREE.MeshStandardMaterial({ color: 0x4422aa, roughness: 0.7, side: THREE.DoubleSide });
        const nucGeo = new THREE.SphereGeometry(60, 64, 64, 0, Math.PI, 0, Math.PI);
        const nucleus = new THREE.Mesh(nucGeo, nucMat);
        nucleus.position.set(0, -60, -20);
        nucleus.castShadow = true; nucleus.receiveShadow = true;
        this.nucleusGroup.add(nucleus);

        // Huge Pore
        const poreGeo = new THREE.TorusGeometry(12, 3, 32, 64);
        const poreMat = new THREE.MeshStandardMaterial({ color: 0xffaa22, roughness: 0.4 });
        const pore = new THREE.Mesh(poreGeo, poreMat);
        pore.rotation.x = Math.PI / 2;
        pore.position.set(0, 0, -20);
        pore.castShadow = true;
        this.nucleusGroup.add(pore);
        
        // mRNA strands coming out
        this.mrnas = [];
        const mrnaMat = new THREE.MeshStandardMaterial({ color: 0x55ff55, emissive: 0x228822 });
        for(let i=0; i<3; i++) {
            const curve = new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0, 20, (i-1)*10));
            const geo = new THREE.TubeGeometry(curve, 32, 0.8, 8, false);
            const mesh = new THREE.Mesh(geo, mrnaMat);
            mesh.position.set(0, 0, -20);
            this.nucleusGroup.add(mesh);
            this.mrnas.push({ mesh, offset: Math.random()*10 });
        }
        this.group.add(this.nucleusGroup);

        // --- Floating Ribosomes (Everywhere) ---
        this.ribosomes = [];
        const riboGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const riboMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
        for(let i=0; i<200; i++) {
            const ribo = new THREE.Mesh(riboGeo, riboMat);
            const sceneOffsetX = [0, 200, 400][Math.floor(Math.random() * 3)];
            ribo.position.set(sceneOffsetX + (Math.random()-0.5)*100, (Math.random()-0.5)*60, (Math.random()-0.5)*50);
            this.group.add(ribo);
            this.ribosomes.push({ mesh: ribo, speedX: (Math.random()-0.5)*2, speedY: (Math.random()-0.5)*2, originX: sceneOffsetX });
        }

        // --- Lighting ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.group.add(ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
        this.dirLight.position.set(20, 50, 30);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.group.add(this.dirLight);
        this.group.add(this.dirLight.target);

        const rimLight = new THREE.DirectionalLight(0x00aaff, 1.5);
        rimLight.position.set(-20, -20, -10);
        this.group.add(rimLight);
    }

    cleanup() {
        this.scene.remove(this.group);
    }
    show() {
        this.scene.add(this.group);
        const bgColor = new THREE.Color(0x1a3c40);
        this.scene.background = bgColor;
        this.scene.fog = new THREE.FogExp2(bgColor, 0.012);
    }

    update(delta, time) {
        this.time = time;
        this.sceneTimer += delta;

        // Scene Switching
        if(this.sceneTimer > 15) {
            this.sceneTimer = 0;

            this.sceneIndex = (this.sceneIndex + 1) % this.cameraPositions.length;
            
            const currentSceneX = this.cameraPositions[this.sceneIndex].pos.x;
            this.dirLight.position.set(currentSceneX + 20, 50, 30);
            this.dirLight.target.position.set(currentSceneX, 0, 0);
            this.dirLight.target.updateMatrixWorld();
        }

        // Camera Lerp
        const targetCam = this.cameraPositions[this.sceneIndex];
        const currentTargetPos = targetCam.pos.clone();
        
        // Add some floating movement to camera based on the scene
        if (this.sceneIndex === 0) {
            // Track Kinesin in scene 0
            let t = (time * 0.05) % 1.0;
            const start = new THREE.Vector3(-60, -10, -20);
            const end = new THREE.Vector3(60, -2, 20);
            const currentPos = new THREE.Vector3().lerpVectors(start, end, t);
            currentTargetPos.x = currentPos.x + 20;
            currentTargetPos.z = currentPos.z + 40;
            
            if(!this.currentLookAt) this.currentLookAt = currentPos.clone();
            this.currentLookAt.lerp(currentPos, 2.0 * delta);
        } else {
            currentTargetPos.x += Math.sin(time * 0.2) * 5;
            currentTargetPos.y += Math.cos(time * 0.15) * 5;
            if(!this.currentLookAt) this.currentLookAt = targetCam.look.clone();
            this.currentLookAt.lerp(targetCam.look, 2.0 * delta);
        }

        const lerpSpeed = this.sceneTimer < 1.0 ? 0.05 : 0.02;
        this.camera.position.lerp(currentTargetPos, lerpSpeed);
        this.camera.lookAt(this.currentLookAt);

        // --- Animate Scene 1: Kinesin ---
        let t = (time * 0.05) % 1.0;
        const start = new THREE.Vector3(-60, -10, -20);
        const end = new THREE.Vector3(60, -2, 20);
        const currentPos = new THREE.Vector3().lerpVectors(start, end, t);
        this.kinesinGroup.position.copy(currentPos);
        this.kinesinGroup.lookAt(end);
        
        this.legs[0].position.y = 1.5 + Math.max(0, Math.sin(time * 6)) * 2;
        this.legs[0].position.z = Math.cos(time * 6) * 1.5;
        this.legs[0].rotation.x = Math.cos(time * 6) * 0.5;
        this.legs[1].position.y = 1.5 + Math.max(0, Math.sin(time * 6 + Math.PI)) * 2;
        this.legs[1].position.z = Math.cos(time * 6 + Math.PI) * 1.5;
        this.legs[1].rotation.x = Math.cos(time * 6 + Math.PI) * 0.5;

        this.vesicle.position.x = Math.sin(time * 2) * 1.0;
        this.vesicle.position.z = Math.cos(time * 2.5) * 1.0;
        this.stalk.rotation.z = Math.sin(time * 2) * 0.1;
        this.stalk.rotation.x = Math.cos(time * 2.5) * 0.1;
        this.membrane.position.y = 25 + Math.sin(time * 0.5) * 2;

        // --- Animate Scene 2: Rough ER ---
        this.erGroup.rotation.y = Math.sin(time * 0.1) * 0.1;
        this.erGroup.rotation.x = Math.cos(time * 0.1) * 0.05;

        // --- Animate Scene 3: Nucleus & mRNA ---
        for(let m of this.mrnas) {
            m.mesh.position.y = Math.sin(time * 1.5 + m.offset) * 2;
            m.mesh.scale.setScalar(1.0 + Math.sin(time * 2 + m.offset) * 0.1);
        }

        // --- Animate Ribosomes ---
        for(let r of this.ribosomes) {
            r.mesh.position.x += r.speedX * delta;
            r.mesh.position.y += r.speedY * delta;
            if (r.mesh.position.x > r.originX + 50) r.mesh.position.x = r.originX - 50;
            if (r.mesh.position.x < r.originX - 50) r.mesh.position.x = r.originX + 50;
            if (r.mesh.position.y > 30) r.mesh.position.y = -30;
            if (r.mesh.position.y < -30) r.mesh.position.y = 30;
        }
    }
}

