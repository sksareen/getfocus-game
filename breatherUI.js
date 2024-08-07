function createBreatherUI() {
  console.log('Creating breather UI');

  const overlay = document.createElement('div');
  overlay.id = 'breather-extension-overlay';

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
    document.dispatchEvent(new CustomEvent('breatherToggled', { bubbles: true }));
  });

  const infoElement = document.createElement('div');
  infoElement.id = 'breather-extension-info';
  infoElement.textContent = 'loading...';

  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'controls-container';

  const exerciseToggle = createToggleSwitch('exercise-toggle', 'Change Exercise', toggleExercise);
  const darkModeToggle = createToggleSwitch('dark-mode-toggle', 'Dark Mode', toggleDarkMode);

  content.appendChild(circleContainer);
  content.appendChild(countdownTimer);
  content.appendChild(instruction);
  content.appendChild(infoElement);
  content.appendChild(toggleButton);
  
  overlay.appendChild(content);
  overlay.appendChild(controlsContainer);

  controlsContainer.appendChild(exerciseToggle);
  controlsContainer.appendChild(darkModeToggle);

  console.log('Breather UI created');
  return overlay;
}

function createToggleSwitch(id, labelText, onChangeFunction) {
  const container = document.createElement('div');
  container.className = 'toggle-container';

  const label = document.createElement('label');
  label.className = 'toggle-switch';
  label.htmlFor = id;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.addEventListener('change', onChangeFunction);

  const slider = document.createElement('span');
  slider.className = 'toggle-slider';
  
  const textLabel = document.createElement('span');
  textLabel.textContent = labelText;
  textLabel.className = 'text-label';

  label.appendChild(input);
  label.appendChild(slider);
  container.appendChild(textLabel);
  container.appendChild(label);

  return container;
}

function toggleDarkMode() {
  const isDarkMode = document.getElementById('dark-mode-toggle').checked;
  document.body.classList.toggle('dark-mode', isDarkMode);
  storage.set({ darkMode: isDarkMode });
}

window.createBreatherUI = createBreatherUI;
window.toggleExercise = toggleExercise;
window.toggleDarkMode = toggleDarkMode;