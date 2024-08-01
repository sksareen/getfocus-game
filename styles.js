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
    background: #a46379;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2147483647;
    font-family: 'Nunito', Arial, sans-serif;
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
    width: 300px;
    height: 300px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;
  `,
  breathCircle: `
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: #ffdf7c;
    transition: all 4s ease-in-out;
  `,
  instruction: `
    font-size: 48px;
    font-family : Avenir Black ;
    margin: 20px 0;
    padding: 10px;
    color: #ffffff;
    font-weight: bold;
    min-height: 60px;
    z-index: 999999;
    line-height: 1.2em;
  `,
  countdownTimer: `
    font-size: 80px;
    font-family : Avenir Black ;
    font-weight: bold;
    color: #ffffff;
    margin-top: 20px;
    z-index: 99999;
  `,
  closeButton: `
    position: absolute;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    background: #a46379;
    color: white;
    border: none;
    border-radius: 25px;
    cursor: pointer;
    font-size: 60px;
    font-family: 'Nunito', Arial, sans-serif;
    transition: background-color 0.3s;
  `,
};

window.styles = styles;