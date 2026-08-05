import { GamePhase, Task } from '../types/game';
import { soundManager } from './SoundManager';

export class TaskManager {
  public phase: GamePhase = GamePhase.CALM;
  public currentDay: number = 1;
  public onPhaseChange?: (newPhase: GamePhase) => void;
  public onDayChange?: (day: number) => void;

  public tasks: Task[] = [
    {
      id: 't1',
      title: 'Apagar la estufa',
      description: 'Acércate a la cocina y apaga la estufa.',
      completed: false,
      phase: GamePhase.CALM,
      targetId: 'Kitchen Counter',
    },
    {
      id: 't2',
      title: 'Tirar la basura',
      description: 'Recoge el bote de basura en la cocina.',
      completed: false,
      phase: GamePhase.CALM,
      targetId: 'Trash Can',
    },
    {
      id: 't4',
      title: 'Cerrar el grifo del baño',
      description: 'Ve al lavamanos del baño y cierra la llave.',
      completed: false,
      phase: GamePhase.CALM,
      targetId: 'Bathroom Faucet',
    },
    {
      id: 't5',
      title: 'Asegurar la ventana',
      description: 'Ve al dormitorio y asegura la ventana.',
      completed: false,
      phase: GamePhase.CALM,
      targetId: 'Bedroom Window',
    },
    {
      id: 't3',
      title: 'Inspeccionar la puerta',
      description: 'Examina la puerta al fondo.',
      completed: false,
      phase: GamePhase.CALM,
      targetId: 'Backrooms Portal',
    },
    {
      id: 't_loot',
      title: 'Explorar los Backrooms',
      description: 'Explora el laberinto y junta linterna, armas y botiquines.',
      completed: false,
      phase: GamePhase.GLITCH,
      targetId: 'Backrooms Portal',
    },
    {
      id: 't_def',
      title: 'Sobrevivir la invasión',
      description: 'Elimina a las entidades anómalas que intentan entrar.',
      completed: false,
      phase: GamePhase.DEFENSE,
    },
  ];

  public resetTasksForNextDay() {
    this.currentDay += 1;
    this.tasks.forEach((t) => (t.completed = false));
    this.setPhase(GamePhase.CALM);
    if (this.onDayChange) {
      this.onDayChange(this.currentDay);
    }
  }

  public completeTask(taskId: string): GamePhase {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task && !task.completed) {
      task.completed = true;
      soundManager.playInteract();

      // Check if all CALM tasks done
      const calmTasksLeft = this.tasks.filter((t) => t.phase === GamePhase.CALM && !t.completed);
      if (calmTasksLeft.length === 0 && this.phase === GamePhase.CALM) {
        this.setPhase(GamePhase.GLITCH);
      }
    }
    return this.phase;
  }

  public setPhase(newPhase: GamePhase) {
    this.phase = newPhase;
    soundManager.updatePhaseAudio(newPhase);

    if (newPhase === GamePhase.GLITCH) {
      soundManager.playGlitchSound();
    } else if (newPhase === GamePhase.DEFENSE) {
      soundManager.playEntityRoar();
    }

    if (this.onPhaseChange) {
      this.onPhaseChange(newPhase);
    }
  }

  public getCurrentTask(): Task | undefined {
    return this.tasks.find((t) => t.phase === this.phase && !t.completed);
  }
}
