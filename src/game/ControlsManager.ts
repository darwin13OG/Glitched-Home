import * as THREE from 'three';
import { BoundingBox3D, ControlsInput, PlayerState } from '../types/game';
import { soundManager } from './SoundManager';

export class ControlsManager {
  public camera: THREE.PerspectiveCamera;
  public playerState: PlayerState;
  public input: ControlsInput;

  // Camera angles (Pitch & Yaw)
  public pitch: number = 0; // Look up/down (radians)
  public yaw: number = 0;   // Look left/right (radians)

  // Velocity & Physics
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public position: THREE.Vector3 = new THREE.Vector3(0, 1.7, 4);
  public playerRadius: number = 0.35;
  public playerHeight: number = 1.7; // 1.7 standing, 1.0 crouching

  // Controls configuration
  public lookSensitivity: number = 0.0025;
  public isPointerLocked: boolean = false;

  // Flashlight Spotlight attached to player camera
  public flashlightSpot: THREE.SpotLight;
  public isFlashlightOn: boolean = true;

  private domElement: HTMLElement;
  private footstepTimer: number = 0;

  // Event handler references for cleanup
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;
  private handleDomClick: () => void;
  private handlePointerLockChange: () => void;
  private handleMouseMove: (e: MouseEvent) => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.playerState = {
      health: 100,
      stamina: 100,
      battery: 100,
      ammo: 0,
      isSprinting: false,
      isCrouching: false,
      isGrounded: true,
      selectedSlot: 0,
      inventory: [null, null, null, null],
    };

    this.input = {
      moveForward: 0,
      moveRight: 0,
      lookDeltaX: 0,
      lookDeltaY: 0,
      jump: false,
      sprint: false,
      crouch: false,
      interact: false,
      useItem: false,
    };

    // Attach Flashlight Spotlight to Camera
    this.flashlightSpot = new THREE.SpotLight(0xfffaed, 2.5, 14, Math.PI / 6, 0.4, 1);
    this.flashlightSpot.castShadow = true;
    this.flashlightSpot.position.set(0, 0, 0);
    this.flashlightSpot.target.position.set(0, 0, -1);
    this.camera.add(this.flashlightSpot);
    this.camera.add(this.flashlightSpot.target);

