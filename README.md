# AI Study Buddy - Simplified

A simplified AI-powered focus companion that uses your webcam to track your head movement and detect smiles, providing gentle audio feedback when you step away.

## Features

- **Head Tracking**: The animated face follows your head movement in real-time
- **Smile Detection**: When you smile, the face smiles back with a happy animation
- **Focus Monitoring**: Gentle buzzing sound when you leave the camera view (max once per second)
- **Clean Interface**: Centered, minimalist design focused on the essentials
- **Real-time Feedback**: Visual status updates showing your current focus state

## How to Use

1. Open the application in a modern web browser
2. Grant webcam permission when prompted
3. Click "Start Monitoring" to begin
4. The face will track your head movement and react to your expressions
5. If you leave the camera view, you'll hear a gentle buzz reminder
6. Click "Stop Monitoring" to pause or "Reset" to start fresh

## Technical Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Webcam access
- JavaScript enabled
- Internet connection (for loading TensorFlow.js and BlazeFace model)

## Privacy

- All face detection happens locally in your browser
- No images or video data are sent to any server
- The application does not record or store webcam footage

## Installation

No installation required! Simply open the `index.html` file in your browser.

For local development:
```bash
git clone <repository-url>
cd focus
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## How It Works

The app uses TensorFlow.js and the BlazeFace model to:

- Detect your face position in real-time
- Track head movement with high sensitivity for responsive animation
- Provide basic smile detection for interactive feedback
- Monitor your presence and provide audio alerts when you step away

## Simplified Design

This version removes complex features like:
- Points and leveling systems
- Timer controls
- Break management
- Milestone tracking

Instead, it focuses on the core experience: a responsive face that tracks your movement and provides gentle focus reminders.

## Credits

- Face detection powered by [TensorFlow.js](https://www.tensorflow.org/js) and [BlazeFace](https://github.com/tensorflow/tfjs-models/tree/master/blazeface)
- Sound effects from [Mixkit](https://mixkit.co/)

---

*A simple, focused companion for better concentration*
