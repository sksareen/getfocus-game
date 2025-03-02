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
const MOBILE_CHECK_INTERVAL = 300; // ms between face checks on mobile
const DESKTOP_CHECK_INTERVAL = 200; // ms between face checks on desktop
const RENDER_THROTTLE = 50; // ms between face canvas renders
const POINTS_UPDATE_INTERVAL = 1000; // ms between points updates

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

// ======= New Focus Milestone System =======
const MILESTONES = [
    { duration: 2, points: 5, message: "2 min focus! 🌱" },
    { duration: 5, points: 15, message: "5 min streak! 🌿" },
    { duration: 10, points: 30, message: "10 min deep focus! 🌲" },
    { duration: 15, points: 50, message: "15 min flow state! 🏆" },
    { duration: 25, points: 100, message: "Full Pomodoro! 🔥" }
];
let reachedMilestones = [];
let continuousFocusStartTime = 0;
let notificationTimeout = null;
let notificationElement = null;

// Add debug flag to enable verbose logging
const DEBUG = true;

// Debug logger
function debugLog(message, obj = null) {
    if (!DEBUG) return;
    if (obj) {
        console.log(`[DEBUG] ${message}`, obj);
    } else {
        console.log(`[DEBUG] ${message}`);
    }
}

// Log app initialization
debugLog('Script loaded, waiting for DOMContentLoaded event');

// Create a notification container
function createNotificationSystem() {
    // Create the notification container if it doesn't exist
    if (!document.getElementById('notificationContainer')) {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.position = 'fixed';
        container.style.bottom = '15px';
        container.style.right = '15px';
        container.style.zIndex = '1000';
        document.body.appendChild(container);
    }
    return document.getElementById('notificationContainer');
}

// Display a non-intrusive notification
function showNotification(message, type = 'info', duration = 4000) {
    const container = createNotificationSystem();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Set timeout to remove
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, duration);
    
    return notification;
}

// Check browser compatibility before attempting to use camera
function checkBrowserCompatibility() {
    // Check for MediaDevices API
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    
    // Check for secure context (HTTPS or localhost)
    const isSecureContext = window.isSecureContext;
    
    // Get browser info
    const userAgent = navigator.userAgent;
    let browserInfo = '';
    
    if (userAgent.indexOf('Chrome') > -1) {
        browserInfo = 'Chrome';
    } else if (userAgent.indexOf('Firefox') > -1) {
        browserInfo = 'Firefox';
    } else if (userAgent.indexOf('Safari') > -1) {
        browserInfo = 'Safari';
    } else if (userAgent.indexOf('Edge') > -1 || userAgent.indexOf('Edg') > -1) {
        browserInfo = 'Edge';
    } else {
        browserInfo = 'Unknown Browser';
    }
    
    // Check browser permissions state if available
    let permissionStatus = 'API not available';
    
    if (navigator.permissions && navigator.permissions.query) {
        console.log('Permissions API is available');
    } else {
        console.log('Permissions API is not available in this browser');
    }
    
    console.log(`Browser compatibility check:
        - Browser: ${browserInfo}
        - MediaDevices API: ${hasMediaDevices ? 'Available' : 'Not available'}
        - Secure Context: ${isSecureContext ? 'Yes' : 'No'}
        - User Agent: ${userAgent}
    `);
    
    return {
        hasMediaDevices,
        isSecureContext,
        browserInfo
    };
}

