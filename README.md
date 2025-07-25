# Focus - AI Study Buddy

A minimalist, zen-like focus accountability app with AI-powered attention tracking.

## Features

- **AI Face Detection**: Uses TensorFlow.js and BlazeFace for real-time attention monitoring
- **Focus Scoring**: Real-time focus percentage based on presence detection
- **Progressive Feedback**: Visual and audio cues when attention wanders
- **Customizable Sessions**: 15, 25, 45, or 60-minute focus sessions
- **Completion Tracking**: Session statistics and focus scores
- **Background Music**: Ambient sound support with volume controls
- **Feedback System**: Post-session rating and comments
- **Time Check-ins**: Gentle 10-minute interval reminders

## Setup

1. Open `index.html` in a modern web browser
2. Allow camera permissions when prompted
3. For background music, add `cicada-ambient.mp3` or `cicada-ambient.ogg` to the root directory

## Audio File

To enable background music, you'll need to add a Japanese cicada ambient sound file:
- Filename: `cicada-ambient.mp3` (or `.ogg`)
- Reference inspiration: https://www.youtube.com/watch?v=fCoxh9_ATU4
- Should be a looping ambient track suitable for focus sessions

## Usage

1. Click "Begin Focus" to start a session
2. Select your preferred duration (15-60 minutes)
3. Stay focused - the app monitors your presence
4. Complete sessions to see your focus score
5. Provide feedback to help improve your practice

## Browser Requirements

- Modern browser with WebRTC support
- Camera access for face detection
- JavaScript enabled
