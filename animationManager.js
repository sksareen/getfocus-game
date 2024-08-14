class AnimationManager {
    constructor(container, exercises) {
        this.container = container;
        this.exercises = exercises;
        this.isExerciseActive = false;
        this.isPaused = false;
        this.currentExercise = null;
        this.phase = 0;
        this.animationFrame = null;
        this.lastTimestamp = 0;
        this.currentScale = 1;
        this.minScale = 1;
        this.maxScale = 5;
        this.lastPhaseType = null;
        this.cycleCount = 0;
        this.elapsedTime = 0;
        this.lastScale = 1;
        this.lastOpacity = 1;
    }

    updateInstruction() {
        const currentPhase = this.exercises[this.currentExercise].phases[this.phase];
        const instruction = document.getElementById('breather-extension-instruction');
        if (instruction) {
            instruction.textContent = currentPhase.instruction;
        }
    }

    breathingAnimation(timestamp) {
        if (!this.isExerciseActive || this.isPaused) {
            return;
        }

        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
        }

        const elapsed = timestamp - this.lastTimestamp;
        this.elapsedTime += elapsed;

        const currentPhase = this.exercises[this.currentExercise].phases[this.phase];
        const phaseDuration = currentPhase.duration;
        const progress = Math.min(this.elapsedTime / phaseDuration, 1);

        this.updateCircleAnimation(currentPhase, progress);
        this.updateCountdown(phaseDuration - this.elapsedTime);

        if (progress < 1) {
            this.animationFrame = requestAnimationFrame(this.breathingAnimation.bind(this));
        } else {
            this.moveToNextPhase(timestamp);
        }

        this.lastTimestamp = timestamp;
    }

    updateCircleAnimation(currentPhase, progress) {
        const circle = document.getElementById('breather-extension-circle');
        if (circle) {
            const newScale = this.getCircleScale(currentPhase.type, progress);
            const newOpacity = currentPhase.type === 'inhale' ? 0.8 + (0.2 * progress) : 1 - (0.3 * progress);

            if (Math.abs(newScale - this.lastScale) > 0.01 || Math.abs(newOpacity - this.lastOpacity) > 0.01) {
                circle.style.transform = `scale(${newScale})`;
                circle.style.opacity = newOpacity;
                this.lastScale = newScale;
                this.lastOpacity = newOpacity;
            }
        }
    }

    updateCountdown(remainingTime) {
        const countdownTimer = document.getElementById('breather-extension-timer');
        if (countdownTimer) {
            const remaining = Math.ceil(remainingTime / 1000);
            if (remaining !== parseInt(countdownTimer.textContent)) {
                countdownTimer.textContent = remaining > 0 ? `${remaining}` : '';
            }
        }
    }

    moveToNextPhase(timestamp) {
        this.lastPhaseType = this.exercises[this.currentExercise].phases[this.phase].type;
        this.phase = (this.phase + 1) % this.exercises[this.currentExercise].phases.length;
        if (this.phase === 0) {
            this.cycleCount++;
            this.updateCycleCount();
        }
        this.elapsedTime = 0;
        this.lastTimestamp = timestamp;
        this.updateInstruction();
        this.animationFrame = requestAnimationFrame(this.breathingAnimation.bind(this));
    }

    getCircleScale(phaseType, progress) {
        switch (phaseType) {
            case 'inhale':
                return this.minScale + (this.maxScale - this.minScale) * progress;
            case 'exhale':
                return this.maxScale - (this.maxScale - this.minScale) * progress;
            case 'hold':
                return this.lastPhaseType === 'inhale' ? this.maxScale : this.minScale;
            default:
                return 1;
        }
    }

    startAnimation(exercise) {
        this.currentExercise = exercise;
        this.isExerciseActive = true;
        this.isPaused = false;
        this.phase = 0;
        this.lastTimestamp = 0;
        this.lastPhaseType = null;
        this.elapsedTime = 0;
        this.resetCircle();
        this.cycleCount = 0;
        this.updateCycleCount();
        this.updateInstruction();
        this.animationFrame = requestAnimationFrame(this.breathingAnimation.bind(this));
        console.log('AnimationManager.startAnimation called');
    }

    stopAnimation() {
        console.log('AnimationManager.stopAnimation called');
        this.isExerciseActive = false;
        this.isPaused = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.resetCircle();
        this.updateUI('Click Start', '');
        this.cycleCount = 0;
        this.updateCycleCount();
    }

    pauseAnimation() {
        this.isPaused = true;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    resumeAnimation() {
        if (this.isExerciseActive && this.isPaused) {
            this.isPaused = false;
            this.lastTimestamp = 0;
            this.animationFrame = requestAnimationFrame(this.breathingAnimation.bind(this));
        }
    }

    resetCircle() {
        const countdownTimer = document.getElementById('breather-extension-timer');
        if (countdownTimer) {
            countdownTimer.textContent = '';
        }
        const circle = document.getElementById('breather-extension-circle');
        if (circle) {
            circle.style.transition = 'none';
            circle.style.transform = 'scale(1)';
            circle.style.opacity = '1';
        }
    }

    updateUI(instruction, countdown) {
        const instructionEl = document.getElementById('breather-extension-instruction');
        const countdownEl = document.getElementById('breather-extension-timer');
        if (instructionEl) instructionEl.textContent = instruction;
        if (countdownEl) countdownEl.textContent = countdown;
    }

    updateCycleCount() {
        if (this.cycleCount >= 3) {
            this.stopAnimation();
            if (typeof window.showFinalScore === 'function') {
                window.showFinalScore();
            }
        } else {
            if (typeof window.updateCycleDisplay === 'function') {
                window.updateCycleDisplay();
            }
        }
    }
}

window.AnimationManager = AnimationManager;