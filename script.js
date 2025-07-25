// Core state
let model;
let isMonitoring = false;
let sessionStartTime = null;
let sessionGoalMinutes = 25;
let focusScore = 100;
let lastFaceDetectedTime = Date.now();
let audioContext;
let animationFrame;
let isMusicPlaying = false;
let checkInInterval = null;

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
const backgroundMusic = document.getElementById('backgroundMusic');
const musicToggle = document.getElementById('musicToggle');
const musicVolume = document.getElementById('musicVolume');

// Feedback form elements
const feedbackStars = document.querySelectorAll('.star');
const feedbackText = document.getElementById('feedbackText');
const skipFeedbackBtn = document.getElementById('skipFeedback');
const submitFeedbackBtn = document.getElementById('submitFeedback');
let selectedRating = 0;

// Product feedback elements
// const feedbackBtn = document.getElementById('feedbackBtn');
const productFeedbackModal = document.getElementById('productFeedbackModal');
const closeFeedbackModal = document.getElementById('closeFeedbackModal');
const productStars = document.querySelectorAll('.product-star');
const productFeedbackText = document.getElementById('productFeedbackText');
const submitProductFeedback = document.getElementById('submitProductFeedback');
let selectedProductRating = 0;

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
        
        // Initialize background music
        backgroundMusic.volume = 0.3; // Set initial volume
        console.log('Background music initialized:', backgroundMusic.src);
        
        // Add audio event listeners for debugging
        backgroundMusic.addEventListener('loadstart', () => console.log('Audio: Load started'));
        backgroundMusic.addEventListener('loadeddata', () => console.log('Audio: Data loaded'));
        backgroundMusic.addEventListener('loadedmetadata', () => console.log('Audio: Metadata loaded'));
        backgroundMusic.addEventListener('canplay', () => console.log('Audio: Can play'));
        backgroundMusic.addEventListener('canplaythrough', () => console.log('Audio: Can play through'));
        backgroundMusic.addEventListener('error', (e) => console.error('Audio error:', e, backgroundMusic.error));
        backgroundMusic.addEventListener('ended', () => console.log('Audio: Ended'));
        backgroundMusic.addEventListener('play', () => console.log('Audio: Play event'));
        backgroundMusic.addEventListener('pause', () => console.log('Audio: Pause event'));
        
        // Try to preload
        backgroundMusic.load();
        console.log('Audio load() called, readyState:', backgroundMusic.readyState);
        
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
    
    // Start check-in timer for 10-minute intervals
    startCheckInTimer();
    
    // Always try to start background music when session begins
    if (!isMusicPlaying) {
        console.log('Starting background music for session...');
        backgroundMusic.play().then(() => {
            musicToggle.classList.add('active');
            musicToggle.textContent = '🔊'; // Unmuted/playing
            isMusicPlaying = true;
            console.log('Session music started successfully');
        }).catch(err => {
            console.log('Auto-play failed (browser policy):', err.message);
            // Still show unmuted icon but music didn't start
            musicToggle.textContent = '🔊';
            statusText.textContent = 'Click music button to enable audio';
            setTimeout(() => {
                statusText.textContent = 'Stay present, stay focused';
            }, 3000);
        });
    }
    
    // Resume audio context if suspended
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Complete session
function completeSession() {
    isMonitoring = false;
    
    // Stop check-in timer
    stopCheckInTimer();
    
    // Pause background music when session ends
    if (isMusicPlaying) {
        backgroundMusic.pause();
        musicToggle.classList.remove('active');
        musicToggle.textContent = '🔇'; // Muted when session ends
        isMusicPlaying = false;
        console.log('Session ended - background music paused');
    }
    
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
        
        // Initialize feedback form
        initFeedbackForm();
        
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

// Background music functions
function toggleMusic() {
    console.log('=== Music Toggle Debug ===');
    console.log('Current state - isMusicPlaying:', isMusicPlaying);
    console.log('Is monitoring session:', isMonitoring);
    
    if (isMonitoring) {
        // During session: toggle music immediately
        if (isMusicPlaying) {
            backgroundMusic.pause();
            musicToggle.classList.remove('active');
            musicToggle.textContent = '🔇'; // Muted
            isMusicPlaying = false;
            console.log('Session music muted');
        } else {
            backgroundMusic.play().then(() => {
                musicToggle.classList.add('active');
                musicToggle.textContent = '🔊'; // Unmuted/playing
                isMusicPlaying = true;
                console.log('Session music unmuted');
            }).catch(err => {
                console.error('Music play failed:', err);
                statusText.textContent = 'Background music not available';
                setTimeout(() => statusText.textContent = 'Stay present, stay focused', 3000);
            });
        }
    } else {
        // Not in session: toggle the preference state
        if (musicToggle.classList.contains('active')) {
            musicToggle.classList.remove('active');
            musicToggle.textContent = '🔇'; // Will be muted
            statusText.textContent = 'Music will be muted during sessions';
        } else {
            musicToggle.classList.add('active');
            musicToggle.textContent = '🔊'; // Will be unmuted
            statusText.textContent = 'Music will play during sessions';
        }
        
        setTimeout(() => {
            statusText.textContent = 'Click to start session';
        }, 2000);
    }
}

function updateMusicVolume() {
    const volume = musicVolume.value / 100;
    backgroundMusic.volume = volume;
    console.log('Music volume updated to:', volume);
    
    // Brief feedback
    if (volume === 0) {
        statusText.textContent = 'Music muted';
    } else {
        statusText.textContent = `Music volume: ${Math.round(volume * 100)}%`;
    }
    
    setTimeout(() => {
        if (!isMonitoring) {
            statusText.textContent = 'Click to start session';
        } else {
            statusText.textContent = 'Stay present, stay focused';
        }
    }, 1500);
}

// Time check-in system
function startCheckInTimer() {
    // Clear any existing timer
    if (checkInInterval) {
        clearInterval(checkInInterval);
    }
    
    // Set 10-minute check-ins (600,000 ms)
    checkInInterval = setInterval(() => {
        if (isMonitoring) {
            showCheckIn();
        }
    }, 600000); // 10 minutes
}

function showCheckIn() {
    // Gentle notification every 10 minutes
    statusText.textContent = '10 minutes passed - still focused?';
    
    // Play gentle chime
    playGentleChime();
    
    // Reset message after 3 seconds
    setTimeout(() => {
        if (isMonitoring) {
            statusText.textContent = 'Stay present, stay focused';
        }
    }, 3000);
}

function stopCheckInTimer() {
    if (checkInInterval) {
        clearInterval(checkInInterval);
        checkInInterval = null;
    }
}

// Feedback form functions
function initFeedbackForm() {
    // Reset form state
    selectedRating = 0;
    feedbackText.value = '';
    feedbackStars.forEach(star => star.classList.remove('active'));
    
    // Show feedback form, hide new session button
    document.querySelector('.feedback-form').style.display = 'block';
    newSessionBtn.classList.add('hidden');
}

function setRating(rating) {
    selectedRating = rating;
    feedbackStars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
            star.textContent = '★';
        } else {
            star.classList.remove('active');
            star.textContent = '☆';
        }
    });
}