// This function will be called right after DOMContentLoaded 
// to validate all the HTML elements exist before we try to use them
function validateHTMLElements() {
    debugLog('Validating critical HTML elements');
    
    // Check primary elements
    const elements = {
        webcam: document.getElementById('webcam'),
        loading: document.getElementById('loading'),
        appContent: document.getElementById('appContent'),
        status: document.getElementById('status'),
        faceCanvas: document.getElementById('faceCanvas')
    };
    
    // Log each element's existence
    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`[MISSING ELEMENT] ${name} element not found in HTML!`);
            debugLog(`Critical element missing: ${name}`, { found: false });
        } else {
            debugLog(`Element found: ${name}`, { 
                found: true, 
                id: element.id,
                tagName: element.tagName,
                display: element.style.display,
                className: element.className
            });
        }
    }
    
    // Test if video element's srcObject can be set
    if (elements.webcam) {
        try {
            // Create a null MediaStream just to test if we can set srcObject
            elements.webcam.srcObject = null;
            debugLog('Video.srcObject property is accessible');
        } catch (e) {
            debugLog('ERROR: Cannot set video.srcObject property!', e);
            console.error('Cannot set srcObject on webcam element:', e);
        }
    }
    
    return elements;
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    debugLog('DOMContentLoaded event fired');
    
    // Validate DOM elements first
    const elementsCheck = validateHTMLElements();
    
    // Check browser features before continuing
    debugLog('Checking browser features');
    const features = {
        mediaDevices: !!navigator.mediaDevices,
        getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        secureContext: window.isSecureContext,
        permissions: !!navigator.permissions,
        localStorage: !!window.localStorage
    };
    
    debugLog('Browser features check:', features);
    
    // Check for any obvious issues that would prevent camera access
    if (!features.mediaDevices) {
        console.error('MediaDevices API not available - camera access will fail');
    }
    
    if (!features.secureContext) {
        console.error('Not in a secure context (HTTPS) - camera access will fail');
    }
    
    // Only attempt initialization if critical elements exist
    if (elementsCheck.webcam && elementsCheck.loading) {
        debugLog('Critical elements found, calling init()');
        init();
    } else {
        console.error('Cannot initialize app - critical HTML elements are missing');
    }
});

