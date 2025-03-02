let model;
let webcam;
let isMonitoring = false;
let lastFaceDetectedTime = Date.now();
const DISTRACTION_THRESHOLD = 600; // Reduced from 750ms to 600ms for quicker response
let checkFaceInterval;
let lastFacePosition = { x: 100, y: 100 };
let distractionStartTime = 0;
let totalDistractedTime = 0;
let distractionTimeout;

// Timer variables
let timerInterval;
let timerStartTime;
let timerPausedTime = 0;
let currentTimerMode = 'focus'; // 'focus' or 'break'
let isTimerRunning = false;
let timerCurrentTime = 25 * 60 * 1000; // Default 25 minutes in milliseconds

// Points system variables
let focusPoints = 0;
let pointsMultiplier = 1;
let consecutiveFocusTime = 0;
let pointsInterval;
let currentFocusLevel = 1;
const POINTS_PER_MINUTE = 10;
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000];

// DOM elements
const webcamElement = document.getElementById('webcam');
const statusElement = document.getElementById('status');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const distractionDialog = document.getElementById('distractionDialog');
const submitDistractionButton = document.getElementById('submitDistraction');
const distractionReasonInput = document.getElementById('distractionReason');
const faceCanvas = document.getElementById('faceCanvas');
const ctx = faceCanvas.getContext('2d');
const chimeSound = document.getElementById('chimeSound');
const timerCompleteSound = document.getElementById('timerCompleteSound');
const timerDisplay = document.getElementById('timerDisplay');
const pointsDisplay = document.getElementById('pointsDisplay');
const pointEarnedSound = document.getElementById('pointEarnedSound');
const levelUpSound = document.getElementById('levelUpSound');

// Timer controls
const workDurationInput = document.getElementById('workDuration');
const breakDurationInput = document.getElementById('breakDuration');
const startTimerButton = document.getElementById('startTimerButton');
const pauseTimerButton = document.getElementById('pauseTimerButton');
const resetTimerButton = document.getElementById('resetTimerButton');
const breakDialog = document.getElementById('breakDialog');
const startBreakButton = document.getElementById('startBreakButton');
const skipBreakButton = document.getElementById('skipBreakButton');

let sessionStartTime = 0;
let totalFocusedTime = 0;

// Set canvas size
faceCanvas.width = 200;
faceCanvas.height = 200;

// Make face tracking more sensitive by adjusting these values
const FACE_SENSITIVITY = 2; // Higher value = more sensitive (default was 1)

// Performance constants
const PERFORMANCE = {
    MOBILE_CHECK_INTERVAL: 400,    // ms between face checks on mobile
    DESKTOP_CHECK_INTERVAL: 250,   // ms between face checks on desktop
    RENDER_THROTTLE: 30,          // minimum ms between face renders
    POINTS_UPDATE_INTERVAL: 10000  // ms between adding focus points
};

// Cache DOM elements for performance
const elements = {
    webcam: document.getElementById('webcam'),
    status: document.getElementById('status'),
    startButton: document.getElementById('startButton'),
    stopButton: document.getElementById('stopButton'),
    distractionDialog: document.getElementById('distractionDialog'),
    faceCanvas: document.getElementById('faceCanvas'),
    timerDisplay: document.getElementById('timerDisplay'),
    pointsDisplay: document.getElementById('pointsDisplay'),
    pointsProgressFill: document.getElementById('pointsProgressFill')
};

// Last render timestamp for throttling
let lastRenderTime = 0;

// Initialize the webcam and model
async function init() {
    try {
        // Show loading state
        document.getElementById('loadingState').style.display = 'flex';
        document.getElementById('appContent').classList.add('hidden');
        
        // Load the BlazeFace model
        model = await blazeface.load();
        
        // Setup webcam
        webcam = await setupWebcam();
        
        // Hide loading state, show app content
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('appContent').classList.remove('hidden');
        
        statusElement.textContent = 'Ready to start!';
        startButton.disabled = false;

        // Draw initial face
        drawFace();
        
        // Initialize timer display
        updateTimerDisplay();
        
        // Initialize points progress indicator
        updatePointsProgressIndicator();
        
        // Add floating animation to the face
        faceCanvas.classList.add('floating');
        
        // Setup mobile-specific event handlers
        setupMobileHandlers();
        
        // Add settings dialog functionality
        setupSettingsDialogHandlers();

        // Hide timer buttons since we're integrating this functionality
        document.querySelector('.timer-buttons').style.display = 'none';
    } catch (error) {
        console.error('Error initializing:', error);
        statusElement.textContent = 'Error: ' + error.message;
        
        // Show error in loading state
        document.getElementById('loadingState').innerHTML = `
            <p>Error loading model</p>
            <p class="loading-info">${error.message}</p>
            <button onclick="location.reload()" class="retry-button">Retry</button>
        `;
    }
}

