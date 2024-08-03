let breatherUI;
let shadowRoot;
let isOverlayVisible = false;
let isExerciseActive = false;
let animationManager;
let currentExercise = 'sleep';

const exercises = {
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

function initializeShadowDOM() {
  console.log('Initializing Shadow DOM');
  const host = document.createElement('div');
  host.id = 'breather-extension-host';
  shadowRoot = host.attachShadow({ mode: 'open' });
  document.body.appendChild(host);
  console.log('Shadow DOM initialized');
  animationManager = new AnimationManager(shadowRoot, exercises);
  document.addEventListener('breatherStopped', stopExercise);
  document.addEventListener('breatherClosed', stopExerciseAndHideOverlay);
  document.addEventListener('breatherToggled', toggleExercise);
}

function updateToggleButton(text) {
  const toggleButton = shadowRoot.getElementById('breather-extension-toggle-button');
  if (toggleButton) {
    toggleButton.textContent = text;
    if (text === 'Start') {
      toggleButton.style.cssText = styles.stopButton + styles.startButton;
      toggleButton.onmouseover = () => {
        toggleButton.style.cssText = styles.stopButton + styles.startButton + styles.startButtonHover;
      };
      toggleButton.onmouseout = () => {
        toggleButton.style.cssText = styles.stopButton + styles.startButton;
      };
    } else {
      toggleButton.style.cssText = styles.stopButton;
      toggleButton.onmouseover = () => {
        toggleButton.style.cssText = styles.stopButton + styles.stopButtonHover;
      };
      toggleButton.onmouseout = () => {
        toggleButton.style.cssText = styles.stopButton;
      };
    }
  }
}

function updateState() {
  chrome.runtime.sendMessage({
    action: "updateState",
    state: { isOverlayVisible, isExerciseActive }
  });
  chrome.storage.local.set({ isOverlayVisible, isExerciseActive });
}

function showOverlay() {
  if (!shadowRoot) {
    initializeShadowDOM();
  }
  if (!breatherUI) {
    breatherUI = createBreatherUI();
    if (breatherUI) {
      shadowRoot.appendChild(breatherUI);
    } else {
      console.error('Failed to create breatherUI');
      return;
    }
  }
  breatherUI.style.display = 'flex';
  requestAnimationFrame(() => {
    breatherUI.style.opacity = '1';
  });
  
  const instruction = shadowRoot.getElementById('breather-extension-instruction');
  if (instruction) {
    instruction.textContent = isExerciseActive ? 'Loading' : 'Click Start to begin';
  }
  isOverlayVisible = true;
  updateState();
  updateToggleButton(isExerciseActive ? 'Stop' : 'Start');
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
    const infoElement = shadowRoot.getElementById('breather-extension-info');
    if (infoElement) {
      infoElement.textContent = `${exercises[currentExercise].name} - 0 cycles`;
    }
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
  hideOverlay();
  if (animationManager) {
    animationManager.stopAnimation();
  } else {
    console.error('AnimationManager not initialized');
  }
  chrome.runtime.sendMessage({ action: "exerciseStopped" });
  updateState();
}

function updateSettings(settings) {
  if (!shadowRoot || !breatherUI) {
    console.log('UI not initialized yet, storing settings for later');
    window.pendingSettings = settings;
    return;
  }
  if (settings.colorTheme) {
    const circle = shadowRoot.getElementById('breather-extension-circle');
    const overlay = shadowRoot.getElementById('breather-extension-overlay');
    const instruction = shadowRoot.getElementById('breather-extension-instruction');
    const timer = shadowRoot.getElementById('breather-extension-timer');
    const count = shadowRoot.getElementById('breather-extension-info');
    if (circle && overlay && instruction && timer) {
      circle.style.backgroundColor = settings.colorTheme.background;
      overlay.style.backgroundColor = settings.colorTheme.secondary;
      instruction.style.color = 'white';
      timer.style.color = 'white';
      count.style.color = 'white';
    }
  }
  if (settings.showWords !== undefined) {
    const instruction = shadowRoot.getElementById('breather-extension-instruction');
    const countdownTimer = shadowRoot.getElementById('breather-extension-timer');
    if (instruction && countdownTimer) {
      instruction.style.display = settings.showWords ? 'block' : 'none';
      countdownTimer.style.display = settings.showWords ? 'block' : 'none';
    }
    }
  const cycleCount = shadowRoot.getElementById('breather-extension-info');
  if (cycleCount) {
      cycleCount.textContent = 'loading...';
  }
}

function applyPendingSettings() {
  if (window.pendingSettings) {
    updateSettings(window.pendingSettings);
    window.pendingSettings = null;
  }
}

function toggleExercise() {
  if (isExerciseActive) {
    stopExercise();
  } else {
    startExercise();
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  if (!animationManager) {
    initializeShadowDOM();
  }
  switch (request.action) {
    case "startExercise":
      currentExercise = request.exercise;
      isOverlayVisible = true;
      showOverlay();
      applyPendingSettings();
      requestAnimationFrame(() => {
        setTimeout(() => {
          startExercise();
        }, 1500); // 1.5s delay before starting the exercise
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
    case "updateSettings":
      updateSettings(request.settings);
      break;
    case "closeOverlay":
      stopExerciseAndHideOverlay();
    break;
  }
  updateState();
});

  
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});
  
console.log('content.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  initializeShadowDOM();
  chrome.runtime.sendMessage({ action: "contentScriptReady" });
});