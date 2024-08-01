class AnimationManager {
    constructor(shadowRoot, exercises) {
      this.shadowRoot = shadowRoot;
      this.exercises = exercises;
      this.isExerciseActive = false;
      this.currentExercise = null;
      this.phase = 0;
      this.animationFrame = null;
    }
  
    startAnimation(exercise) {
      this.currentExercise = exercise;
      this.isExerciseActive = true;
      this.phase = 0;
      this.resetCircle();
      this.breathingAnimation();
    }
  
    stopAnimation() {
      this.isExerciseActive = false;
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      this.resetCircle();
      this.updateUI('Exercise stopped', '');
    }
  
    changeExercise(exercise) {
      this.currentExercise = exercise;
      this.phase = 0;
      this.resetCircle();
      if (this.isExerciseActive) {
        this.breathingAnimation();
      }
    }
  
    resetCircle() {
      const circle = this.shadowRoot.getElementById('breather-extension-circle');
      if (circle) {
        circle.style.transform = 'scale(1)';
        circle.style.opacity = '1';
      }
    }
  
    breathingAnimation() {
      if (!this.isExerciseActive) {
        console.log('Breathing animation stopped');
        return;
      }
  
      const circle = this.shadowRoot.getElementById('breather-extension-circle');
      const instruction = this.shadowRoot.getElementById('breather-extension-instruction');
      const countdownTimer = this.shadowRoot.getElementById('breather-extension-timer');
  
      if (!circle || !instruction || !countdownTimer) {
        console.error('Required elements not found in Shadow DOM');
        return;
      }
  
      const currentPhase = this.exercises[this.currentExercise].phases[this.phase];
      const isInhale = currentPhase.instruction.toLowerCase().includes('inhale');
      const isExhale = currentPhase.instruction.toLowerCase().includes('exhale');
      
      if (isInhale) {
        circle.style.transform = 'scale(19)';
        circle.style.opacity = '0.6';
      } else if (isExhale) {
        circle.style.transform = 'scale(0.5)';
        circle.style.opacity = '1';
      }
      // No change during hold periods
  
      instruction.textContent = currentPhase.instruction;
  
      let startTime = performance.now();
      let elapsed = 0;
  
      const animate = (currentTime) => {
        elapsed = currentTime - startTime;
        const remaining = Math.ceil((currentPhase.duration - elapsed) / 1000);
        countdownTimer.textContent = remaining > 0 ? `${remaining}` : '';
  
        if (elapsed < currentPhase.duration) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          this.phase = (this.phase + 1) % this.exercises[this.currentExercise].phases.length;
          this.breathingAnimation();
        }
      };
  
      this.animationFrame = requestAnimationFrame(animate);
    }
  
    updateUI(instruction, countdown) {
      const instructionEl = this.shadowRoot.getElementById('breather-extension-instruction');
      const countdownEl = this.shadowRoot.getElementById('breather-extension-timer');
      if (instructionEl) instructionEl.textContent = instruction;
      if (countdownEl) countdownEl.textContent = countdown;
    }
  }
  
  window.AnimationManager = AnimationManager;