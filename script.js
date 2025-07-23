// Core state
let model;
let isMonitoring = false;
let sessionStartTime = null;
let sessionGoalMinutes = 25;
let focusScore = 100;
let lastFaceDetectedTime = Date.now();
let audioContext;
let animationFrame;

// DOM elements
const loadingEl = document.getElementById('loading');
const appEl = document.getElementById('app');
const webcamEl = document.getElementById('webcam');
const canvasEl = document.getElementById('focusCanvas');
const ctx = canvasEl.getContext('2d');
const actionBtn = document.getElementById('actionBtn');
const timeBtn = document.getElementById('timeBtn');
const timeSelectorEl = document.getElementById('timeSelector');
const timeDisplay = document.getElementById('timeDisplay');
const focusScoreEl = document.getElementById('focusScore');
const statusText = document.getElementById('statusText');
const progressRing = document.querySelector('.ring-progress');
const completionEl = document.getElementById('completion');
const newSessionBtn = document.getElementById('newSessionBtn');

// Time options
const timeOptions = document.querySelectorAll('.time-option');

// Initialize
async function init() {
    try {
        // Update loading text
        const loadingText = document.getElementById('loadingText');
        loadingText.textContent = 'Loading AI model...';
        
        // Load model
        model = await blazeface.load();
        
        // Update loading text
        loadingText.textContent = 'Requesting camera access...';
        
        // Setup webcam
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' },
            audio: false 
        });
        webcamEl.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise(resolve => {
            webcamEl.onloadedmetadata = resolve;
        });
        
        // Initialize audio
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Setup canvas
        canvasEl.width = 400;
        canvasEl.height = 400;
        
        // Show app
        loadingEl.classList.add('hidden');
        appEl.classList.remove('hidden');
        
        // Set initial webcam visibility
        webcamEl.classList.add('visible');
        
        // Show camera indicator
        statusText.textContent = 'Click to start session';
        
        // Start rendering
        render();
        
    } catch (error) {
        console.error('Initialization error:', error);
        const loadingText = document.getElementById('loadingText');
        loadingText.textContent = 'Camera access required - Please allow camera permission';
        loadingText.style.color = '#ff6b6b';
    }
}

// Render loop
function render() {
    if (isMonitoring) {
        detectFace();
        updateProgress();
        updateFocusScore();
    }
    
    drawFocusVisualization();
    animationFrame = requestAnimationFrame(render);
}

// Face detection
async function detectFace() {
    if (!model || webcamEl.readyState !== 4) return;
    
    const predictions = await model.estimateFaces(webcamEl, false);
    
    if (predictions.length > 0) {
        lastFaceDetectedTime = Date.now();
    }
}

// Draw abstract focus visualization
function drawFocusVisualization() {
    // Only draw minimal overlay when monitoring
    if (!isMonitoring) {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        return;
    }
    
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    
    const centerX = canvasEl.width / 2;
    const centerY = canvasEl.height / 2;
    const time = Date.now() * 0.001;
    
    // Only draw subtle glow, not solid orb
    const breathScale = 1 + Math.sin(time * 0.5) * 0.05;
    const focusAlpha = focusScore / 100;
    
    // Very subtle outer glow only
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 100 * breathScale);
    gradient.addColorStop(0, `rgba(74, 144, 226, ${focusAlpha * 0.1})`);
    gradient.addColorStop(0.8, `rgba(74, 144, 226, ${focusAlpha * 0.05})`);
    gradient.addColorStop(1, 'rgba(74, 144, 226, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
}

// Update progress
function updateProgress() {
    if (!sessionStartTime) return;
    
    const elapsed = (Date.now() - sessionStartTime) / 1000 / 60; // minutes
    const progress = Math.min(elapsed / sessionGoalMinutes, 1);
    
    // Update time display
    const remainingMinutes = Math.max(0, sessionGoalMinutes - elapsed);
    const minutes = Math.floor(remainingMinutes);
    const seconds = Math.floor((remainingMinutes - minutes) * 60);
    timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Update progress ring
    const circumference = 2 * Math.PI * 190;
    const offset = circumference - (progress * circumference);
    progressRing.style.strokeDashoffset = offset;
    
    // Check automatic completion
    if (progress >= 1) {
        // Mark as automatic completion
        actionBtn.dataset.state = 'completed';
        completeSession();
    }
}