// Draw the 2D face with minimalist design and performance optimization
function drawFace(isFocused = true, faceX = null, faceY = null) {
    // Throttle rendering for performance
    const now = Date.now();
    if (now - lastRenderTime < RENDER_THROTTLE) return;
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

// Setup webcam stream with better permission handling
async function setupWebcam() {
    debugLog('setupWebcam() function called');
    
    // Run compatibility check first
    debugLog('Running browser compatibility check');
    const compatibility = checkBrowserCompatibility();
    debugLog('Browser compatibility results:', compatibility);
    
    // First check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        debugLog('MediaDevices API not supported in this browser');
        throw new Error(`Your browser (${compatibility.browserInfo}) does not support webcam access. Please try Chrome, Firefox or Edge.`);
    }

    // Check for secure context - camera access requires HTTPS or localhost
    if (!compatibility.isSecureContext) {
        debugLog('Not running in a secure context, camera access will be blocked');
        throw new Error('Camera access requires a secure connection (HTTPS). Please use a secure connection or localhost.');
    }

    try {
        // Check if user is on mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        debugLog('Device type detected:', isMobile ? 'Mobile' : 'Desktop');
        
        // Use more optimized video constraints based on device
        const videoConstraints = {
            facingMode: 'user',
            width: isMobile ? { ideal: 240 } : { ideal: 480 },
            height: isMobile ? { ideal: 180 } : { ideal: 360 }
        };
        
        console.log('Requesting camera permission...', videoConstraints);
        debugLog('Video constraints for getUserMedia:', videoConstraints);
        
        // Check current permissions if API is available
        if (navigator.permissions && navigator.permissions.query) {
            try {
                debugLog('Permissions API available, checking camera permission state');
                const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                console.log('Camera permission status:', permissionStatus.state);
                debugLog('Current camera permission status:', permissionStatus.state);
                
                // Add listener for permission changes
                permissionStatus.addEventListener('change', () => {
                    console.log('Camera permission changed to:', permissionStatus.state);
                    debugLog('Permission state changed to:', permissionStatus.state);
                });
            } catch (e) {
                console.log('Error checking camera permission:', e);
                debugLog('Error when checking permission status:', e);
            }
        } else {
            debugLog('Permissions API not available, cannot check permission state');
        }
        
        // Explicitly request user permission
        debugLog('Calling getUserMedia to request camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false
        });
        
        console.log('Camera permission granted, stream tracks:', stream.getVideoTracks().length);
        debugLog('getUserMedia succeeded! Got camera stream:', {
            trackCount: stream.getVideoTracks().length,
            active: stream.active
        });
        
        // Log stream constraints for debugging
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            console.log('Video track settings:', videoTrack.getSettings());
            debugLog('Video track details:', {
                label: videoTrack.label,
                settings: videoTrack.getSettings(),
                constraints: videoTrack.getConstraints(),
                enabled: videoTrack.enabled
            });
        }
        
        // Set the webcam stream to the video element
        debugLog('Setting stream to video element srcObject property');
        webcam.srcObject = stream;
        debugLog('Stream assigned to video element, readyState:', webcam.readyState);
        
        // Return a promise that resolves when metadata is loaded
        debugLog('Waiting for video metadata to load');
        return new Promise((resolve) => {
            webcam.onloadedmetadata = () => {
                console.log('Webcam metadata loaded, video ready');
                debugLog('Video metadata loaded, video dimensions:', {
                    videoWidth: webcam.videoWidth,
                    videoHeight: webcam.videoHeight,
                    clientWidth: webcam.clientWidth,
                    clientHeight: webcam.clientHeight
                });
                
                // Also log when video starts playing
                webcam.onplay = () => {
                    debugLog('Video playback started!');
                };
                
                resolve(webcam);
            };
            
            // Add error handler for video element
            webcam.onerror = (err) => {
                debugLog('Video element error:', err);
                console.error('Video element error:', err);
            };
        });
    } catch (error) {
        console.error('Camera permission error:', error);
        debugLog('getUserMedia failed with error:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // More descriptive error messages based on the error type
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            debugLog('User denied camera permission');
            throw new Error('Camera access denied. Please allow camera access in your browser settings and reload the page.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            debugLog('No camera detected on this device');
            throw new Error('No camera found. Please connect a camera and reload the page.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            debugLog('Camera in use by another application');
            throw new Error('Your camera is in use by another application. Please close other apps using your camera.');
        } else if (error.name === 'OverconstrainedError') {
            debugLog('Camera constraints cannot be satisfied');
            throw new Error('Camera cannot satisfy the requested constraints. Please try using a different camera.');
        } else if (error.name === 'TypeError' && error.message.includes('Permissions request')) {
            debugLog('Permission request timeout');
            throw new Error('Permission request is taking too long. Please try again or check your browser settings.');
        } else {
            debugLog('Unknown camera error');
            throw new Error(`Webcam error (${error.name}): ${error.message}`);
        }
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
    continuousFocusStartTime = Date.now(); // Start tracking continuous focus time
    reachedMilestones = []; // Reset milestones
    elements.status.textContent = 'Monitoring your focus...';
    elements.status.className = 'focused';
    
    // Adjust check interval based on device for performance
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const checkInterval = isMobile ? 
        MOBILE_CHECK_INTERVAL : 
        DESKTOP_CHECK_INTERVAL;
    
    checkFaceInterval = setInterval(checkFace, checkInterval);
    
    startPointsAccumulation();
    startTimer();
    
    document.querySelector('.webcam-container').classList.add('active');
    
    // Show an encouraging notification to start
    showNotification("Focus session started! 💪 First milestone: 2 minutes", "success");
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

// Create milestone indicators in the UI
function createMilestoneIndicators() {
    const container = document.createElement('div');
    container.className = 'milestone-indicators';
    
    MILESTONES.forEach((milestone, index) => {
        const indicator = document.createElement('div');
        indicator.className = 'milestone-indicator';
        indicator.id = `milestone-${milestone.duration}`;
        indicator.innerHTML = `<span>${milestone.duration}m</span>`;
        indicator.title = `Focus for ${milestone.duration} minutes to earn ${milestone.points} points`;
        
        // Set the position based on index
        indicator.style.left = `${(milestone.duration / 30) * 100}%`;
        
        container.appendChild(indicator);
    });
    
    // Add the container to the points section
    const pointsContainer = document.querySelector('.points-container');
    if (pointsContainer) {
        pointsContainer.appendChild(container);
    }
}

// Handle distraction event with non-intrusive notification
function handleDistraction() {
    // Don't trigger too frequently
    if (Date.now() - distractionStartTime < 3000) return;
    
    distractionStartTime = Date.now();
    
    // Play a subtle sound
    chimeSound.currentTime = 0;
    chimeSound.volume = 0.2;
    chimeSound.play();
    
    // Reset continuous focus time
    const focusedForSeconds = Math.floor((Date.now() - continuousFocusStartTime) / 1000);
    continuousFocusStartTime = Date.now();
    
    // Show non-intrusive notification instead of dialog
    showNotification(`
        <div class="distraction-notification">
            <h3>Distraction detected</h3>
            <p>You were focused for ${formatTime(focusedForSeconds)}. Let's refocus!</p>
        </div>
    `, 'warning', 5000);
    
    // Update distracted time
    totalDistractedTime += 3000; // Add a default distraction duration
    updateStatus(false);
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
        }, POINTS_UPDATE_INTERVAL);
    }
}

