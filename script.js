let model;
let webcam;
let isMonitoring = false;
let lastFaceDetectedTime = Date.now();
let lastBuzzTime = 0;
const DISTRACTION_THRESHOLD = 1000; // 1 second before considering user away
const BUZZ_COOLDOWN = 1000; // Minimum 1 second between buzzes
let checkFaceInterval;
let lastFacePosition = { x: 120, y: 120 };
let isSmiling = false;

// DOM elements
const webcamElement = document.getElementById('webcam');
const statusElement = document.getElementById('status');
const mainActionButton = document.getElementById('mainActionButton');
const resetButton = document.getElementById('resetButton');
const faceCanvas = document.getElementById('faceCanvas');
const ctx = faceCanvas.getContext('2d');
// Audio context for generating buzzing sound
let audioContext;
let isAudioInitialized = false;

// Set canvas size to match CSS
faceCanvas.width = 240;
faceCanvas.height = 240;

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
        // Create oscillator for the buzz
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Configure the buzz sound
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime); // Low frequency buzz
        oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.1);
        
        // Gentle volume envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        // Play for 300ms
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        debugLog('Played buzz sound');
    } catch (error) {
        console.error('Error playing buzz sound:', error);
    }
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
        
        // Hide loading screen and show main content
        debugLog('Hiding loading screen and showing main content');
        document.getElementById('loading').style.display = 'none';
        document.getElementById('appContent').classList.remove('hidden');
        
        // Initialize status and UI elements
        statusElement.textContent = 'Ready to start!';
        mainActionButton.textContent = 'Start Monitoring';
        mainActionButton.classList.remove('active');
        
        // Draw initial face
        drawFace();
        
        // Add floating animation to the face
        faceCanvas.classList.add('floating');
        
        // Initialize audio context (will be activated on first user interaction)
        initializeAudio();
        
        debugLog('Initialization completed successfully');
        
    } catch (error) {
        console.error('Initialization failed:', error);
        document.querySelector('#loading h2').textContent = 'Failed to load. Please refresh the page.';
    }
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
        adjustedX, adjustedY, 45
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

// Enhanced face checking with smile detection
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
            isSmiling = currentlySmiling;
            
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

// Start monitoring
async function startMonitoring() {
    if (isMonitoring) return;
    
    try {
        if (!model) {
            statusElement.textContent = 'AI model not ready. Please wait...';
            return;
        }
        
        isMonitoring = true;
        mainActionButton.textContent = 'Stop Monitoring';
        mainActionButton.classList.add('active');
        resetButton.disabled = false;
        
        statusElement.textContent = 'Monitoring your focus...';
        
        // Start face checking
        checkFaceInterval = setInterval(checkFace, CHECK_INTERVAL);
        
        debugLog('Monitoring started');
        
    } catch (error) {
        console.error('Error starting monitoring:', error);
        statusElement.textContent = 'Error starting monitoring';
    }
}

// Stop monitoring
function stopMonitoring() {
    if (!isMonitoring) return;
    
    try {
        isMonitoring = false;
        
        // Clear intervals
        if (checkFaceInterval) {
            clearInterval(checkFaceInterval);
            checkFaceInterval = null;
        }
        
        // Update UI
        mainActionButton.textContent = 'Start Monitoring';
        mainActionButton.classList.remove('active');
        resetButton.disabled = false;
        statusElement.textContent = 'Monitoring stopped';
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

// Reset everything
function resetMonitoring() {
    stopMonitoring();
    
    // Reset variables
    lastFaceDetectedTime = Date.now();
    lastBuzzTime = 0;
    lastFacePosition = { x: 120, y: 120 };
    isSmiling = false;
    
    // Reset UI
    statusElement.textContent = 'Ready to start!';
    statusElement.className = '';
    
    // Reset face
    drawFace();
    faceCanvas.classList.remove('pulsing', 'happy');
    faceCanvas.classList.add('floating');
    
    debugLog('Everything reset');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    debugLog('DOM loaded, setting up event listeners');
    
    // Main action button (start/stop)
    mainActionButton.addEventListener('click', function() {
        // Activate audio context on first user interaction
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        if (isMonitoring) {
            stopMonitoring();
        } else {
            startMonitoring();
        }
    });
    
    // Reset button
    resetButton.addEventListener('click', function() {
        resetMonitoring();
    });
    
    // Initialize the app
    init();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isMonitoring) {
        // User has switched away, consider this as distraction
        const timeSinceLastFace = Date.now() - lastFaceDetectedTime;
        
        if (timeSinceLastFace > DISTRACTION_THRESHOLD) {
            handleDistraction();
        }
    }
});

debugLog('Script loaded, waiting for DOMContentLoaded event'); 