let model;
let webcam;
let isMonitoring = false;
let lastFaceDetectedTime = Date.now();
let lastBuzzTime = 0;
let lastDistractionCountTime = 0;
const DISTRACTION_THRESHOLD = 1000; // 1 second before considering user away
const BUZZ_COOLDOWN = 1000; // Minimum 1 second between buzzes
let checkFaceInterval;
let lastFacePosition = { x: 120, y: 120 };
let isSmiling = false;

// Session tracking variables
let sessionGoalMinutes = 25; // Default Pomodoro
let sessionStartTime = null;
let sessionElapsedTime = 0;
let sessionPaused = false;
let focusStreak = 0;
let maxFocusStreak = 0;
let smileCount = 0;
let distractionCount = 0;
let focusQuality = 100; // Percentage
let qualityHistory = [];
let sessionTimer = null;

// DOM elements
const webcamElement = document.getElementById('webcam');
const statusElement = document.getElementById('status');
const mainActionButton = document.getElementById('mainActionButton');
const resetButton = document.getElementById('resetButton');
const completeButton = document.getElementById('completeButton');
const faceCanvas = document.getElementById('faceCanvas');
const ctx = faceCanvas.getContext('2d');

// Preview elements
const previewWebcamElement = document.getElementById('previewWebcam');
const previewFaceCanvas = document.getElementById('previewFaceCanvas');
const previewCtx = previewFaceCanvas.getContext('2d');
const previewStatus = document.getElementById('previewStatus');

// New DOM elements for habit features
const goalSettingDiv = document.getElementById('goalSetting');
const mainInterface = document.getElementById('mainInterface');
const completionCelebration = document.getElementById('completionCelebration');
const progressTime = document.getElementById('progressTime');
const progressGoal = document.getElementById('progressGoal');
const progressBar = document.querySelector('.progress-bar');
const focusStreakElement = document.getElementById('focusStreak');
const smileCountElement = document.getElementById('smileCount');
const distractionCountElement = document.getElementById('distractionCount');
const qualityFill = document.getElementById('qualityFill');
const qualityText = document.getElementById('qualityText');

// Audio context for generating buzzing sound
let audioContext;
let isAudioInitialized = false;

// Set canvas size to match CSS
faceCanvas.width = 240;
faceCanvas.height = 240;
previewFaceCanvas.width = 120;
previewFaceCanvas.height = 120;

// Face tracking sensitivity
const FACE_SENSITIVITY = 6; // Higher sensitivity for more responsive movement

// Performance constants
const CHECK_INTERVAL = 150; // ms between face checks (improved responsiveness)
const RENDER_THROTTLE = 33; // ms between face canvas renders (~30fps)

// Last render timestamp for throttling
let lastRenderTime = 0;

// Debug logging
function debugLog(message, obj = null) {
    console.log(message, obj || '');
}

// Initialize audio context for buzzing sound
function initializeAudio() {
    if (isAudioInitialized) return;
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        isAudioInitialized = true;
        debugLog('Audio context initialized');
    } catch (error) {
        console.error('Failed to initialize audio context:', error);
    }
}

// Create a gentle buzzing sound using Web Audio API
function playBuzzSound() {
    if (!audioContext || audioContext.state === 'suspended') {
        audioContext?.resume();
        return;
    }
    
    try {
        // Create low frequency oscillator for the buzz
        const lowOsc = audioContext.createOscillator();
        const lowGain = audioContext.createGain();
        
        // Create high frequency oscillator for clarity
        const highOsc = audioContext.createOscillator();
        const highGain = audioContext.createGain();
        
        // Create master gain
        const masterGain = audioContext.createGain();
        
        // Connect nodes
        lowOsc.connect(lowGain);
        highOsc.connect(highGain);
        lowGain.connect(masterGain);
        highGain.connect(masterGain);
        masterGain.connect(audioContext.destination);
        
        // Configure the low buzz sound
        lowOsc.frequency.setValueAtTime(200, audioContext.currentTime);
        lowOsc.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.1);
        
        // Configure the high frequency component for clarity
        highOsc.frequency.setValueAtTime(800, audioContext.currentTime);
        highOsc.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
        
        // Set volume levels
        lowGain.gain.setValueAtTime(0.15, audioContext.currentTime); // Main buzz
        highGain.gain.setValueAtTime(0.08, audioContext.currentTime); // Higher register accent
        
        // Master volume envelope
        masterGain.gain.setValueAtTime(0, audioContext.currentTime);
        masterGain.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.05);
        masterGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        // Play for 300ms
        lowOsc.start(audioContext.currentTime);
        highOsc.start(audioContext.currentTime);
        lowOsc.stop(audioContext.currentTime + 0.3);
        highOsc.stop(audioContext.currentTime + 0.3);
        
        debugLog('Played enhanced buzz sound');
    } catch (error) {
        console.error('Error playing buzz sound:', error);
    }
}

