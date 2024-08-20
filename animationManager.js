class AnimationManager {
    // The constructor initializes the AnimationManager with the container
    // element and the exercises object.
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

    // This method updates the instruction displayed on the screen.
    updateInstruction() {
        const currentPhase = this.exercises[this.currentExercise].phases[this.phase];
        const instruction = document.getElementById('breather-extension-instruction');
        if (instruction) {
            instruction.textContent = currentPhase.instruction;
        }
    }

    // This method is the main animation loop. It is called every frame
    // and updates the animation state.
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

        // Update the circle animation
        this.updateCircleAnimation(currentPhase, progress);

        // Update the countdown timer
        this.updateCountdown(phaseDuration - this.elapsedTime);

        // If the phase is not finished, schedule the next frame
        if (progress < 1) {
            this.animationFrame = requestAnimationFrame(this.breathingAnimation.bind(this));
        } else {
            // Otherwise, move to the next phase
            this.moveToNextPhase(timestamp);
                // Play different sounds based on odd/even phases
                if ((this.phase + 1) % 4 === 1) {
                    const audio = new Audio('breathein.mp3');
                    audio.volume = 0.3;
                    audio.play();

                }
                if ((this.phase + 1) % 4 === 3) {
                    const audio = new Audio('breatheout.mp3');
                    audio.volume = 0.15;
                    audio.play();
                }
        }

        this.lastTimestamp = timestamp;
    }

    // This method updates the circle animation based on the current phase
    // and progress.
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

    // This method updates the countdown timer displayed on the screen.
    updateCountdown(remainingTime) {
        const countdownTimer = document.getElementById('breather-extension-timer');
        if (countdownTimer) {
            const remaining = Math.ceil(remainingTime / 1000);
            if (remaining !== parseInt(countdownTimer.textContent)) {
                countdownTimer.textContent = remaining > 0 ? `${remaining}` : '';
            }
        }
    }

    // This method moves to the next phase of the exercise.
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

    // This method returns the scale of the circle for the given phase type
    // and progress.
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

    // This method starts the animation.
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
        const audio = new Audio('breathein.mp3');
        audio.volume = 0.3;
        audio.play();
    }

    // This method stops the animation.
    stopAnimation() {
        console.log('AnimationManager.stopAnimation called');
        this.isExerciseActive = false;
        this.isPaused = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.resetCircle();
        this.updateUI('press the button', '');
        this.cycleCount = 0;
        this.updateCycleCount();
    }

    // This method pauses the animation.
    pauseAnimation() {
        this.isPaused = true;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    // This method resumes the animation.
    resumeAnimation() {
        if (this.isExerciseActive && this.isPaused) {
            this.isPaused = false;
            this.lastTimestamp = 0;
            this.animationFrame = requestAnimationFrame(this.breathingAnimation.bind(this));
        }
    }

    // This method resets the circle animation.
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

    // This method updates the UI with the given instruction and countdown.
    updateUI(instruction, countdown) {
        const instructionEl = document.getElementById('breather-extension-instruction');
        const countdownEl = document.getElementById('breather-extension-timer');
        if (instructionEl) instructionEl.textContent = instruction;
        if (countdownEl) countdownEl.textContent = countdown;
    }

    // This method updates the cycle count and displays the final score when
    // the exercise is finished.
    updateCycleCount() {
        if (this.cycleCount >= 3) {
            this.stopAnimation();
            if (typeof window.showFinalScore === 'function') {
                window.showFinalScore();
            }
            if (typeof window.stopExercise === 'function') {
                window.stopExercise();
            }
        } else {
            if (typeof window.updateCycleDisplay === 'function') {
                window.updateCycleDisplay();
            }
        }
    }
}

window.AnimationManager = AnimationManager;

