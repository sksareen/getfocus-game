function createBreatherUI() {
  console.log('Creating breather UI');

  if (typeof styles === 'undefined') {
    console.error('Styles object is not defined');
    return null;
  }

  const overlay = document.createElement('div');
  overlay.id = 'breather-extension-overlay';
  overlay.style.cssText = styles.overlay;

  const content = document.createElement('div');
  content.id = 'breather-extension-content';
  content.style.cssText = styles.content;

  const circleContainer = document.createElement('div');
  circleContainer.style.cssText = styles.circleContainer;

  const breathCircle = document.createElement('div');
  breathCircle.id = 'breather-extension-circle';
  breathCircle.style.cssText = styles.breathCircle;
  
  const outlineCircleSmall = document.createElement('div');
  outlineCircleSmall.id = 'breather-extension-outline-circle-small';
  outlineCircleSmall.style.cssText = styles.outlineCircleSmall;
  
  const outlineCircleBig = document.createElement('div');
  outlineCircleBig.id = 'breather-extension-outline-circle-big';
  outlineCircleBig.style.cssText = styles.outlineCircleBig;

  circleContainer.appendChild(breathCircle);
  circleContainer.appendChild(outlineCircleSmall);
  circleContainer.appendChild(outlineCircleBig);

  const instruction = document.createElement('p');
  instruction.id = 'breather-extension-instruction';
  instruction.style.cssText = styles.instruction;

  const countdownTimer = document.createElement('div');
  countdownTimer.id = 'breather-extension-timer';
  countdownTimer.style.cssText = styles.countdownTimer;

  const toggleButton = document.createElement('button');
  toggleButton.id = 'breather-extension-toggle-button';
  toggleButton.style.cssText = styles.stopButton + styles.startButton;
  toggleButton.textContent = 'Start';
  toggleButton.addEventListener('mouseover', () => {
    toggleButton.style.cssText = styles.stopButton + styles.startButton + styles.startButtonHover;
  });
  toggleButton.addEventListener('mouseout', () => {
    toggleButton.style.cssText = styles.stopButton + styles.startButton;
  });
  toggleButton.addEventListener('click', () => {
    console.log('Toggle button clicked');
    toggleButton.dispatchEvent(new CustomEvent('breatherToggled', { bubbles: true, composed: true }));
  });
  const closeButton = document.createElement('button');
  closeButton.id = 'breather-extension-close-button';
  closeButton.style.cssText = styles.closeButton;
  closeButton.textContent = 'X';
  closeButton.addEventListener('mouseover', () => {
    closeButton.style.cssText = styles.closeButton + styles.closeButtonHover;
  });
  closeButton.addEventListener('mouseout', () => {
    closeButton.style.cssText = styles.closeButton;
  });
  closeButton.addEventListener('click', () => {
    console.log('Close button clicked');
    document.dispatchEvent(new CustomEvent('breatherClosed'));
  });

  const infoElement = document.createElement('div');
  infoElement.id = 'breather-extension-info';
  infoElement.textContent = 'loading...';
  infoElement.style.cssText = styles.infoElement;

  content.appendChild(circleContainer);
  content.appendChild(countdownTimer);
  content.appendChild(instruction);
  overlay.appendChild(content);
  overlay.appendChild(closeButton);
  overlay.appendChild(toggleButton);
  overlay.appendChild(infoElement);

  console.log('Breather UI created');
  return overlay;
}

window.createBreatherUI = createBreatherUI;