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
        // Load model
        model = await blazeface.load();
        
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
        
        // Start rendering
        render();
        
    } catch (error) {
        console.error('Initialization error:', error);
        statusText.textContent = 'Camera access required';
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
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    
    const centerX = canvasEl.width / 2;
    const centerY = canvasEl.height / 2;
    const time = Date.now() * 0.001;
    
    // Draw breathing orb
    const breathScale = 1 + Math.sin(time * 0.5) * 0.1;
    const focusAlpha = focusScore / 100;
    
    // Outer glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 150 * breathScale);
    gradient.addColorStop(0, `rgba(74, 144, 226, ${focusAlpha * 0.3})`);
    gradient.addColorStop(0.5, `rgba(74, 144, 226, ${focusAlpha * 0.1})`);
    gradient.addColorStop(1, 'rgba(74, 144, 226, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
    
    // Center orb
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30 * breathScale, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(74, 144, 226, ${focusAlpha * 0.6})`;
    ctx.fill();
    
    // Inner light
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10 * breathScale, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${focusAlpha * 0.8})`;
    ctx.fill();
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
    
    // Check completion
    if (progress >= 1) {
        completeSession();
    }
}

// Update focus score
function updateFocusScore() {
    const timeSinceLastFace = Date.now() - lastFaceDetectedTime;
    const isPresent = timeSinceLastFace < 2000;
    
    if (isPresent) {
        focusScore = Math.min(100, focusScore + 0.5);
    } else {
        focusScore = Math.max(0, focusScore - 1);
    }
    
    focusScoreEl.textContent = Math.round(focusScore);
    
    // Play gentle chime if focus drops too low
    if (focusScore < 30 && timeSinceLastFace === 2000) {
        playGentleChime();
    }
}

// Play gentle chime
function playGentleChime() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Start session
function startSession() {
    isMonitoring = true;
    sessionStartTime = Date.now();
    focusScore = 100;
    
    actionBtn.dataset.state = 'focusing';
    actionBtn.querySelector('.btn-text').textContent = 'End Session';
    timeSelectorEl.classList.add('hidden');
    statusText.textContent = 'Stay present, stay focused';
    
    // Resume audio context if suspended
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Complete session
function completeSession() {
    isMonitoring = false;
    
    // Show completion view
    appEl.classList.add('hidden');
    completionEl.classList.remove('hidden');
    
    // Update completion stats
    document.getElementById('completionScore').textContent = Math.round(focusScore);
    document.getElementById('completionTime').textContent = `${sessionGoalMinutes} minutes of deep focus`;
    
    // Play success sound
    playSuccessSound();
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
    const state = actionBtn.dataset.state;
    
    if (state === 'ready') {
        // Show time selector
        timeSelectorEl.classList.toggle('hidden');
        statusText.textContent = 'Choose your focus duration';
    } else if (state === 'set') {
        startSession();
    } else if (state === 'focusing') {
        completeSession();
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
        
        // Update button
        actionBtn.dataset.state = 'set';
        actionBtn.querySelector('.btn-text').textContent = 'Start Focus';
        statusText.textContent = 'Ready to begin your focus session';
    });
});

newSessionBtn.addEventListener('click', () => {
    // Reset everything
    completionEl.classList.add('hidden');
    appEl.classList.remove('hidden');
    
    actionBtn.dataset.state = 'ready';
    actionBtn.querySelector('.btn-text').textContent = 'Begin Focus';
    timeSelectorEl.classList.add('hidden');
    timeDisplay.textContent = '25:00';
    focusScoreEl.textContent = '100';
    statusText.textContent = 'Click to set your focus time';
    
    // Reset progress ring
    progressRing.style.strokeDashoffset = 1194;
    
    // Clear active time option
    timeOptions.forEach(opt => opt.classList.remove('active'));
});

// Initialize on load
window.addEventListener('load', init);