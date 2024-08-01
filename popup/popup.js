let isOverlayVisible = false;
let isExerciseActive = false;

const exerciseDescriptions = {
  sleep: "4-7-8 Breathing: Helps reduce anxiety and aids sleep.",
  anxiety: "Box Breathing: Calms the nervous system and improves focus.",
  focus: "Alternate Nostril: Balances the mind and enhances concentration."
};

document.addEventListener('DOMContentLoaded', () => {
    const toggleExerciseButton = document.getElementById('toggleExercise');
    const exerciseSelect = document.getElementById('exerciseSelect');
    const exerciseDescription = document.getElementById('exerciseDescription');
    const settingsButton = document.getElementById('settingsButton');
    const settingsPanel = document.getElementById('settingsPanel');
    const colorOptions = document.querySelectorAll('.colorOption');
    const showWordsCheckbox = document.getElementById('showWords');
  
    updateStateFromStorage();

  chrome.storage.local.get(['isOverlayVisible', 'isExerciseActive', 'currentExercise', 'colorTheme', 'showWords'], (result) => {
    isOverlayVisible = result.isOverlayVisible || false;
    isExerciseActive = result.isExerciseActive || false;
    updateButtonStates();
    if (result.currentExercise) {
      exerciseSelect.value = result.currentExercise;
      exerciseDescription.textContent = exerciseDescriptions[result.currentExercise];
    } else {
      exerciseDescription.textContent = exerciseDescriptions[exerciseSelect.value];
    }
    if (result.colorTheme) {
      updateSelectedColorOption(result.colorTheme);
    }
    if (result.showWords !== undefined) {
      showWordsCheckbox.checked = result.showWords;
    }
  });

  toggleExerciseButton.addEventListener('click', () => {
    if (isExerciseActive) {
      isExerciseActive = false;
    } else {
      isExerciseActive = true;
      isOverlayVisible = true;
    }
    updateButtonStates();
    sendMessageToContentScript({
      action: isExerciseActive ? "startExercise" : "stopExercise",
      exercise: exerciseSelect.value
    });
  });

  exerciseSelect.addEventListener('change', () => {
    chrome.storage.local.set({ currentExercise: exerciseSelect.value });
    exerciseDescription.textContent = exerciseDescriptions[exerciseSelect.value];
    if (isExerciseActive) {
      sendMessageToContentScript({
        action: "changeExercise",
        exercise: exerciseSelect.value
      });
    }
  });

  settingsButton.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
  });

  colorOptions.forEach(option => {
    option.addEventListener('click', () => {
      const colorTheme = {
        primary: option.dataset.primary,
        secondary: option.dataset.secondary
      };
      chrome.storage.local.set({ colorTheme: colorTheme });
      updateSelectedColorOption(colorTheme);
      sendMessageToContentScript({
        action: "updateSettings",
        settings: { colorTheme: colorTheme }
      });
    });
  });

  showWordsCheckbox.addEventListener('change', () => {
    chrome.storage.local.set({ showWords: showWordsCheckbox.checked });
    sendMessageToContentScript({
      action: "updateSettings",
      settings: { showWords: showWordsCheckbox.checked }
    });
  });
});

function updateStateFromStorage() {
    chrome.storage.local.get(['isOverlayVisible', 'isExerciseActive', 'currentExercise', 'colorTheme', 'showWords'], (result) => {
      isOverlayVisible = result.isOverlayVisible || false;
      isExerciseActive = result.isExerciseActive || false;
      updateButtonStates();
      if (result.currentExercise) {
        const exerciseSelect = document.getElementById('exerciseSelect');
        const exerciseDescription = document.getElementById('exerciseDescription');
        exerciseSelect.value = result.currentExercise;
        exerciseDescription.textContent = exerciseDescriptions[result.currentExercise];
      }
      if (result.colorTheme) {
        updateSelectedColorOption(result.colorTheme);
      }
      if (result.showWords !== undefined) {
        document.getElementById('showWords').checked = result.showWords;
      }
    });
  }
  
  function updateButtonStates() {
    const toggleExerciseButton = document.getElementById('toggleExercise');
    console.log('Updating button state, isExerciseActive:', isExerciseActive);
  
    if (isExerciseActive) {
      toggleExerciseButton.textContent = 'Stop and Close';
      toggleExerciseButton.style.backgroundColor = '#e74c3c';
    } else {
      toggleExerciseButton.textContent = 'Start Activity';
      toggleExerciseButton.style.backgroundColor = '#3498db';
    }
  
    chrome.storage.local.set({
      isOverlayVisible: isOverlayVisible,
      isExerciseActive: isExerciseActive
    });
  }

function updateSelectedColorOption(colorTheme) {
  const colorOptions = document.querySelectorAll('.colorOption');
  colorOptions.forEach(option => {
    if (option.dataset.primary === colorTheme.primary) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

function sendMessageToContentScript(message) {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, message);
    } else {
      chrome.tabs.create({ url: 'https://www.google.com' }, (newTab) => {
        setTimeout(() => {
          chrome.tabs.sendMessage(newTab.id, message);
        }, 1000);
      });
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "exerciseStopped" || request.action === "updateState") {
      chrome.storage.local.get(['isOverlayVisible', 'isExerciseActive'], (result) => {
        isOverlayVisible = result.isOverlayVisible;
        isExerciseActive = result.isExerciseActive;
        updateButtonStates();
      });
    }
  });