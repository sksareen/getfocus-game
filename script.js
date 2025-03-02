let model;
let webcam;
let isMonitoring = false;
let lastFaceDetectedTime = Date.now();
const DISTRACTION_THRESHOLD = 800; // Reduced from 750ms to 600ms for quicker response
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
// Additional timer variables
let timerEndTime = 0;
let timerDuration = 0;
let timerRemainingTime = 0;
let workDuration = 25; // Default work duration in minutes
let isInBreak = false;

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
const mainActionButton = document.getElementById('mainActionButton');
const resetButton = document.getElementById('resetButton');
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
const breakDialog = document.getElementById('breakDialog');
const startBreakButton = document.getElementById('startBreakButton');
const skipBreakButton = document.getElementById('skipBreakButton');

let sessionStartTime = 0;
let totalFocusedTime = 0;

// Set canvas size
faceCanvas.width = 200;
faceCanvas.height = 200;

// Make face tracking more sensitive by adjusting these values
const FACE_SENSITIVITY = 4; // Increased from 2 to 4 for more motion

// Performance constants
const MOBILE_CHECK_INTERVAL = 300; // ms between face checks on mobile
const DESKTOP_CHECK_INTERVAL = 300; // ms between face checks on desktop
const RENDER_THROTTLE = 50; // ms between face canvas renders
const POINTS_UPDATE_INTERVAL = 1000; // ms between points updates

