let breatherUI;
let shadowRoot;
let isOverlayVisible = false;
let isExerciseActive = false;
let animationManager;

const exercises = {
  sleep: { 
    name: '4-7-8 Breathing', 
    phases: [
      { duration: 4000, instruction: 'Breathe in', type: 'inhale' },
      { duration: 7000, instruction: 'Hold', type: 'hold' },
      { duration: 8000, instruction: 'Breathe out', type: 'exhale' },
      { duration: 1000, instruction: 'Pause', type: 'hold' }
    ]   
  },
  anxiety: { 
    name: 'Box Breathing', 
    phases: [
      { duration: 4000, instruction: 'Breathe in', type: 'inhale' },
      { duration: 4000, instruction: 'Hold', type: 'hold' },
      { duration: 4000, instruction: 'Breathe out', type: 'exhale' },
      { duration: 4000, instruction: 'Hold', type: 'hold' }
    ]
  },
  focus: { 
    name: 'Alternate Nostril', 
    phases: [
      { duration: 4000, instruction: 'Close right nostril, inhale through left', type: 'inhale' },
      { duration: 4000, instruction: 'Close both nostrils, hold breath', type: 'hold' },
      { duration: 4000, instruction: 'Close left nostril, exhale through right', type: 'exhale' },
      { duration: 4000, instruction: 'Inhale through right nostril', type: 'inhale' },
      { duration: 4000, instruction: 'Close both nostrils, hold breath', type: 'hold' },
      { duration: 4000, instruction: 'Close right nostril, exhale through left', type: 'exhale' }
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
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    switch (request.action) {
      case "startExercise":
        isExerciseActive = true;
        isOverlayVisible = true;
        showOverlay();
        requestAnimationFrame(() => {
          setTimeout(() => {
            animationManager.startAnimation(request.exercise);
          }, 1500); // 1.5s delay before starting the exercise
        });
        break;
      case "stopExercise":
        stopExerciseAndHideOverlay();
        break;
      case "changeExercise":
        animationManager.changeExercise(request.exercise);
        break;
      case "updateSettings":
        updateSettings(request.settings);
        break;
    }
    updateState();
  });
  
  function updateSettings(settings) {
    if (settings.colorTheme) {
      const circle = shadowRoot.getElementById('breather-extension-circle');
      const overlay = shadowRoot.getElementById('breather-extension-overlay');
      if (circle && overlay) {
        circle.style.backgroundColor = settings.colorTheme.primary;
        overlay.style.backgroundColor = settings.colorTheme.secondary;
      }
    }
    if (settings.showWords !== undefined) {
      const instruction = shadowRoot.getElementById('breather-extension-instruction');
      const countdownTimer = shadowRoot.getElementById('breather-extension-timer');
      if (instruction && countdownTimer) {
        instruction.style.display = settings.showWords ? 'block' : 'none';
      }
    }
  };
  
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
  
  function updateState() {
    chrome.runtime.sendMessage({
      action: "updateState",
      state: { isOverlayVisible, isExerciseActive }
    });
    chrome.storage.local.set({ isOverlayVisible, isExerciseActive})
  };
  
  document.addEventListener('breatherClosed', () => {
    console.log('Breather closed event received');
    stopExerciseAndHideOverlay();
  });
  
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
  });
  
  console.log('content.js loaded');

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    switch (request.action) {
      case "startExercise":
        isExerciseActive = true;
        showOverlay();
        setTimeout(() => {
          animationManager.startAnimation(request.exercise);
        }, 1500); // 1.5s delay before starting the exercise
        break;
      case "stopExercise":
        stopExerciseAndHideOverlay();
        break;
    }
    updateState();
  });