// Create a positive reinforcement sound for achievements
function playSuccessSound() {
    if (!audioContext || audioContext.state === 'suspended') {
        audioContext?.resume();
        return;
    }
    
    try {
        // Create multiple oscillators for rich harmonic sound
        const osc1 = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        const osc3 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        const gain2 = audioContext.createGain();
        const gain3 = audioContext.createGain();
        const masterGain = audioContext.createGain();
        
        // Connect nodes
        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        gain1.connect(masterGain);
        gain2.connect(masterGain);
        gain3.connect(masterGain);
        masterGain.connect(audioContext.destination);
        
        // Pleasant ascending chord progression
        // First note: C5 (523 Hz)
        osc1.frequency.setValueAtTime(523, audioContext.currentTime);
        osc1.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
        osc1.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5
        
        // Higher harmony: E5 -> G5 -> C6
        osc2.frequency.setValueAtTime(659, audioContext.currentTime);
        osc2.frequency.setValueAtTime(784, audioContext.currentTime + 0.1);
        osc2.frequency.setValueAtTime(1047, audioContext.currentTime + 0.2); // C6
        
        // Even higher sparkle: G5 -> C6 -> E6
        osc3.frequency.setValueAtTime(784, audioContext.currentTime);
        osc3.frequency.setValueAtTime(1047, audioContext.currentTime + 0.1);
        osc3.frequency.setValueAtTime(1319, audioContext.currentTime + 0.2); // E6
        
        // Set individual volumes
        gain1.gain.setValueAtTime(0.12, audioContext.currentTime); // Main melody
        gain2.gain.setValueAtTime(0.08, audioContext.currentTime); // Harmony
        gain3.gain.setValueAtTime(0.05, audioContext.currentTime); // High sparkle
        
        // Master volume envelope
        masterGain.gain.setValueAtTime(0, audioContext.currentTime);
        masterGain.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.05);
        masterGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        // Play the chord progression
        osc1.start(audioContext.currentTime);
        osc2.start(audioContext.currentTime);
        osc3.start(audioContext.currentTime);
        osc1.stop(audioContext.currentTime + 0.5);
        osc2.stop(audioContext.currentTime + 0.5);
        osc3.stop(audioContext.currentTime + 0.5);
        
        debugLog('Played enhanced success sound');
    } catch (error) {
        console.error('Error playing success sound:', error);
    }
}

// Format time for display
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update progress ring
function updateProgressRing() {
    if (!sessionStartTime) return;
    
    const elapsed = sessionElapsedTime;
    const total = sessionGoalMinutes * 60;
    const progress = Math.min(elapsed / total, 1);
    
    // Update progress bar (circumference = 2 * π * r = 2 * π * 54 ≈ 339.292)
    const circumference = 339.292;
    const offset = circumference - (progress * circumference);
    progressBar.style.strokeDashoffset = offset;
    
    // Update time display
    progressTime.textContent = formatTime(elapsed);
    progressGoal.textContent = `/ ${formatTime(total)}`;
    
    // Change color based on progress
    if (progress >= 1) {
        progressBar.style.stroke = '#4CAF50'; // Success green
    } else if (progress >= 0.75) {
        progressBar.style.stroke = '#8BC34A'; // Light green
    } else if (progress >= 0.5) {
        progressBar.style.stroke = '#FFC107'; // Warning yellow
    } else {
        progressBar.style.stroke = '#2196F3'; // Primary blue
    }
}

// Update focus quality based on recent performance
function updateFocusQuality() {
    // Calculate quality based on recent focus history
    const recentHistory = qualityHistory.slice(-10); // Last 10 measurements
    if (recentHistory.length === 0) return;
    
    const averageQuality = recentHistory.reduce((sum, q) => sum + q, 0) / recentHistory.length;
    focusQuality = Math.round(averageQuality);
    
    // Update quality bar
    qualityFill.style.width = `${focusQuality}%`;
    
    // Update quality text and color
    let qualityLabel, qualityClass;
    if (focusQuality >= 90) {
        qualityLabel = 'Excellent';
        qualityClass = 'quality-excellent';
        qualityFill.style.background = 'linear-gradient(90deg, #2E7D32, #4CAF50)';
    } else if (focusQuality >= 75) {
        qualityLabel = 'Good';
        qualityClass = 'quality-good';
        qualityFill.style.background = 'linear-gradient(90deg, #689F38, #8BC34A)';
    } else if (focusQuality >= 60) {
        qualityLabel = 'Fair';
        qualityClass = 'quality-fair';
        qualityFill.style.background = 'linear-gradient(90deg, #F57C00, #FFC107)';
    } else {
        qualityLabel = 'Poor';
        qualityClass = 'quality-poor';
        qualityFill.style.background = 'linear-gradient(90deg, #D32F2F, #FF5722)';
    }
    
    qualityText.textContent = qualityLabel;
    qualityText.className = qualityClass;
}

