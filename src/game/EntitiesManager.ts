import * as THREE from 'three';
import { EntityState, GamePhase } from '../types/game';
import { soundManager } from './SoundManager';

export class EntitiesManager {
  public scene: THREE.Scene;
  public entities: { state: EntityState; mesh: THREE.Group; stunTimer?: number }[] = [];
  public onAllDefeated?: () => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public damageEntity(id: string, damage: number) {
    const entIndex = this.entities.findIndex((e) => e.state.id === id);
    if (entIndex === -1) return;

    const ent = this.entities[entIndex];
    ent.state.health -= damage;
    soundManager.playEntityRoar();

    // Flash entity mesh white/red upon damage
    ent.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.color) {
          if (child.userData.origColor === undefined) {
            child.userData.origColor = mat.color.getHex();
          }
          mat.color.setHex(0xffffff);
          setTimeout(() => {
            if (mat.color && child.userData.origColor !== undefined) {
              mat.color.setHex(child.userData.origColor);
            }
          }, 150);
        }
      }
    });

    // If health depleted, eliminate entity from scene
    if (ent.state.health <= 0) {
      this.scene.remove(ent.mesh);
      this.entities.splice(entIndex, 1);

      if (this.entities.length === 0 && this.onAllDefeated) {
        this.onAllDefeated();
      }
    }
  }

  public spawnEntity(x: number, y: number, z: number, id: string, type: 'stalker' | 'fiend' = 'stalker') {
    const group = new THREE.Group();

    if (type === 'stalker') {
      // 1. TALL HUMANOID SHADOW STALKER (2.3m height)
      const skinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.2 });
      const boneMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
      const teethMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });

      // Torso / Ribcage
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.35), skinMat);
      torso.position.y = 1.35;
      group.add(torso);

      // Ribcage detail
      for (let r = 0; r < 4; r++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.38), boneMat);
        rib.position.set(0, 1.6 - r * 0.15, 0);
        group.add(rib);
      }

      // Evil Glowing Heart Core Light
      const coreLight = new THREE.PointLight(0xef4444, 2.0, 3.5);
      coreLight.position.set(0, 1.4, 0.1);
      group.add(coreLight);

      // Elongated Creepy Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.38), skinMat);
      head.position.set(0, 2.05, 0.05);
      group.add(head);

      // Glowing Eyes
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), eyeMat);
      eyeL.position.set(-0.12, 2.12, 0.22);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), eyeMat);
      eyeR.position.set(0.12, 2.12, 0.22);
      group.add(eyeL, eyeR);

      // Wide Creepy Mouth / Needle Teeth
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.1), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      mouth.position.set(0, 1.94, 0.22);
      group.add(mouth);

      for (let t = -0.11; t <= 0.11; t += 0.05) {
        const toothU = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.05, 6), teethMat);
        toothU.rotation.x = Math.PI;
        toothU.position.set(t, 1.98, 0.24);

        const toothD = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.05, 6), teethMat);
        toothD.position.set(t, 1.9, 0.24);
        group.add(toothU, toothD);
      }

      // Long Clawed Arms reaching forward
      const armL = new THREE.Group();
      armL.name = 'armL';
      const upperL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.6), skinMat);
      upperL.position.set(-0.35, 1.4, 0.1);
      upperL.rotation.x = -0.4;
      armL.add(upperL);

      const clawL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 4), boneMat);
      clawL.position.set(-0.35, 1.1, 0.3);
      clawL.rotation.x = Math.PI / 2;
      armL.add(clawL);

      const armR = new THREE.Group();
      armR.name = 'armR';
      const upperR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.6), skinMat);
      upperR.position.set(0.35, 1.4, 0.1);
      upperR.rotation.x = -0.4;
      armR.add(upperR);

      const clawR = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 4), boneMat);
      clawR.position.set(0.35, 1.1, 0.3);
      clawR.rotation.x = Math.PI / 2;
      armR.add(clawR);

      group.add(armL, armR);

      // Legs
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.95), skinMat);
      legL.name = 'legL';
      legL.position.set(-0.18, 0.48, 0);
      const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.95), skinMat);
      legR.name = 'legR';
      legR.position.set(0.18, 0.48, 0);
      group.add(legL, legR);

    } else {
      // 2. ARACHNID VOID FIEND (Multi-legged Spiky Crawler)
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd97706 }); // Piercing Orange-Red

      const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), bodyMat);
      thorax.position.y = 0.55;
      thorax.scale.set(1.1, 0.7, 1.4);
      group.add(thorax);

      // 6 Spiky Jointed Legs
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 3; i++) {
          const legGroup = new THREE.Group();
          legGroup.name = `spiderLeg_${side}_${i}`;

          const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.6), bodyMat);
          upper.rotation.z = side * 0.8;
          upper.position.set(side * 0.3, 0.6, (i - 1) * 0.4);

          const lower = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.7, 8), bodyMat);
          lower.rotation.z = -side * 0.4;
          lower.position.set(side * 0.6, 0.25, (i - 1) * 0.4);

          legGroup.add(upper, lower);
          group.add(legGroup);
        }
      }

      // Multiple Glowing Eyes in Arc
      for (let e = -2; e <= 2; e++) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
        eye.position.set(e * 0.08, 0.62, 0.62);
        group.add(eye);
      }
    }

    group.position.set(x, y, z);
    this.scene.add(group);

    this.entities.push({
      state: {
        id,
        x,
        y,
        z,
        health: 100,
        speed: type === 'stalker' ? 1.25 : 1.45,
        state: 'idle',
      },
      mesh: group,
    });
  }

  private proximityAudioTimer: number = 0;

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    phase: GamePhase,
    isFlashlightOn: boolean,
    cameraDir: THREE.Vector3,
    onPlayerHit: (damage: number) => void
  ) {
    if (phase !== GamePhase.DEFENSE) {
      return;
    }

    const safeDelta = Math.min(delta, 0.04);
    let minDistanceToPlayer = 999;

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      if (entity.stunTimer && entity.stunTimer > 0) {
        entity.stunTimer -= safeDelta;
        continue;
      }

      const entPos = entity.mesh.position;

      // Calculate vector to player
      const dirToPlayer = new THREE.Vector3().subVectors(playerPos, entPos);
      dirToPlayer.y = 0; // Move horizontally
      const distance = dirToPlayer.length();

      if (distance < minDistanceToPlayer) {
        minDistanceToPlayer = distance;
      }

      if (distance < 18) {
        dirToPlayer.normalize();

        // Rotate entity towards player smoothly
        const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
        entity.mesh.rotation.y = targetAngle;

        // Check if player flashlight is shining directly on entity
        const entFromCam = new THREE.Vector3().subVectors(entPos, playerPos).normalize();
        const dot = cameraDir.dot(entFromCam);

        let currentSpeed = entity.state.speed;
        if (isFlashlightOn && dot > 0.85 && distance < 8) {
          // Stunned / slowed down significantly by direct flashlight beam
          currentSpeed = 0.2;
        }

        // Move entity toward player
        entPos.addScaledVector(dirToPlayer, currentSpeed * safeDelta);
        entity.state.x = entPos.x;
        entity.state.z = entPos.z;

        // Animate walking limbs
        const animTime = Date.now() * 0.01;
        const legL = entity.mesh.getObjectByName('legL');
        const legR = entity.mesh.getObjectByName('legR');
        if (legL && legR) {
          legL.rotation.x = Math.sin(animTime * 8) * 0.4;
          legR.rotation.x = -Math.sin(animTime * 8) * 0.4;
        }

        const armL = entity.mesh.getObjectByName('armL');
        const armR = entity.mesh.getObjectByName('armR');
        if (armL && armR) {
          armL.rotation.z = Math.sin(animTime * 6) * 0.15;
          armR.rotation.z = -Math.sin(animTime * 6) * 0.15;
        }

        // Bobbing vertical movement
        entPos.y = Math.sin(animTime * 4) * 0.05;

        // Check attack distance
        if (distance < 1.3) {
          onPlayerHit(delta * 22); // Deal 22 HP damage per second
          soundManager.playEntityRoar();
        }
      }
    }

    // Trigger proximity monster growls and heartbeats when close to player!
    this.proximityAudioTimer += delta;
    if (minDistanceToPlayer < 14 && this.proximityAudioTimer > 1.2) {
      this.proximityAudioTimer = 0;
      soundManager.playProximityGrowl(minDistanceToPlayer);
      if (minDistanceToPlayer < 7) {
        soundManager.playHeartbeat();
      }
    }
  }

  public removeAll() {
    for (const ent of this.entities) {
      this.scene.remove(ent.mesh);
    }
    this.entities = [];
  }
}
