window.exercises = {
  anxiety: { 
    name: `Box Breathing`, 
    phases: [
        { duration: 4000, instruction: 'breathe in', type: 'inhale' },
        { duration: 4000, instruction: 'hold', type: 'hold' },
        { duration: 4000, instruction: 'breathe out', type: 'exhale' },
        { duration: 4000, instruction: 'hold', type: 'hold' }
    ]
  }
};

let isExerciseActive = false;
let animationManager;
let currentExercise = 'anxiety';
let eyeTrackingManager;
let countdownInterval;

const storage = {
  get: (keys, callback) => {
      const result = {};
      keys.forEach(key => {
          result[key] = JSON.parse(localStorage.getItem(key)) || null;
      });
      callback(result);
  },
  set: (data) => {
      Object.keys(data).forEach(key => {
          localStorage.setItem(key, JSON.stringify(data[key]));
      });
  }
};

function initializeApp() {
  console.log('Initializing app');

  storage.get(['darkMode'], (result) => {
      if (result.darkMode !== undefined) {
          document.getElementById('dark-mode-toggle').checked = result.darkMode;
          document.body.classList.toggle('dark-mode', result.darkMode);
      }
  });

  eyeTrackingManager = new EyeTrackingManager();

  setTimeout(() => {
      eyeTrackingManager.init();
  }, 1000);

  animationManager = new AnimationManager(document.getElementById('app'), window.exercises);
  
  document.getElementById('breather-extension-toggle-button').addEventListener('click', toggleBreathing);
  document.getElementById('dark-mode-toggle').addEventListener('change', toggleDarkMode);
  document.getElementById('eye-tracking-toggle').addEventListener('change', toggleEyeTracking);
  document.addEventListener('keydown', handleKeyPress);

  updateCycleDisplay();

}

function handleKeyPress(event) {
  if (event.code === 'Space') {
      event.preventDefault();
      toggleBreathing();
  } else if (event.code === 'Escape') {
      const countdownOverlay = document.getElementById('countdown-overlay');
      if (countdownOverlay.classList.contains('visible')) {
          clearInterval(countdownInterval);
          countdownOverlay.classList.remove('visible');
          stopExercise();
      }
  }
}

function startExercise() {
  console.log('Starting exercise');
  const toggleButton = document.getElementById('breather-extension-toggle-button');
  toggleButton.disabled = true;
  let countdown = 3;
  
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownTimer = document.getElementById('countdown-timer');
  
  countdownOverlay.classList.add('visible');
  
  countdownInterval = setInterval(() => {
      if (countdown > 0) {
          countdownTimer.textContent = countdown;
          countdown--;
      } else {
          clearInterval(countdownInterval);
          countdownOverlay.classList.remove('visible');
          toggleButton.textContent = 'Stop';
          toggleButton.className = 'stop pulsing';
          toggleButton.disabled = false;
          isExerciseActive = true;
          if (animationManager) {
              animationManager.startAnimation(currentExercise);
          }
          if (eyeTrackingManager) {
              eyeTrackingManager.startTracking();
              if (animationManager) {
                  animationManager.resumeAnimation();
              }
          } else {
              console.warn('Eye tracking manager not initialized');
          }
      }
  }, 1000);
  updateCycleDisplay();
  
}

function stopExercise() {
  console.log('Stopping exercise');
  isExerciseActive = false;
  if (animationManager) {
      animationManager.stopAnimation();
  }
  if (eyeTrackingManager) {
      eyeTrackingManager.stopTracking();
  }
  updateToggleButton('Start');
  updateCycleDisplay();
  showFinalScore();

}

function updateCycleDisplay() {
  const cycleDisplay = document.getElementById('cycle-display');
  cycleDisplay.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = `cycle-dot ${i < animationManager.cycleCount ? 'completed' : ''}`;
    cycleDisplay.appendChild(dot);
  }
}

function showFinalScore() {
  const pointsDisplay = document.getElementById('points-display');
  pointsDisplay.textContent = `Final Score: ${eyeTrackingManager.getPoints()} points`;
}

function updateToggleButton(text) {
  const toggleButton = document.getElementById('breather-extension-toggle-button');
  if (toggleButton) {
    toggleButton.className = text === 'Start' ? '' : 'stop pulsing';
    toggleButton.textContent = text;
  }
}

function toggleBreathing() {
  if (isExerciseActive) {
    stopExercise();
  } else {
    startExercise();
  }
}

function toggleDarkMode() {
  const isDarkMode = document.getElementById('dark-mode-toggle').checked;
  document.body.classList.toggle('dark-mode', isDarkMode);
  storage.set({ darkMode: isDarkMode });
}

function toggleEyeTracking(event) {
  const isVideoVisible = event.target.checked;
  if (eyeTrackingManager) {
    eyeTrackingManager.toggleVideo(isVideoVisible);
  } else {
    console.warn('Eye tracking manager not initialized');
    event.target.checked = !isVideoVisible;
  }
}

function updateFocusIndicator(status) {
  const focusIndicator = document.getElementById('focusIndicator');
  if (focusIndicator) {
    focusIndicator.textContent = status;
    focusIndicator.className = status.toLowerCase();
  }
}


document.addEventListener('DOMContentLoaded', initializeApp);