// Update focus score
function updateFocusScore() {
    const timeSinceLastFace = Date.now() - lastFaceDetectedTime;
    const isPresent = timeSinceLastFace < 1500; // Faster detection
    
    if (isPresent) {
        focusScore = Math.min(100, focusScore + 1);
    } else {
        focusScore = Math.max(0, focusScore - 2); // Faster penalty
    }
    
    focusScoreEl.textContent = Math.round(focusScore);
    
    // Visual feedback based on focus
    updateVisualFeedback(timeSinceLastFace, isPresent);
    
    // Audio feedback for extended distraction
    if (!isPresent && timeSinceLastFace > 3000 && timeSinceLastFace % 2000 < 100) {
        playGentleChime();
    }
}

// Visual feedback system
function updateVisualFeedback(timeSinceLastFace, isPresent) {
    const progressRing = document.querySelector('.ring-progress');
    const focusContainer = document.querySelector('.focus-container');
    
    if (!isPresent && timeSinceLastFace > 2000) {
        // Distracted state - red progress ring
        progressRing.style.stroke = '#ff6b6b';
        focusContainer.style.filter = 'brightness(0.7)';
        statusText.textContent = 'Please return your attention to the screen';
    } else if (!isPresent) {
        // Warning state - yellow
        progressRing.style.stroke = '#ffa500';
        focusContainer.style.filter = 'brightness(0.9)';
        statusText.textContent = 'Stay focused...';
    } else {
        // Focused state - blue
        progressRing.style.stroke = '#4a90e2';
        focusContainer.style.filter = 'brightness(1)';
        statusText.textContent = 'Great focus! Keep it up';
    }
}

// Play gentle chime (accountability reminder)
function playGentleChime() {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Soft, attention-getting tone
    oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C note
    oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E note
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);
}

// Start session
function startSession() {
    isMonitoring = true;
    sessionStartTime = Date.now();
    focusScore = 100;
    
    actionBtn.dataset.state = 'focusing';
    actionBtn.querySelector('.btn-text').textContent = 'End Session';
    timeSelectorEl.classList.add('hidden');
    timeBtn.style.display = 'none'; // Hide time button during session
    statusText.textContent = 'Stay present, stay focused';
    
    // Resume audio context if suspended
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Complete session
function completeSession() {
    isMonitoring = false;
    
    // Check if completion was manual (button click) or automatic (timer)
    const isManualComplete = actionBtn.dataset.state === 'focusing';
    
    if (isManualComplete) {
        // Manual completion - just reset to ready state
        resetToReady();
    } else {
        // Automatic completion - show celebration
        showCompletionScreen();
    }
}

// Show completion screen
function showCompletionScreen() {
    try {
        console.log('Showing completion screen...');
        
        // Update completion stats
        const scoreEl = document.getElementById('completionScore');
        const timeEl = document.getElementById('completionTime');
        
        if (scoreEl) scoreEl.textContent = Math.round(focusScore);
        if (timeEl) timeEl.textContent = `${sessionGoalMinutes} minutes of deep focus`;
        
        // Show completion view
        console.log('Hiding app, showing completion');
        appEl.classList.add('hidden');
        completionEl.classList.remove('hidden');
        
        // Play success sound
        playSuccessSound();
    } catch (error) {
        console.error('Completion screen error:', error);
        // Fallback to simple reset
        resetToReady();
    }
}

// Reset to ready state
function resetToReady() {
    console.log('Resetting to ready state...');
    
    isMonitoring = false;
    sessionStartTime = null;
    focusScore = 100;
    
    // Make sure main app is visible
    appEl.classList.remove('hidden');
    completionEl.classList.add('hidden');
    
    // Reset UI
    actionBtn.dataset.state = 'ready';
    actionBtn.querySelector('.btn-text').textContent = 'Begin Focus';
    timeSelectorEl.classList.add('hidden');
    timeDisplay.textContent = '25:00';
    timeBtn.textContent = '25 min';
    timeBtn.style.display = 'block'; // Show time button when ready
    focusScoreEl.textContent = '100';
    statusText.textContent = 'Click to start session';
    
    // Reset progress ring
    const progressRing = document.querySelector('.ring-progress');
    if (progressRing) {
        progressRing.style.strokeDashoffset = 1194;
        progressRing.style.stroke = '#4a90e2';
    }
    
    // Reset visual state
    const focusContainer = document.querySelector('.focus-container');
    if (focusContainer) {
        focusContainer.style.filter = 'brightness(1)';
    }
    
    // Clear active time option
    timeOptions.forEach(opt => opt.classList.remove('active'));
    
    console.log('Reset complete');
}

// Play success sound
function playSuccessSound() {
    const notes = [523.25, 659.25, 783.99]; // C, E, G
    
    notes.forEach((freq, i) => {
        setTimeout(() => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        }, i * 100);
    });
}