function submitFeedback() {
    const feedback = {
        rating: selectedRating,
        comment: feedbackText.value.trim(),
        sessionDuration: sessionGoalMinutes,
        focusScore: Math.round(focusScore),
        timestamp: new Date().toISOString()
    };
    
    // Store feedback locally (could be sent to server in future)
    const existingFeedback = JSON.parse(localStorage.getItem('focusFeedback') || '[]');
    existingFeedback.push(feedback);
    localStorage.setItem('focusFeedback', JSON.stringify(existingFeedback));
    
    console.log('Feedback submitted:', feedback);
    
    // Show thank you message briefly
    const feedbackForm = document.querySelector('.feedback-form');
    feedbackForm.innerHTML = '<p style="text-align: center; color: var(--accent); margin: 20px 0;">Thank you for your feedback!</p>';
    
    // Show new session button after short delay
    setTimeout(() => {
        feedbackForm.style.display = 'none';
        newSessionBtn.classList.remove('hidden');
    }, 2000);
}

function skipFeedback() {
    // Hide feedback form and show new session button
    document.querySelector('.feedback-form').style.display = 'none';
    newSessionBtn.classList.remove('hidden');
}

// Product feedback functions
function openProductFeedbackModal() {
    productFeedbackModal.classList.remove('hidden');
    // Reset form
    selectedProductRating = 0;
    productFeedbackText.value = '';
    productStars.forEach(star => {
        star.classList.remove('active');
        star.textContent = '☆';
    });
}