// Update session statistics display
function updateSessionStats() {
    focusStreakElement.textContent = focusStreak;
    smileCountElement.textContent = smileCount;
    distractionCountElement.textContent = distractionCount;
}

// Initialize the app
async function init() {
    debugLog('Initialization started');
    try {
        const loadingElement = document.getElementById('loading');
        const loadingText = document.querySelector('#loading h2');
        
        // Update loading message
        loadingText.textContent = 'Setting up camera...';
        debugLog('Setting up camera...');
        
        // Setup webcam
        try {
            await setupWebcam();
            await setupPreviewWebcam();
            debugLog('Webcam setup successful');
        } catch (error) {
            console.error('Webcam setup failed:', error);
            loadingText.textContent = 'Camera access failed. Please refresh and allow camera access.';
            return;
        }
        
        // Update loading message
        loadingText.textContent = 'Loading AI model...';
        debugLog('Loading BlazeFace model...');
        
        // Load face detection model
        model = await blazeface.load();
        debugLog('BlazeFace model loaded successfully');
        
        // Hide loading screen and show goal setting
        debugLog('Hiding loading screen and showing goal setting');
        document.getElementById('loading').style.display = 'none';
        document.getElementById('appContent').classList.remove('hidden');
        
        // Initialize audio context (will be activated on first user interaction)
        initializeAudio();
        
        // Setup goal setting event listeners
        setupGoalSetting();
        
        // Start preview face detection
        startPreviewDetection();
        
        debugLog('Initialization completed successfully');
        
    } catch (error) {
        console.error('Initialization failed:', error);
        document.querySelector('#loading h2').textContent = 'Failed to load. Please refresh the page.';
    }
}

// Setup goal setting interface
function setupGoalSetting() {
    const goalButtons = document.querySelectorAll('.goal-btn');
    const customMinutes = document.getElementById('customMinutes');
    const customGoalBtn = document.getElementById('customGoalBtn');
    
    // Handle preset goal buttons
    goalButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove selected class from all buttons
            goalButtons.forEach(b => b.classList.remove('selected'));
            // Add selected class to clicked button
            btn.classList.add('selected');
            
            const minutes = parseInt(btn.dataset.minutes);
            setSessionGoal(minutes);
        });
    });
    
    // Handle custom goal
    customGoalBtn.addEventListener('click', () => {
        const minutes = parseInt(customMinutes.value);
        if (minutes && minutes >= 5 && minutes <= 180) {
            goalButtons.forEach(b => b.classList.remove('selected'));
            setSessionGoal(minutes);
        } else {
            alert('Please enter a valid time between 5 and 180 minutes.');
        }
    });
    
    // Allow Enter key for custom goal
    customMinutes.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            customGoalBtn.click();
        }
    });
}

// Set session goal and transition to main interface
function setSessionGoal(minutes) {
    sessionGoalMinutes = minutes;
    
    // Stop preview detection
    stopPreviewDetection();
    
    // Update progress goal display
    progressGoal.textContent = `/ ${formatTime(minutes * 60)}`;
    
    // Hide goal setting and show main interface
    goalSettingDiv.classList.add('hidden');
    mainInterface.classList.remove('hidden');
    
    // Initialize status and UI elements
    statusElement.textContent = 'Ready to start your focus session!';
    mainActionButton.textContent = 'Start Session';
    mainActionButton.classList.remove('active');
    
    // Draw initial face
    drawFace();
    
    // Add floating animation to the face
    faceCanvas.classList.add('floating');
    
    debugLog(`Session goal set to ${minutes} minutes`);
}

// Setup webcam
async function setupWebcam() {
    const constraints = {
        video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
        },
        audio: false
    };
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        webcamElement.srcObject = stream;
        
        return new Promise((resolve) => {
            webcamElement.onloadedmetadata = () => {
                webcamElement.play();
                debugLog('Webcam stream started');
                resolve();
            };
        });
    } catch (error) {
        console.error('Error accessing webcam:', error);
        throw error;
    }
}

// Setup preview webcam (same stream)
async function setupPreviewWebcam() {
    try {
        // Use the same stream as the main webcam
        const stream = webcamElement.srcObject;
        previewWebcamElement.srcObject = stream;
        
        return new Promise((resolve) => {
            previewWebcamElement.onloadedmetadata = () => {
                previewWebcamElement.play();
                debugLog('Preview webcam stream started');
                resolve();
            };
        });
    } catch (error) {
        console.error('Error setting up preview webcam:', error);
        throw error;
    }
}

