window.exercises = {
  sleep: { 
    name: '4-7-8 Breathing', 
    phases: [
      { duration: 4000, instruction: 'breathe in', type: 'inhale' },
      { duration: 7000, instruction: 'hold', type: 'hold' },
      { duration: 8000, instruction: 'breathe out', type: 'exhale' },
      { duration: 1000, instruction: 'pause', type: 'hold' }
    ]   
  },
  anxiety: { 
    name: 'Box Breathing', 
    phases: [
      { duration: 4000, instruction: 'breathe in', type: 'inhale' },
      { duration: 4000, instruction: 'hold', type: 'hold' },
      { duration: 4000, instruction: 'breathe out', type: 'exhale' },
      { duration: 4000, instruction: 'hold', type: 'hold' }
    ]
  },
  focus: { 
    name: 'Alternate Nostril', 
    phases: [
      { duration: 4000, instruction: 'Inhale through left nostril', type: 'inhale' },
      { duration: 4000, instruction: 'Hold, close both nostrils', type: 'hold' },
      { duration: 4000, instruction: 'Exhale through right nostril', type: 'exhale' },
      { duration: 4000, instruction: 'Inhale through right nostril', type: 'inhale' },
      { duration: 4000, instruction: 'Hold, close both nostrils', type: 'hold' },
      { duration: 4000, instruction: 'Exhale through left nostril', type: 'exhale' }
    ]
  }
};

let breatherUI;
let isOverlayVisible = true;
let isExerciseActive = false;
let showInstructions = true;
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
  breatherUI = createBreatherUI();  // Assign to breatherUI variable
  if (breatherUI) {
    appContainer.appendChild(breatherUI);
  } else {
    console.error('Failed to create breatherUI');
    return;
  }
  animationManager = new AnimationManager(appContainer, window.exercises);
  document.addEventListener('breatherStopped', stopExercise);
  document.addEventListener('breatherClosed', stopExerciseAndHideOverlay);
  document.addEventListener('breatherToggled', toggleExercise);

  storage.get(['isOverlayVisible', 'isExerciseActive', 'currentExercise', 'showInstructions'], (result) => {
    isOverlayVisible = result.isOverlayVisible !== null ? result.isOverlayVisible : true;
    isExerciseActive = false; // Always start in stopped state
    currentExercise = result.currentExercise || 'sleep';
    showInstructions = result.showInstructions !== undefined ? result.showInstructions : true;
    updateUIState();
    showOverlay(); // Show the overlay initially
  });
  storage.get(['colorTheme', 'showWords'], (result) => {
    if (result.colorTheme) {
      updateColorTheme(result.colorTheme);
    }
    if (result.showWords !== undefined) {
      document.getElementById('showWordsCheckbox').checked = result.showWords;
      toggleInstructions();
    }
  });
}

function updateUIState() {
  if (isOverlayVisible) {
    showOverlay();
  }
  updateToggleButton(isExerciseActive ? 'Stop' : 'Start');
}

function updateState() {
  storage.set({ isOverlayVisible, isExerciseActive, currentExercise });
}

function showOverlay() {
  isOverlayVisible = true;
  if (breatherUI) {
    breatherUI.style.display = 'flex';
    setTimeout(() => {
      breatherUI.style.opacity = '1';
    }, 10);
  }
  updateState();
}

function hideOverlay() {
  isOverlayVisible = false;
  if (breatherUI) {
    breatherUI.style.opacity = '0';
    setTimeout(() => {
      breatherUI.style.display = 'none';
    }, 300);
  }
  updateState();
}

function startExercise() {
  isExerciseActive = true;
  if (animationManager) {
    animationManager.startAnimation(currentExercise);
  }
  updateToggleButton('Stop');
  updateState();
}

function stopExercise() {
  console.log('stopping animation');
  isExerciseActive = false;
  if (animationManager) {
    animationManager.stopAnimation();
  } else {
    console.error('AnimationManager not initialized');
  }
  updateToggleButton('Start');
  updateState();
}

function stopExerciseAndHideOverlay() {
  isExerciseActive = false;
  if (animationManager) {
    animationManager.stopAnimation();
  } else {
    console.error('AnimationManager not initialized');
  }
  document.dispatchEvent(new CustomEvent('exerciseStopped'));
  updateState();
}

function updateToggleButton(text) {
  const toggleButton = document.getElementById('breather-extension-toggle-button');
  if (toggleButton) {
    toggleButton.className = text === 'Start' ? '' : 'stop';
    toggleButton.textContent = text;
  }
}

function toggleExercise() {
  if (isExerciseActive) {
    stopExercise();
  } else {
    startExercise();
  }
  updateToggleButton(isExerciseActive ? 'Stop' : 'Start');
}

document.addEventListener('appAction', (event) => {
  const request = event.detail;
  console.log('Action received:', request);

  switch (request.action) {
    case "startExercise":
      currentExercise = request.exercise;
      isOverlayVisible = true;
      showOverlay();
      requestAnimationFrame(() => {
        setTimeout(() => {
          startExercise();
        }, 1000);
      });
      break;
    case "stopExercise":
      stopExercise();
      break;
    case "changeExercise":
      if (animationManager) {
        animationManager.changeExercise(request.exercise);
      }
      break;
  }
  updateState();
});

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app');
  if (appContainer) {
    initializeApp();
  } else {
    console.error('App container not found');
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateSettings") {
    if (request.settings.colorTheme) {
      updateColorTheme(request.settings.colorTheme);
    }
    if (request.settings.showWords !== undefined) {
      document.getElementById('showWordsCheckbox').checked = request.settings.showWords;
      toggleInstructions();
    }
  }
});