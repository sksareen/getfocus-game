const styles = {
  colors: {
    primary: '#a46379',
    secondary: '#ffdf7c',
    background: '#90c5ff',
    text: '#fff',
  },
  fonts: {
    main: "'Google Sans', sans-serif",
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
    width: 80vw;
    max-width: 90vw;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 80vh;
  `,
  circleContainer: `
    position: fixed;
    width: 12vw;
    height: 12vw;
    display: flex;
    justify-content: center;
    align-items: center;
  `,
  breathCircle: `
    position: fixed;
    width: 8vw;
    height: 8vw;
    max-width: 900px;
    max-height: 900px;
    border-radius: 50%;
    background: #ffdf7c;
    transition: all 4s ease-in-out;
    z-index: 99999;
  `,
  outlineCircleSmall: `
    position: fixed;
    width: 8vw;
    height: 8vw;
    border-radius: 50%;
    opacity: 0.1;
    background: #fff;
    z-index: 999991;
  `,
  outlineCircleBig: `
    position: fixed;
    max-width: 900px;
    max-height: 900px;
    width: 40vw;
    height: 40vw;
    border-radius: 50%;
    opacity: 0.5;
    background: #fff;
    z-index: 9999;
  `,
  instruction: `
    position: fixed;
    bottom: 10vh;
    font-size: 4vh;
    font-weight: 500;
    font-family: 'Google Sans', sans-serif;
    margin: 1vh;
    padding-bottom: 2vh;
    color: #757575;
    min-height: 6vh;
    z-index: 999999;
    line-height: 2vh;
    transition: all 0.3s ease;
  `,
  countdownTimer: `
    position: absolute;
    font-size: 5vh;
    font-weight: 300;
    font-family: 'Google Sans', sans-serif;
    color: #757575;
    opacity: 0.8;
    z-index: 99999999;
    transition: all 0.3s ease;
  `,
  infoElement: `
    position: fixed;
    bottom: 7vh;
    font-size: 2.5vh;
    font-weight: 400;
    font-family: 'Google Sans', sans-serif;
    margin: 1vh;
    padding-bottom: 2vh;
    min-height: 2.5vh;
    color: #757575;
    z-index: 99999;
    transform: opacity translateX(-50%);
    transition: all .3s ease;
`,
  settingsButton: `
    position: absolute;
    top: 2vh;
    left: 2vw;
    padding: 1.5vw;
    background: none;
    border: none;
    color: white;
    font-size: 2.4vw;
    cursor: pointer;
  `,
  settingsMenu: `
    position: absolute;
    top: 0;
    left: -30vw;
    width: 30vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 2vw;
    box-sizing: border-box;
    transition: left all 0.3s ease-in-out;
    overflow-y: auto;
  `,
  stopButton: `
    position: fixed;
    bottom: 3vh;
    padding: 1em;
    width: 10vw;
    height: 1vh;
    color: white;
    cursor: pointer;
    font-size: 2.2vh;
    font-family: 'Google Sans', sans-serif;
    font-weight: 400;
    border-radius: 20px;
    opacity: 0.8;
    transition: all 0.3s ease;
    border: none;
    min-width: 70px;
    max-width: 200px;
    background-color: rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    text-align: center;
    box-shadow: 0 1px 1px 1px rgba(0, 0, 0, 0.05);
`,
stopButtonHover: `
  background-color: #e24e53;
  border: none;
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
`,
closeButton: `
  position: absolute;
  top: .8em;
  right: .8em;
  padding: 0;
  width: 2em;
  height: 2em;
  color: white;
  cursor: pointer;
  font-size: 1.5em;
  font-family: 'Google Sans', sans-serif;
  font-weight: 400;
  border-radius: 100%;
  opacity: 0.8;
  transition: all 0.3s ease;
  border: none;
  background-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 1px 1px 1px rgba(0, 0, 0, 0.05);

`,
closeButtonHover: `
  background-color: #e24e53;
  border: none;
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
`,
startButton: `
  background-color: rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
`,
startButtonHover: `
  background-color: #3d9970;
  transform: translateY(-1px);
`
};

window.styles = styles;
