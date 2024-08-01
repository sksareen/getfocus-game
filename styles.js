const styles = {
  colors: {
    primary: '#a46379',
    secondary: '#ffdf7c',
    background: '#90c5ff)',
    text: '#a46379',
  },
  fonts: {
    main: "'Nunito', Arial, sans-serif",
  },
  overlay: `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #f5f9ff;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2147483647;
    font-family: "Nunito", sans-serif;
    pointer-events: auto;
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  `,
  content: `
    text-align: center;
    width: 80%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
  `,
  circleContainer: `
    position: relative;
    width: 200px;
    height: 200px;
    display: flex;
    justify-content: center;
    align-items: center;
  `,
  breathCircle: `
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: #ffdf7c;
    transition: all 4s ease-in-out;
  `,
  instruction: `
    position: absolute;
    bottom: 1vh;
    font-size: 40px;
    font-family: "Nunito", sans-serif;
    margin: 20px;
    padding: 15px;
    color: #757575;
    font-weight: bold;
    min-height: 60px;
    z-index: 999999;
    line-height: 1.2em;
    transition: background-color 0.3s;
  `,
  countdownTimer: `
    position: relative;
    font-size: 48px;
    font-weight: bold;
    font-family: "Nunito", sans-serif;
    color: #757575;
    z-index: 99999;
    transition: background-color 0.3s;
  `,
  closeButton: `
    position: absolute;
    top: 20px;
    right: 40px;
    padding: 10px;
    background: #f5f9ff;
    color: grey;
    border: none;
    border-radius: 40px;
    cursor: pointer;
    font-size: 30px;
    font-family: 'Arial', Arial, sans-serif;
    transition: background-color 0.3s;
  `,
   closeButtonHover: `
    background: #e0e5f0;
    color: black;
  `,
  settingsButton: `
    position: absolute;
    top: 20px;
    left: 20px;
    padding: 10px;
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
  `,
  settingsMenu: `
    position: absolute;
    top: 0;
    left: -300px;
    width: 300px;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px;
    box-sizing: border-box;
    transition: left 0.3s ease-in-out;
    overflow-y: auto;
  `
};

window.styles = styles;
