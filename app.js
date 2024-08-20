// Initialize the exercises object with the Box Breathing exercise
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

// Initialize variables for managing the breathing exercise
let isExerciseActive = false;
let isCountingDown = false;
let animationManager;
let currentExercise = 'anxiety';
let eyeTrackingManager;
let countdownInterval;

// Define a storage object for managing local storage
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

// Initialize the application when the DOMContentLoaded event is fired
function initializeApp() {
  console.log('Initializing app');

  // Get the dark mode preference from local storage and update the UI accordingly
  storage.get(['darkMode'], (result) => {
      if (result.darkMode !== undefined) {
          document.getElementById('dark-mode-toggle').checked = result.darkMode;
          document.body.classList.toggle('dark-mode', result.darkMode);
      }
  });

  // Initialize the eye tracking manager
  eyeTrackingManager = new EyeTrackingManager();

  // Wait for 1 second before initializing the eye tracking manager
  setTimeout(() => {
      eyeTrackingManager.init();
  }, 1000);

  // Initialize the animation manager
  animationManager = new AnimationManager(document.getElementById('app'), window.exercises);
  
  // Add event listeners for the toggle button, dark mode toggle, and eye tracking toggle
  document.getElementById('breather-extension-toggle-button').addEventListener('click', toggleBreathing);
  document.getElementById('dark-mode-toggle').addEventListener('change', toggleDarkMode);
  document.getElementById('eye-tracking-toggle').addEventListener('change', toggleEyeTracking);
  document.addEventListener('keydown', handleKeyPress);

  // Update the cycle display
  updateCycleDisplay();
}

// Handle key press events
function handleKeyPress(event) {
  if (event.code === 'Space') {
      event.preventDefault();
      toggleBreathing();
  } else if (event.code === 'Escape') {
      if (isCountingDown) {
          cancelCountdown();
      } else if (isExerciseActive) {
          stopExercise();
      }
  }
}

// Start the breathing exercise
function startExercise() {
  if (isExerciseActive || isCountingDown) return;

  console.log('Starting exercise');
  const toggleButton = document.getElementById('breather-extension-toggle-button');
  toggleButton.disabled = true;
  let countdown = 3;
  
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownTimer = document.getElementById('countdown-timer');
  
  countdownOverlay.classList.add('visible');
  isCountingDown = true;

  eyeTrackingManager.resetPoints();
  
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
          isCountingDown = false;
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

// Stop the breathing exercise
function stopExercise() {
  if (!isExerciseActive) return;

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

// Cancel the countdown
function cancelCountdown() {
  clearInterval(countdownInterval);
  const countdownOverlay = document.getElementById('countdown-overlay');
  countdownOverlay.classList.remove('visible');
  isCountingDown = false;
  updateToggleButton('Start');
}

// Update the cycle display
function updateCycleDisplay() {
  const cycleDisplay = document.getElementById('cycle-display');
  cycleDisplay.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = `cycle-dot ${i < animationManager.cycleCount ? 'completed' : ''}`;
    cycleDisplay.appendChild(dot);
  }
}

// Show the final score
function showFinalScore() {
  const pointsDisplay = document.getElementById('points-display');
  const percent = ((eyeTrackingManager.points / 48 * 100)).toFixed(0);
  pointsDisplay.textContent = `Focused: ${100 - percent}%`;
  // pointsDisplay.textContent = `Focused: ${(eyeTrackingManager.getPoints() / 48 * 100).toFixed(0)}`;
}

// Update the toggle button text and class
function updateToggleButton(text) {
  const toggleButton = document.getElementById('breather-extension-toggle-button');
  if (toggleButton) {
    toggleButton.className = text === 'Start' ? '' : 'stop pulsing';
    toggleButton.textContent = text;
  }
}

// Play the chime audio at 10% volume
function playChime() {
  const audio = new Audio('chime.mp3');
  audio.volume = 0.1;
  audio.play();
}

// Toggle the breathing exercise
function toggleBreathing() {
  if (isCountingDown) return;

  if (isExerciseActive) {
    stopExercise();
  } else {
    startExercise();
  }
}

// Toggle the dark mode
function toggleDarkMode() {
  const isDarkMode = document.getElementById('dark-mode-toggle').checked;
  document.body.classList.toggle('dark-mode', isDarkMode);
  storage.set({ darkMode: isDarkMode });
}

// Toggle the eye tracking video
function toggleEyeTracking(event) {
  const isVideoVisible = event.target.checked;
  if (eyeTrackingManager) {
    eyeTrackingManager.toggleVideo(isVideoVisible);
  } else {
    console.warn('Eye tracking manager not initialized');
    event.target.checked = !isVideoVisible;
  }
}

// Update the focus indicator text and class
function updateFocusIndicator(status) {
  const focusIndicator = document.getElementById('focusIndicator');
  if (focusIndicator) {
    focusIndicator.textContent = status;
    focusIndicator.className = status.toLowerCase();
  }
}

// Make stopExercise function globally accessible
window.stopExercise = stopExercise;

// Initialize the application when the DOMContentLoaded event is fired
document.addEventListener('DOMContentLoaded', initializeApp);