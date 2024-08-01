let isOverlayVisible = false;
let isExerciseActive = false;

document.addEventListener('DOMContentLoaded', () => {
  const toggleOverlayButton = document.getElementById('toggleOverlay');
  const toggleExerciseButton = document.getElementById('toggleExercise');
  const exerciseSelect = document.getElementById('exerciseSelect');

  chrome.storage.local.get(['isOverlayVisible', 'isExerciseActive', 'currentExercise'], (result) => {
    isOverlayVisible = result.isOverlayVisible || false;
    isExerciseActive = result.isExerciseActive || false;
    updateButtonStates();
    if (result.currentExercise) {
      exerciseSelect.value = result.currentExercise;
    }
  });

  toggleOverlayButton.addEventListener('click', () => {
    isOverlayVisible = !isOverlayVisible;
    updateButtonStates();
    sendMessageToContentScript({ action: isOverlayVisible ? "showOverlay" : "hideOverlay" });
  });

  toggleExerciseButton.addEventListener('click', () => {
    isExerciseActive = !isExerciseActive;
    updateButtonStates();
    sendMessageToContentScript({
      action: isExerciseActive ? "startExercise" : "stopExercise",
      exercise: exerciseSelect.value
    });
  });

  exerciseSelect.addEventListener('change', () => {
    chrome.storage.local.set({ currentExercise: exerciseSelect.value });
    if (isExerciseActive) {
      sendMessageToContentScript({
        action: "changeExercise",
        exercise: exerciseSelect.value
      });
    }
  });
});

function updateButtonStates() {
  const toggleOverlayButton = document.getElementById('toggleOverlay');
  const toggleExerciseButton = document.getElementById('toggleExercise');

  toggleOverlayButton.textContent = isOverlayVisible ? 'Hide Overlay' : 'Show Overlay';
  toggleExerciseButton.textContent = isExerciseActive ? 'Stop Exercise' : 'Start Exercise';

  chrome.storage.local.set({
    isOverlayVisible: isOverlayVisible,
    isExerciseActive: isExerciseActive
  });
}

function sendMessageToContentScript(message) {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, message);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "exerciseStopped") {
    isExerciseActive = false;
    updateButtonStates();
  }
});