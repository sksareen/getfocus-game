# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Study Buddy - A privacy-focused web application for maintaining focus during work sessions using webcam-based face tracking. Built with vanilla JavaScript, HTML5, and CSS3 with TensorFlow.js for face detection.

## Development Commands

```bash
# Start development server (no build process required)
python3 -m http.server 8000
# OR
npx http-server
# Then open http://localhost:8000

# No build, lint, or test commands - this is a static site
```

## Architecture

This is a single-page application with no build process:

- **index.html** - Main HTML structure with semantic markup
- **script.js** - All JavaScript functionality including:
  - Face detection using TensorFlow.js BlazeFace model
  - Session management and timer logic
  - Canvas-based face animation
  - Web Audio API for sound generation
  - Goal setting and progress tracking
- **styles.css** - CSS with custom properties for theming and responsive design

## Key Technical Details

1. **Face Detection**: Uses TensorFlow.js with BlazeFace model loaded from CDN
2. **Performance**: Optimized for 30fps rendering with throttling
3. **Audio**: Web Audio API generates sounds programmatically (no external audio files for buzzing)
4. **Privacy**: 100% client-side processing, no data leaves the browser
5. **State Management**: Global variables in script.js manage session state

## Development Guidelines

1. **No Framework Dependencies**: Keep it vanilla JavaScript
2. **CDN Libraries Only**: TensorFlow.js and BlazeFace loaded from CDN
3. **Direct File Editing**: Edit HTML/CSS/JS directly and refresh browser
4. **Browser DevTools**: Primary debugging tool
5. **Performance**: Maintain 30fps target, use throttling for renders

## Context Management

**Auto-Generated Context File**: This repository maintains an auto-updating context file to help track development progress and maintain state across sessions.

- **context.md** - Automatically generated every 5 tasks or 30 seconds during development
- Contains current feature state, recent changes, active debugging areas, and next priorities
- Used by Claude to maintain awareness of project evolution
- Helps developers resume work after breaks by providing recent context

### Context File Structure



## Testing Approach

Manual testing via browser:
1. Test webcam permissions and face detection
2. Verify timer accuracy and session tracking
3. Check audio feedback timing
4. Test goal completion flow
5. Verify responsive design on different screen sizes

## Common Tasks

- **Add new feature**: Edit script.js directly, update relevant DOM elements in index.html
- **Style changes**: Modify styles.css using existing CSS custom properties
- **Debug face tracking**: Use console.log in debugLog() function, check TensorFlow.js predictions
- **Test audio**: Ensure user interaction before audio plays (browser requirement)