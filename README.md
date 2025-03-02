# AI Study Buddy

AI Study Buddy is a web application that helps you maintain focus during study sessions by using your webcam to monitor your attention and provide real-time feedback.

![AI Study Buddy](https://example.com/screenshot.png) *(Note: Replace with actual screenshot URL)*

## Features

- **Focus Monitoring**: Uses your webcam and AI to detect when you're focused or distracted
- **Visual Feedback**: An expressive face reacts to your focus state - smiling when you're focused and concerned when you're distracted
- **Pomodoro Timer**: Built-in customizable timer for focus and break sessions
- **Points System**: Earn points by maintaining focus to track your progress
- **Focus Milestones**: Receive bonus points for achieving continuous focus streaks (2min, 5min, 10min)
- **Level Progression**: Level up as you accumulate points
- **Audio Alerts**: Customizable sound notifications for distractions and achievements
- **Responsive Design**: Works on both desktop and mobile devices

## How to Use

1. Open the application in a modern web browser
2. Grant webcam permission when prompted
3. Set your desired focus and break durations (default: 25min focus, 5min break)
4. Click "Start Studying" to begin your session
5. The application will monitor your focus and provide real-time feedback
6. When your focus session ends, you can take a break or skip it
7. Track your points and level progression to measure improvement over time

## Technical Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Webcam access
- JavaScript enabled
- Internet connection (for loading TensorFlow.js and Blazeface model)

## Privacy

- All face detection happens locally in your browser
- No images or video data are sent to any server
- The application does not record or store webcam footage

## Installation

No installation required! Simply open the index.html file in your browser to use the application.

```
git clone https://github.com/yourusername/ai-study-buddy.git
cd ai-study-buddy
```

Then open `index.html` in your browser.

## How It Works

AI Study Buddy uses TensorFlow.js and the Blazeface model to detect your face and monitor your attention:

- The AI model tracks your face position in real-time
- Looking down or away from the screen for too long triggers the distraction state
- The animated face provides visual feedback about your current state
- Focus points accumulate when you maintain consistent attention
- Milestones reward longer periods of uninterrupted focus

## Customization

- **Timer Settings**: Adjust focus and break durations to fit your study style
- **Sound Settings**: Choose from different alert sounds for distractions

## Credits

- Face detection powered by [TensorFlow.js](https://www.tensorflow.org/js) and [Blazeface](https://github.com/tensorflow/tfjs-models/tree/master/blazeface)
- Sound effects from [Mixkit](https://mixkit.co/)

## License

[MIT License](LICENSE) *(Note: Add appropriate license if available)*

---

*Built with ❤️ to help you focus better and achieve more*
