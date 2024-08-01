function createBreatherUI() {
  console.log('Creating breather UI');

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

  circleContainer.appendChild(breathCircle);

  const instruction = document.createElement('p');
  instruction.id = 'breather-extension-instruction';
  instruction.style.cssText = styles.instruction;

  const countdownTimer = document.createElement('div');
  countdownTimer.id = 'breather-extension-timer';
  countdownTimer.style.cssText = styles.countdownTimer;

  const closeButton = document.createElement('button');
  closeButton.style.cssText = styles.closeButton;
  closeButton.textContent = 'X';
  closeButton.addEventListener('mouseover', () => {
    closeButton.style.color = styles.colors.secondary;
  });
  closeButton.addEventListener('click', () => {
    console.log('Close button clicked');
    document.dispatchEvent(new CustomEvent('breatherClosed'));
  });

  content.appendChild(circleContainer);
  content.appendChild(countdownTimer);
  content.appendChild(instruction);
  overlay.appendChild(content);
  overlay.appendChild(closeButton);

  console.log('Breather UI created');
  return overlay;
}