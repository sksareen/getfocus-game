window.exercises = {
  sleep: { 
    name: `4-7-8 Breathing`, 
    phases: [
      { duration: 4000, instruction: 'breathe in', type: 'inhale' },
      { duration: 7000, instruction: 'hold', type: 'hold' },
      { duration: 8000, instruction: 'breathe out', type: 'exhale' },
      { duration: 1000, instruction: 'pause', type: 'hold' }
    ]   
  },
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

let breatherUI;
let isOverlayVisible = true;
let isExerciseActive = false;
let animationManager;
let currentExercise = 'sleep';

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
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('App container not found');
    return;
  }
  
  breatherUI = createBreatherUI();
  if (breatherUI) {
    appContainer.appendChild(breatherUI);
  } else {
    console.error('Failed to create breatherUI');
    return;
  }

  storage.get(['currentExercise', 'darkMode'], (result) => {
    currentExercise = result.currentExercise || 'sleep';
    updateExerciseInfo();
    
    if (result.darkMode !== undefined) {
      document.getElementById('dark-mode-toggle').checked = result.darkMode;
      document.body.classList.toggle('dark-mode', result.darkMode);
    }
  });

  animationManager = new AnimationManager(appContainer, window.exercises);
  
  document.addEventListener('breatherToggled', toggleBreathing);

  showOverlay();
}

function updateExerciseInfo() {
  const infoElement = document.getElementById('breather-extension-info');
  if (infoElement) {
    infoElement.textContent = window.exercises[currentExercise].name;
  }
}

function showOverlay() {
  isOverlayVisible = true;
  if (breatherUI) {
    breatherUI.style.display = 'flex';
    setTimeout(() => {
      breatherUI.style.opacity = '1';
    }, 10);
  }
}

function startExercise() {
  console.log('Starting exercise');
  isExerciseActive = true;
  if (animationManager) {
    animationManager.startAnimation(currentExercise);
  }
  updateToggleButton('Stop');
}

function stopExercise() {
  console.log('Stopping exercise');
  isExerciseActive = false;
  if (animationManager) {
    animationManager.stopAnimation();
  } else {
    console.error('AnimationManager not initialized');
  }
  updateToggleButton('Start');
}

function updateToggleButton(text) {
  const toggleButton = document.getElementById('breather-extension-toggle-button');
  if (toggleButton) {
    toggleButton.className = text === 'Start' ? '' : 'stop';
    toggleButton.textContent = text;
  }
}

function toggleExercise(event) {
  const isBoxBreathing = event.target.checked;
  const exercise = isBoxBreathing ? 'anxiety' : 'sleep';
  changeExercise({ detail: { exercise: exercise } });
  console.log('Exercise toggled:', exercise);
}

function toggleBreathing() {
  if (isExerciseActive) {
    stopExercise();
  } else {
    startExercise();
  }
}

function changeExercise(event) {
  const newExercise = event.detail.exercise;
  if (window.exercises[newExercise]) {
    currentExercise = newExercise;
    updateExerciseInfo();
    if (animationManager && isExerciseActive) {
      animationManager.changeExercise(currentExercise);
    }
    storage.set({ currentExercise });
  } else {
    console.error('Invalid exercise:', newExercise);
  }
}

document.addEventListener('DOMContentLoaded', initializeApp);