let model;
let webcam;
let isMonitoring = false;
let lastFaceDetectedTime = Date.now();
const DISTRACTION_THRESHOLD = 750; // Reduced to 0.75 seconds
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

// Initialize the webcam and model
async function init() {
    try {
        // Load the BlazeFace model
        statusElement.textContent = 'Loading AI model...';
        model = await blazeface.load();
        
        // Setup webcam
        webcam = await setupWebcam();
        
        statusElement.textContent = 'Ready to start!';
        startButton.disabled = false;

        // Draw initial face
        drawFace();
        
        // Initialize timer display
        updateTimerDisplay();
    } catch (error) {
        console.error('Error initializing:', error);
        statusElement.textContent = 'Error: ' + error.message;
    }
}

// Draw the 2D face with enhanced animations and expressions
function drawFace(isFocused = true) {
    // Clear canvas
    ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    
    const centerX = 100; 
    const centerY = 100;
    
    // Draw face
    ctx.fillStyle = '#FFE0BD';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eyes based on focus state
    const leftEyeX = centerX - 15;
    const rightEyeX = centerX + 15;
    const eyeY = centerY - 10;
    
    // Eye whites
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(leftEyeX, eyeY, 12, 0, Math.PI * 2);
    ctx.arc(rightEyeX, eyeY, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils with different states
    ctx.fillStyle = '#333';
    
    if (isFocused) {
        // Normal pupils when focused
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY, 6, 0, Math.PI * 2);
        ctx.arc(rightEyeX, eyeY, 6, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Distracted eyes - look away or different
        ctx.beginPath();
        ctx.arc(leftEyeX - 3, eyeY, 5, 0, Math.PI * 2);
        ctx.arc(rightEyeX + 3, eyeY, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Expression based on focus
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    if (isFocused) {
        // Happy smile when focused
        ctx.beginPath();
        ctx.arc(centerX, centerY + 15, 25, 0.2, Math.PI - 0.2);
        ctx.stroke();
    } else {
        // Concerned/sad expression when distracted
        ctx.beginPath();
        ctx.arc(centerX, centerY + 25, 15, Math.PI + 0.5, 2 * Math.PI - 0.5);
        ctx.stroke();
    }

    // Add colorful progress circle for visual feedback
    const timeSinceLastDetection = Date.now() - lastFaceDetectedTime;
    const progress = Math.min(1, timeSinceLastDetection / DISTRACTION_THRESHOLD);
    
    // Draw progress circle with color change based on focus state
    if (isMonitoring) {
        // Color gradient based on focus level
        let circleColor;
        if (progress < 0.3) {
            circleColor = '#4CAF50'; // Green - focused
        } else if (progress < 0.7) {
            circleColor = '#FFC107'; // Yellow - warning
        } else {
            circleColor = '#F44336'; // Red - distracted
        }
        
        ctx.strokeStyle = circleColor;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 65, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * progress));
        ctx.stroke();
        
        // Add pulsing animation when close to distraction
        if (progress > 0.7 && !faceCanvas.classList.contains('pulsing')) {
            faceCanvas.classList.add('pulsing');
        } else if (progress < 0.5 && faceCanvas.classList.contains('pulsing')) {
            faceCanvas.classList.remove('pulsing');
        }
    } else {
        // Remove pulsing if not monitoring
        faceCanvas.classList.remove('pulsing');
    }
}

// Setup webcam stream
async function setupWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: 640,
                height: 480,
                facingMode: 'user'
            },
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

// Start monitoring
async function startMonitoring() {
    isMonitoring = true;
    startButton.disabled = true;
    stopButton.disabled = false;
    lastFaceDetectedTime = Date.now();
    totalDistractedTime = 0;
    statusElement.textContent = 'Monitoring your focus...';
    statusElement.className = 'focused';
    checkFaceInterval = setInterval(checkFace, 250);
}

// Stop monitoring
function stopMonitoring() {
    isMonitoring = false;
    startButton.disabled = false;
    stopButton.disabled = true;
    statusElement.textContent = 'Monitoring stopped';
    statusElement.className = '';
    clearInterval(checkFaceInterval);
    
    // Reset face animation
    drawFace(true);
    faceCanvas.classList.remove('pulsing');
}