// Draw the 2D face with minimalist design and performance optimization
function drawFace(isFocused = true, faceX = null, faceY = null) {
    // Throttle rendering for performance
    const now = Date.now();
    if (now - lastRenderTime < PERFORMANCE.RENDER_THROTTLE) return;
    lastRenderTime = now;
    
    // Rest of the drawFace function as before
    ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    
    const centerX = 100;
    const centerY = 100;
    
    let offsetX = 0;
    let offsetY = 0;
    
    if (faceX !== null && faceY !== null) {
        offsetX = Math.max(-12, Math.min(12, (faceX - 320) / (32 / FACE_SENSITIVITY)));
        offsetY = Math.max(-12, Math.min(12, (faceY - 240) / (24 / FACE_SENSITIVITY)));
    }
    
    const adjustedX = centerX + offsetX;
    const adjustedY = centerY + offsetY;
    
    // Draw face background with minimal gradient
    const faceGradient = ctx.createRadialGradient(
        adjustedX, adjustedY - 5, 5,
        adjustedX, adjustedY, 45
    );
    faceGradient.addColorStop(0, '#FFEDD6');
    faceGradient.addColorStop(1, '#FFCD90');
    
    ctx.fillStyle = faceGradient;
    ctx.beginPath();
    ctx.arc(adjustedX, adjustedY, 45, 0, Math.PI * 2);
    ctx.fill();
    
    // Add a minimal highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(adjustedX - 15, adjustedY - 15, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eyes
    const leftEyeX = adjustedX - 15;
    const rightEyeX = adjustedX + 15;
    const eyeY = adjustedY - 10;
    
    ctx.fillStyle = '#333';
    
    if (isFocused) {
        const pupilOffsetX = offsetX * 0.2;
        const pupilOffsetY = offsetY * 0.2;
        
        ctx.beginPath();
        ctx.arc(leftEyeX + pupilOffsetX, eyeY + pupilOffsetY, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(rightEyeX + pupilOffsetX, eyeY + pupilOffsetY, 5, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.ellipse(leftEyeX, eyeY, 6, 4, Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(rightEyeX, eyeY, 6, 4, -Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw mouth
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    if (isFocused) {
        ctx.beginPath();
        ctx.arc(adjustedX, adjustedY + 15, 20, 0.2, Math.PI - 0.2);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.arc(adjustedX, adjustedY + 25, 20, Math.PI + 0.2, 2 * Math.PI - 0.2);
        ctx.stroke();
    }

    // Draw progress indicator when monitoring
    if (isMonitoring) {
        const timeSinceLastDetection = Date.now() - lastFaceDetectedTime;
        const progress = Math.min(1, timeSinceLastDetection / DISTRACTION_THRESHOLD);
        
        let circleColor = isFocused ? '#4CAF50' : '#F44336';
        if (isFocused && progress > 0.5) {
            circleColor = '#FFC107';
        }
        
        ctx.strokeStyle = circleColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(adjustedX, adjustedY, 60, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * progress));
        ctx.stroke();
        
        // Animation classes management
        if (progress > 0.7 && !faceCanvas.classList.contains('pulsing')) {
            faceCanvas.classList.add('pulsing');
            faceCanvas.classList.remove('floating');
        } else if (progress < 0.5 && faceCanvas.classList.contains('pulsing')) {
            faceCanvas.classList.remove('pulsing');
            faceCanvas.classList.add('floating');
        }
    } else {
        faceCanvas.classList.remove('pulsing');
        if (!faceCanvas.classList.contains('floating')) {
            faceCanvas.classList.add('floating');
        }
    }
}

// Setup webcam stream
async function setupWebcam() {
    try {
        // Check if user is on mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // Use more optimized video constraints based on device
        const videoConstraints = {
            facingMode: 'user',
            width: isMobile ? { ideal: 240 } : { ideal: 480 },
            height: isMobile ? { ideal: 180 } : { ideal: 360 }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false
        });
        
        webcamElement.srcObject = stream;
        
        return new Promise((resolve) => {
            webcamElement.onloadedmetadata = () => {
                resolve(webcamElement);
            };
        });
    } catch (error) {
        throw new Error('Webcam access denied or not available');
    }
}

// Setup mobile-specific event handlers
function setupMobileHandlers() {
    // Handle page visibility changes (when user switches apps or tabs)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isMonitoring) {
            // User has switched away, consider this as distraction
            const timeSinceLastFace = Date.now() - lastFaceDetectedTime;
            
            if (timeSinceLastFace > DISTRACTION_THRESHOLD) {
                handleDistraction();
            }
        }
    });
    
    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
        // Redraw face after orientation change
        setTimeout(() => {
            drawFace(true);
        }, 300);
    });
    
    // Improve touch experience for buttons
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.97)';
        });
        
        button.addEventListener('touchend', function() {
            this.style.transform = '';
        });
    });
}

