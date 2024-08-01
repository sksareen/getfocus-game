let breatherUI;
let shadowRoot;
let isOverlayVisible = false;
let animationManager;

const exercises = {
  sleep: { 
    name: '4-7-8 Breathing', 
    phases: [
      { duration: 4000, instruction: 'Inhale through your nose' },
      { duration: 7000, instruction: 'Hold your breath' },
      { duration: 8000, instruction: 'Exhale through your mouth' },
      { duration: 1000, instruction: 'Pause' }
    ]
  },
  anxiety: { 
    name: 'Box Breathing', 
    phases: [
      { duration: 4000, instruction: 'Inhale slowly' },
      { duration: 4000, instruction: 'Hold your breath' },
      { duration: 4000, instruction: 'Exhale slowly' },
      { duration: 4000, instruction: 'Hold your breath' }
    ]
  },
  focus: { 
    name: 'Alternate Nostril', 
    phases: [
      { duration: 4000, instruction: 'Close right nostril, inhale through left' },
      { duration: 4000, instruction: 'Close both nostrils, hold breath' },
      { duration: 4000, instruction: 'Close left nostril, exhale through right' },
      { duration: 4000, instruction: 'Inhale through right nostril' },
      { duration: 4000, instruction: 'Close both nostrils, hold breath' },
      { duration: 4000, instruction: 'Close right nostril, exhale through left' }
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
    shadowRoot.appendChild(breatherUI);
  }
  breatherUI.style.display = 'flex';
  setTimeout(() => {
    breatherUI.style.opacity = '1';
  }, 50);
}

function hideOverlay() {
  if (breatherUI) {
    breatherUI.style.opacity = '0';
    setTimeout(() => {
      breatherUI.style.display = 'none';
    }, 300);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  switch (request.action) {
    case "showOverlay":
      isOverlayVisible = true;
      showOverlay();
      break;
    case "hideOverlay":
      isOverlayVisible = false;
      hideOverlay();
      break;
    case "startExercise":
      showOverlay(); // Ensure overlay is visible when starting exercise
      animationManager.startAnimation(request.exercise);
      break;
    case "stopExercise":
      animationManager.stopAnimation();
      chrome.runtime.sendMessage({ action: "exerciseStopped" });
      break;
    case "changeExercise":
      animationManager.changeExercise(request.exercise);
      break;
  }
});


document.addEventListener('breatherClosed', () => {
  console.log('Breather closed event received');
  hideOverlay();
  animationManager.stopAnimation();
  chrome.runtime.sendMessage({ action: "exerciseStopped" });
});

window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});

console.log('content.js loaded');