// Check for face in the webcam feed
async function checkFace() {
    if (!isMonitoring) return;
    
    try {
        const predictions = await model.estimateFaces(webcamElement, false);
        
        if (predictions.length > 0) {
            lastFaceDetectedTime = Date.now();
            
            // Get the first detected face
            const face = predictions[0];
            
            // Update face position data (not used directly for animation but could be used)
            const centerX = (face.topLeft[0] + face.bottomRight[0]) / 2;
            const centerY = (face.topLeft[1] + face.bottomRight[1]) / 2;
            
            // Draw the reactive face (showing focused state)
            drawFace(true);
            
            // Update status with focused state
            statusElement.className = 'focused';
            updateStatus(true);
            
        } else {
            const timeSinceLastFace = Date.now() - lastFaceDetectedTime;
            
            if (timeSinceLastFace > DISTRACTION_THRESHOLD) {
                // Draw distracted face expression
                drawFace(false);
                
                // Update status with distracted state
                statusElement.className = 'distracted';
                updateStatus(false);
                
                // Handle distraction alert
                handleDistraction();
            } else {
                // Show progress towards distraction threshold
                drawFace(true);
                updateStatus(true);
            }
        }
    } catch (error) {
        console.error('Error in face detection:', error);
        statusElement.textContent = 'Face detection error occurred';
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
        statusElement.textContent = `Focused for ${formatTime(focusedTime)} | Distracted: ${formatTime(distractedTime)}`;
    } else {
        statusElement.textContent = `Distracted! Focus time: ${formatTime(focusedTime)}`;
    }
}

// Format time in seconds to MM:SS format
function formatTime(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Timer Functions
function startTimer() {
    if (isTimerRunning) return;
    
    // Get timer settings
    const workDuration = workDurationInput.value * 60 * 1000; // Convert minutes to ms
    
    // Initialize timer
    timerCurrentTime = workDuration;
    timerStartTime = Date.now();
    isTimerRunning = true;
    currentTimerMode = 'focus';
    
    // Update UI
    timerDisplay.className = 'timer-display focus';
    startTimerButton.disabled = true;
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
    startTimerButton.disabled = true;
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
    timerDisplay.className = 'timer-display';
    startTimerButton.disabled = false;
    pauseTimerButton.disabled = true;
    pauseTimerButton.textContent = 'Pause';
    updateTimerDisplay();
}

function updateTimer() {
    if (!isTimerRunning) return;
    
    // Calculate remaining time
    const elapsedTime = Date.now() - timerStartTime;
    timerCurrentTime = Math.max(0, (currentTimerMode === 'focus' ? 
        workDurationInput.value * 60 * 1000 : 
        breakDurationInput.value * 60 * 1000) - elapsedTime);
    
    // Update display
    updateTimerDisplay();
    
    // Check if timer is completed
    if (timerCurrentTime <= 0) {
        timerComplete();
    }
    // Add warning class when less than 1 minute remaining
    else if (timerCurrentTime < 60000 && !timerDisplay.classList.contains('warning')) {
        timerDisplay.className = 'timer-display warning';
    }
}

function updateTimerDisplay() {
    const totalSeconds = Math.ceil(timerCurrentTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function timerComplete() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    
    // Play completion sound
    timerCompleteSound.currentTime = 0;
    timerCompleteSound.play();
    
    if (currentTimerMode === 'focus') {
        // Show break dialog
        breakDialog.classList.remove('hidden');
        timerDisplay.className = 'timer-display break';
    } else {
        // Focus session completed
        resetTimer();
        timerDisplay.className = 'timer-display focus';
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
    timerDisplay.className = 'timer-display break';
    pauseTimerButton.disabled = false;
    
    // Start the break timer
    timerInterval = setInterval(updateTimer, 500);
}

function skipBreak() {
    breakDialog.classList.add('hidden');
    resetTimer();
}

// Event Listeners
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

// Timer event listeners
startTimerButton.addEventListener('click', startTimer);
pauseTimerButton.addEventListener('click', () => {
    if (isTimerRunning) {
        pauseTimer();
    } else {
        resumeTimer();
    }
});
resetTimerButton.addEventListener('click', resetTimer);
startBreakButton.addEventListener('click', startBreak);
skipBreakButton.addEventListener('click', skipBreak);

// Initialize the application
init();

// Set audio volumes
chimeSound.volume = 0.4; // 40% volume
timerCompleteSound.volume = 0.5; // 50% volume 