// Add touch effect for inputs
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('focus', function() {
        this.style.borderColor = 'var(--primary-color)';
        this.style.boxShadow = '0 0 0 3px rgba(76, 175, 80, 0.1)';
    });
    
    input.addEventListener('blur', function() {
        this.style.borderColor = '';
        this.style.boxShadow = '';
    });
});

// Start monitoring - also starts the timer
async function startMonitoring() {
    isMonitoring = true;
    elements.startButton.disabled = true;
    elements.stopButton.disabled = false;
    lastFaceDetectedTime = Date.now();
    totalDistractedTime = 0;
    sessionStartTime = Date.now();
    elements.status.textContent = 'Monitoring your focus...';
    elements.status.className = 'focused';
    
    // Adjust check interval based on device for performance
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const checkInterval = isMobile ? 
        PERFORMANCE.MOBILE_CHECK_INTERVAL : 
        PERFORMANCE.DESKTOP_CHECK_INTERVAL;
    
    checkFaceInterval = setInterval(checkFace, checkInterval);
    
    startPointsAccumulation();
    startTimer();
    
    document.querySelector('.webcam-container').classList.add('active');
}

// Stop monitoring - also stops the timer
function stopMonitoring() {
    isMonitoring = false;
    elements.startButton.disabled = false;
    elements.stopButton.disabled = true;
    elements.status.textContent = 'Monitoring stopped';
    elements.status.className = '';
    clearInterval(checkFaceInterval);
    
    // Stop points accumulation
    stopPointsAccumulation();
    
    // Reset face animation
    drawFace(true);
    faceCanvas.classList.remove('pulsing');
    faceCanvas.classList.add('floating');
    
    // Also pause the timer
    if (isTimerRunning) {
        pauseTimer();
    }
    
    // Remove active class from webcam container
    document.querySelector('.webcam-container').classList.remove('active');
}

// Enhanced check face function with improved detection logic
async function checkFace() {
    if (!isMonitoring) return;
    
    try {
        // Reduce prediction frequency on mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile && Math.random() > 0.7) {
            // Skip some frames on mobile for better performance
            return;
        }
        
        const predictions = await model.estimateFaces(webcamElement, false);
        
        if (predictions.length > 0) {
            lastFaceDetectedTime = Date.now();
            
            // Get the first detected face
            const face = predictions[0];
            
            // Update face position data for animation
            const centerX = (face.topLeft[0] + face.bottomRight[0]) / 2;
            const centerY = (face.topLeft[1] + face.bottomRight[1]) / 2;
            
            // Simplified expression detection based on head position
            const isLookingDown = centerY > webcamElement.height * 0.6;
            
            // Update last face position
            lastFacePosition = { x: centerX, y: centerY };
            
            if (isLookingDown) {
                // Show concerned face if looking down
                drawFace(false, centerX, centerY);
                elements.status.className = 'distracted';
                updateStatus(false);
                consecutiveFocusTime = Math.max(0, consecutiveFocusTime - 0.5);
            } else {
                // Draw the reactive face (showing focused state) with position
                drawFace(true, centerX, centerY);
                elements.status.className = 'focused';
                updateStatus(true);
                consecutiveFocusTime += 0.25; // 250ms interval
            }
            
        } else {
            const timeSinceLastFace = Date.now() - lastFaceDetectedTime;
            
            if (timeSinceLastFace > DISTRACTION_THRESHOLD) {
                drawFace(false);
                elements.status.className = 'distracted';
                updateStatus(false);
                handleDistraction();
                consecutiveFocusTime = 0;
            } else {
                drawFace(true, lastFacePosition.x, lastFacePosition.y);
                updateStatus(true);
            }
        }
    } catch (error) {
        console.error('Error in face detection:', error);
        elements.status.textContent = 'Face detection error occurred';
    }
}