// Preview face detection
let previewDetectionInterval;

async function checkPreviewFace() {
    if (!model) return;
    
    try {
        const predictions = await model.estimateFaces(previewWebcamElement, false);
        
        if (predictions.length > 0) {
            const face = predictions[0];
            const centerX = (face.topLeft[0] + face.bottomRight[0]) / 2;
            const centerY = (face.topLeft[1] + face.bottomRight[1]) / 2;
            
            const currentlySmiling = detectSmile(predictions);
            
            drawPreviewFace(true, centerX, centerY, currentlySmiling);
            previewStatus.textContent = currentlySmiling ? 'Ready! 😊' : 'Face detected ✓';
            previewStatus.className = 'ready';
        } else {
            drawPreviewFace(false);
            previewStatus.textContent = 'Look at camera';
            previewStatus.className = '';
        }
    } catch (error) {
        console.error('Error in preview face detection:', error);
        previewStatus.textContent = 'Detection error';
    }
}

function startPreviewDetection() {
    // Draw initial preview face
    drawPreviewFace();
    previewFaceCanvas.classList.add('floating');
    
    // Start preview detection
    previewDetectionInterval = setInterval(checkPreviewFace, 200);
    
    debugLog('Preview detection started');
}

function stopPreviewDetection() {
    if (previewDetectionInterval) {
        clearInterval(previewDetectionInterval);
        previewDetectionInterval = null;
    }
    debugLog('Preview detection stopped');
}

// Draw preview face (smaller version for goal setting)
function drawPreviewFace(isFocused = true, faceX = null, faceY = null, isSmiling = false) {
    previewCtx.clearRect(0, 0, previewFaceCanvas.width, previewFaceCanvas.height);
    
    const centerX = 60; 
    const centerY = 60;
    
    let offsetX = 0;
    let offsetY = 0;
    
    if (faceX !== null && faceY !== null) {
        // Calculate head movement offset with increased sensitivity
        offsetX = Math.max(-15, Math.min(15, (faceX - 320) / (320 / FACE_SENSITIVITY)));
        offsetY = Math.max(-15, Math.min(15, (faceY - 240) / (240 / FACE_SENSITIVITY)));
    }
    
    const adjustedX = centerX + offsetX;
    const adjustedY = centerY + offsetY;
    
    // Draw face background with gradient
    const faceGradient = previewCtx.createRadialGradient(
        adjustedX, adjustedY - 2, 2,
        adjustedX, adjustedY, 25
    );
    faceGradient.addColorStop(0, '#FFEDD6');
    faceGradient.addColorStop(1, '#FFCD90');
    
    previewCtx.fillStyle = faceGradient;
    previewCtx.beginPath();
    previewCtx.arc(adjustedX, adjustedY, 25, 0, Math.PI * 2);
    previewCtx.fill();
    
    // Add highlight for 3D effect
    previewCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    previewCtx.beginPath();
    previewCtx.arc(adjustedX - 8, adjustedY - 8, 12, 0, Math.PI * 2);
    previewCtx.fill();
    
    // Draw eyes
    const leftEyeX = adjustedX - 8;
    const rightEyeX = adjustedX + 8;
    const eyeY = adjustedY - 5;
    
    if (isFocused) {
        // Regular eyes with pupils
        previewCtx.fillStyle = 'white';
        previewCtx.beginPath();
        previewCtx.arc(leftEyeX, eyeY, 3, 0, Math.PI * 2);
        previewCtx.fill();
        
        previewCtx.beginPath();
        previewCtx.arc(rightEyeX, eyeY, 3, 0, Math.PI * 2);
        previewCtx.fill();
        
        // Pupils
        previewCtx.fillStyle = '#333';
        previewCtx.beginPath();
        previewCtx.arc(leftEyeX + offsetX * 0.1, eyeY + offsetY * 0.1, 2, 0, Math.PI * 2);
        previewCtx.fill();
        
        previewCtx.beginPath();
        previewCtx.arc(rightEyeX + offsetX * 0.1, eyeY + offsetY * 0.1, 2, 0, Math.PI * 2);
        previewCtx.fill();
    } else {
        // Distracted eyes
        previewCtx.fillStyle = '#333';
        previewCtx.beginPath();
        previewCtx.ellipse(leftEyeX, eyeY, 3, 1, Math.PI/6, 0, Math.PI * 2);
        previewCtx.fill();
        
        previewCtx.beginPath();
        previewCtx.ellipse(rightEyeX, eyeY, 3, 1, -Math.PI/6, 0, Math.PI * 2);
        previewCtx.fill();
    }
    
    // Draw mouth
    previewCtx.strokeStyle = '#333';
    previewCtx.lineWidth = 2;
    previewCtx.lineCap = 'round';
    
    if (isFocused) {
        if (isSmiling) {
            // Happy smile
            previewCtx.beginPath();
            previewCtx.arc(adjustedX, adjustedY + 5, 12, 0.2, Math.PI - 0.2);
            previewCtx.stroke();
        } else {
            // Content smile
            previewCtx.beginPath();
            previewCtx.arc(adjustedX, adjustedY + 7, 8, 0.3, Math.PI - 0.3);
            previewCtx.stroke();
        }
    } else {
        // Sad mouth
        previewCtx.beginPath();
        previewCtx.arc(adjustedX, adjustedY + 12, 8, Math.PI + 0.3, 2 * Math.PI - 0.3);
        previewCtx.stroke();
    }
}

