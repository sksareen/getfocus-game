# Build Me: AI Study Buddy - Simplified

## Context
I am an adult male who sometimes struggles to focus on the task at hand.
I find it helpful to have someone else in the room to keep me accountable.
I don't notice when I lose focus.

## Why
- I don't want my focus issues to hold me back from achieving my goals
- I want to complete tasks faster, in one go, without distractions
- I want to be able to focus on one task at a time

## What - Simplified Version
- Use my webcam to watch me while I'm working
- Click a button to start monitoring
- Show a face on the screen that tracks my head movement
- The face should smile when I smile
- Play a gentle buzzing sound when I leave the camera view (max once per second)
- Keep everything centered and clean - no complex points or timer systems

## How
- Use JS, HTML, and CSS to build it
- Use the webcam of the computer to watch me
- Use TensorFlow.js and BlazeFace for face detection
- Simple geometric analysis for basic smile detection

# PRD - Simplified

Thesis: Build a minimal AI Study Buddy that uses your webcam to provide gentle, intuitive feedback through head tracking and smile detection.

Context
You lose focus and time without noticing. The app aims to recreate that accountability of having someone present, but in the simplest way possible.

Who We're Building For
An adult who struggles with staying on task and needs external cues to stay focused, but wants a clean, distraction-free interface.

Why We're Building It
To remove focus issues as a barrier, enabling better concentration through an engaging, face-driven accountability system without overwhelming features.

What Success Looks Like
Users start monitoring with a click, and the app tracks head movement accurately. The on-screen face follows their movement and smiles when they smile. Users get gentle audio reminders when they step away. The interface is clean and centered.

Epics and Stories
	1.	Focus Monitoring:
 • User clicks a button to start monitoring.
 • User can stop monitoring or reset at any time.
	2.	Webcam Tracking:
 • App accesses the webcam.
 • Real-time face detection tracks head position.
 • Face animation follows user's head movement with high sensitivity.
	3.	Visual Feedback:
 • A digital face looks at the user and moves based on head position.
 • Face smiles when user smiles.
 • Clean, centered layout with minimal distractions.
	4.	Audio Feedback:
 • Gentle buzzing sound when user leaves camera view.
 • Sound limited to maximum once per second to avoid annoyance.

## Technical Implementation
- HTML5 for structure
- CSS3 for responsive, centered styling
- JavaScript for face detection and interaction
- TensorFlow.js with BlazeFace model for face detection
- Canvas API for face animation
- Web Audio API for sound feedback

## Removed Features
- Complex points and leveling systems
- Timer and break management
- Milestone tracking and notifications
- Settings dialogs and customization options
- Progress bars and achievement systems

## Core Focus
The app should feel like having a friendly companion that:
- Pays attention to where you're looking
- Reacts to your expressions
- Gently reminds you when you step away
- Stays out of your way otherwise