function stopPointsAccumulation() {
    clearInterval(pointsInterval);
    pointsInterval = null;
    pointsMultiplier = 1;
    consecutiveFocusTime = 0;
}

function addPoints(points, isMilestone = false) {
    if (points <= 0) return;
    
    // Apply points
    focusPoints += points;
    
    // Update display with animation
    elements.pointsDisplay.textContent = focusPoints;
    elements.pointsDisplay.classList.add(isMilestone ? 'milestone-earned' : 'point-earned');
    
    // Update the progress indicator
    updatePointsProgressIndicator();
    
    // Add pulse effect to progress bar
    const progressFill = elements.pointsProgressFill;
    if (progressFill) {
        progressFill.classList.add(isMilestone ? 'milestone-pulse' : 'pulse');
        setTimeout(() => {
            progressFill.classList.remove('pulse');
            progressFill.classList.remove('milestone-pulse');
        }, 1000);
    }
    
    // Play sound
    pointEarnedSound.currentTime = 0;
    pointEarnedSound.volume = isMilestone ? 0.4 : 0.3;
    pointEarnedSound.play();
    
    // Remove animation class after it completes
    setTimeout(() => {
        elements.pointsDisplay.classList.remove('point-earned');
        elements.pointsDisplay.classList.remove('milestone-earned');
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

// Check for focus milestones
function checkFocusMilestones() {
    if (!isMonitoring || Date.now() - continuousFocusStartTime < 1000) return;
    
    const focusedForMinutes = (Date.now() - continuousFocusStartTime) / (60 * 1000);
    
    MILESTONES.forEach(milestone => {
        if (focusedForMinutes >= milestone.duration && !reachedMilestones.includes(milestone.duration)) {
            // Mark milestone as reached
            reachedMilestones.push(milestone.duration);
            
            // Add bonus points
            addPoints(milestone.points, true);
            
            // Show notification
            const notification = showNotification(`
                <div class="milestone-notification">
                    <h3>${milestone.message}</h3>
                    <p>+${milestone.points} bonus points!</p>
                    <div class="milestone-progress">🏆</div>
                </div>
            `, 'success', 5000);
            
            // Highlight the milestone indicator
            const indicator = document.getElementById(`milestone-${milestone.duration}`);
            if (indicator) {
                indicator.classList.add('achieved');
            }
            
            // Play a rewarding sound
            pointEarnedSound.currentTime = 0;
            pointEarnedSound.volume = 0.4;
            pointEarnedSound.play();
        }
    });
}

// Enhanced check face function with focus milestone tracking
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
                
                // Reset continuous focus if distracted for too long
                if (Date.now() - lastFaceDetectedTime > DISTRACTION_THRESHOLD / 2) {
                    continuousFocusStartTime = Date.now();
                }
            } else {
                // Draw the reactive face (showing focused state) with position
                drawFace(true, centerX, centerY);
                elements.status.className = 'focused';
                updateStatus(true);
                consecutiveFocusTime += 0.25; // 250ms interval
                
                // Check for focus milestones
                checkFocusMilestones();
            }
            
        } else {
            const timeSinceLastFace = Date.now() - lastFaceDetectedTime;
            
            if (timeSinceLastFace > DISTRACTION_THRESHOLD) {
                drawFace(false);
                elements.status.className = 'distracted';
                updateStatus(false);
                handleDistraction();
                consecutiveFocusTime = 0;
                continuousFocusStartTime = Date.now(); // Reset continuous focus timer
            } else {
                drawFace(true, lastFacePosition.x, lastFacePosition.y);
                updateStatus(true);
                
                // Check for focus milestones
                checkFocusMilestones();
            }
        }
    } catch (error) {
        console.error('Error in face detection:', error);
        elements.status.textContent = 'Face detection error occurred';
    }
}

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