function closeProductFeedbackModal() {
    productFeedbackModal.classList.add('hidden');
}

function setProductRating(rating) {
    selectedProductRating = rating;
    productStars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
            star.textContent = '★';
        } else {
            star.classList.remove('active');
            star.textContent = '☆';
        }
    });
}

function submitProductFeedbackData() {
    const productFeedback = {
        type: 'product',
        rating: selectedProductRating,
        comment: productFeedbackText.value.trim(),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    };
    
    // Store feedback locally (in browser storage)
    const existingFeedback = JSON.parse(localStorage.getItem('productFeedback') || '[]');
    existingFeedback.push(productFeedback);
    localStorage.setItem('productFeedback', JSON.stringify(existingFeedback));
    
    console.log('Product feedback submitted:', productFeedback);
    console.log('All feedback stored locally. To export: copy from browser dev tools -> Application -> Local Storage');
    
    // Show thank you message with info
    const modalBody = document.querySelector('.modal-body');
    modalBody.innerHTML = `
        <div style="text-align: center;">
            <p style="color: var(--accent); font-size: 1.2rem; margin: 20px 0;">Thank you for your feedback! 🙏</p>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 10px 0;">
                Your feedback is stored locally in your browser.<br>
                Check the browser console for details.
            </p>
            <button id="exportFeedback" style="
                background: rgba(255, 255, 255, 0.1); 
                border: 1px solid rgba(255, 255, 255, 0.2); 
                color: var(--text-primary); 
                padding: 8px 16px; 
                border-radius: 6px; 
                cursor: pointer; 
                margin-top: 10px;
            ">View Stored Feedback</button>
        </div>
    `;
    
    // Add export functionality
    document.getElementById('exportFeedback').addEventListener('click', () => {
        const allFeedback = {
            productFeedback: JSON.parse(localStorage.getItem('productFeedback') || '[]'),
            sessionFeedback: JSON.parse(localStorage.getItem('focusFeedback') || '[]')
        };
        console.log('All stored feedback:', allFeedback);
        alert('Feedback data logged to console. Open Developer Tools (F12) -> Console to view.');
    });
    
    // Hide submit button
    document.querySelector('.modal-footer').style.display = 'none';
    
    // Close modal after delay
    setTimeout(() => {
        closeProductFeedbackModal();
        // Restore original content for next time
        modalBody.innerHTML = `
            <p>Help us improve Focus! Your feedback matters.</p>
            <div class="product-rating-stars">
                <button class="product-star" data-rating="1">☆</button>
                <button class="product-star" data-rating="2">☆</button>
                <button class="product-star" data-rating="3">☆</button>
                <button class="product-star" data-rating="4">☆</button>
                <button class="product-star" data-rating="5">☆</button>
            </div>
            <textarea id="productFeedbackText" class="product-feedback-textarea" placeholder="What do you think about Focus? Any suggestions or improvements?" rows="4"></textarea>
        `;
        document.querySelector('.modal-footer').style.display = 'block';
    }, 4000);
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
        webcamToggle.textContent = '●';
        webcamToggle.title = 'Hide webcam';
    } else {
        webcamEl.classList.remove('visible');
        webcamEl.classList.add('hidden');
        webcamToggle.textContent = '○';
        webcamToggle.title = 'Show webcam';
    }
});

// Feedback form listeners
feedbackStars.forEach(star => {
    star.addEventListener('click', () => {
        const rating = parseInt(star.dataset.rating);
        setRating(rating);
    });
});

skipFeedbackBtn.addEventListener('click', skipFeedback);
submitFeedbackBtn.addEventListener('click', submitFeedback);

// Product feedback listeners
// feedbackBtn.addEventListener('click', openProductFeedbackModal);
closeFeedbackModal.addEventListener('click', closeProductFeedbackModal);
submitProductFeedback.addEventListener('click', submitProductFeedbackData);

productStars.forEach(star => {
    star.addEventListener('click', () => {
        const rating = parseInt(star.dataset.rating);
        setProductRating(rating);
    });
});

// Close modal when clicking outside
productFeedbackModal.addEventListener('click', (e) => {
    if (e.target === productFeedbackModal) {
        closeProductFeedbackModal();
    }
});

// Music controls
musicToggle.addEventListener('click', toggleMusic);
musicVolume.addEventListener('input', updateMusicVolume);

// Initialize music volume
updateMusicVolume();

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