    // Initialize bound handlers
    this.handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.input.moveForward = 1;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.input.moveForward = -1;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.input.moveRight = -1;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.input.moveRight = 1;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.input.sprint = true;
          break;
        case 'KeyC':
        case 'ControlLeft':
          this.input.crouch = !this.input.crouch;
          break;
        case 'Space':
          this.input.jump = true;
          break;
        case 'KeyE':
          this.input.interact = true;
          break;
        case 'KeyF':
          this.toggleFlashlight();
          break;
        case 'Digit1':
          this.playerState.selectedSlot = 0;
          break;
        case 'Digit2':
          this.playerState.selectedSlot = 1;
          break;
        case 'Digit3':
          this.playerState.selectedSlot = 2;
          break;
        case 'Digit4':
          this.playerState.selectedSlot = 3;
          break;
      }
    };

    this.handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          if (this.input.moveForward > 0) this.input.moveForward = 0;
          break;
        case 'KeyS':
        case 'ArrowDown':
          if (this.input.moveForward < 0) this.input.moveForward = 0;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          if (this.input.moveRight < 0) this.input.moveRight = 0;
          break;
        case 'KeyD':
        case 'ArrowRight':
          if (this.input.moveRight > 0) this.input.moveRight = 0;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.input.sprint = false;
          break;
        case 'Space':
          this.input.jump = false;
          break;
        case 'KeyE':
          this.input.interact = false;
          break;
      }
    };

    this.handleDomClick = () => {
      if (!this.isPointerLocked && !('ontouchstart' in window)) {
        this.domElement.requestPointerLock?.();
      }
    };

    this.handlePointerLockChange = () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
    };

    this.handleMouseMove = (e: MouseEvent) => {
      if (this.isPointerLocked) {
        this.handleLook(e.movementX, e.movementY);
      }
    };

    this.handleMouseDown = (e: MouseEvent) => {
      if (this.isPointerLocked && e.button === 0) {
        this.input.useItem = true;
      }
    };

    this.setupListeners();
  }

  private handleMouseDown: (e: MouseEvent) => void;

  private setupListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.domElement.addEventListener('click', this.handleDomClick);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mousedown', this.handleMouseDown);
  }

  public dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.domElement) {
      this.domElement.removeEventListener('click', this.handleDomClick);
    }
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mousedown', this.handleMouseDown);
  }

  public handleLook(deltaX: number, deltaY: number) {
    this.yaw -= deltaX * this.lookSensitivity;
    this.pitch -= deltaY * this.lookSensitivity;

    // Clamp pitch between -85 deg and +85 deg
    const maxPitch = (85 * Math.PI) / 180;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

    // Update camera quaternion rotation
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch;
    euler.y = this.yaw;
    this.camera.quaternion.setFromEuler(euler);
  }

  public lock() {
    if (!('ontouchstart' in window)) {
      try {
        this.domElement.requestPointerLock?.();
      } catch (err) {
        console.warn('Pointer lock error:', err);
      }
    }
  }

  public unlock() {
    try {
      if (document.pointerLockElement === this.domElement) {
        document.exitPointerLock?.();
      }
    } catch (err) {
      console.warn('Exit pointer lock error:', err);
    }
  }

  public toggleFlashlight() {
    this.isFlashlightOn = !this.isFlashlightOn;
    this.flashlightSpot.intensity = this.isFlashlightOn ? 2.5 : 0;
    soundManager.playFlashlightToggle();
  }

  public update(delta: number, obstacles: BoundingBox3D[]) {
    // 1. Crouch / Stand height adjustment
    const targetHeight = this.input.crouch ? 1.0 : 1.7;
    this.playerHeight += (targetHeight - this.playerHeight) * 0.2;

    // 2. Sprint & Stamina logic
    const isMoving = Math.abs(this.input.moveForward) > 0.1 || Math.abs(this.input.moveRight) > 0.1;
    if (this.input.sprint && isMoving && !this.input.crouch && this.playerState.stamina > 5) {
      this.playerState.isSprinting = true;
      this.playerState.stamina = Math.max(0, this.playerState.stamina - delta * 25);
    } else {
      this.playerState.isSprinting = false;
      this.playerState.stamina = Math.min(100, this.playerState.stamina + delta * 15);
    }

    // Flashlight battery consumption
    if (this.isFlashlightOn && this.playerState.battery > 0) {
      this.playerState.battery = Math.max(0, this.playerState.battery - delta * 0.5);
      if (this.playerState.battery <= 0) {
        this.isFlashlightOn = false;
        this.flashlightSpot.intensity = 0;
      }
    }

    // 3. Speed calculation
    let moveSpeed = 3.2; // Base walk m/s
    if (this.playerState.isSprinting) moveSpeed = 5.8;
    if (this.input.crouch) moveSpeed = 1.6;

    // 4. Direction relative to Camera Yaw
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const moveVector = new THREE.Vector3();
    moveVector.addScaledVector(forward, this.input.moveForward);
    moveVector.addScaledVector(right, this.input.moveRight);

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize().multiplyScalar(moveSpeed * delta);
    }

    // 5. Jump & Gravity
    if (this.input.jump && this.playerState.isGrounded) {
      this.velocity.y = 4.6;
      this.playerState.isGrounded = false;
      soundManager.playJump();
    }

    // Apply gravity
    this.velocity.y -= 14.0 * delta; // Gravity m/s^2

    // Target position after horizontal & vertical movement
    const oldPos = this.position.clone();
    const targetPos = this.position.clone();
    targetPos.x += moveVector.x;
    targetPos.z += moveVector.z;
    targetPos.y += this.velocity.y * delta;

    // 6. Collision detection & Resolution (Sliding along walls)
    this.resolveCollisions(oldPos, targetPos, obstacles);

    // Apply computed position to Camera (Eye height ~1.53m standing, ~0.9m crouching)
    this.position.copy(targetPos);
    this.camera.position.set(this.position.x, this.position.y + this.playerHeight * 0.9, this.position.z);

    // 7. Footsteps audio timing
    if (isMoving && this.playerState.isGrounded) {
      const stepInterval = this.playerState.isSprinting ? 0.28 : 0.48;
      this.footstepTimer += delta;
      if (this.footstepTimer >= stepInterval) {
        soundManager.playFootstep();
        this.footstepTimer = 0;
      }
    }
  }

  private resolveCollisions(oldPos: THREE.Vector3, targetPos: THREE.Vector3, obstacles: BoundingBox3D[]) {
    // Ground plane check (floor is at y = 0)
    if (targetPos.y <= 0) {
      targetPos.y = 0;
      this.velocity.y = 0;
      this.playerState.isGrounded = true;
    }

    const r = this.playerRadius; // 0.38m
    const playerHeight = this.playerHeight;

    // 1. RESOLVE VERTICAL (Y) MOVEMENT & STEPPING ON OBSTACLES (Bed, Couch, Tables)
    for (const box of obstacles) {
      if (box.isPortal) continue;
      // Check X & Z overlap
      if (
        targetPos.x + r > box.minX &&
        targetPos.x - r < box.maxX &&
        targetPos.z + r > box.minZ &&
        targetPos.z - r < box.maxZ
      ) {
        // If falling down onto top surface of obstacle
        if (oldPos.y >= box.maxY - 0.25 && targetPos.y < box.maxY && this.velocity.y <= 0) {
          targetPos.y = box.maxY;
          this.velocity.y = 0;
          this.playerState.isGrounded = true;
        }
      }
    }

    const playerMinY = targetPos.y;
    const playerMaxY = targetPos.y + playerHeight;

    // 2. RESOLVE HORIZONTAL X MOVEMENT
    for (const box of obstacles) {
      if (box.isPortal) continue;
      if (playerMinY >= box.maxY - 0.05) continue;
      if (playerMaxY <= box.minY + 0.05) continue;

      // Only resolve X collision if player was already aligned in Z in oldPos or targetPos
      const wasInZ = oldPos.z + r > box.minZ && oldPos.z - r < box.maxZ;
      if (wasInZ) {
        // Moving East (X increasing): hit West face
        if (oldPos.x + r <= box.minX && targetPos.x + r > box.minX) {
          targetPos.x = box.minX - r;
        }
        // Moving West (X decreasing): hit East face
        else if (oldPos.x - r >= box.maxX && targetPos.x - r < box.maxX) {
          targetPos.x = box.maxX + r;
        }
        // Penetration fallback if overlapping X
        else if (targetPos.x + r > box.minX && targetPos.x - r < box.maxX) {
          const overlapWest = Math.abs(targetPos.x + r - box.minX);
          const overlapEast = Math.abs(box.maxX - (targetPos.x - r));
          if (overlapWest < overlapEast) {
            targetPos.x = box.minX - r;
          } else {
            targetPos.x = box.maxX + r;
          }
        }
      }
    }

    // 3. RESOLVE HORIZONTAL Z MOVEMENT
    for (const box of obstacles) {
      if (box.isPortal) continue;
      if (playerMinY >= box.maxY - 0.05) continue;
      if (playerMaxY <= box.minY + 0.05) continue;

      // Only resolve Z collision if player was already aligned in X in oldPos or targetPos
      const wasInX = oldPos.x + r > box.minX && oldPos.x - r < box.maxX;
      if (wasInX) {
        // Moving South (Z increasing): hit North face
        if (oldPos.z + r <= box.minZ && targetPos.z + r > box.minZ) {
          targetPos.z = box.minZ - r;
        }
        // Moving North (Z decreasing): hit South face
        else if (oldPos.z - r >= box.maxZ && targetPos.z - r < box.maxZ) {
          targetPos.z = box.maxZ + r;
        }
        // Penetration fallback if overlapping Z
        else if (targetPos.z + r > box.minZ && targetPos.z - r < box.maxZ) {
          const overlapNorth = Math.abs(targetPos.z + r - box.minZ);
          const overlapSouth = Math.abs(box.maxZ - (targetPos.z - r));
          if (overlapNorth < overlapSouth) {
            targetPos.z = box.minZ - r;
          } else {
            targetPos.z = box.maxZ + r;
          }
        }
      }
    }

    // 4. SAFETY CHECK FOR RESIDUAL OVERLAP
    for (const box of obstacles) {
      if (box.isPortal) continue;
      if (playerMinY >= box.maxY - 0.05) continue;
      if (playerMaxY <= box.minY + 0.05) continue;

      if (
        targetPos.x + r > box.minX &&
        targetPos.x - r < box.maxX &&
        targetPos.z + r > box.minZ &&
        targetPos.z - r < box.maxZ
      ) {
        const dWest = Math.abs(targetPos.x + r - box.minX);
        const dEast = Math.abs(box.maxX - (targetPos.x - r));
        const dNorth = Math.abs(targetPos.z + r - box.minZ);
        const dSouth = Math.abs(box.maxZ - (targetPos.z - r));

        const minD = Math.min(dWest, dEast, dNorth, dSouth);
        if (minD === dWest) targetPos.x = box.minX - r;
        else if (minD === dEast) targetPos.x = box.maxX + r;
        else if (minD === dNorth) targetPos.z = box.minZ - r;
        else if (minD === dSouth) targetPos.z = box.maxZ + r;
      }
    }
  }
}