// Function to manually force the camera permission prompt
function forceRequestCameraPermission() {
    debugLog('Manual camera permission request triggered');
    
    // Display a message
    const loadingInfo = document.querySelector('.loading-info');
    if (loadingInfo) {
        loadingInfo.innerHTML = '<p>Requesting camera permission directly...</p>';
    }
    
    // Direct getUserMedia call to force permission dialog
    return navigator.mediaDevices.getUserMedia({video: true})
        .then(stream => {
            debugLog('Manual permission request succeeded', {
                tracks: stream.getTracks().length
            });
            
            // Display success
            if (loadingInfo) {
                loadingInfo.innerHTML = '<p class="success-message">Permission granted! Reloading...</p>';
            }
            
            // Stop tracks
            stream.getTracks().forEach(track => track.stop());
            
            // Reload the page after delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
            return true;
        })
        .catch(err => {
            debugLog('Manual permission request failed', err);
            
            // Display error
            if (loadingInfo) {
                loadingInfo.innerHTML = `
                    <p class="error-message">Camera permission error: ${err.message}</p>
                    <p>Please check your browser settings and try again.</p>
                `;
            }
            
            return false;
        });
}

// Initialize the webcam and model
async function init() {
    debugLog('Initialization started');
    try {
        // Create loading element reference
        const loadingElement = document.getElementById('loading');
        const loadingText = document.querySelector('#loading h2');
        const loadingInfo = document.querySelector('.loading-info');
        
        // Add a manual trigger button at the top of the loading screen
        const manualTriggerContainer = document.createElement('div');
        manualTriggerContainer.style.marginBottom = '20px';
        
        const manualTrigger = document.createElement('button');
        manualTrigger.textContent = 'Force Camera Permission';
        manualTrigger.className = 'permission-button';
        manualTrigger.style.marginTop = '10px';
        manualTrigger.onclick = forceRequestCameraPermission;
        
        manualTriggerContainer.appendChild(manualTrigger);
        loadingElement.insertBefore(manualTriggerContainer, loadingElement.firstChild);
        
        debugLog('Added manual permission trigger button');
        
        // Check if the webcam element exists
        const webcamElement = document.getElementById('webcam');
        const faceCanvas = document.getElementById('faceCanvas');
        const faceCtx = faceCanvas.getContext('2d');
        
        debugLog('Webcam and canvas elements:', { webcamElement, faceCanvas });
        
        if (!webcamElement || !faceCanvas) {
            debugLog('Required elements not found!');
            throw new Error('Required elements not found');
        }
        
        // Update loading message
        loadingText.textContent = 'Setting up camera...';
        debugLog('Updated loading message: Setting up camera...');
        
        try {
            // Setup webcam first
            debugLog('Assigning webcam element to global variable');
            webcam = webcamElement; // Assign the video element to our global webcam variable
            debugLog('Calling setupWebcam() function');
            await setupWebcam();
            debugLog('Webcam setup successful');
        } catch (webcamError) {
            console.error('Webcam setup failed:', webcamError);
            debugLog('Webcam setup failed with error:', webcamError);
            
            // Create a permission button if it doesn't exist yet
            if (!document.querySelector('.permission-button')) {
                debugLog('Creating permission button for user intervention');
                // Clear the loading info and show a more detailed message
                loadingInfo.innerHTML = `
                    <p class="error-message">${webcamError.message}</p>
                    <p>This app needs camera access to track your focus during study sessions.</p>
                    <p>Your camera feed is processed locally and never stored or sent anywhere.</p>
                `;
                
                // Add a button to request permissions again
                const permissionButton = document.createElement('button');
                permissionButton.className = 'permission-button';
                permissionButton.textContent = 'Enable Camera Access';
                permissionButton.onclick = () => {
                    // Remove the error message and button
                    loadingInfo.innerHTML = '<p>Requesting camera access...</p>';
                    permissionButton.remove();
                    
                    // Try to setup the webcam again
                    debugLog('User clicked permission button, trying init() again');
                    init();
                };
                
                loadingElement.appendChild(permissionButton);
                debugLog('Permission button added to DOM');
            }
            
            // We'll return early since we can't proceed without camera access
            debugLog('Returning early from init() due to webcam setup failure');
            return;
        }
        
        // Update loading message
        loadingText.textContent = 'Loading AI model...';
        debugLog('Updated loading message: Loading AI model...');
        
        // Setup face detection
        debugLog('Loading BlazeFace model');
        model = await blazeface.load();
        debugLog('BlazeFace model loaded successfully');
        
        // Once model is loaded, initialize app and show main content
        debugLog('Hiding loading screen and showing main content');
        document.getElementById('loading').style.display = 'none';
        document.getElementById('appContent').classList.remove('hidden');
        
        // Initialize status and UI elements
        const statusElement = document.getElementById('status');
        const startButton = document.getElementById('startButton');
        
        statusElement.textContent = 'Ready to start!';
        startButton.disabled = false;
        
        // Draw initial face
        debugLog('Drawing initial face');
        drawFace();
        
        // Initialize timer display
        updateTimerDisplay();
        
        // Initialize points progress indicator
        updatePointsProgressIndicator();
        
        // Add floating animation to the face
        faceCanvas.classList.add('floating');
        
        // Setup additional handlers and UI elements
        setupMobileHandlers();
        setupSettingsDialogHandlers();
        
        // Create notification system
        const notificationContainer = createNotificationSystem();
        document.body.appendChild(notificationContainer);
        
        // Create milestone indicators
        createMilestoneIndicators();
        
        console.log('App initialized successfully');
        debugLog('App initialization complete');
    } catch (error) {
        console.error('Initialization error:', error);
        debugLog('Initialization failed with error:', error);
        
        // Display error to user
        const loadingElement = document.getElementById('loading');
        const loadingInfo = document.querySelector('.loading-info');
        
        if (loadingInfo) {
            loadingInfo.innerHTML = `
                <p class="error-message">Error: ${error.message}</p>
                <p>Please try refreshing the page or using a different browser.</p>
            `;
            
            // Add a retry button
            const retryButton = document.createElement('button');
            retryButton.className = 'retry-button';
            retryButton.textContent = 'Retry';
            retryButton.onclick = () => window.location.reload();
            
            loadingElement.appendChild(retryButton);
            debugLog('Retry button added due to initialization error');
        }
    }
} 