// Event listeners
actionBtn.addEventListener('click', () => {
    const state = actionBtn.dataset.state || 'ready';
    
    if (state === 'ready') {
        // Quick start with default 25 minutes
        sessionGoalMinutes = 25;
        timeDisplay.textContent = '25:00';
        startSession();
    } else if (state === 'set') {
        startSession();
    } else if (state === 'focusing') {
        completeSession();
    }
});

// Time button to show time selector
timeBtn.addEventListener('click', () => {
    if (!isMonitoring) {
        timeSelectorEl.classList.toggle('hidden');
        statusText.textContent = timeSelectorEl.classList.contains('hidden') ? 
            'Click to start session' : 'Choose your focus duration';
    }
});

// Right click also works
actionBtn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!isMonitoring) {
        timeSelectorEl.classList.toggle('hidden');
        statusText.textContent = timeSelectorEl.classList.contains('hidden') ? 
            'Click to start session' : 'Choose your focus duration';
    }
});

timeOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Update active state
        timeOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        
        // Set goal
        sessionGoalMinutes = parseInt(option.dataset.minutes);
        timeDisplay.textContent = `${sessionGoalMinutes}:00`;
        timeBtn.textContent = `${sessionGoalMinutes} min`;
        
        // Update button
        actionBtn.dataset.state = 'set';
        actionBtn.querySelector('.btn-text').textContent = 'Start Focus';
        statusText.textContent = 'Ready to begin your focus session';
        
        // Hide selector
        timeSelectorEl.classList.add('hidden');
    });
});

newSessionBtn.addEventListener('click', () => {
    // Hide completion screen
    completionEl.classList.add('hidden');
    appEl.classList.remove('hidden');
    
    // Reset to ready state
    resetToReady();
});

// Webcam toggle
const webcamToggle = document.getElementById('webcamToggle');
let webcamVisible = true;

webcamToggle.addEventListener('click', () => {
    webcamVisible = !webcamVisible;
    if (webcamVisible) {
        webcamEl.classList.remove('hidden');
        webcamEl.classList.add('visible');
        webcamToggle.textContent = '👁';
    } else {
        webcamEl.classList.remove('visible');
        webcamEl.classList.add('hidden');
        webcamToggle.textContent = '👁‍🗨';
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Space to start/pause
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        actionBtn.click();
    }
    
    // ESC to end session
    if (e.code === 'Escape' && isMonitoring) {
        completeSession();
    }
    
    // Number keys for time selection
    if (!isMonitoring && timeSelectorEl && !timeSelectorEl.classList.contains('hidden')) {
        if (e.key === '1') timeOptions[0].click(); // 15 min
        if (e.key === '2') timeOptions[1].click(); // 25 min
        if (e.key === '3') timeOptions[2].click(); // 45 min
        if (e.key === '4') timeOptions[3].click(); // 60 min
    }
});

// Initialize on load
window.addEventListener('load', init);