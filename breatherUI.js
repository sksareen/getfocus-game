function createBreatherUI() {
  console.log('Creating breather UI');

  const overlay = document.createElement('div');
  overlay.id = 'breather-extension-overlay';
  overlay.style.height = 'calc(100vh - 40px)';

  const content = document.createElement('div');
  content.id = 'breather-extension-content';

  const circleContainer = document.createElement('div');
  circleContainer.className = 'circle-container';

  const breathCircle = document.createElement('div');
  breathCircle.id = 'breather-extension-circle';
  
  const outlineCircleSmall = document.createElement('div');
  outlineCircleSmall.id = 'breather-extension-outline-circle-small';
  
  const outlineCircleBig = document.createElement('div');
  outlineCircleBig.id = 'breather-extension-outline-circle-big';

  circleContainer.appendChild(breathCircle);
  circleContainer.appendChild(outlineCircleSmall);
  circleContainer.appendChild(outlineCircleBig);

  const instruction = document.createElement('p');
  instruction.id = 'breather-extension-instruction';

  const countdownTimer = document.createElement('div');
  countdownTimer.id = 'breather-extension-timer';

  const toggleButton = document.createElement('button');
  toggleButton.id = 'breather-extension-toggle-button';
  toggleButton.textContent = 'Start';
  toggleButton.addEventListener('click', () => {
    console.log('Toggle button clicked');
    document.dispatchEvent(new CustomEvent('breatherToggled', { bubbles: true }));
  });

  const infoElement = document.createElement('div');
  infoElement.id = 'breather-extension-info';
  infoElement.textContent = 'loading...';

  const exerciseSelector = document.createElement('select');
  exerciseSelector.id = 'exercise-selector';
  Object.keys(window.exercises).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = window.exercises[key].name;
    exerciseSelector.appendChild(option);
  });
  exerciseSelector.addEventListener('change', (e) => {
    document.dispatchEvent(new CustomEvent('appAction', {
      detail: { action: 'changeExercise', exercise: e.target.value }
    }));
  });

  const colorOptions = document.createElement('div');
  colorOptions.id = 'colorOptions';
  
  const colors = [
    { primary: "#3a83d2", secondary: "#a0c5e8" },
    { primary: "#4caf50", secondary: "#a5d6a7" },
    { primary: "#ff9800", secondary: "#ffcc80" }
  ];

  colors.forEach(color => {
    const option = document.createElement('div');
    option.className = 'colorOption';
    option.style.backgroundColor = color.primary;
    option.dataset.primary = color.primary;
    option.dataset.secondary = color.secondary;
    option.addEventListener('click', () => updateColorTheme(color));
    colorOptions.appendChild(option);
  });

  // Add show/hide instructions checkbox
  const showWordsCheckbox = document.createElement('input');
  showWordsCheckbox.type = 'checkbox';
  showWordsCheckbox.id = 'showWordsCheckbox';
  showWordsCheckbox.checked = true;
  showWordsCheckbox.addEventListener('change', toggleInstructions);

  const showWordsLabel = document.createElement('label');
  showWordsLabel.htmlFor = 'showWordsCheckbox';
  showWordsLabel.textContent = 'Show Instructions';

  content.appendChild(circleContainer);
  content.appendChild(countdownTimer);
  content.appendChild(instruction);
  overlay.appendChild(content);
  overlay.appendChild(toggleButton);
  overlay.appendChild(infoElement);
  overlay.appendChild(exerciseSelector);
  overlay.appendChild(showWordsCheckbox);
  overlay.appendChild(showWordsLabel);
  overlay.appendChild(colorOptions);

  console.log('Breather UI created');
  return overlay;  // Return both elements
}

function updateColorTheme(colorTheme) {
  document.querySelectorAll('.colorOption').forEach(option => {
    option.classList.toggle('selected', option.dataset.primary === colorTheme.primary);
  });

  const circle = document.getElementById('breather-extension-circle');
  const overlay = document.getElementById('breather-extension-overlay');
  if (circle && overlay) {
    circle.style.backgroundColor = colorTheme.primary;
    overlay.style.backgroundColor = colorTheme.secondary;
  }

  // Save the color theme
  storage.set({ colorTheme: colorTheme });
}

function toggleInstructions() {
  const instruction = document.getElementById('breather-extension-instruction');
  const countdownTimer = document.getElementById('breather-extension-timer');
  const showWords = document.getElementById('showWordsCheckbox').checked;

  if (instruction && countdownTimer) {
    instruction.style.display = showWords ? 'block' : 'none';
    countdownTimer.style.display = showWords ? 'block' : 'none';
  }

  // Save the show words preference
  storage.set({ showWords: showWords });
}

// Add this to the end of the file
window.updateColorTheme = updateColorTheme;
window.toggleInstructions = toggleInstructions;