// Handle distraction event
function handleDistraction() {
    // Don't trigger if a dialog is already open or too soon after the last distraction
    if (!distractionDialog.classList.contains('hidden') || 
        Date.now() - distractionStartTime < 3000) return;
    
    distractionStartTime = Date.now();
    distractionDialog.classList.remove('hidden');
    chimeSound.currentTime = 0;
    chimeSound.play();
    
    // Auto-hide after 8 seconds
    distractionTimeout = setTimeout(() => {
        distractionDialog.classList.add('hidden');
        totalDistractedTime += Date.now() - distractionStartTime;
        updateStatus(true);
    }, 8000);
}

function updateStatus(isFocused) {
    const focusedTime = Math.floor((Date.now() - sessionStartTime - totalDistractedTime) / 1000);
    const distractedTime = Math.floor(totalDistractedTime / 1000);
    
    if (isFocused) {
        elements.status.textContent = `Focused for ${formatTime(focusedTime)} | Distracted: ${formatTime(distractedTime)}`;
    } else {
        elements.status.textContent = `Distracted! Focus time: ${formatTime(focusedTime)}`;
    }
}

// Format time in seconds to MM:SS format
function formatTime(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Points System Functions
function startPointsAccumulation() {
    if (!pointsInterval) {
        pointsInterval = setInterval(() => {
            if (isMonitoring && consecutiveFocusTime >= 10) {
                const basePoints = (POINTS_PER_MINUTE / 6);
                const pointsToAdd = Math.floor(basePoints * pointsMultiplier);
                addPoints(pointsToAdd);
                
                if (consecutiveFocusTime >= 60) {
                    pointsMultiplier = Math.min(3, pointsMultiplier + 0.1);
                }
            } else {
                pointsMultiplier = 1;
            }
        }, PERFORMANCE.POINTS_UPDATE_INTERVAL);
    }
}

function stopPointsAccumulation() {
    clearInterval(pointsInterval);
    pointsInterval = null;
    pointsMultiplier = 1;
    consecutiveFocusTime = 0;
}

function addPoints(points) {
    if (points <= 0) return;
    
    // Apply points
    focusPoints += points;
    
    // Update display with animation
    elements.pointsDisplay.textContent = focusPoints;
    elements.pointsDisplay.classList.add('point-earned');
    
    // Update the progress indicator
    updatePointsProgressIndicator();
    
    // Add pulse effect to progress bar
    const progressFill = elements.pointsProgressFill;
    if (progressFill) {
        progressFill.classList.add('pulse');
        setTimeout(() => {
            progressFill.classList.remove('pulse');
        }, 1000);
    }
    
    // Play sound
    pointEarnedSound.currentTime = 0;
    pointEarnedSound.volume = 0.3;
    pointEarnedSound.play();
    
    // Remove animation class after it completes
    setTimeout(() => {
        elements.pointsDisplay.classList.remove('point-earned');
    }, 500);
    
    // Check for level up
    checkLevelUp();
}

function checkLevelUp() {
    // Determine new level based on points
    let newLevel = 1;
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        if (focusPoints >= LEVEL_THRESHOLDS[i]) {
            newLevel = i + 1;
        } else {
            break;
        }
    }
    
    // If leveled up
    if (newLevel > currentFocusLevel) {
        // Update level
        currentFocusLevel = newLevel;
        
        // Play level up animation
        elements.pointsDisplay.classList.add('level-up');
        
        // Play level up sound
        levelUpSound.currentTime = 0;
        levelUpSound.volume = 0.5;
        levelUpSound.play();
        
        // Show level up message
        const levelUpMessage = `Congratulations! You've reached focus level ${currentFocusLevel}!`;
        elements.status.textContent = levelUpMessage;
        
        // Update the progress indicator
        updatePointsProgressIndicator();
        
        // Remove animation class after it completes
        setTimeout(() => {
            elements.pointsDisplay.classList.remove('level-up');
        }, 1500);
    }
}

