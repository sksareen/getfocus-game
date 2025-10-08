# Focus - AI Study Buddy

A minimalist, brutalist focus accountability app with AI-powered attention tracking and real-time interactive feedback.

## Features

- **AI Face Detection**: Uses TensorFl
ow.js and BlazeFace for real-time attention monitoring
- **Real-time Audio Feedback**: Immediate alerts when losing focus, rewards every 5 minutes
- **Progressive Difficulty**: 5 levels with increasing challenges and session lengths
- **Focus Scoring**: Dynamic scoring based on face presence, streaks, and consistency
- **Visual Rewards**: Milestone animations, glowing borders, celebration effects
- **Collapsible Stats**: Hide distracting statistics during focus sessions
- **Focus Mode**: Automatic UI minimization during active sessions
- **Session History**: Track progress over time with visual charts
- **XP System**: Gain experience and level up through consistent focus

## How Scoring Works

### Focus Score Calculation
The focus score is a real-time metric (0-100) that reflects your attention quality:

```
Base Score = 100
- Decreases by 2 points per second when face not detected
- Decreases by 1 point per second when face detected but looking away
- Recovers by 1 point per second when focused (capped at 100)
```

### Score Modifiers
- **Streak Bonus**: +0.5 points per 10 seconds of continuous focus
- **Consistency Bonus**: Additional points for maintaining steady attention
- **Deep Focus Multiplier**: 1.5x points when focus maintained for >60 seconds
- **Challenge Success**: +5 XP per completed focus challenge

### Alert Thresholds
- **< 60% Focus**: Audio alert (down-twinkle.wav) plays immediately
- **< 40% Focus**: Visual distraction indicator with red glow
- **> 70% Recovery**: Positive feedback sound (up-skip.wav)
- **5-min Milestones**: Celebration sound and animation

### XP & Leveling System
```
Level 1: Quick Focus (5 min sessions, 60% threshold)
Level 2: Steady Attention (10 min, 65% threshold, dot-tracking)
Level 3: Focused Mind (15 min, 70% threshold, breathing cues)
Level 4: Deep Focus (25 min, 75% threshold, distraction resistance)
Level 5: Master Focus (45 min, 80% threshold, all challenges)
```

## Architecture

### Technology Stack
```
Frontend:
├── HTML5 (Semantic markup)
├── CSS3 (Custom properties, animations)
├── Vanilla JavaScript (ES6+)
└── TensorFlow.js + BlazeFace (Face detection)

No build process - pure static files
```

### Core Components

#### 1. Face Detection System
- **Model**: BlazeFace (lightweight face detector)
- **Processing**: 30 FPS target with throttling
- **Detection**: Real-time bounding box and confidence scoring
- **Privacy**: 100% client-side, no data leaves browser

#### 2. State Management
```javascript
// Global state objects
focusMetrics = {
    currentStreak: 0,
    maxStreak: 0,
    distractionCount: 0,
    scoreHistory: [],
    qualityHistory: []
}

difficultySystem = {
    currentLevel: 1,
    xp: 0,
    xpToNextLevel: 100,
    challenges: {...}
}
```

#### 3. Audio System
- **Feedback Sounds**: WAV files for immediate response
  - `down-twinkle.wav`: Focus loss alert
  - `up-skip.wav`: Achievement/milestone sound
- **Background**: `cicada.mp3` ambient loop
- **Fallback**: Web Audio API oscillators if files unavailable

#### 4. Visual Feedback
- **Canvas Overlay**: Real-time face tracking visualization
- **CSS Animations**: Glow effects, pulse animations, celebrations
- **Progressive Enhancement**: Degraded experience without WebGL

### File Structure
```
focus/
├── index.html              # Main HTML structure
├── script-brutalist.js     # Core application logic
├── styles-brutalist.css    # Brutalist design system
├── cicada.mp3             # Background ambient sound
├── down-twinkle.wav       # Focus loss alert
├── up-skip.wav            # Achievement sound
└── README.md              # Documentation
```

## Face Detection Details

### How It Works
1. **Initialization**: BlazeFace model loads from CDN on page load
2. **Calibration**: 5-second initial period to establish baseline
3. **Detection Loop**: Runs at 30 FPS during active sessions
4. **Processing Pipeline**:
   ```
   Webcam → Canvas → TensorFlow.js → Predictions → Score Update
   ```

### Detection Logic
```javascript
// Face is considered "detected" when:
- Confidence > 0.5 (50% certainty)
- Bounding box area > minimum threshold
- Face center within frame boundaries

// Focus states:
- FOCUSED: Face detected, looking at screen
- DISTRACTED: Face detected but looking away
- ABSENT: No face detected
```

### Performance Optimization
- Throttled detection (max 30 FPS)
- Canvas size limited to 640x480
- Model predictions cached for 33ms
- Background tab detection pauses processing

## Usage Guide

### Starting a Session
1. Click "BEGIN FOCUS" or press Spacebar
2. Allow camera permissions (first time only)
3. Position face in blue calibration crosshair
4. Session begins after 5-second calibration

### During Session
- **Timer**: Large display shows remaining time
- **Focus Score**: Real-time percentage in top-right
- **Visual Feedback**: Green glow when focused, red when distracted
- **Audio Alerts**: Immediate feedback on focus loss
- **Milestones**: Celebrations every 5 minutes

### Controls
- **Spacebar**: Start/pause session
- **R**: Reset session
- **W**: Toggle webcam visibility
- **M**: Toggle background music
- **Click Stats**: Collapse/expand statistics panel

### Session Completion
- Final score displayed with breakdown
- XP awarded based on performance
- Stats saved to localStorage
- Option to start new session immediately

## Browser Requirements

- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- WebRTC support for camera access
- JavaScript enabled
- localStorage for saving progress
- Web Audio API for sound playback