// Cache DOM elements for performance
const elements = {
    webcam: document.getElementById('webcam'),
    status: document.getElementById('status'),
    mainActionButton: document.getElementById('mainActionButton'),
    resetButton: document.getElementById('resetButton'),
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

// Debug flags - just keep timer debugging
const DEBUG = false;
const DEBUG_TIMER = true;

// Enhanced debug logging function with type parameter
function debugLog(message, obj = null, type = 'general') {
    // Only log if debugging is enabled for the specific type
    if ((type === 'general' && DEBUG) || (type === 'timer' && DEBUG_TIMER)) {
        if (obj !== null) {
            console.log(`${type === 'timer' ? '[TIMER] ' : ''}${message}`, obj);
        } else {
            console.log(`${type === 'timer' ? '[TIMER] ' : ''}${message}`);
        }
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
        browserInfo = 'Unknown Browser';d
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
    try {
        debugLog('DOM Content Loaded, initializing app');
        
        // Initialize notification system
        createNotificationSystem();
        
        // DOM element validation
        validateHTMLElements();
        
        // Set up handlers for the mobile experience
        setupMobileHandlers();
        
        // Setup settings dialog handlers
        setupSettingsDialogHandlers();
        
        // Initialize the app
        init();
        
        // Button event handlers for the consolidated controls - remove duplicates
        /* 
        // Removed to avoid duplicate listeners
        mainActionButton.addEventListener('click', () => {
            if (isMonitoring) {
                stopMonitoring();
            } else {
                startMonitoring();
            }
        });
        
        resetButton.addEventListener('click', () => {
            resetTimer();
        });
        */
        
        // Bind work duration input to immediately update timer display
        /* 
        // Removed to avoid duplicate listeners
        workDurationInput.addEventListener('change', () => {
            if (!isTimerRunning) {
                timerCurrentTime = workDurationInput.value * 60 * 1000;
                updateTimerDisplay();
            }
        });
        */
        
        // Start break and skip break button handlers
        document.getElementById('startBreakButton').addEventListener('click', startBreak);
        document.getElementById('skipBreakButton').addEventListener('click', skipBreak);
        
        // Initial face rendering
        drawFace(true);
        
    } catch (error) {
        console.error('Initialization error:', error);
        debugLog('Initialization error:', error);
        showNotification('Failed to initialize app. Please reload the page.', 'error');
    }
});

// Draw the 2D face with minimalist design and performance optimization
function drawFace(isFocused = true, faceX = null, faceY = null) {
    // Throttle rendering for performance
    const now = Date.now();
    if (now - lastRenderTime < RENDER_THROTTLE) return;
    lastRenderTime = now;
    
    ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    
    const centerX = 100; 
    const centerY = 100;
    
    let offsetX = 0;
    let offsetY = 0;
    
    if (faceX !== null && faceY !== null) {
        // Increased sensitivity for more movement
        offsetX = Math.max(-20, Math.min(20, (faceX - 320) / (24 / FACE_SENSITIVITY)));
        offsetY = Math.max(-20, Math.min(20, (faceY - 240) / (18 / FACE_SENSITIVITY)));
    }
    
    const adjustedX = centerX + offsetX;
    const adjustedY = centerY + offsetY;
    
    // Draw face background with improved gradient
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
    
    // Add improved highlight for more 3D effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(adjustedX - 15, adjustedY - 15, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eyes with improved animation
    const leftEyeX = adjustedX - 15;
    const rightEyeX = adjustedX + 15;
    const eyeY = adjustedY - 10;
    
    ctx.fillStyle = '#333';
    
    if (isFocused) {
        // More responsive eye movement
        const pupilOffsetX = offsetX * 0.3;
        const pupilOffsetY = offsetY * 0.3;
        
        // Blink occasionally
        const shouldBlink = Math.random() < 0.005;
        
        if (shouldBlink) {
            // Blinking eyes
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
            ctx.beginPath();
            ctx.arc(leftEyeX, eyeY, 7, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(rightEyeX, eyeY, 7, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            
            // Pupils
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(leftEyeX + pupilOffsetX, eyeY + pupilOffsetY, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(rightEyeX + pupilOffsetX, eyeY + pupilOffsetY, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // Distracted/sleepy eyes
        ctx.beginPath();
        ctx.ellipse(leftEyeX, eyeY, 6, 4, Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(rightEyeX, eyeY, 6, 4, -Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw mouth with more expression
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    if (isFocused) {
        // Happier mouth with slight variance
        const smileIntensity = 0.2 + (Math.random() * 0.1); // Small variance in smile
        ctx.beginPath();
        ctx.arc(adjustedX, adjustedY + 15, 20, smileIntensity, Math.PI - smileIntensity);
        ctx.stroke();
    } else {
        // Sad/distracted mouth
        ctx.beginPath();
        ctx.arc(adjustedX, adjustedY + 25, 20, Math.PI + 0.3, 2 * Math.PI - 0.3);
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

// Make sure we have working variables at startup
async function checkInitialization() {
    debugLog('Checking initialization state', null, 'timer');
    
    if (!webcam || !model) {
        debugLog('Webcam or model not initialized, retrying initialization', null, 'timer');
        
        try {
            // Try to initialize the webcam
            if (!webcam) {
                webcam = document.getElementById('webcam');
                if (webcam) {
                    await setupWebcam();
                }
            }
            
            // Try to initialize the model
            if (!model) {
                model = await blazeface.load();
            }
            
            return !!webcam && !!model;
        } catch (error) {
            console.error('Initialization check failed:', error);
            debugLog('Initialization check failed:', error, 'timer');
            return false;
        }
    }
    
    return true;
}

// Modify the startMonitoring function to check initialization first
async function startMonitoring() {
    if (isMonitoring) return;
    
    try {
        // Check and retry initialization if needed
        const isInitialized = await checkInitialization();
        
        if (!isInitialized) {
            showNotification('Camera or AI model not ready. Please reload the page.', 'error');
            return;
        }
        
        isMonitoring = true;
        mainActionButton.textContent = 'Pause';
        mainActionButton.classList.add('active');
        
        // Only disable the reset button if we're in the middle of a focus session
        // This change allows the reset button to be clicked during breaks or when paused
        if (isTimerRunning && !isInBreak) {
            resetButton.disabled = true;
            debugLog('Reset button disabled during focus session', null, 'timer');
        } else {
            // Keep the reset button enabled during other states
            resetButton.disabled = false;
            debugLog('Reset button remains enabled', null, 'timer');
        }
        
        statusElement.textContent = 'Monitoring your focus...';
        
        // Store the initial focus points for session calculation
        focusPointsAtStart = focusPoints;
        
        // Start tracking face - fix the isMobile reference
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const checkInterval = isMobile ? MOBILE_CHECK_INTERVAL : DESKTOP_CHECK_INTERVAL;
        checkFaceInterval = setInterval(checkFace, checkInterval);
        
        // Start points accumulation
        startPointsAccumulation();
        
        // Start timer
        startTimer();
        
        // Reset continuous focus tracking
        continuousFocusStartTime = Date.now();
        reachedMilestones = [];
        
        // Update notification
        showNotification('Focus monitoring started', 'success');
        
        // Set session start time for analytics
        sessionStartTime = Date.now();
        totalDistractedTime = 0;
        
        debugLog('Monitoring started, timer started', { isMonitoring, isTimerRunning }, 'timer');
    } catch (error) {
        // If anything fails, reset the state
        console.error('Error starting monitoring:', error);
        debugLog('Error in startMonitoring:', error, 'timer');
        
        isMonitoring = false;
        mainActionButton.textContent = 'Start Studying';
        mainActionButton.classList.remove('active');
        resetButton.disabled = false;
        showNotification('Failed to start monitoring. Try again.', 'error');
    }
}

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
        const mainActionBtn = document.getElementById('mainActionButton');
        const resetBtn = document.getElementById('resetButton');
        const statusElem = document.getElementById('status');
        
        if (mainActionBtn) {
            mainActionBtn.textContent = 'Start Studying';
            mainActionBtn.classList.remove('active');
        }
        
        if (resetBtn) {
            resetBtn.disabled = false;
        }
        
        if (statusElem) {
            statusElem.textContent = 'Monitoring stopped';
        }
        
        // Stop points accumulation
        stopPointsAccumulation();
        
        // Pause timer
        pauseTimer();
        
        // Calculate total focused time
        totalFocusedTime += (Date.now() - sessionStartTime) - totalDistractedTime;
        
        // Show summary notification
        let sessionLength = Math.round((Date.now() - sessionStartTime) / 60000);
        let pointsEarned = focusPoints - focusPointsAtStart;
        showNotification(`Session complete! ${sessionLength} min, earned ${pointsEarned} points`, 'success', 6000);
        
        debugLog('Monitoring stopped successfully', {
            isMonitoring,
            isTimerRunning,
            sessionLength,
            pointsEarned
        }, 'timer');
    } catch (error) {
        console.error('Error in stopMonitoring:', error);
        debugLog('Error in stopMonitoring:', error, 'timer');
        
        // Ensure we reset state even if there's an error
        isMonitoring = false;
        if (checkFaceInterval) {
            clearInterval(checkFaceInterval);
        }
        
        // Make sure the reset button is enabled
        const resetBtn = document.getElementById('resetButton');
        if (resetBtn) {
            resetBtn.disabled = false;
        }
    }
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
    // Existing points calculation
    focusPoints += points;
    
    // Update display
    elements.pointsDisplay.textContent = focusPoints;
    
    // Add animation for points earned
    elements.pointsDisplay.classList.add('points-animate');
    setTimeout(() => {
        elements.pointsDisplay.classList.remove('points-animate');
    }, 600);
    
    // Play sound effect
    pointEarnedSound.currentTime = 0;
    pointEarnedSound.play().catch(e => console.log('Sound play error:', e));
    
    // Check level up
    checkLevelUp();
    
    // Update progress bar
    updatePointsProgressIndicator();
    
    // Display milestone notification if it's a milestone
    if (isMilestone) {
        // Create a milestone notification element
        const notification = document.createElement('div');
        notification.className = 'milestone-notification';
        notification.textContent = `${points > 0 ? '+' + points : points} points - Milestone reached!`;
        document.querySelector('.container').appendChild(notification);
        
        // Remove after animation completes
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
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
    debugLog('Starting timer now', { workDuration, isTimerRunning, isMonitoring }, 'timer');
    if (!isTimerRunning) {
        isTimerRunning = true;
        isInBreak = false;
        
        // Get the current work duration from the input field
        const workDurationInput = document.getElementById('workDuration');
        if (workDurationInput) {
            workDuration = parseInt(workDurationInput.value, 10) || 25; // Default to 25 if parsing fails
            debugLog('Retrieved work duration from input:', { workDuration }, 'timer');
        } else {
            // Ensure workDuration has a valid value
            workDuration = workDuration || 25;
            debugLog('Using existing work duration:', { workDuration }, 'timer');
        }
        
        // Set timer display class to focus
        const timerDisplay = document.getElementById('timerDisplay');
        timerDisplay.className = 'timer-display focus running';
        
        timerStartTime = Date.now();
        timerDuration = workDuration * 60 * 1000; // Convert minutes to milliseconds
        timerEndTime = timerStartTime + timerDuration;
        timerRemainingTime = timerDuration; // Initialize remaining time
        
        // Update main action button
        document.getElementById('mainActionButton').textContent = 'Pause';
        document.getElementById('mainActionButton').classList.add('active');
        
        // Update the timer immediately first
        updateTimer();
        
        // Then set the interval for updates
        timerInterval = setInterval(updateTimer, 250); // Update every 250ms for smoother countdown
        
        debugLog('Timer started with animation', { 
            timerClass: timerDisplay.className,
            duration: timerDuration,
            startTime: new Date(timerStartTime).toISOString(),
            endTime: new Date(timerEndTime).toISOString()
        }, 'timer');
    }
}

function pauseTimer() {
    if (isTimerRunning) {
        debugLog('Pausing timer', null, 'timer');
        isTimerRunning = false;
        clearInterval(timerInterval);
        
        // Store the remaining time
        const currentTime = Date.now();
        timerRemainingTime = timerEndTime - currentTime;
        
        // Update UI
        const mainActionBtn = document.getElementById('mainActionButton');
        if (mainActionBtn) {
            mainActionBtn.textContent = 'Resume';
            mainActionBtn.classList.remove('active');
        }
        
        // Enable the reset button when paused
        const resetBtn = document.getElementById('resetButton');
        if (resetBtn) {
            resetBtn.disabled = false;
            debugLog('Reset button enabled on pause', null, 'timer');
        }
        
        // Remove the running animation class
        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay) {
            timerDisplay.classList.remove('running');
        }
        
        debugLog('Timer paused, animation stopped', { 
            remaining: timerRemainingTime,
            timerClass: timerDisplay ? timerDisplay.className : 'unknown'
        }, 'timer');
    }
}

function resumeTimer() {
    if (!isTimerRunning && timerRemainingTime > 0) {
        debugLog('Resuming timer', { remainingTime: timerRemainingTime }, 'timer');
        isTimerRunning = true;
        
        // Update the end time based on the remaining time
        timerStartTime = Date.now();
        timerEndTime = timerStartTime + timerRemainingTime;
        
        // Update UI
        const mainActionBtn = document.getElementById('mainActionButton');
        if (mainActionBtn) {
            mainActionBtn.textContent = 'Pause';
            mainActionBtn.classList.add('active');
        }
        
        // Only disable the reset button during focused sessions, not during breaks
        const resetBtn = document.getElementById('resetButton');
        if (resetBtn && !isInBreak) {
            resetBtn.disabled = true;
            debugLog('Reset button disabled on resume during focus session', null, 'timer');
        }
        
        // Add the running animation class back
        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay && !timerDisplay.classList.contains('running')) {
            timerDisplay.classList.add('running');
        }
        
        // Update the timer immediately first
        updateTimer();
        
        // Then set the interval for updates
        timerInterval = setInterval(updateTimer, 250); // Update every 250ms for smoother countdown
        
        debugLog('Timer resumed with animation', { 
            timerClass: timerDisplay ? timerDisplay.className : 'unknown',
            remainingTime: timerRemainingTime,
            endTime: new Date(timerEndTime).toISOString()
        }, 'timer');
    } else {
        debugLog('Cannot resume timer - not in the right state', { 
            isTimerRunning,
            timerRemainingTime
        }, 'timer');
    }
}

function resetTimer() {
    debugLog('Resetting timer', null, 'timer');
    
    try {
        // Clear the timer interval
        clearInterval(timerInterval);
        isTimerRunning = false;
        timerRemainingTime = 0;
        isInBreak = false;  // Reset the break state as well
        
        // Reset the timer display
        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay) {
            timerDisplay.className = 'timer-display';
        }
        
        // Get the work duration from the input
        const workDurationInput = document.getElementById('workDuration');
        if (workDurationInput) {
            workDuration = parseInt(workDurationInput.value, 10) || 25; // Default to 25 if parsing fails
        }
        updateTimerDisplay(workDuration * 60);
        
        // Reset the main action button
        const mainActionBtn = document.getElementById('mainActionButton');
        if (mainActionBtn) {
            mainActionBtn.textContent = 'Start Studying';
            mainActionBtn.classList.remove('active');
        }
        
        // Enable the reset button for next use
        const resetBtn = document.getElementById('resetButton');
        if (resetBtn) {
            resetBtn.disabled = false;
        }
        
        debugLog('Timer reset, animation cleared', { 
            timerClass: timerDisplay ? timerDisplay.className : 'unknown',
            displayValue: timerDisplay ? timerDisplay.textContent : 'unknown'
        }, 'timer');
    } catch (error) {
        console.error('Error in resetTimer:', error);
        debugLog('Error in resetTimer function', error, 'timer');
    }
}

function updateTimer() {
    if (!isTimerRunning) return;
    
    const currentTime = Date.now();
    const timeRemaining = timerEndTime - currentTime;
    
    debugLog('Updating timer', { 
        current: new Date(currentTime).toISOString(),
        end: new Date(timerEndTime).toISOString(),
        remaining: timeRemaining 
    }, 'timer');
    
    if (timeRemaining <= 0) {
        // Timer is complete
        timerComplete();
        return;
    }
    
    // Calculate minutes and seconds
    const totalSeconds = Math.floor(timeRemaining / 1000);
    
    // Update the timer display
    updateTimerDisplay(totalSeconds);
    
    // Get timer display element
    const timerDisplay = document.getElementById('timerDisplay');
    
    // Make sure the running class is added for animation
    if (!timerDisplay.classList.contains('running')) {
        timerDisplay.classList.add('running');
        debugLog('Added running animation class', { timerClass: timerDisplay.className }, 'timer');
    }
    
    // Add warning class when 10% of time remains
    const warningThreshold = 0.5 * timerDuration;
    if (timeRemaining <= warningThreshold && !timerDisplay.classList.contains('warning')) {
        timerDisplay.classList.add('warning');
        debugLog('Timer entered warning state', { 
            remaining: timeRemaining,
            threshold: warningThreshold,
            timerClass: timerDisplay.className
        }, 'timer');
    }
}

function updateTimerDisplay(totalSeconds) {
    // Handle the case when totalSeconds is undefined or NaN
    if (totalSeconds === undefined || isNaN(totalSeconds)) {
        // Default to workDuration if available, otherwise use 25 minutes
        totalSeconds = workDuration ? workDuration * 60 : 25 * 60;
    }
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // Format the timer display
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Update the timer display
    document.getElementById('timerDisplay').textContent = formattedTime;
    
    debugLog(`Timer display updated to ${formattedTime}`, null, 'timer');
}

function timerComplete() {
    debugLog('Timer complete, current mode: ' + (isInBreak ? 'break' : 'focus'), null, 'timer');
    
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerRemainingTime = 0;
    
    // Play completion sound
    if (timerCompleteSound) {
        timerCompleteSound.currentTime = 0;
        timerCompleteSound.play().catch(e => console.log('Sound play error:', e));
    }
    
    // Get DOM elements we need
    const mainActionBtn = document.getElementById('mainActionButton');
    const resetBtn = document.getElementById('resetButton');
    const breakDialog = document.getElementById('breakDialog');
    const timerDisplay = document.getElementById('timerDisplay');
    
    // Always make sure reset button is enabled
    if (resetBtn) {
        resetBtn.disabled = false;
        debugLog('Reset button enabled at timer completion', null, 'timer');
    }
    
    // Check if we're in focus mode
    if (!isInBreak) {
        // We were in focus mode, show break dialog
        isMonitoring = false;
        if (checkFaceInterval) {
            clearInterval(checkFaceInterval);
            checkFaceInterval = null;
        }
        
        // Stop the points system
        stopPointsAccumulation();
        
        // Reset button states
        if (mainActionBtn) {
            mainActionBtn.textContent = 'Start Studying';
            mainActionBtn.classList.remove('active');
        }
        
        // Show break dialog
        if (breakDialog) {
            breakDialog.classList.remove('hidden');
        }
        
        if (timerDisplay) {
            timerDisplay.className = 'timer-display break';
        }
        
        debugLog('Focus timer complete, showing break dialog', {
            timerClass: timerDisplay ? timerDisplay.className : 'unknown',
            isMonitoring
        }, 'timer');
    } else {
        // Break timer completed
        resetTimer();
        
        if (timerDisplay) {
            timerDisplay.className = 'timer-display';
        }
        
        debugLog('Break timer complete', null, 'timer');
    }
}

function startBreak() {
    // Hide dialog
    const breakDialog = document.getElementById('breakDialog');
    breakDialog.classList.add('hidden');
    
    debugLog('Starting break timer', null, 'timer');
    
    // Set up break timer
    const breakDuration = parseInt(document.getElementById('breakDuration').value, 10);
    isInBreak = true;
    
    // Setup timer 
    timerStartTime = Date.now();
    timerDuration = breakDuration * 60 * 1000; // Convert minutes to milliseconds
    timerEndTime = timerStartTime + timerDuration;
    isTimerRunning = true;
    
    // Update UI
    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.className = 'timer-display break running';
    
    // Update the timer immediately first
    updateTimer();
    
    // Then set the interval for updates
    timerInterval = setInterval(updateTimer, 250);
    
    debugLog('Break started', { 
        duration: breakDuration,
        timerClass: timerDisplay.className
    }, 'timer');
}

function skipBreak() {
    debugLog('Skipping break', null, 'timer');
    const breakDialog = document.getElementById('breakDialog');
    breakDialog.classList.add('hidden');
    
    isInBreak = false;
    resetTimer();
    
    debugLog('Break skipped, timer reset', null, 'timer');
}

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
        // Safety check: make sure model is available
        if (!model) {
            debugLog('Model not available for checkFace', null, 'timer');
            stopMonitoring(); // Stop monitoring if model isn't available
            return;
        }
        
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
        
        // Stop monitoring if there are persistent errors
        if (error.message && (
            error.message.includes("Cannot read properties of null") || 
            error.message.includes("Cannot read property") ||
            error.message.includes("is not defined")
        )) {
            debugLog('Critical error in face detection, stopping monitoring', error, 'timer');
            stopMonitoring();
            showNotification('Face detection error. Monitoring stopped.', 'error');
        }
    }
}

// Set audio volumes
chimeSound.volume = 0.4; // 40% volume
timerCompleteSound.volume = 0.5; // 50% volume

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
        const mainActionBtn = document.getElementById('mainActionButton');
        
        if (statusElement) {
            statusElement.textContent = 'Ready to start!';
        }
        
        if (mainActionBtn) {
            // No need to disable/enable, the button should be enabled by default
            mainActionBtn.textContent = 'Start Studying';
            mainActionBtn.classList.remove('active');
        }
        
        // Draw initial face
        debugLog('Drawing initial face');
        drawFace();
        
        // Initialize timer display
        const initialMinutes = workDuration || 25; // Default to 25 minutes if workDuration is not set
        debugLog('Initializing timer display with minutes:', { initialMinutes }, 'timer');
        updateTimerDisplay(initialMinutes * 60);
        
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

// Fix the mainActionButton handler to properly control the timer
document.addEventListener('DOMContentLoaded', function() {
    debugLog('Setting up timer controls', null, 'timer');
    
    // Add main action button handler
    const mainActionButton = document.getElementById('mainActionButton');
    if (mainActionButton) {
        mainActionButton.addEventListener('click', async function() {
            debugLog('Main action button clicked', { 
                isTimerRunning, 
                isMonitoring, 
                buttonText: this.textContent,
                timerRemainingTime
            }, 'timer');
            
            try {
                if (!isMonitoring) {
                    // If not monitoring, start monitoring which also starts the timer
                    debugLog('Starting monitoring and timer', null, 'timer');
                    await startMonitoring();
                    
                    // Double check that timer is running
                    if (!isTimerRunning) {
                        debugLog('Timer did not start properly, forcing timer start', null, 'timer');
                        startTimer();
                    }
                } else {
                    // If monitoring, toggle timer state
                    if (isTimerRunning) {
                        debugLog('Pausing timer', null, 'timer');
                        pauseTimer();
                    } else {
                        debugLog('Resuming/starting timer', { timerRemainingTime }, 'timer');
                        if (timerRemainingTime > 0) {
                            resumeTimer();
                        } else {
                            startTimer();
                        }
                    }
                }
            } catch (error) {
                console.error('Error in main action button handler:', error);
                debugLog('Error in main action button handler:', error, 'timer');
                
                // Reset states to a clean slate
                isMonitoring = false;
                isTimerRunning = false;
                mainActionButton.textContent = 'Start Studying';
                mainActionButton.classList.remove('active');
                resetButton.disabled = false;
                
                showNotification('An error occurred. Please try again.', 'error');
            }
        });
    } else {
        debugLog('Main action button not found', null, 'timer');
    }
    
    // Add reset button handler
    const resetButton = document.getElementById('resetButton');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            debugLog('Reset button clicked, calling resetTimer function', null, 'timer');
            
            // Force stop monitoring first if it's running
            if (isMonitoring) {
                debugLog('Stopping monitoring before reset', null, 'timer');
                stopMonitoring();
            }
            
            // Call resetTimer function
            resetTimer();
            
            // Always re-enable the reset button to ensure it's not stuck
            resetButton.disabled = false;
            
            // Update the main action button state
            const mainActionBtn = document.getElementById('mainActionButton');
            if (mainActionBtn) {
                mainActionBtn.textContent = 'Start Studying';
                mainActionBtn.classList.remove('active');
            }
        });
        debugLog('Added enhanced click handler to resetButton', null, 'timer');
    } else {
        debugLog('Reset button not found in the DOM', null, 'timer');
    }
    
    // Initialize timer display with default value
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        updateTimerDisplay(workDuration * 60);
        debugLog('Initialized timer display with default value', { workDuration }, 'timer');
    }
    
    // Add event listener to work duration input to update timer display
    const workDurationInput = document.getElementById('workDuration');
    if (workDurationInput) {
        workDurationInput.addEventListener('change', function() {
            if (!isTimerRunning) {
                workDuration = parseInt(this.value, 10) || 25; // Default to 25 if parsing fails
                updateTimerDisplay(workDuration * 60);
                debugLog('Work duration changed, updated timer display', { newDuration: workDuration }, 'timer');
            }
        });
        debugLog('Added change handler to workDurationInput', null, 'timer');
    }
});

// Update status text based on focus state
function updateStatus(isFocused) {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;
    
    if (isFocused) {
        statusElement.textContent = 'Focused! Keep it up!';
        statusElement.className = 'focused';
    } else {
        statusElement.textContent = 'Distracted! Look at the screen';
        statusElement.className = 'distracted';
    }
}

// Log app initialization
debugLog('Script loaded, waiting for DOMContentLoaded event');

// Handle distraction events
function handleDistraction() {
    if (!isMonitoring) return;
    
    // Play chime sound to alert the user
    if (chimeSound) {
        chimeSound.currentTime = 0;
        chimeSound.play().catch(e => console.log('Sound play error:', e));
    }
    
    // Update UI to show distraction
    if (document.getElementById('status')) {
        document.getElementById('status').className = 'distracted';
    }
    
    // Update face to show distraction
    drawFace(false);
    
    // Reset continuous focus time
    continuousFocusStartTime = Date.now();
    
    // Track distraction time
    if (distractionStartTime === 0) {
        distractionStartTime = Date.now();
    }
    
    // Add to total distracted time
    if (distractionStartTime > 0) {
        totalDistractedTime += (Date.now() - distractionStartTime);
        distractionStartTime = 0;
    }
}

// Create milestone indicators for UI
function createMilestoneIndicators() {
    // Skip if we've already created them or if the container doesn't exist
    if (document.querySelector('.milestone-markers') && 
        document.querySelector('.milestone-markers').children.length > 0) {
        return;
    }
    
    const container = document.querySelector('.milestone-markers');
    if (!container) return;
    
    // Remove any existing indicators
    container.innerHTML = '';
    
    // Create milestone indicators based on MILESTONES array
    MILESTONES.forEach(milestone => {
        const marker = document.createElement('div');
        marker.className = 'milestone-marker';
        marker.id = `milestone-${milestone.duration}`;
        marker.title = `${milestone.duration} min: +${milestone.points} points`;
        marker.textContent = `${milestone.duration}m`;
        
        // Position along the progress bar based on duration
        // Assuming the longest milestone duration is our max
        const maxDuration = MILESTONES[MILESTONES.length - 1].duration;
        const position = (milestone.duration / maxDuration) * 100;
        marker.style.left = `${position}%`;
        
        container.appendChild(marker);
    });
} 