// Start the timer with better UX
function startTimer() {
    if (isTimerRunning) return;
    
    // Get timer settings
    const workDuration = workDurationInput.value * 60 * 1000; // Convert minutes to ms
    
    // Initialize timer
    timerCurrentTime = workDuration;
    timerStartTime = Date.now(); // Fixed timer calculation
    isTimerRunning = true;
    currentTimerMode = 'focus';
    
    // Update UI
    elements.timerDisplay.className = 'timer-display focus';
    pauseTimerButton.disabled = false;
    updateTimerDisplay();
    
    // Start the timer
    timerInterval = setInterval(updateTimer, 500);
}

function pauseTimer() {
    if (!isTimerRunning) return;
    
    clearInterval(timerInterval);
    timerPausedTime = timerCurrentTime;
    isTimerRunning = false;
    
    // Update UI
    pauseTimerButton.textContent = 'Resume';
    pauseTimerButton.disabled = false;
}

function resumeTimer() {
    if (isTimerRunning) return;
    
    timerStartTime = Date.now() - (timerPausedTime - timerCurrentTime);
    isTimerRunning = true;
    
    // Update UI
    pauseTimerButton.textContent = 'Pause';
    
    // Restart the timer
    timerInterval = setInterval(updateTimer, 500);
}

function resetTimer() {
    // Clear any existing timer
    clearInterval(timerInterval);
    
    // Reset timer variables
    timerCurrentTime = workDurationInput.value * 60 * 1000;
    isTimerRunning = false;
    timerPausedTime = 0;
    currentTimerMode = 'focus';
    
    // Update UI
    elements.timerDisplay.className = 'timer-display';
    pauseTimerButton.disabled = true;
    pauseTimerButton.textContent = 'Pause';
    updateTimerDisplay();
}

// Update timer function with improved calculation
function updateTimer() {
    if (!isTimerRunning) return;
    
    // Calculate remaining time with simpler, more reliable algorithm
    const elapsedTime = Date.now() - timerStartTime;
    const totalTime = currentTimerMode === 'focus' ? 
        workDurationInput.value * 60 * 1000 : 
        breakDurationInput.value * 60 * 1000;
    timerCurrentTime = Math.max(0, totalTime - elapsedTime);
    
    // Update display
    updateTimerDisplay();
    
    // Check if timer is completed
    if (timerCurrentTime <= 0) {
        timerComplete();
    }
    // Add warning class when less than 1 minute remaining
    else if (timerCurrentTime < 60000 && !elements.timerDisplay.classList.contains('warning')) {
        elements.timerDisplay.className = 'timer-display warning';
    }
}

