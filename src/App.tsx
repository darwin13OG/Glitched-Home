import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SceneManager } from './game/SceneManager';
import { ControlsManager } from './game/ControlsManager';
import { TaskManager } from './game/TaskManager';
import { EntitiesManager } from './game/EntitiesManager';
import { soundManager } from './game/SoundManager';
import { HUD } from './components/HUD';
import { SettingsModal } from './components/SettingsModal';
import { PhaseBanner } from './components/PhaseBanner';
import { StartMenu } from './components/StartMenu';
import { LoadingScreen } from './components/LoadingScreen';
import { MultiplayerModal } from './components/MultiplayerModal';
import { MultiplayerPlayer } from './types/customization';
import { GamePhase, Item, PlayerState } from './types/game';
import { VhsGlitchOverlay } from './components/VhsGlitchOverlay';
import { AlertCircle, RotateCcw, Trophy, ArrowRight } from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Core Game Systems
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const controlsManagerRef = useRef<ControlsManager | null>(null);
  const taskManagerRef = useRef<TaskManager | null>(null);
  const entitiesManagerRef = useRef<EntitiesManager | null>(null);

  // React State for HUD & UI
  const [isLoading, setIsLoading] = useState(true);
  const [hasStartedGame, setHasStartedGame] = useState(false);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.CALM);
  const [playerState, setPlayerState] = useState<PlayerState>({
    health: 100,
    stamina: 100,
    battery: 100,
    isSprinting: false,
    isCrouching: false,
    isGrounded: true,
    selectedSlot: 0,
    inventory: [
      { id: 'fl1', name: 'Linterna', icon: '🔦', type: 'flashlight', description: 'Linterna de mano.' },
      null,
      null,
      null,
    ],
  });

  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const activeInteractableRef = useRef<string | null>(null);

  const [currentDay, setCurrentDay] = useState(1);
  const [nightSurvivedModal, setNightSurvivedModal] = useState<{ day: number; hpBonus: number; ammoBonus: number } | null>(null);
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);
  const [selectedSkinId, setSelectedSkinId] = useState('investigator');
  const [multiplayerPlayers, setMultiplayerPlayers] = useState<MultiplayerPlayer[] | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [webGlError, setWebGlError] = useState(false);
  const [lookSensitivity, setLookSensitivity] = useState(0.0025);
  const [volume, setVolumeState] = useState(0.8);
  const [brightness, setBrightnessState] = useState(1.1);

  const [backroomsTimer, setBackroomsTimer] = useState<number | null>(null);
  const [prepTimer, setPrepTimer] = useState<number | null>(null);
  const [isInBackrooms, setIsInBackrooms] = useState<boolean>(false);
  const isInBackroomsRef = useRef<boolean>(false);
  const [isVhsTransition, setIsVhsTransition] = useState<boolean>(false);
  const [vhsMessage, setVhsMessage] = useState<string>('');
  const backroomsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const enterBackrooms = () => {
    if (!controlsManagerRef.current) return;
    // Trigger VHS TV static glitch transition screen
    setVhsMessage('ENTRANDO A LOS BACKROOMS - SEÑAL VHS NTSC...');
    setIsVhsTransition(true);
    soundManager.playGlitch();

    setTimeout(() => {
      setIsVhsTransition(false);
    }, 2200);

    // Teleport player cleanly inside Backrooms corridor (past z = -10 doorway)
    controlsManagerRef.current.position.set(0, 1.7, -11.5);
    isInBackroomsRef.current = true;
    setIsInBackrooms(true);

    // Lock portal door behind player and update Backrooms yellow fog environment
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setBackroomsDoorLocked(true);
      sceneManagerRef.current.setBackroomsEnvironment(true);
    }

    // Start 3-minute (180s) exploration timer
    if (backroomsIntervalRef.current) clearInterval(backroomsIntervalRef.current);
    let timeLeft = 180;
    setBackroomsTimer(180);

    backroomsIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      setBackroomsTimer(timeLeft);
      if (timeLeft <= 0) {
        if (backroomsIntervalRef.current) clearInterval(backroomsIntervalRef.current);
        setBackroomsTimer(null);
        returnToHouse();
      }
    }, 1000);
  };

  const returnToHouse = () => {
    if (!controlsManagerRef.current) return;
    // Trigger VHS TV static glitch transition screen
    setVhsMessage('REBOBINANDO CINTA VHS - REGRESANDO A LA CASA...');
    setIsVhsTransition(true);
    soundManager.playGlitch();

    setTimeout(() => {
      setIsVhsTransition(false);
    }, 2200);

    // Teleport return to house central hallway
    controlsManagerRef.current.position.set(0, 1.7, -8.0);
    isInBackroomsRef.current = false;
    setIsInBackrooms(false);

    if (sceneManagerRef.current) {
      sceneManagerRef.current.setBackroomsDoorLocked(false);
      sceneManagerRef.current.setBackroomsEnvironment(false);
    }

    // Start 5-second preparation timer before invasion phase starts
    if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
    let prepLeft = 5;
    setPrepTimer(5);

    prepIntervalRef.current = setInterval(() => {
      prepLeft -= 1;
      setPrepTimer(prepLeft);
      if (prepLeft <= 0) {
        if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
        setPrepTimer(null);
        // Switch to DEFENSE phase, trigger invasion and blackout house lights
        taskManagerRef.current?.setPhase(GamePhase.DEFENSE);
        sceneManagerRef.current?.turnOffHouseLights();
      }
    }, 1000);
  };

  const handleStartGame = () => {
    setHasStartedGame(true);
    soundManager.startCalmAmbience();
    if (controlsManagerRef.current) {
      controlsManagerRef.current.lock();
    }
  };

  const handleVolumeChange = (val: number) => {
    setVolumeState(val);
    soundManager.setVolume(val);
  };

  const handleBrightnessChange = (val: number) => {
    setBrightnessState(val);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setBrightness(val);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    let sceneManager: SceneManager | null = null;
    let controlsManager: ControlsManager | null = null;
    let animId: number;

    try {
      // 1. Initialize Scene Manager (3D & Lighting & Backrooms Portal)
      sceneManager = new SceneManager(containerRef.current);
      sceneManagerRef.current = sceneManager;

      // 2. Initialize Controls Manager (WASD / Mouse / Touch / VR Physics)
      controlsManager = new ControlsManager(sceneManager.camera, sceneManager.renderer.domElement);
      controlsManagerRef.current = controlsManager;

      // 3. Initialize Task Manager & Entity Manager
      const taskManager = new TaskManager();
      taskManagerRef.current = taskManager;

      const entitiesManager = new EntitiesManager(sceneManager.scene);
      entitiesManagerRef.current = entitiesManager;

      // Listen to Day Changes
      taskManager.onDayChange = (day) => {
        setCurrentDay(day);
      };

      // Handle Victory when all monsters defeated in DEFENSE phase
      entitiesManager.onAllDefeated = () => {
        soundManager.playPickup();
        const currentSurvDay = taskManager.currentDay;

        // Player victory rewards (+35 HP, +15 Ammo)
        if (controlsManagerRef.current) {
          controlsManagerRef.current.playerState.health = Math.min(100, controlsManagerRef.current.playerState.health + 35);
          controlsManagerRef.current.playerState.ammo += 15;
          setPlayerState({ ...controlsManagerRef.current.playerState });
        }

        setNightSurvivedModal({
          day: currentSurvDay,
          hpBonus: 35,
          ammoBonus: 15,
        });

        // Reset house tasks & backrooms loot meshes for next day
        if (sceneManagerRef.current) {
          sceneManagerRef.current.turnOnHouseLights();
          sceneManagerRef.current.buildProceduralBackrooms();
        }

        // Advance to Next Day
        taskManager.resetTasksForNextDay();
      };

      // Listen to Phase changes
      taskManager.onPhaseChange = (newPhase) => {
        setPhase(newPhase);
        soundManager.updatePhaseAudio(newPhase);
        if (newPhase === GamePhase.DEFENSE) {
          // Clear any old entities
          entitiesManager.removeAll();

          // Calculate total monsters to spawn based on currentDay (Day 1 = 3, Day 2 = 5, Day 3 = 7...)
          const monsterCount = 3 + (taskManager.currentDay - 1) * 2;
          const spawnPoints = [
            { x: 0, y: 0, z: -12, type: 'stalker' as const },
            { x: -10.0, y: 0, z: 4.0, type: 'fiend' as const },
            { x: 10.0, y: 0, z: 4.0, type: 'stalker' as const },
            { x: 0, y: 0, z: -18, type: 'fiend' as const },
            { x: -7.0, y: 0, z: -6.0, type: 'stalker' as const },
            { x: 7.0, y: 0, z: -6.0, type: 'fiend' as const },
            { x: 0, y: 0, z: 8.0, type: 'stalker' as const },
          ];

          for (let m = 0; m < monsterCount; m++) {
            const pt = spawnPoints[m % spawnPoints.length];
            const entId = `ent_${taskManager.currentDay}_${m}`;
            // Add slight spatial offset for extra monsters
            const offsetX = (Math.random() - 0.5) * 2.0;
            const offsetZ = (Math.random() - 0.5) * 2.0;
            entitiesManager.spawnEntity(pt.x + offsetX, pt.y, pt.z + offsetZ, entId, pt.type);
          }

          soundManager.playEntityRoar();
        }
      };

      // Start background sound ambience
      soundManager.startCalmAmbience();

      // 4. Main Animation & Game Loop
      const clock = new THREE.Clock();

      const gameLoop = () => {
        const delta = Math.min(clock.getDelta(), 0.1);
        const time = clock.getElapsedTime();

        if (!isGameOver && controlsManager && sceneManager) {
          // Update Physics & Controls
          controlsManager.update(delta, sceneManager.boundingBoxes);

          // Handle Key E interaction press from keyboard
          if (controlsManager.input.interact) {
            controlsManager.input.interact = false;
            handleInteract();
          }

          // Handle Left Mouse Click / Use item press
          if (controlsManager.input.useItem) {
            controlsManager.input.useItem = false;
            const inv = controlsManager.playerState.inventory;
            const currentItem = inv[controlsManager.playerState.selectedSlot];
            if (!currentItem || currentItem.type !== 'weapon') {
              const wepIndex = inv.findIndex((it) => it?.type === 'weapon');
              if (wepIndex !== -1) {
                controlsManager.playerState.selectedSlot = wepIndex;
              }
            }
            handleUseSelectedItem();
          }

          // Sync player stats & held weapon visibility
          setPlayerState({ ...controlsManager.playerState });
          const selItem = controlsManager.playerState.inventory[controlsManager.playerState.selectedSlot];
          sceneManager.updateHeldWeapon(selItem?.type === 'weapon');

          // Update Glitch & Portal effects (Blinding Bloom)
          sceneManager.updateGlitchEffects(taskManager.phase, time);

          // Auto-trigger entering Backrooms if stepping into doorway in GLITCH phase
          if (!isInBackroomsRef.current && taskManager.phase === GamePhase.GLITCH && controlsManager.position.z <= -9.5) {
            enterBackrooms();
          }

          // Check interactive target near player camera ray / position
          checkInteractions(controlsManager, sceneManager, taskManager);

          // Update Entities logic (Phase 3 Defense)
          const cameraDir = new THREE.Vector3();
          sceneManager.camera.getWorldDirection(cameraDir);

          entitiesManager.update(
            delta,
            controlsManager.position,
            taskManager.phase,
            controlsManager.isFlashlightOn,
            cameraDir,
            (damage) => {
              controlsManager!.playerState.health = Math.max(0, controlsManager!.playerState.health - damage);
              if (controlsManager!.playerState.health <= 0) {
                setIsGameOver(true);
              }
            }
          );
        }

        // Render Three.js Scene with Unreal Bloom
        if (sceneManager) {
          sceneManager.render();
        }
        animId = requestAnimationFrame(gameLoop);
      };

      gameLoop();
    } catch (err) {
      console.error('WebGL / 3D Context initialization error:', err);
      setWebGlError(true);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      soundManager.stopAll();
      controlsManager?.dispose();
      sceneManager?.dispose();
    };
  }, []);

  // Check proximity and camera sight aim alignment to interactive objects
  const checkInteractions = (
    controls: ControlsManager,
    scene: SceneManager,
    tasks: TaskManager
  ) => {
    const camera = scene.camera;
    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);

    let foundPrompt: string | null = null;
    let foundId: string | null = null;

    // Helper to check if crosshair/camera ray is aiming at target within distance
    const isAimingAt = (targetPos: THREE.Vector3, maxDist = 4.5, minDot = 0.70) => {
      const toTarget = new THREE.Vector3().subVectors(targetPos, cameraPos);
      const dist = toTarget.length();
      if (dist > maxDist) return false;
      toTarget.normalize();
      const dot = cameraDir.dot(toTarget);
      if (dist < 2.5) return dot >= 0.50;
      return dot >= minDot;
    };

    // A. Tasks Interactions (Only when NOT inside Backrooms)
    if (!isInBackroomsRef.current) {
      // 1. Kitchen Stove (Task 1) - (-7.3, 0.9, 4.5)
      if (isAimingAt(new THREE.Vector3(-7.3, 0.9, 4.5), 3.5)) {
        const t = tasks.tasks.find((task) => task.id === 't1');
        if (t && !t.completed) {
          foundPrompt = 'Apagar Estufa de la Cocina';
          foundId = 't1';
        }
      }

      // 2. Trash Can (Task 2) - (-8.2, 0.22, 7.0)
      if (!foundPrompt && isAimingAt(new THREE.Vector3(-8.2, 0.22, 7.0), 3.5)) {
        const t = tasks.tasks.find((task) => task.id === 't2');
        if (t && !t.completed) {
          foundPrompt = 'Tirar la Basura';
          foundId = 't2';
        }
      }

      // 3. Bathroom Faucet (Task 4) - Vanity at (-6.0, 0.95, -0.425)
      if (!foundPrompt && isAimingAt(new THREE.Vector3(-6.0, 0.95, -0.425), 3.8)) {
        const t = tasks.tasks.find((task) => task.id === 't4');
        if (t && !t.completed) {
          foundPrompt = 'Cerrar Grifo del Baño';
          foundId = 't4';
        }
      }

      // 4. Bedroom Window (Task 5) - Bedroom Window at (9.0, 1.65, -5.0)
      if (!foundPrompt && isAimingAt(new THREE.Vector3(9.0, 1.65, -5.0), 4.5, 0.75)) {
        const t = tasks.tasks.find((task) => task.id === 't5');
        if (t && !t.completed) {
          foundPrompt = 'Asegurar Ventana del Dormitorio';
          foundId = 't5';
        }
      }

      // 5. Door (Task 3) - (0, 1.2, -9.5)
      if (!foundPrompt && isAimingAt(new THREE.Vector3(0, 1.2, -9.5), 4.0)) {
        if (tasks.phase === GamePhase.CALM) {
          const t = tasks.tasks.find((task) => task.id === 't3');
          if (t && !t.completed) {
            foundPrompt = 'Investigar la puerta';
            foundId = 't3';
          }
        }
      }
    }

    // B. Dynamic Lootable 3D Items Interactions
    if (!foundPrompt) {
      scene.lootMeshes.forEach((mesh, lootId) => {
        if (foundPrompt) return;
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        if (isAimingAt(worldPos, 4.5, 0.70)) {
          if (lootId.startsWith('loot_flashlight')) {
            foundPrompt = 'Recoger Linterna 🔦';
            foundId = lootId;
          } else if (lootId.startsWith('loot_medkit')) {
            foundPrompt = 'Recoger Botiquín de Curas 🩹';
            foundId = lootId;
          } else if (lootId.startsWith('loot_weapon')) {
            foundPrompt = 'Recoger Pistola de Defensa 🔫';
            foundId = lootId;
          } else if (lootId.startsWith('loot_ammo')) {
            foundPrompt = 'Recoger Munición (+10) 📦';
            foundId = lootId;
          }
        }
      });
    }

    if (foundPrompt) {
      foundPrompt = `Tocar / Presionar E: ${foundPrompt}`;
    }

    setInteractionPrompt(foundPrompt);
    activeInteractableRef.current = foundId;
  };

  const handleInteract = () => {
    const interactId = activeInteractableRef.current;
    if (!interactId || !controlsManagerRef.current || !sceneManagerRef.current) return;

    if (interactId === 't1' || interactId === 't2' || interactId === 't3' || interactId === 't4' || interactId === 't5') {
      taskManagerRef.current?.completeTask(interactId);

      // Visual feedback on task completion
      if (interactId === 't1' && sceneManagerRef.current?.stoveLight) {
        sceneManagerRef.current.stoveLight.intensity = 0;
      } else if (interactId === 't2' && sceneManagerRef.current?.trashMesh) {
        sceneManagerRef.current.trashMesh.visible = false;
      } else if (interactId === 't4' && sceneManagerRef.current?.waterDripLight) {
        sceneManagerRef.current.waterDripLight.intensity = 0;
      } else if (interactId === 't5' && sceneManagerRef.current?.bedroomWindowMesh) {
        // Secure window by dimming and adding locked glass tone
        sceneManagerRef.current.bedroomWindowMesh.position.z = -5.0;
        sceneManagerRef.current.bedroomWindowMesh.scale.set(1, 1, 0.9);
      }
    } else if (interactId.startsWith('loot_')) {
      // Handle item pickup
      const inv = [...controlsManagerRef.current.playerState.inventory];

      if (interactId.startsWith('loot_ammo')) {
        controlsManagerRef.current.playerState.ammo += 10;
        soundManager.playPickup();
        sceneManagerRef.current.removeLootMesh(interactId);
        setPlayerState({ ...controlsManagerRef.current.playerState });
        return;
      }

      // Find first empty slot
      const emptyIdx = inv.findIndex((slot) => slot === null);
      if (emptyIdx === -1) {
        setInteractionPrompt('¡Inventario Lleno!');
        return;
      }

      let newItem: Item | null = null;
      if (interactId.startsWith('loot_flashlight')) {
        newItem = { id: 'fl1', name: 'Linterna', icon: '🔦', type: 'flashlight', description: 'Linterna de mano potente (Tecla F).' };
      } else if (interactId.startsWith('loot_medkit')) {
        newItem = { id: `med_${Date.now()}`, name: 'Botiquín', icon: '🩹', type: 'medkit', description: 'Cura +50 de Salud al usarlo.', healAmount: 50 };
      } else if (interactId.startsWith('loot_weapon')) {
        newItem = { id: 'wep1', name: 'Pistola de Defensa', icon: '🔫', type: 'weapon', description: 'Aturde a las entidades Backrooms.' };
        // Give 5 initial bullets on pickup
        controlsManagerRef.current.playerState.ammo += 5;
      }

      if (newItem) {
        inv[emptyIdx] = newItem;
        controlsManagerRef.current.playerState.inventory = inv;
        sceneManagerRef.current.removeLootMesh(interactId);
        soundManager.playPickup();
        setPlayerState({ ...controlsManagerRef.current.playerState });
      }
    } else {
      // Use currently selected inventory item if no loot target
      handleUseSelectedItem();
    }
  };

  // Use currently selected inventory item
  const handleUseSelectedItem = () => {
    if (!controlsManagerRef.current) return;
    const { playerState } = controlsManagerRef.current;
    const item = playerState.inventory[playerState.selectedSlot];
    if (!item) return;

    if (item.type === 'medkit') {
      playerState.health = Math.min(100, playerState.health + (item.healAmount || 50));
      soundManager.playHeal();
      playerState.inventory[playerState.selectedSlot] = null; // consume item
      setPlayerState({ ...playerState });
    } else if (item.type === 'weapon') {
      if (playerState.ammo > 0) {
        playerState.ammo -= 1;
        soundManager.playGunshot();
        sceneManagerRef.current?.triggerGunRecoil();

        // Hitscan damage against monsters in crosshair direction
        if (entitiesManagerRef.current && sceneManagerRef.current) {
          const camDir = new THREE.Vector3();
          sceneManagerRef.current.camera.getWorldDirection(camDir);
          const camPos = new THREE.Vector3();
          sceneManagerRef.current.camera.getWorldPosition(camPos);

          const entitiesList = [...entitiesManagerRef.current.entities];
          entitiesList.forEach((ent) => {
            const entPos = ent.mesh.position;
            const toEnt = new THREE.Vector3().subVectors(entPos, camPos);
            const dist = toEnt.length();
            if (dist < 20.0) {
              toEnt.normalize();
              const dot = camDir.dot(toEnt);
              if (dot > 0.82) {
                // Direct hit! Deal 35 damage (3 hits kill monster with 100 HP)
                ent.stunTimer = 0.6;
                entitiesManagerRef.current!.damageEntity(ent.state.id, 35);
              }
            }
          });
        }
        setPlayerState({ ...playerState });
      }
    } else if (item.type === 'flashlight') {
      handleToggleFlashlight();
    }
  };

  const handleSelectSlot = (idx: number) => {
    if (!controlsManagerRef.current) return;
    controlsManagerRef.current.playerState.selectedSlot = idx;
    setPlayerState({ ...controlsManagerRef.current.playerState });

    // Use item on selection if it's a medkit
    const item = controlsManagerRef.current.playerState.inventory[idx];
    if (item && item.type === 'medkit') {
      handleUseSelectedItem();
    }
  };

  const handleToggleFlashlight = () => {
    if (!controlsManagerRef.current) return;
    controlsManagerRef.current.toggleFlashlight();
    setPlayerState({ ...controlsManagerRef.current.playerState });
  };

  const handleGoMainMenu = () => {
    handleResetGame();
    setHasStartedGame(false);
    setIsSettingsOpen(false);
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  };

  const handleResetGame = () => {
    if (backroomsIntervalRef.current) clearInterval(backroomsIntervalRef.current);
    if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
    setBackroomsTimer(null);
    setPrepTimer(null);
    isInBackroomsRef.current = false;
    setIsInBackrooms(false);

    if (controlsManagerRef.current) {
      controlsManagerRef.current.playerState = {
        health: 100,
        stamina: 100,
        battery: 100,
        inventory: [null, null, null, null, null],
        selectedSlot: 0,
        ammo: 0,
      };
      controlsManagerRef.current.position.set(0, 1.7, 4);
      controlsManagerRef.current.isFlashlightOn = false;
    }
    if (taskManagerRef.current) {
      taskManagerRef.current.currentDay = 1;
      taskManagerRef.current.setPhase(GamePhase.CALM);
      taskManagerRef.current.tasks.forEach((t) => (t.completed = false));
    }
    if (entitiesManagerRef.current) {
      entitiesManagerRef.current.removeAll();
    }
    if (sceneManagerRef.current) {
      sceneManagerRef.current.turnOnHouseLights();
      sceneManagerRef.current.buildProceduralBackrooms();
    }
    setCurrentDay(1);
    setNightSurvivedModal(null);
    setPlayerState({
      health: 100,
      stamina: 100,
      battery: 100,
      inventory: [null, null, null, null, null],
      selectedSlot: 0,
      ammo: 0,
    });
    setPhase(GamePhase.CALM);
    setIsGameOver(false);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* Main HUD Overlay */}
      <HUD
        playerState={playerState}
        currentTask={taskManagerRef.current?.getCurrentTask()}
        phase={phase}
        currentDay={currentDay}
        interactionPrompt={interactionPrompt}
        backroomsTimer={backroomsTimer}
        prepTimer={prepTimer}
        multiplayerPlayers={multiplayerPlayers || undefined}
        onInteract={handleInteract}
        onSelectSlot={handleSelectSlot}
        onToggleFlashlight={handleToggleFlashlight}
        onToggleSettings={() => setIsSettingsOpen(true)}
        onVirtualJoystickMove={(x, y) => {
          if (controlsManagerRef.current) {
            controlsManagerRef.current.input.moveRight = x;
            controlsManagerRef.current.input.moveForward = y;
          }
        }}
        onVirtualLookMove={(dx, dy) => {
          if (controlsManagerRef.current) {
            controlsManagerRef.current.handleLook(dx, dy);
          }
        }}
        onVirtualJump={() => {
          if (controlsManagerRef.current) {
            controlsManagerRef.current.input.jump = true;
            setTimeout(() => {
              if (controlsManagerRef.current) controlsManagerRef.current.input.jump = false;
            }, 100);
          }
        }}
        onVirtualSprint={(sprinting) => {
          if (controlsManagerRef.current) {
            controlsManagerRef.current.input.sprint = sprinting;
          }
        }}
        onVirtualCrouch={() => {
          if (controlsManagerRef.current) {
            controlsManagerRef.current.input.crouch = !controlsManagerRef.current.input.crouch;
          }
        }}
      />

      {/* Animated Phase Change Announcement Banner */}
      <PhaseBanner phase={phase} />

      {/* NIGHT SURVIVED CELEBRATION MODAL OVERLAY */}
      {nightSurvivedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 select-none">
          <div className="bg-[#0e0e14] border border-amber-500/50 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
            
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/40 mx-auto flex items-center justify-center text-amber-400 shadow-inner">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono font-extrabold uppercase tracking-[0.25em] text-amber-400 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/30">
                ¡NOCHE {nightSurvivedModal.day} SOBREVIVIDA!
              </span>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight pt-1">
                AMANECE EN EL DÍA {nightSurvivedModal.day + 1}
              </h2>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Has repelido la oleada de monstruos anómalos. Las tareas de la casa se han reiniciado para la nueva jornada. ¡Prepárate, la próxima noche habrá más entidades!
              </p>
            </div>

            {/* REWARDS SUMMARY BOX */}
            <div className="bg-black/60 border border-zinc-800 p-4 rounded-2xl grid grid-cols-2 gap-3 text-center">
              <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-red-500/20">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">Salud Restaurada</span>
                <span className="text-emerald-400 font-mono font-black text-sm">+{nightSurvivedModal.hpBonus} HP</span>
              </div>
              <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-amber-500/20">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block">Bono de Munición</span>
                <span className="text-amber-400 font-mono font-black text-sm">+{nightSurvivedModal.ammoBonus} Balas</span>
              </div>
            </div>

            <button
              onClick={() => setNightSurvivedModal(null)}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 active:scale-98 text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl transition shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2"
            >
              <span>CONTINUAR AL DÍA {nightSurvivedModal.day + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* START MENU / INITIAL MENU OVERLAY */}
      {!hasStartedGame && (
        <StartMenu
          onStartGame={handleStartGame}
          lookSensitivity={lookSensitivity}
          onSensitivityChange={(val) => {
            setLookSensitivity(val);
            if (controlsManagerRef.current) {
              controlsManagerRef.current.lookSensitivity = val;
            }
          }}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          onOpenMultiplayer={() => setIsMultiplayerOpen(true)}
          selectedSkinId={selectedSkinId}
        />
      )}

      {/* MULTIPLAYER & CHARACTER CUSTOMIZATION MODAL */}
      <MultiplayerModal
        isOpen={isMultiplayerOpen}
        onClose={() => setIsMultiplayerOpen(false)}
        selectedSkinId={selectedSkinId}
        onSelectSkin={(skinId) => setSelectedSkinId(skinId)}
        onStartMultiplayerGame={(code, playersList) => {
          setMultiplayerPlayers(playersList);
          setIsMultiplayerOpen(false);
          handleStartGame();
        }}
      />

      {/* INITIAL LOADING SCREEN OVERLAY */}
      {isLoading && (
        <LoadingScreen onComplete={() => setIsLoading(false)} />
      )}

      {/* VHS TV STATIC GLITCH TRANSITION SCREEN */}
      {isVhsTransition && <VhsGlitchOverlay message={vhsMessage} />}

      {/* Settings & Controls Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetGame={handleResetGame}
        onGoMainMenu={handleGoMainMenu}
        lookSensitivity={lookSensitivity}
        onSensitivityChange={(val) => {
          setLookSensitivity(val);
          if (controlsManagerRef.current) {
            controlsManagerRef.current.lookSensitivity = val;
          }
        }}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        brightness={brightness}
        onBrightnessChange={handleBrightnessChange}
      />

      {/* WEBGL ERROR FALLBACK SCREEN */}
      {webGlError && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center p-6 text-white text-center">
          <div className="max-w-md w-full bg-zinc-900/90 border border-white/10 rounded-2xl p-8 shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-light uppercase tracking-tight mb-2">Aviso de Contexto 3D / WebGL</h2>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              No se pudo inicializar el motor gráfico WebGL. Asegúrate de que la aceleración por hardware esté activada en tu navegador o reinicia la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition"
            >
              Reiniciar Página
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-red-900/80 rounded-3xl max-w-md w-full p-8 text-center shadow-[0_0_80px_rgba(239,68,68,0.5)]">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
            <h1 className="text-3xl font-extrabold text-red-500 font-mono tracking-widest uppercase mb-2">
              FIN DEL JUEGO
            </h1>
            <p className="text-xs text-zinc-400 mb-6">
              Las entidades de la anomalía han capturado tu presencia.
            </p>
            <button
              onClick={handleResetGame}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 transition active:scale-95"
            >
              <RotateCcw className="w-5 h-5" /> Reintentar Partida
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