// Draw the 2D face with head tracking and smile detection
function drawFace(isFocused = true, faceX = null, faceY = null, isSmiling = false) {
    // Throttle rendering for performance
    const now = Date.now();
    if (now - lastRenderTime < RENDER_THROTTLE) return;
    lastRenderTime = now;
    
    ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    
    const centerX = 120; 
    const centerY = 120;
    
    let offsetX = 0;
    let offsetY = 0;
    
    if (faceX !== null && faceY !== null) {
        // Calculate head movement offset with increased sensitivity
        offsetX = Math.max(-35, Math.min(35, (faceX - 320) / (320 / FACE_SENSITIVITY)));
        offsetY = Math.max(-35, Math.min(35, (faceY - 240) / (240 / FACE_SENSITIVITY)));
    }
    
    const adjustedX = centerX + offsetX;
    const adjustedY = centerY + offsetY;
    
    // Draw face background with gradient
    const faceGradient = ctx.createRadialGradient(
        adjustedX, adjustedY - 5, 5,
        adjustedX, adjustedY, 55
    );
    faceGradient.addColorStop(0, '#FFEDD6');
    faceGradient.addColorStop(1, '#FFCD90');
    
    ctx.fillStyle = faceGradient;
    ctx.beginPath();
    ctx.arc(adjustedX, adjustedY, 55, 0, Math.PI * 2);
    ctx.fill();
    
    // Add highlight for 3D effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(adjustedX - 18, adjustedY - 18, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eyes
    const leftEyeX = adjustedX - 18;
    const rightEyeX = adjustedX + 18;
    const eyeY = adjustedY - 12;
    
    if (isFocused) {
        // Responsive eye movement based on head position
        const pupilOffsetX = offsetX * 0.2;
        const pupilOffsetY = offsetY * 0.2;
        
        // Occasional blinking
        const shouldBlink = Math.random() < 0.008;
        
        if (shouldBlink) {
            // Blinking eyes
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(leftEyeX - 7, eyeY);
            ctx.lineTo(leftEyeX + 7, eyeY);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(rightEyeX - 7, eyeY);
            ctx.lineTo(rightEyeX + 7, eyeY);
            ctx.stroke();
        } else {
            // Regular eyes with pupils
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(leftEyeX, eyeY, 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(rightEyeX, eyeY, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Pupils that follow head movement
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(leftEyeX + pupilOffsetX, eyeY + pupilOffsetY, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(rightEyeX + pupilOffsetX, eyeY + pupilOffsetY, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // Distracted/sleepy eyes
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.ellipse(leftEyeX, eyeY, 6, 3, Math.PI/6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(rightEyeX, eyeY, 6, 3, -Math.PI/6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw mouth based on focus and smile detection
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    if (isFocused) {
        if (isSmiling) {
            // Big happy smile
            ctx.beginPath();
            ctx.arc(adjustedX, adjustedY + 12, 25, 0.2, Math.PI - 0.2);
            ctx.stroke();
            
            // Add smile lines
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(adjustedX - 25, adjustedY + 5);
            ctx.lineTo(adjustedX - 20, adjustedY + 10);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(adjustedX + 25, adjustedY + 5);
            ctx.lineTo(adjustedX + 20, adjustedY + 10);
            ctx.stroke();
        } else {
            // Content/neutral smile
            ctx.beginPath();
            ctx.arc(adjustedX, adjustedY + 15, 20, 0.3, Math.PI - 0.3);
            ctx.stroke();
        }
    } else {
        // Sad/distracted mouth
        ctx.beginPath();
        ctx.arc(adjustedX, adjustedY + 25, 20, Math.PI + 0.3, 2 * Math.PI - 0.3);
        ctx.stroke();
    }

    // Draw focus indicator ring when monitoring
    if (isMonitoring) {
        const timeSinceLastDetection = Date.now() - lastFaceDetectedTime;
        const progress = Math.min(1, timeSinceLastDetection / DISTRACTION_THRESHOLD);
    
        let circleColor = isFocused ? '#4CAF50' : '#F44336';
        if (isFocused && progress > 0.5) {
            circleColor = '#FFC107';
        }
        
        ctx.strokeStyle = circleColor;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(adjustedX, adjustedY, 75, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * progress));
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

// Simple smile detection using facial landmarks geometry
function detectSmile(predictions) {
    if (predictions.length === 0) return false;
    
    const face = predictions[0];
    if (!face.landmarks) return false;
    
    // BlazeFace provides 6 landmarks: 
    // 0: right eye, 1: left eye, 2: nose, 3: mouth, 4: right ear, 5: left ear
    const landmarks = face.landmarks;
    
    if (landmarks.length < 6) return false;
    
    try {
        // Get key facial points
        const rightEye = landmarks[0];
        const leftEye = landmarks[1];
        const nose = landmarks[2];
        const mouth = landmarks[3];
        
        // Calculate face dimensions
        const eyeDistance = Math.sqrt(
            Math.pow(leftEye[0] - rightEye[0], 2) + 
            Math.pow(leftEye[1] - rightEye[1], 2)
        );
        
        // Calculate mouth position relative to nose
        const mouthToNoseDistance = Math.sqrt(
            Math.pow(mouth[0] - nose[0], 2) + 
            Math.pow(mouth[1] - nose[1], 2)
        );
        
        // Normalize the mouth-to-nose distance by eye distance
        const normalizedMouthDistance = mouthToNoseDistance / eyeDistance;
        
        // Calculate if mouth is lower than expected (indicating a smile)
        // When smiling, the mouth corners go up, making the mouth appear "higher"
        const mouthY = mouth[1];
        const noseY = nose[1];
        const eyeCenterY = (rightEye[1] + leftEye[1]) / 2;
        
        // Expected mouth position when neutral
        const expectedMouthY = noseY + (noseY - eyeCenterY) * 0.8;
        
        // If mouth is higher than expected, it might be a smile
        const mouthOffset = expectedMouthY - mouthY;
        const normalizedMouthOffset = mouthOffset / eyeDistance;
        
        // Improved smile detection heuristics
        const isSmiling = normalizedMouthOffset > 0.03 && normalizedMouthDistance < 0.65;
        
        // Additional check: mouth width relative to eye distance
        const mouthWidth = Math.abs(mouth[0] - nose[0]) / eyeDistance;
        const hasWidemouth = mouthWidth > 0.15;
        
        return isSmiling || hasWidemouth;
        
    } catch (error) {
        // If landmark analysis fails, return false instead of random
        console.log('Smile detection error:', error);
        return false;
    }
}

// Enhanced face checking with smile detection and habit tracking
async function checkFace() {
    if (!isMonitoring || !model) return;
    
    try {
        const predictions = await model.estimateFaces(webcamElement, false);
        
        if (predictions.length > 0) {
            lastFaceDetectedTime = Date.now();
            
            // Get the first detected face
            const face = predictions[0];
            
            // Update face position data for animation
            const centerX = (face.topLeft[0] + face.bottomRight[0]) / 2;
            const centerY = (face.topLeft[1] + face.bottomRight[1]) / 2;
            
            // Update last face position
            lastFacePosition = { x: centerX, y: centerY };
            
            // Detect smile
            const currentlySmiling = detectSmile(predictions);
            const wasSmiling = isSmiling;
            isSmiling = currentlySmiling;
            
            // Track smile count for positive reinforcement
            if (currentlySmiling && !wasSmiling) {
                smileCount++;
                updateSessionStats();
                
                // Play success sound for smiles (positive reinforcement)
                if (smileCount % 5 === 0) { // Every 5th smile
                    playSuccessSound();
                }
            }
            
            // Update focus streak
            focusStreak++;
            if (focusStreak > maxFocusStreak) {
                maxFocusStreak = focusStreak;
            }
            
            // Add to quality history (focused = 100%)
            qualityHistory.push(100);
            if (qualityHistory.length > 50) {
                qualityHistory.shift(); // Keep only recent history
            }
            
            // Draw the face with current position and smile state
            drawFace(true, centerX, centerY, isSmiling);
            statusElement.className = 'focused';
            statusElement.textContent = isSmiling ? 'Smiling and focused! 😊' : 'Focused and tracking';
            
            // Add happy animation if smiling
            if (isSmiling && !faceCanvas.classList.contains('happy')) {
                faceCanvas.classList.add('happy');
                setTimeout(() => faceCanvas.classList.remove('happy'), 600);
            }
            
        } else {
            // No face detected
            const timeSinceLastFace = Date.now() - lastFaceDetectedTime;
            
            if (timeSinceLastFace > DISTRACTION_THRESHOLD) {
                // Reset focus streak
                focusStreak = 0;
                
                // Increment distraction count once per second when distracted
                const now = Date.now();
                if (now - lastDistractionCountTime >= 1000) {
                    distractionCount++;
                    lastDistractionCountTime = now;
                    updateSessionStats();
                }
                
                // Add to quality history (distracted = 0%)
                qualityHistory.push(0);
                if (qualityHistory.length > 50) {
                    qualityHistory.shift();
                }
                
                drawFace(false);
                statusElement.className = 'distracted';
                statusElement.textContent = 'Please look at the camera';
                handleDistraction();
            } else {
                drawFace(true, lastFacePosition.x, lastFacePosition.y, isSmiling);
                statusElement.className = 'focused';
                statusElement.textContent = 'Focused and tracking';
            }
        }
        
        // Update focus quality and session stats
        updateFocusQuality();
        updateSessionStats();
        
    } catch (error) {
        console.error('Error in face detection:', error);
        statusElement.textContent = 'Face detection error occurred';
        
        // Stop monitoring if there are persistent errors
        if (error.message && error.message.includes("Cannot read properties")) {
            debugLog('Critical error in face detection, stopping monitoring');
            stopMonitoring();
        }
    }
}

// Handle distraction with buzzing sound (max once per second)
function handleDistraction() {
    const now = Date.now();
    
    // Only play buzz sound if enough time has passed since last buzz
    if (now - lastBuzzTime >= BUZZ_COOLDOWN) {
        playBuzzSound();
        lastBuzzTime = now;
    }
}

// Update session timer
function updateSessionTimer() {
    if (!sessionStartTime || sessionPaused) return;
    
    sessionElapsedTime = Math.floor((Date.now() - sessionStartTime) / 1000);
    updateProgressRing();
    
    // Check if session goal is reached
    if (sessionElapsedTime >= sessionGoalMinutes * 60) {
        completeSession(true); // Auto-complete when goal reached
    }
}

// Start monitoring
async function startMonitoring() {
    if (isMonitoring) return;
    
    try {
        if (!model) {
            statusElement.textContent = 'AI model not ready. Please wait...';
            return;
        }
        
        // Activate audio context on first user interaction
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        isMonitoring = true;
        sessionStartTime = Date.now();
        sessionPaused = false;
        
        // Reset session stats
        focusStreak = 0;
        maxFocusStreak = 0;
        smileCount = 0;
        distractionCount = 0;
        focusQuality = 100;
        qualityHistory = [];
        sessionElapsedTime = 0;
        
        // Update UI
        mainActionButton.textContent = 'Pause Session';
        mainActionButton.classList.add('active');
        resetButton.disabled = false;
        completeButton.classList.remove('hidden');
        statusElement.textContent = 'Monitoring your focus...';
        
        // Start timers
        checkFaceInterval = setInterval(checkFace, CHECK_INTERVAL);
        sessionTimer = setInterval(updateSessionTimer, 1000);
        
        // Update initial displays
        updateSessionStats();
        updateFocusQuality();
        updateProgressRing();
        
        debugLog('Monitoring started');
        
    } catch (error) {
        console.error('Error starting monitoring:', error);
        statusElement.textContent = 'Error starting monitoring';
    }
}

// Pause/Resume monitoring
function pauseResumeMonitoring() {
    if (!isMonitoring) {
        startMonitoring();
        return;
    }
    
    if (sessionPaused) {
        // Resume
        sessionStartTime = Date.now() - (sessionElapsedTime * 1000);
        sessionPaused = false;
        mainActionButton.textContent = 'Pause Session';
        statusElement.textContent = 'Monitoring resumed...';
        
        checkFaceInterval = setInterval(checkFace, CHECK_INTERVAL);
        sessionTimer = setInterval(updateSessionTimer, 1000);
        
        debugLog('Monitoring resumed');
    } else {
        // Pause
        sessionPaused = true;
        mainActionButton.textContent = 'Resume Session';
        statusElement.textContent = 'Session paused';
        
        clearInterval(checkFaceInterval);
        clearInterval(sessionTimer);
        
        debugLog('Monitoring paused');
    }
}

// Stop monitoring
function stopMonitoring() {
    if (!isMonitoring) return;
    
    try {
        isMonitoring = false;
        sessionPaused = false;
        
        // Clear intervals
        if (checkFaceInterval) {
            clearInterval(checkFaceInterval);
            checkFaceInterval = null;
        }
        
        if (sessionTimer) {
            clearInterval(sessionTimer);
            sessionTimer = null;
        }
        
        // Update UI
        mainActionButton.textContent = 'Start Session';
        mainActionButton.classList.remove('active');
        resetButton.disabled = false;
        completeButton.classList.add('hidden');
        statusElement.textContent = 'Session stopped';
        statusElement.className = '';
        
        // Reset face animation
        drawFace();
        faceCanvas.classList.remove('pulsing');
        faceCanvas.classList.add('floating');
        
        debugLog('Monitoring stopped');
        
    } catch (error) {
        console.error('Error stopping monitoring:', error);
    }
}

// Complete session with celebration
function completeSession(autoComplete = false) {
    stopMonitoring();
    
    // Calculate final stats
    const completedMinutes = Math.floor(sessionElapsedTime / 60);
    const completedSeconds = sessionElapsedTime % 60;
    const completedTimeStr = `${completedMinutes}:${completedSeconds.toString().padStart(2, '0')}`;
    
    // Update completion celebration
    document.getElementById('completedTime').textContent = completedTimeStr;
    document.getElementById('finalQuality').textContent = `${focusQuality}%`;
    document.getElementById('finalStreak').textContent = maxFocusStreak;
    
    // Generate achievement message
    let achievementMessage = '';
    if (sessionElapsedTime >= sessionGoalMinutes * 60) {
        achievementMessage = '🎯 Goal achieved! You completed your full focus session. ';
    } else if (sessionElapsedTime >= sessionGoalMinutes * 60 * 0.8) {
        achievementMessage = '🌟 Great effort! You completed most of your session. ';
    } else {
        achievementMessage = '👍 Good start! Every minute of focus counts. ';
    }
    
    if (focusQuality >= 90) {
        achievementMessage += 'Your focus quality was excellent!';
    } else if (focusQuality >= 75) {
        achievementMessage += 'Your focus quality was really good!';
    } else {
        achievementMessage += 'Keep practicing to improve your focus quality.';
    }
    
    if (smileCount >= 10) {
        achievementMessage += ' You had a positive attitude throughout! 😊';
    }
    
    document.getElementById('achievementMessage').textContent = achievementMessage;
    
    // Show celebration
    completionCelebration.classList.remove('hidden');
    
    // Play success sound
    playSuccessSound();
    
    debugLog(`Session completed: ${completedTimeStr}, Quality: ${focusQuality}%, Streak: ${maxFocusStreak}`);
}

// Reset everything
function resetMonitoring() {
    stopMonitoring();
    
    // Reset variables
    lastFaceDetectedTime = Date.now();
    lastBuzzTime = 0;
    lastDistractionCountTime = 0;
    lastFacePosition = { x: 120, y: 120 };
    isSmiling = false;
    sessionStartTime = null;
    sessionElapsedTime = 0;
    sessionPaused = false;
    focusStreak = 0;
    maxFocusStreak = 0;
    smileCount = 0;
    distractionCount = 0;
    focusQuality = 100;
    qualityHistory = [];
    
    // Reset UI
    statusElement.textContent = 'Ready to start your focus session!';
    statusElement.className = '';
    progressTime.textContent = '0:00';
    updateProgressRing();
    updateSessionStats();
    updateFocusQuality();
    
    // Reset face
    drawFace();
    faceCanvas.classList.remove('pulsing', 'happy');
    faceCanvas.classList.add('floating');
    
    debugLog('Everything reset');
}

// Start new session (from completion screen)
function startNewSession() {
    completionCelebration.classList.add('hidden');
    
    // Show goal setting again
    mainInterface.classList.add('hidden');
    goalSettingDiv.classList.remove('hidden');
    
    // Reset everything
    resetMonitoring();
    
    // Restart preview detection
    startPreviewDetection();
    
    debugLog('Starting new session');
}

// Take a break (from completion screen)
function takeBreak() {
    completionCelebration.classList.add('hidden');
    
    // Reset but stay on main interface
    resetMonitoring();
    statusElement.textContent = 'Take a well-deserved break! Start when ready.';
    
    debugLog('Taking a break');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    debugLog('DOM loaded, setting up event listeners');
    
    // Main action button (start/pause/resume)
    mainActionButton.addEventListener('click', function() {
        // Activate audio context on first user interaction
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        if (!isMonitoring) {
            startMonitoring();
        } else {
            pauseResumeMonitoring();
        }
    });
    
    // Reset button
    resetButton.addEventListener('click', function() {
        resetMonitoring();
    });
    
    // Complete button
    completeButton.addEventListener('click', function() {
        completeSession(false);
    });
    
    // Completion celebration buttons
    document.getElementById('newSessionBtn').addEventListener('click', startNewSession);
    document.getElementById('takeBreakBtn').addEventListener('click', takeBreak);
    
    // Initialize the app
    init();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isMonitoring && !sessionPaused) {
        // User has switched away, consider this as distraction
        const timeSinceLastFace = Date.now() - lastFaceDetectedTime;
        
        if (timeSinceLastFace > DISTRACTION_THRESHOLD) {
            handleDistraction();
        }
    }
});

debugLog('Script loaded, waiting for DOMContentLoaded event'); 