function updateTimerDisplay() {
    const totalSeconds = Math.ceil(timerCurrentTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    elements.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function timerComplete() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    
    // Play completion sound
    timerCompleteSound.currentTime = 0;
    timerCompleteSound.play();
    
    if (currentTimerMode === 'focus') {
        // Add bonus points for completing a focus session
        const focusTimeMinutes = workDurationInput.value;
        const bonusPoints = focusTimeMinutes * POINTS_PER_MINUTE;
        addPoints(bonusPoints);
        
        // Show break dialog
        breakDialog.classList.remove('hidden');
        elements.timerDisplay.className = 'timer-display break';
    } else {
        // Focus session completed
        resetTimer();
        elements.timerDisplay.className = 'timer-display focus';
    }
}

function startBreak() {
    breakDialog.classList.add('hidden');
    
    // Set up break timer
    currentTimerMode = 'break';
    timerCurrentTime = breakDurationInput.value * 60 * 1000;
    timerStartTime = Date.now();
    isTimerRunning = true;
    
    // Update UI
    elements.timerDisplay.className = 'timer-display break';
    pauseTimerButton.disabled = false;
    
    // Start the break timer
    timerInterval = setInterval(updateTimer, 500);
}

function skipBreak() {
    breakDialog.classList.add('hidden');
    resetTimer();
}

// Event listeners - remove the redundant timer button listeners
startButton.addEventListener('click', startMonitoring);
stopButton.addEventListener('click', stopMonitoring);

submitDistractionButton.addEventListener('click', () => {
    const reason = distractionReasonInput.value;
    console.log('Distraction reason:', reason);
    distractionReasonInput.value = '';
    distractionDialog.classList.add('hidden');
    clearTimeout(distractionTimeout);
    totalDistractedTime += Date.now() - distractionStartTime;
    updateStatus(true);
});

document.querySelector('.close-button').addEventListener('click', () => {
    document.getElementById('distractionDialog').classList.add('hidden');
    clearTimeout(distractionTimeout);
    totalDistractedTime += Date.now() - distractionStartTime;
    updateStatus(true);
});

// Use requestAnimationFrame for smoother updates
function updatePointsProgressIndicator() {
    requestAnimationFrame(() => {
        const progressBar = document.getElementById('pointsProgressBar');
        const progressFill = elements.pointsProgressFill;
        
        if (!progressBar || !progressFill) return;
        
        let currentLevelThreshold = 0;
        let nextLevelThreshold = LEVEL_THRESHOLDS[currentFocusLevel];
        
        if (currentFocusLevel > 1) {
            currentLevelThreshold = LEVEL_THRESHOLDS[currentFocusLevel - 1];
        }
        
        const pointsToNextLevel = nextLevelThreshold - currentLevelThreshold;
        const pointsProgressed = focusPoints - currentLevelThreshold;
        let progressPercentage = (pointsProgressed / pointsToNextLevel) * 100;
        
        progressPercentage = Math.min(100, Math.max(0, progressPercentage));
        progressFill.style.width = `${progressPercentage}%`;
        
        document.getElementById('currentLevel').textContent = currentFocusLevel;
        document.getElementById('nextLevel').textContent = currentFocusLevel + 1;
    });
}

// Add settings dialog functionality
function setupSettingsDialogHandlers() {
    const settingsButton = document.getElementById('settingsButton');
    const settingsDialog = document.getElementById('settingsDialog');
    const closeButtons = document.querySelectorAll('.close-button');
    const saveSettingsButton = document.getElementById('saveSettings');
    const testSoundButton = document.getElementById('testSoundButton');
    const distractionSoundSelect = document.getElementById('distractionSound');
    
    // Open settings dialog
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            settingsDialog.classList.remove('hidden');
        });
    }
    
    // Close buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Get the parent dialog
            const dialog = e.target.closest('.dialog');
            if (dialog) {
                dialog.classList.add('hidden');
            }
        });
    });
    
    // Test sound button
    if (testSoundButton && distractionSoundSelect) {
        testSoundButton.addEventListener('click', () => {
            const selectedSound = distractionSoundSelect.value;
            // Create a temporary audio element to test the sound
            const testAudio = new Audio(selectedSound);
            testAudio.volume = 0.4;
            testAudio.play();
        });
    }
    
    // Save settings
    if (saveSettingsButton && distractionSoundSelect) {
        saveSettingsButton.addEventListener('click', () => {
            // Update the chime sound source
            chimeSound.src = distractionSoundSelect.value;
            // Close the dialog
            settingsDialog.classList.add('hidden');
        });
    }
}

// Initialize the application
init();

// Set audio volumes
chimeSound.volume = 0.4; // 40% volume
timerCompleteSound.volume = 0.5; // 50% volume

// Make sure the pauseTimerButton works with the new layout
document.addEventListener('DOMContentLoaded', function() {
    // Find both pauseTimerButton elements (the original and the compact one)
    const pauseButtons = document.querySelectorAll('#pauseTimerButton');
    
    // Add the event listener to all pause buttons
    pauseButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (isTimerRunning) {
                pauseTimer();
            } else {
                resumeTimer();
            }
            
            // Update all pause buttons
            pauseButtons.forEach(btn => {
                btn.textContent = isTimerRunning ? 'Pause' : 'Resume';
                btn.disabled = !isMonitoring;
            });
        });
    });
    
    // Find all resetTimerButton elements
    const resetButtons = document.querySelectorAll('#resetTimerButton');
    
    // Add the event listener to all reset buttons
    resetButtons.forEach(button => {
        button.addEventListener('click', resetTimer);
    });
    
    // Add listeners for break buttons
    document.getElementById('startBreakButton').addEventListener('click', startBreak);
    document.getElementById('skipBreakButton').addEventListener('click', skipBreak);
}); 