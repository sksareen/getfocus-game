// BRUTALIST FOCUS TRACKER JAVASCRIPT

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
let sessionStats = {
    sessionsCompleted: 0,
    totalFocusTime: 0,
    avgFocusScore: 0,
    bestStreak: 0
};
let currentVolume = 0.3;
let isTabActive = true;
let sessionPausedDueToTab = false;

// Progressive difficulty system
let difficultySystem = {
    currentLevel: 1,
    xp: 0,
    xpToNextLevel: 100,
    challenges: {
        1: { name: 'Quick Focus', duration: 5, threshold: 0.6, challenges: [] },
        2: { name: 'Steady Attention', duration: 10, threshold: 0.65, challenges: ['dot-tracking'] },
        3: { name: 'Focused Mind', duration: 15, threshold: 0.7, challenges: ['dot-tracking', 'breathing-cue'] },
        4: { name: 'Deep Focus', duration: 25, threshold: 0.75, challenges: ['dot-tracking', 'breathing-cue', 'distraction-resistance'] },
        5: { name: 'Master Focus', duration: 45, threshold: 0.8, challenges: ['all'] }
    }
};

// Enhanced scoring system
let focusMetrics = {
    currentStreak: 0,
    maxStreak: 0,
    totalFocusTime: 0,
    distractionCount: 0,
    lastScoreUpdate: Date.now(),
    scoreHistory: [],
    consistencyBonus: 0,
    currentQuality: 0,
    qualityHistory: [],
    deepFocusTime: 0,
    challengeSuccess: 0,
    lastScore: 100,
    scoreChangeBuffer: [],
    trendDirection: 'stable',
    distractionEvents: [] // Track when distractions happen
};

let audioContextForFeedback = null;

// Focus alert tracking
let lastFocusAlertTime = 0;
let focusAlertThreshold = 60; // Alert when focus drops below 60%
let focusAlertCooldown = 3000; // Reduced cooldown for more responsive feedback
let lastFocusState = 'focused';
let hasPlayedInitialAlert = false; // Track if we've played the first alert

// Milestone tracking for rewards
let lastMilestoneTime = 0;
let focusMilestones = [300000, 600000, 900000, 1200000, 1500000]; // 5, 10, 15, 20, 25 minutes
let achievedMilestones = new Set();

// Session history tracking
let sessionHistory = [];
let scoreChart = null;

// DOM elements
const loadingEl = document.getElementById('loading');
const appEl = document.getElementById('app');
const webcamEl = document.getElementById('webcam');
const canvasEl = document.getElementById('focusCanvas');
const ctx = canvasEl ? canvasEl.getContext('2d') : null;
const actionBtn = document.getElementById('actionBtn');
const timeBtn = document.getElementById('timeBtn');
const timeSelectorEl = document.getElementById('timeSelector');
const timeDisplay = document.getElementById('timeDisplay');
const focusScoreEl = document.getElementById('focusScore');
const statusText = document.getElementById('statusText');
const completionEl = document.getElementById('completion');
const newSessionBtn = document.getElementById('newSessionBtn');
const backgroundMusic = document.getElementById('backgroundMusic');
const webcamToggle = document.getElementById('webcamToggle');
const resetBtn = document.getElementById('resetBtn');
const progressFill = document.getElementById('progressFill');
const volumeSlider = document.getElementById('volumeSlider');
const volumeDisplay = document.getElementById('volumeDisplay');
const volumeBtn = document.getElementById('volumeBtn');
const insightsBtn = document.getElementById('insightsBtn');
const insightsDropdown = document.getElementById('insightsDropdown');
const closeInsights = document.getElementById('closeInsights');
const themeToggle = document.getElementById('themeToggle');
const helpBtn = document.getElementById('helpBtn');
const helpDropdown = document.getElementById('helpDropdown');
const closeHelp = document.getElementById('closeHelp');

// New progressive difficulty elements
const levelNumberEl = document.getElementById('levelNumber');
const stateValueEl = document.getElementById('stateValue');
const focusChallengeEl = document.getElementById('focusChallenge');
const challengeDotEl = document.getElementById('challengeDot');
const challengeTextEl = document.getElementById('challengeText');
const qualityBarEl = document.getElementById('qualityBar');

// Stats dashboard elements
const statsToggleBtn = document.getElementById('statsToggle');
const statsContent = document.getElementById('statsContent');

// Focus challenge state
let activeChallenges = [];
let challengeInterval = null;
let currentChallenge = null;

// Time options
const timeOptions = document.querySelectorAll('.time-option');

// Stats elements
const sessionsCompletedEl = document.getElementById('sessionsCompleted');
const totalFocusTimeEl = document.getElementById('totalFocusTime');
const avgFocusScoreEl = document.getElementById('avgFocusScore');
const bestStreakEl = document.getElementById('bestStreak');

// Real-time score tracking elements
const scoreTrendEl = document.getElementById('scoreTrend');
const scoreChartEl = document.getElementById('scoreChart');

// Initialize the app
async function init() {
    console.log('Initializing Modern Focus Trainer...');

    // Initialize theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', initialTheme);

    // Load session stats and difficulty progress
    loadSessionStats();
    loadDifficultyProgress();
    updateStatsDisplay();
    updateDifficultyDisplay();
    
    // Initialize score history chart
    initializeScoreChart();
    loadSessionHistory();
    drawScoreChart();
    
    // Initialize audio context for feedback
    initAudioContext();
    
    // Set up event listeners
    setupEventListeners();
    
    // Try to load face detection model
    try {
        await loadFaceDetectionModel();
        console.log('Face detection model loaded successfully');
    } catch (error) {
        console.warn('Face detection not available:', error);
    }
    
    // Initialize webcam
    await setupWebcam();
    
    // Set initial session time based on current level
    const currentLevelData = difficultySystem.challenges[difficultySystem.currentLevel];
    setSessionTime(currentLevelData.duration);
    
    // Hide loading and show app
    if (loadingEl) loadingEl.style.display = 'none';
    if (appEl) appEl.classList.remove('hidden');
    
    console.log('Modern Focus Trainer initialized');
}

// Session History Management
function loadSessionHistory() {
    try {
        const saved = localStorage.getItem('focus-session-history');
        if (saved) {
            sessionHistory = JSON.parse(saved);
            // Keep only last 20 sessions
            if (sessionHistory.length > 20) {
                sessionHistory = sessionHistory.slice(-20);
                saveSessionHistory();
            }
        }
    } catch (error) {
        console.warn('Could not load session history:', error);
        sessionHistory = [];
    }
}

function saveSessionHistory() {
    try {
        localStorage.setItem('focus-session-history', JSON.stringify(sessionHistory));
    } catch (error) {
        console.warn('Could not save session history:', error);
    }
}

function addSessionToHistory(score, duration, date = new Date()) {
    const session = {
        score: Math.round(score),
        duration: duration,
        date: date.toISOString(),
        timestamp: date.getTime()
    };
    
    sessionHistory.push(session);
    
    // Keep only last 20 sessions
    if (sessionHistory.length > 20) {
        sessionHistory = sessionHistory.slice(-20);
    }
    
    saveSessionHistory();
    drawScoreChart();
}

// Score Chart Functions
function initializeScoreChart() {
    if (!scoreChartEl) return;
    
    const ctx = scoreChartEl.getContext('2d');
    if (!ctx) return;
    
    // Get device pixel ratio for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    
    // Get the size the canvas should be displayed
    const rect = scoreChartEl.getBoundingClientRect();
    const displayWidth = rect.width || 800;
    const displayHeight = 150;
    
    // Set the internal size to the display size * pixel ratio
    scoreChartEl.width = displayWidth * dpr;
    scoreChartEl.height = displayHeight * dpr;
    
    // Scale the drawing context to match device pixel ratio
    ctx.scale(dpr, dpr);
    
    // Set CSS size to maintain correct display size
    scoreChartEl.style.width = displayWidth + 'px';
    scoreChartEl.style.height = displayHeight + 'px';
    
    scoreChart = {
        canvas: scoreChartEl,
        ctx: ctx,
        width: displayWidth, // Use display width for drawing calculations
        height: displayHeight
    };
}

function drawScoreChart() {
    // Reinitialize chart to ensure proper resolution
    initializeScoreChart();
    
    if (!scoreChart || !scoreChart.ctx || sessionHistory.length === 0) {
        drawEmptyChart();
        return;
    }
    
    const ctx = scoreChart.ctx;
    const width = scoreChart.width;
    const height = scoreChart.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Chart settings
    const padding = 20;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    // Get data points
    const scores = sessionHistory.map(s => s.score);
    const maxScore = Math.max(...scores, 100);
    const minScore = Math.max(Math.min(...scores, 0), 0);
    const scoreRange = maxScore - minScore || 1;
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(139, 148, 158, 0.2)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight * i / 4);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Vertical grid lines
    const stepX = chartWidth / Math.max(sessionHistory.length - 1, 1);
    for (let i = 0; i < sessionHistory.length; i++) {
        const x = padding + (stepX * i);
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
    }
    
    // Draw trend line (moving average)
    if (sessionHistory.length > 2) {
        ctx.strokeStyle = '#3fb950';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < sessionHistory.length; i++) {
            // Calculate moving average (3-point)
            const start = Math.max(0, i - 1);
            const end = Math.min(sessionHistory.length, i + 2);
            const subset = scores.slice(start, end);
            const avgScore = subset.reduce((a, b) => a + b, 0) / subset.length;
            
            const x = padding + (stepX * i);
            const y = padding + chartHeight - ((avgScore - minScore) / scoreRange * chartHeight);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    
    // Draw actual scores line
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    for (let i = 0; i < sessionHistory.length; i++) {
        const score = scores[i];
        const x = padding + (stepX * i);
        const y = padding + chartHeight - ((score - minScore) / scoreRange * chartHeight);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Draw data points
    ctx.fillStyle = '#58a6ff';
    for (let i = 0; i < sessionHistory.length; i++) {
        const score = scores[i];
        const x = padding + (stepX * i);
        const y = padding + chartHeight - ((score - minScore) / scoreRange * chartHeight);
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // Highlight most recent point
    if (sessionHistory.length > 0) {
        const lastScore = scores[scores.length - 1];
        const x = padding + (stepX * (sessionHistory.length - 1));
        const y = padding + chartHeight - ((lastScore - minScore) / scoreRange * chartHeight);
        
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.stroke();
    }
    
    // Draw score labels
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 4; i++) {
        const score = minScore + (scoreRange * (4 - i) / 4);
        const y = padding + (chartHeight * i / 4) + 3;
        ctx.fillText(Math.round(score), padding - 5, y);
    }
}

function drawEmptyChart() {
    if (!scoreChart || !scoreChart.ctx) return;
    
    const ctx = scoreChart.ctx;
    const width = scoreChart.width;
    const height = scoreChart.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw empty state
    ctx.fillStyle = '#6e7681';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Complete a session to see your score history', width / 2, height / 2);
}

// Progressive Difficulty System Functions
function loadDifficultyProgress() {
    try {
        const saved = localStorage.getItem('focus-difficulty-progress');
        if (saved) {
            const progress = JSON.parse(saved);
            difficultySystem.currentLevel = progress.currentLevel || 1;
            difficultySystem.xp = progress.xp || 0;
            difficultySystem.xpToNextLevel = progress.xpToNextLevel || 100;
        }
    } catch (error) {
        console.warn('Could not load difficulty progress:', error);
    }
}

function saveDifficultyProgress() {
    try {
        const progress = {
            currentLevel: difficultySystem.currentLevel,
            xp: difficultySystem.xp,
            xpToNextLevel: difficultySystem.xpToNextLevel
        };
        localStorage.setItem('focus-difficulty-progress', JSON.stringify(progress));
    } catch (error) {
        console.warn('Could not save difficulty progress:', error);
    }
}

function updateDifficultyDisplay() {
    if (levelNumberEl) {
        levelNumberEl.textContent = difficultySystem.currentLevel;
    }
    
    const currentLevelData = difficultySystem.challenges[difficultySystem.currentLevel];
    if (statusText && currentLevelData) {
        statusText.textContent = `${currentLevelData.name} - ${currentLevelData.duration} min session`;
    }
}

function awardXP(amount, reason) {
    difficultySystem.xp += amount;
    
    // Check for level up
    if (difficultySystem.xp >= difficultySystem.xpToNextLevel && difficultySystem.currentLevel < 5) {
        levelUp();
    }
    
    saveDifficultyProgress();
    updateDifficultyDisplay();
    
    console.log(`Awarded ${amount} XP for ${reason}. Total XP: ${difficultySystem.xp}`);
}

function levelUp() {
    difficultySystem.currentLevel++;
    difficultySystem.xp = 0;
    difficultySystem.xpToNextLevel = difficultySystem.currentLevel * 100;
    
    // Play level up sound
    playFeedbackSound('level-up');
    
    // Show level up notification
    showLevelUpNotification();
    
    // Update recommended session time
    const newLevelData = difficultySystem.challenges[difficultySystem.currentLevel];
    if (newLevelData) {
        setSessionTime(newLevelData.duration);
    }
    
    console.log(`Level up! Now level ${difficultySystem.currentLevel}`);
}

function showLevelUpNotification() {
    const currentLevelData = difficultySystem.challenges[difficultySystem.currentLevel];
    if (statusText && currentLevelData) {
        const originalText = statusText.textContent;
        statusText.textContent = `🎉 LEVEL UP! Welcome to ${currentLevelData.name}`;
        statusText.style.color = 'var(--accent-success)';
        
        setTimeout(() => {
            statusText.textContent = originalText;
            statusText.style.color = '';
        }, 3000);
    }
}

function startFocusChallenges() {
    const currentLevelData = difficultySystem.challenges[difficultySystem.currentLevel];
    if (!currentLevelData || !currentLevelData.challenges.length) return;
    
    activeChallenges = [...currentLevelData.challenges];
    
    // Start challenge rotation
    challengeInterval = setInterval(() => {
        if (isMonitoring && activeChallenges.length > 0) {
            const challengeType = activeChallenges[Math.floor(Math.random() * activeChallenges.length)];
            startChallenge(challengeType);
        }
    }, 30000); // New challenge every 30 seconds
}

function startChallenge(type) {
    if (!focusChallengeEl) return;
    
    currentChallenge = {
        type,
        startTime: Date.now(),
        duration: 10000, // 10 seconds
        success: false
    };
    
    switch (type) {
        case 'dot-tracking':
            challengeTextEl.textContent = 'Keep your eyes on the dot';
            challengeDotEl.style.display = 'block';
            break;
        case 'breathing-cue':
            challengeTextEl.textContent = 'Take 3 deep breaths';
            challengeDotEl.style.display = 'none';
            break;
        case 'distraction-resistance':
            challengeTextEl.textContent = 'Maintain focus despite distractions';
            challengeDotEl.style.display = 'none';
            // Could add subtle visual distractions here
            break;
    }
    
    focusChallengeEl.classList.add('active');
    
    // End challenge after duration
    setTimeout(() => {
        endChallenge();
    }, currentChallenge.duration);
}

function endChallenge() {
    if (!currentChallenge || !focusChallengeEl) return;
    
    focusChallengeEl.classList.remove('active');
    
    // Award XP based on performance during challenge
    if (currentChallenge.success) {
        awardXP(10, `completing ${currentChallenge.type} challenge`);
        focusMetrics.challengeSuccess++;
        playFeedbackSound('achievement');
    }
    
    currentChallenge = null;
}

function stopFocusChallenges() {
    if (challengeInterval) {
        clearInterval(challengeInterval);
        challengeInterval = null;
    }
    
    if (focusChallengeEl) {
        focusChallengeEl.classList.remove('active');
    }
    
    currentChallenge = null;
    activeChallenges = [];
}

// Load face detection model
async function loadFaceDetectionModel() {
    if (typeof blazeface !== 'undefined') {
        model = await blazeface.load();
        return model;
    } else {
        throw new Error('BlazeFace not loaded');
    }
}

// Setup webcam
async function setupWebcam() {
    if (!webcamEl) return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 400, 
                height: 300,
                facingMode: 'user'
            } 
        });
        webcamEl.srcObject = stream;
        webcamEl.onloadedmetadata = () => {
            webcamEl.play();
            if (canvasEl) {
                canvasEl.width = webcamEl.videoWidth;
                canvasEl.height = webcamEl.videoHeight;
            }
        };
        console.log('Webcam initialized');
    } catch (error) {
        console.error('Error accessing webcam:', error);
        if (statusText) {
            statusText.textContent = 'WEBCAM ACCESS DENIED';
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Action button
    if (actionBtn) {
        actionBtn.addEventListener('click', toggleSession);
    }
    
    // Time button
    if (timeBtn) {
        timeBtn.addEventListener('click', toggleTimeSelector);
    }
    
    // Time options
    timeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const minutes = parseInt(option.dataset.minutes);
            setSessionTime(minutes);
        });
    });
    
    // Webcam toggle
    if (webcamToggle) {
        webcamToggle.addEventListener('click', toggleWebcam);
    }
    
    // Reset button
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSession);
    }
    
    // New session button
    if (newSessionBtn) {
        newSessionBtn.addEventListener('click', startNewSession);
    }

    // Volume button
    if (volumeBtn) {
        volumeBtn.addEventListener('click', toggleVolume);
    }

    // Insights button
    if (insightsBtn) {
        insightsBtn.addEventListener('click', showInsights);
    }

    // Close insights
    if (closeInsights) {
        closeInsights.addEventListener('click', hideInsights);
    }

    // Close insights on background click
    if (insightsDropdown) {
        insightsDropdown.addEventListener('click', (e) => {
            if (e.target === insightsDropdown) {
                hideInsights();
            }
        });
    }

    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Help button
    if (helpBtn) {
        helpBtn.addEventListener('click', showHelp);
    }

    // Close help
    if (closeHelp) {
        closeHelp.addEventListener('click', hideHelp);
    }

    // Close help on background click
    if (helpDropdown) {
        helpDropdown.addEventListener('click', (e) => {
            if (e.target === helpDropdown) {
                hideHelp();
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Background music events
    if (backgroundMusic) {
        backgroundMusic.addEventListener('error', (e) => {
            console.warn('Audio error:', e);
        });
        // Set initial volume
        backgroundMusic.volume = currentVolume;
    }
    
    // Volume control
    if (volumeSlider) {
        volumeSlider.addEventListener('input', handleVolumeChange);
    }
    
    // Page visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Stats toggle button
    if (statsToggleBtn) {
        statsToggleBtn.addEventListener('click', toggleStatsPanel);
        
        // Load saved preference
        const statsCollapsed = localStorage.getItem('focus-stats-collapsed') === 'true';
        if (statsCollapsed) {
            collapseStatsPanel(false); // Don't animate on initial load
        }
    }
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch(e.key.toLowerCase()) {
        case ' ':
            e.preventDefault();
            toggleSession();
            break;
        case 'r':
            resetSession();
            break;
        case 'w':
            toggleWebcam();
            break;
        case 'm':
            toggleMusic();
            break;
        case 'v':
            toggleVolume();
            break;
        case 'l':
            toggleTheme();
            break;
        case 'i':
            if (insightsDropdown && insightsDropdown.hidden) {
                showInsights();
            } else {
                hideInsights();
            }
            break;
        case 'h':
            if (helpDropdown && helpDropdown.hidden) {
                showHelp();
            } else {
                hideHelp();
            }
            break;
        case 'escape':
            // Check if help modal is open first
            if (helpDropdown && !helpDropdown.hidden) {
                hideHelp();
            } else if (insightsDropdown && !insightsDropdown.hidden) {
                hideInsights();
            } else {
                window.location.replace('../index.html');
            }
            break;
    }
}

// Toggle session (start/pause/resume)
function toggleSession() {
    if (!isMonitoring) {
        startSession();
    } else {
        pauseSession();
    }
}

// Start focus session
function startSession() {
    isMonitoring = true;
    sessionStartTime = Date.now();
    lastFaceDetectedTime = Date.now();
    
    // Initialize audio context for feedback sounds
    if (!audioContextForFeedback) {
        try {
            audioContextForFeedback = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio context initialized');
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }
    
    // Reset alert tracking for new session
    lastFocusAlertTime = 0;
    lastFocusState = 'focused';
    hasPlayedInitialAlert = false;
    
    // Reset milestone tracking
    achievedMilestones.clear();
    
    // Reset focus metrics for new session
    resetFocusMetrics();
    
    // Show calibration overlay for first 5 seconds
    showCalibration();
    
    // Update UI
    updateActionButton();
    updateFocusState('FOCUSING');
    if (statusText) statusText.textContent = 'FOCUS SESSION ACTIVE';
    
    // Enter focus mode - collapse stats for minimal distractions
    enterFocusMode();
    
    // Start progressive challenges
    startFocusChallenges();
    
    // Start monitoring
    startFaceDetection();
    startTimer();
    
    // Play background music with user interaction context
    if (backgroundMusic) {
        // Reset the audio element to ensure it's ready
        backgroundMusic.load();
        backgroundMusic.volume = currentVolume;
        
        // Try to play with Promise handling
        const playPromise = backgroundMusic.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isMusicPlaying = true;
                console.log('Cicada sounds started successfully');
            }).catch(error => {
                console.error('Failed to play cicada sounds:', error);
                console.log('Browser may be blocking autoplay. Trying workaround...');
                
                // Create a user interaction event to enable audio
                backgroundMusic.muted = false;
                backgroundMusic.volume = currentVolume;
                
                // Try playing again after user has interacted
                setTimeout(() => {
                    backgroundMusic.play().then(() => {
                        isMusicPlaying = true;
                        console.log('Cicada sounds started after retry');
                    }).catch(err => {
                        console.error('Still cannot play audio:', err);
                        alert('Unable to play background sounds. Please check your browser audio permissions.');
                    });
                }, 500);
            });
        }
    } else {
        console.error('Background music element not found');
    }
    
    console.log(`Started ${sessionGoalMinutes} minute focus session at level ${difficultySystem.currentLevel}`);
}

// Focus state update function
function updateFocusState(state) {
    if (stateValueEl) {
        stateValueEl.textContent = state;
        
        // Update color based on state
        stateValueEl.style.color = state === 'FOCUSING' ? 'var(--accent-focus)' : 
                                  state === 'DEEP FOCUS' ? 'var(--accent-success)' :
                                  state === 'DISTRACTED' ? 'var(--accent-distracted)' : 
                                  'var(--text-secondary)';
    }
    
    // Update canvas border to provide visual feedback
    if (canvasEl) {
        // Remove existing classes
        canvasEl.classList.remove('focused', 'distracted');
        
        // Add appropriate class based on state
        if (state === 'DEEP FOCUS' || state === 'FOCUSING') {
            canvasEl.classList.add('focused');
        } else if (state === 'DISTRACTED') {
            canvasEl.classList.add('distracted');
        }
    }
}

// Pause session
function pauseSession() {
    isMonitoring = false;
    
    // Update UI
    updateActionButton();
    updateFocusState('PAUSED');
    if (statusText) statusText.textContent = 'SESSION PAUSED';
    
    // Hide timeline when paused
    const timeline = document.getElementById('distractionTimeline');
    if (timeline) timeline.classList.add('hidden');
    
    // Exit focus mode when pausing
    exitFocusMode();
    
    // Stop challenges and monitoring
    stopFocusChallenges();
    stopFaceDetection();
    stopTimer();
    
    // Pause background music
    pauseBackgroundMusic();
    
    console.log('Session paused');
}

// Reset session
function resetSession() {
    isMonitoring = false;
    sessionStartTime = null;
    focusScore = 100;
    resetFocusMetrics();
    
    // Update UI
    updateActionButton();
    updateFocusState('READY');
    updateTimeDisplay();
    updateFocusScore();
    updateProgress();
    updateQualityIndicator();
    if (statusText) statusText.textContent = 'READY FOR FOCUS TRAINING';
    
    // Stop everything
    stopFocusChallenges();
    stopFaceDetection();
    stopTimer();
    stopBackgroundMusic();
    
    console.log('Session reset');
}

// Set session time
function setSessionTime(minutes) {
    sessionGoalMinutes = minutes;
    if (timeBtn) timeBtn.textContent = `${minutes} MIN`;
    updateTimeDisplay();
    hideTimeSelector();
    if (statusText) statusText.textContent = `${minutes} MINUTE SESSION READY`;
    console.log(`Session time set to ${minutes} minutes`);
}

// Toggle time selector
function toggleTimeSelector() {
    if (timeSelectorEl) {
        timeSelectorEl.classList.toggle('hidden');
    }
}

// Hide time selector
function hideTimeSelector() {
    if (timeSelectorEl) {
        timeSelectorEl.classList.add('hidden');
    }
}

// Update action button
function updateActionButton() {
    if (!actionBtn) return;
    
    const btnText = actionBtn.querySelector('.btn-text');
    if (!btnText) return;
    
    if (!isMonitoring && !sessionStartTime) {
        actionBtn.setAttribute('data-state', 'ready');
        btnText.textContent = 'BEGIN FOCUS';
    } else if (isMonitoring) {
        actionBtn.setAttribute('data-state', 'active');
        btnText.textContent = 'PAUSE';
    } else {
        actionBtn.setAttribute('data-state', 'paused');
        btnText.textContent = 'RESUME';
    }
}

// Start timer
function startTimer() {
    checkInInterval = setInterval(() => {
        updateTimeDisplay();
        updateProgress();
        
        // Check if session is complete
        if (sessionStartTime) {
            const elapsed = Date.now() - sessionStartTime;
            const sessionGoalMs = sessionGoalMinutes * 60 * 1000;
            
            // Check for milestone rewards every 5 minutes
            checkMilestoneRewards(elapsed);
            
            if (elapsed >= sessionGoalMs) {
                completeSession();
            }
        }
    }, 1000);
}

// Check and play milestone rewards
function checkMilestoneRewards(elapsedMs) {
    for (let milestone of focusMilestones) {
        if (elapsedMs >= milestone && !achievedMilestones.has(milestone)) {
            achievedMilestones.add(milestone);
            
            // Play milestone sound
            playFeedbackSound('milestone');
            
            // Show visual feedback
            showMilestoneAnimation(milestone / 60000); // Convert to minutes
            
            // Award XP bonus
            const minutes = milestone / 60000;
            awardXP(10 * (minutes / 5), `${minutes} minute milestone`);
            
            console.log(`🎉 Milestone achieved: ${minutes} minutes of focus!`);
        }
    }
}

// Show milestone animation
function showMilestoneAnimation(minutes) {
    // Create a temporary celebration overlay
    const celebration = document.createElement('div');
    celebration.className = 'milestone-celebration';
    celebration.innerHTML = `
        <div class="milestone-text">🎯 ${minutes} MINUTES!</div>
        <div class="milestone-subtext">Keep going strong!</div>
    `;
    
    document.body.appendChild(celebration);
    
    // Remove after animation
    setTimeout(() => {
        celebration.remove();
    }, 3000);
}

// Stop timer
function stopTimer() {
    if (checkInInterval) {
        clearInterval(checkInInterval);
        checkInInterval = null;
    }
}

// Update time display
function updateTimeDisplay() {
    if (!timeDisplay) return;
    
    if (!sessionStartTime) {
        timeDisplay.textContent = `${sessionGoalMinutes}:00`;
        return;
    }
    
    const elapsed = Date.now() - sessionStartTime;
    const sessionGoalMs = sessionGoalMinutes * 60 * 1000;
    const remaining = Math.max(0, sessionGoalMs - elapsed);
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Update progress bar
function updateProgress() {
    if (!progressFill || !sessionStartTime) return;
    
    const elapsed = Date.now() - sessionStartTime;
    const sessionGoalMs = sessionGoalMinutes * 60 * 1000;
    const progress = Math.min(100, (elapsed / sessionGoalMs) * 100);
    
    progressFill.style.width = `${progress}%`;
}

// Check for focus loss and trigger alerts
function checkFocusLoss() {
    const now = Date.now();
    const currentScore = Math.round(focusScore);
    
    // Debug log
    if (currentScore < 70) {
        console.log('Focus score:', currentScore, 'Threshold:', focusAlertThreshold, 'State:', lastFocusState);
    }
    
    // Check if focus has dropped below threshold
    if (currentScore < focusAlertThreshold && lastFocusState === 'focused') {
        // Focus just dropped - trigger alert
        console.log('Triggering focus alert!');
        // Play immediately on first alert, or after cooldown
        if (!hasPlayedInitialAlert || now - lastFocusAlertTime > focusAlertCooldown) {
            playFeedbackSound('focus-alert');
            lastFocusAlertTime = now;
            hasPlayedInitialAlert = true;
            
            // Add visual pulse to the focus container
            if (canvasEl) {
                canvasEl.style.borderColor = '#ff6b6b';
                setTimeout(() => {
                    canvasEl.style.borderColor = '';
                }, 500);
            }
        }
        lastFocusState = 'distracted';
    } else if (currentScore >= focusAlertThreshold && lastFocusState === 'distracted') {
        // Focus recovered
        lastFocusState = 'focused';
    }
}

// Update focus score
function updateFocusScore() {
    const scoreValueEl = document.getElementById('scoreValue');
    if (scoreValueEl) {
        const currentScore = Math.round(focusScore);
        const previousScore = focusMetrics.lastScore;
        
        // Update display with percentage
        scoreValueEl.textContent = `${currentScore}%`;
        
        // Check for focus loss and alert if needed
        if (isMonitoring) {
            checkFocusLoss();
        }
        
        // Update score percentage for visual indicator
        const percentage = focusScore / 100;
        focusScoreEl.style.setProperty('--score-percentage', percentage);
        
        // Track score changes for trend analysis
        if (currentScore !== previousScore) {
            updateScoreTrend(currentScore, previousScore);
            focusMetrics.lastScore = currentScore;
        }
    }
}

// Real-time score trend tracking
function updateScoreTrend(currentScore, previousScore) {
    const scoreDiff = currentScore - previousScore;
    
    // Add to change buffer (keep last 10 changes)
    focusMetrics.scoreChangeBuffer.push(scoreDiff);
    if (focusMetrics.scoreChangeBuffer.length > 10) {
        focusMetrics.scoreChangeBuffer.shift();
    }
    
    // Calculate trend
    const recentChanges = focusMetrics.scoreChangeBuffer.slice(-5);
    const averageChange = recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length;
    
    let newTrend = 'stable';
    if (averageChange > 0.5) {
        newTrend = 'improving';
    } else if (averageChange < -0.5) {
        newTrend = 'declining';
    }
    
    // Update trend display and animations
    if (newTrend !== focusMetrics.trendDirection) {
        focusMetrics.trendDirection = newTrend;
        showScoreTrend(newTrend, scoreDiff);
        animateScoreChange(newTrend);
    }
}

// Show score trend indicator
function showScoreTrend(direction, scoreDiff) {
    if (!scoreTrendEl) return;
    
    let trendText = '';
    let trendClass = '';
    
    if (direction === 'improving') {
        trendText = `+${Math.abs(scoreDiff).toFixed(1)}`;
        trendClass = 'improving';
    } else if (direction === 'declining') {
        trendText = `-${Math.abs(scoreDiff).toFixed(1)}`;
        trendClass = 'declining';
    }
    
    if (trendText) {
        scoreTrendEl.textContent = trendText;
        scoreTrendEl.className = `score-trend ${trendClass} show`;
        
        // Hide after 2 seconds
        setTimeout(() => {
            scoreTrendEl.classList.remove('show');
        }, 2000);
    }
}

// Animate score changes
function animateScoreChange(direction) {
    if (!focusScoreEl) return;
    
    // Remove existing animation classes
    focusScoreEl.classList.remove('improving', 'declining');
    
    // Add new animation class
    if (direction === 'improving' || direction === 'declining') {
        focusScoreEl.classList.add(direction);
        
        // Remove class after animation completes
        setTimeout(() => {
            focusScoreEl.classList.remove(direction);
        }, 600);
    }
}

// Update focus quality indicator
function updateQualityIndicator() {
    if (qualityBarEl) {
        const percentage = Math.max(0, Math.min(100, focusMetrics.currentQuality));
        qualityBarEl.style.setProperty('--quality-percentage', `${percentage}%`);
    }
}

// Start face detection
function startFaceDetection() {
    if (!model || !webcamEl || !canvasEl || !ctx) return;
    
    const detectFaces = async () => {
        if (!isMonitoring) return;
        
        try {
            const predictions = await model.estimateFaces(webcamEl, false);
            
            // Clear canvas
            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
            
            if (predictions.length > 0) {
                // Face detected
                lastFaceDetectedTime = Date.now();
                
                // Draw face detection box with better stability
                predictions.forEach(prediction => {
                    const [x, y, width, height] = prediction.topLeft.concat(prediction.bottomRight);
                    
                    // Adjust box to better center on face (shift up by 15% of height)
                    const boxHeight = height - y;
                    const boxWidth = width - x;
                    const adjustedY = y - (boxHeight * 0.15); // Shift up to center on face instead of chin
                    const adjustedHeight = height - (boxHeight * 0.1); // Slightly reduce height
                    
                    // Expand box horizontally for better face coverage
                    const adjustedX = x - (boxWidth * 0.1);
                    const adjustedWidth = width + (boxWidth * 0.1);
                    
                    // Use prediction confidence for better visual feedback
                    const confidence = prediction.probability ? prediction.probability[0] : 1;
                    
                    // Draw center point to show what app considers "center of face"
                    const centerX = adjustedX + (adjustedWidth - adjustedX) / 2;
                    const centerY = adjustedY + (adjustedHeight - adjustedY) / 2;
                    
                    if (confidence > 0.7) {
                        // High confidence - green box
                        ctx.strokeStyle = '#00ff00';
                        ctx.lineWidth = 4;
                    } else {
                        // Lower confidence - yellow box
                        ctx.strokeStyle = '#ffff00';
                        ctx.lineWidth = 3;
                    }
                    
                    ctx.strokeRect(adjustedX, adjustedY, adjustedWidth - adjustedX, adjustedHeight - adjustedY);
                    
                    // Draw center crosshair for calibration
                    ctx.strokeStyle = '#58a6ff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(centerX - 10, centerY);
                    ctx.lineTo(centerX + 10, centerY);
                    ctx.moveTo(centerX, centerY - 10);
                    ctx.lineTo(centerX, centerY + 10);
                    ctx.stroke();
                    
                    // Add confidence text
                    ctx.fillStyle = confidence > 0.7 ? '#00ff00' : '#ffff00';
                    ctx.font = '14px monospace';
                    ctx.fillText(`Focus: ${Math.round(confidence * 100)}%`, adjustedX, adjustedY - 5);
                });
                
                // Enhanced scoring system with difficulty adaptation
                const avgConfidence = predictions.reduce((sum, p) => sum + (p.probability ? p.probability[0] : 1), 0) / predictions.length;
                const timeSinceLastUpdate = Date.now() - focusMetrics.lastScoreUpdate;
                
                // Get current level threshold
                const currentLevelData = difficultySystem.challenges[difficultySystem.currentLevel];
                const requiredThreshold = currentLevelData ? currentLevelData.threshold : 0.7;
                
                if (timeSinceLastUpdate > 1000) { // Update every second
                    updateFocusScoreEnhanced(avgConfidence, true, requiredThreshold);
                    focusMetrics.lastScoreUpdate = Date.now();
                    
                    // Update focus state based on performance
                    if (avgConfidence >= requiredThreshold + 0.1) {
                        updateFocusState('DEEP FOCUS');
                        focusMetrics.deepFocusTime++;
                    } else if (avgConfidence >= requiredThreshold) {
                        updateFocusState('FOCUSING');
                    }
                    
                    // Check challenge success
                    if (currentChallenge && avgConfidence >= requiredThreshold) {
                        currentChallenge.success = true;
                    }
                }
                
            } else {
                // No face detected - enhanced tracking
                const timeSinceLastFace = Date.now() - lastFaceDetectedTime;
                const timeSinceLastUpdate = Date.now() - focusMetrics.lastScoreUpdate;
                
                // Get current level threshold
                const currentLevelData = difficultySystem.challenges[difficultySystem.currentLevel];
                const requiredThreshold = currentLevelData ? currentLevelData.threshold : 0.7;
                
                if (timeSinceLastUpdate > 1000) { // Update every second
                    updateFocusScoreEnhanced(0, false, requiredThreshold);
                    focusMetrics.lastScoreUpdate = Date.now();
                    
                    // Track distraction if looked away for >2 seconds
                    if (timeSinceLastFace > 2000 && !focusMetrics.lastDistractionTime) {
                        trackDistraction();
                        focusMetrics.lastDistractionTime = now;
                    } else if (timeSinceLastFace < 1000 && focusMetrics.lastDistractionTime) {
                        // Face is back, reset distraction timer
                        focusMetrics.lastDistractionTime = null;
                    }
                    
                    // Update focus state for distraction
                    if (timeSinceLastFace > 3000) {
                        updateFocusState('DISTRACTED');
                    }
                }
                
                if (timeSinceLastFace > 10000) { // 10 seconds = distraction
                    focusMetrics.distractionCount++;
                }
            }
            
            updateFocusScore();
            updateFocusMetrics();
            
            // Continue detection
            animationFrame = requestAnimationFrame(detectFaces);
        } catch (error) {
            console.warn('Face detection error:', error);
            // Continue anyway
            animationFrame = requestAnimationFrame(detectFaces);
        }
    };
    
    detectFaces();
}

// Stop face detection
function stopFaceDetection() {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    // Clear canvas
    if (ctx && canvasEl) {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    }
}

// Complete session
function completeSession() {
    isMonitoring = false;
    stopFocusChallenges();
    stopFaceDetection();
    stopTimer();
    stopBackgroundMusic();
    
    // Exit focus mode
    exitFocusMode();
    
    // Add session to history
    const sessionDuration = sessionGoalMinutes;
    addSessionToHistory(focusScore, sessionDuration);
    
    // Calculate XP reward based on performance
    let xpReward = 20; // Base completion XP
    if (focusScore >= 90) xpReward += 30; // High score bonus
    if (focusScore >= 80) xpReward += 20; // Good score bonus
    if (focusMetrics.deepFocusTime > sessionGoalMinutes * 30) xpReward += 25; // Deep focus bonus
    if (focusMetrics.challengeSuccess > 0) xpReward += focusMetrics.challengeSuccess * 5; // Challenge bonus
    
    // Award XP
    awardXP(xpReward, 'completing focus session');
    
    // Update stats
    sessionStats.sessionsCompleted++;
    sessionStats.totalFocusTime += sessionGoalMinutes;
    sessionStats.avgFocusScore = ((sessionStats.avgFocusScore * (sessionStats.sessionsCompleted - 1)) + focusScore) / sessionStats.sessionsCompleted;
    
    // Save stats
    saveSessionStats();
    updateStatsDisplay();
    
    // Show completion
    showCompletion();
    
    console.log('Session completed!', { 
        focusScore, 
        sessionGoalMinutes, 
        level: difficultySystem.currentLevel,
        xpAwarded: xpReward 
    });
}

// Show completion screen
function showCompletion() {
    if (!completionEl) return;
    
    // Update completion data
    const completionScore = completionEl.querySelector('#completionScore');
    const completionTime = completionEl.querySelector('#completionTime');
    const completionStreak = completionEl.querySelector('#completionStreak');
    const completionDistractions = completionEl.querySelector('#completionDistractions');
    const completionConsistency = completionEl.querySelector('#completionConsistency');
    
    if (completionScore) {
        completionScore.textContent = Math.round(focusScore);
    }
    
    if (completionTime) {
        completionTime.textContent = `${sessionGoalMinutes} MINUTES OF DEEP FOCUS`;
    }
    
    if (completionStreak) {
        completionStreak.textContent = focusMetrics.maxStreak;
    }
    
    if (completionDistractions) {
        completionDistractions.textContent = focusMetrics.distractionCount;
    }
    
    if (completionConsistency) {
        const consistency = Math.round(focusMetrics.consistencyBonus);
        completionConsistency.textContent = `${consistency}%`;
    }
    
    // Play large completion chime
    playFeedbackSound('session-complete');
    
    // Show completion screen
    completionEl.classList.remove('hidden');
}

// Start new session
function startNewSession() {
    if (completionEl) {
        completionEl.classList.add('hidden');
    }
    resetSession();
}

// Toggle webcam visibility
function toggleWebcam() {
    if (!webcamEl) return;

    if (webcamEl.style.display === 'none') {
        webcamEl.style.display = 'block';
        if (webcamToggle) webcamToggle.textContent = 'HIDE WEBCAM';
    } else {
        webcamEl.style.display = 'none';
        if (webcamToggle) webcamToggle.textContent = 'SHOW WEBCAM';
    }
}

// Toggle volume
function toggleVolume() {
    if (!backgroundMusic) return;

    if (isMusicPlaying) {
        pauseBackgroundMusic();
    } else {
        playBackgroundMusic();
    }
}

// Show insights dropdown
function showInsights() {
    if (insightsDropdown) {
        insightsDropdown.hidden = false;
        updateInsightsData();
    }
}

// Hide insights dropdown
function hideInsights() {
    if (insightsDropdown) {
        insightsDropdown.hidden = true;
    }
}

// Show help dropdown
function showHelp() {
    if (helpDropdown) {
        helpDropdown.hidden = false;
    }
}

// Hide help dropdown
function hideHelp() {
    if (helpDropdown) {
        helpDropdown.hidden = true;
    }
}

// Update insights data
function updateInsightsData() {
    // Update session statistics
    const sessionsCompletedEl = document.getElementById('sessionsCompleted');
    const totalFocusTimeEl = document.getElementById('totalFocusTime');
    const avgFocusScoreEl = document.getElementById('avgFocusScore');
    const bestStreakEl = document.getElementById('bestStreak');

    if (sessionsCompletedEl) sessionsCompletedEl.textContent = sessionHistory.length;
    if (totalFocusTimeEl) totalFocusTimeEl.textContent = formatTotalTime();
    if (avgFocusScoreEl) avgFocusScoreEl.textContent = calculateAverageScore();
    if (bestStreakEl) bestStreakEl.textContent = bestStreak;

    // Update timeline if available
    updateDistractionTimeline();
}

// Format total focus time
function formatTotalTime() {
    const totalMinutes = sessionHistory.reduce((total, session) => {
        return total + (session.duration || 0);
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }
    return `${minutes}m`;
}

// Calculate average focus score
function calculateAverageScore() {
    if (sessionHistory.length === 0) return '0';

    const totalScore = sessionHistory.reduce((total, session) => {
        return total + (session.averageScore || 0);
    }, 0);

    return Math.round(totalScore / sessionHistory.length);
}

// Update distraction timeline
function updateDistractionTimeline() {
    const timelineBar = document.getElementById('timelineBar');
    if (!timelineBar || !currentSessionDistractions) return;

    // This would be implemented based on current session distraction data
    // For now, just clear any existing content
    timelineBar.innerHTML = '';
}

// Toggle theme (light/dark)
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update status text briefly
    if (statusText) {
        statusText.textContent = `${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated`;
        setTimeout(() => {
            if (!isMonitoring) {
                statusText.textContent = 'Ready to focus';
            }
        }, 2000);
    }
}

// Background music controls
function playBackgroundMusic() {
    if (backgroundMusic && !isMusicPlaying && isTabActive) {
        backgroundMusic.volume = currentVolume;
        backgroundMusic.play().then(() => {
            isMusicPlaying = true;
            console.log('Background music started');
        }).catch(error => {
            console.warn('Could not play background music:', error);
        });
    }
}

function pauseBackgroundMusic() {
    if (backgroundMusic && isMusicPlaying) {
        backgroundMusic.pause();
        isMusicPlaying = false;
        console.log('Background music paused');
    }
}

function stopBackgroundMusic() {
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        isMusicPlaying = false;
        console.log('Background music stopped');
    }
}

function toggleMusic() {
    if (isMusicPlaying) {
        pauseBackgroundMusic();
    } else {
        playBackgroundMusic();
    }
}

// Volume control
function handleVolumeChange() {
    if (volumeSlider && backgroundMusic) {
        currentVolume = parseInt(volumeSlider.value) / 100;
        backgroundMusic.volume = currentVolume;
        if (volumeDisplay) {
            volumeDisplay.textContent = `${volumeSlider.value}%`;
        }
        console.log(`Volume set to ${volumeSlider.value}%`);
    }
}

// Toggle stats panel
function toggleStatsPanel() {
    const isExpanded = statsToggleBtn.getAttribute('aria-expanded') === 'true';
    
    if (isExpanded) {
        collapseStatsPanel(true);
    } else {
        expandStatsPanel(true);
    }
}

// Collapse stats panel
function collapseStatsPanel(animate = true) {
    if (!statsContent || !statsToggleBtn) return;
    
    statsToggleBtn.setAttribute('aria-expanded', 'false');
    statsContent.classList.add('collapsed');
    
    // Save preference
    localStorage.setItem('focus-stats-collapsed', 'true');
    
    // Update button text
    const toggleText = statsToggleBtn.querySelector('.toggle-text');
    if (toggleText) {
        toggleText.textContent = 'SHOW STATISTICS';
    }
}

// Expand stats panel
function expandStatsPanel(animate = true) {
    if (!statsContent || !statsToggleBtn) return;
    
    statsToggleBtn.setAttribute('aria-expanded', 'true');
    statsContent.classList.remove('collapsed');
    
    // Save preference
    localStorage.setItem('focus-stats-collapsed', 'false');
    
    // Update button text
    const toggleText = statsToggleBtn.querySelector('.toggle-text');
    if (toggleText) {
        toggleText.textContent = 'HIDE STATISTICS';
    }
}

// Enter focus mode - minimize distractions
function enterFocusMode() {
    // Collapse stats panel
    collapseStatsPanel(true);
    
    // Add focus mode class to body
    document.body.classList.add('focus-mode');
    
    // Hide secondary controls
    const secondaryControls = document.querySelector('.secondary-controls');
    if (secondaryControls) {
        secondaryControls.style.opacity = '0.3';
    }
    
    console.log('Entered focus mode - minimal distractions');
}

// Exit focus mode
function exitFocusMode() {
    // Remove focus mode class
    document.body.classList.remove('focus-mode');
    
    // Restore controls visibility
    const secondaryControls = document.querySelector('.secondary-controls');
    if (secondaryControls) {
        secondaryControls.style.opacity = '1';
    }
    
    // Optionally expand stats if that was the user's preference
    const wasExpanded = localStorage.getItem('focus-stats-collapsed') !== 'true';
    if (wasExpanded) {
        expandStatsPanel(true);
    }
    
    console.log('Exited focus mode');
}

// Handle page visibility changes
function handleVisibilityChange() {
    isTabActive = !document.hidden;
    
    if (document.hidden && isMonitoring) {
        // Page is hidden, but don't pause the session
        // Just note that it was paused due to tab
        sessionPausedDueToTab = true;
        console.log('Tab became inactive, continuing session in background');
    } else if (!document.hidden && sessionPausedDueToTab && isMonitoring) {
        // Page is visible again, resume music if it was playing
        sessionPausedDueToTab = false;
        if (isMusicPlaying) {
            playBackgroundMusic();
        }
        console.log('Tab became active, resuming music');
    }
}

// Session stats management
function loadSessionStats() {
    try {
        const saved = localStorage.getItem('brutalist-focus-stats');
        if (saved) {
            sessionStats = { ...sessionStats, ...JSON.parse(saved) };
        }
    } catch (error) {
        console.warn('Could not load session stats:', error);
    }
}

function saveSessionStats() {
    try {
        localStorage.setItem('brutalist-focus-stats', JSON.stringify(sessionStats));
    } catch (error) {
        console.warn('Could not save session stats:', error);
    }
}

function updateStatsDisplay() {
    if (sessionsCompletedEl) {
        sessionsCompletedEl.textContent = sessionStats.sessionsCompleted;
    }
    if (totalFocusTimeEl) {
        const hours = Math.floor(sessionStats.totalFocusTime / 60);
        const minutes = sessionStats.totalFocusTime % 60;
        totalFocusTimeEl.textContent = `${hours}:${minutes.toString().padStart(2, '0')}`;
    }
    if (avgFocusScoreEl) {
        avgFocusScoreEl.textContent = Math.round(sessionStats.avgFocusScore);
    }
    if (bestStreakEl) {
        bestStreakEl.textContent = sessionStats.bestStreak;
    }
}

// Enhanced scoring functions
function resetFocusMetrics() {
    focusMetrics = {
        currentStreak: 0,
        maxStreak: 0,
        totalFocusTime: 0,
        distractionCount: 0,
        lastScoreUpdate: Date.now(),
        scoreHistory: [],
        consistencyBonus: 0,
        currentQuality: 0,
        qualityHistory: [],
        deepFocusTime: 0,
        challengeSuccess: 0,
        lastScore: 100,
        scoreChangeBuffer: [],
        trendDirection: 'stable',
        distractionEvents: [],
        lastDistractionTime: null
    };
}

// Track distraction event
function trackDistraction() {
    const now = Date.now();
    const sessionElapsed = now - sessionStartTime;
    const sessionProgress = sessionElapsed / (sessionGoalMinutes * 60 * 1000);
    
    focusMetrics.distractionCount++;
    focusMetrics.distractionEvents.push({
        time: now,
        sessionProgress: Math.min(sessionProgress, 1), // Cap at 100%
        duration: 0
    });
    
    updateDistractionTimeline();
    console.log(`Distraction #${focusMetrics.distractionCount} at ${Math.round(sessionProgress * 100)}% of session`);
}

// Update distraction timeline visualization
function updateDistractionTimeline() {
    const timeline = document.getElementById('distractionTimeline');
    const timelineBar = document.getElementById('timelineBar');
    
    if (!timeline || !timelineBar || !isMonitoring) return;
    
    // Show timeline during session
    timeline.classList.remove('hidden');
    
    // Clear existing markers
    timelineBar.innerHTML = '';
    
    // Add markers for each distraction
    focusMetrics.distractionEvents.forEach((event, index) => {
        const marker = document.createElement('div');
        marker.className = 'distraction-marker';
        marker.style.left = `${event.sessionProgress * 100}%`;
        marker.style.width = '3px';
        marker.title = `Distraction #${index + 1}`;
        timelineBar.appendChild(marker);
    });
}

function updateFocusScoreEnhanced(confidence, faceDetected, requiredThreshold = 0.7) {
    const now = Date.now();
    const timeSinceLastFace = now - lastFaceDetectedTime;
    
    // Update current quality metric
    focusMetrics.currentQuality = confidence * 100;
    updateQualityIndicator();
    
    if (faceDetected && confidence > requiredThreshold) {
        // High quality focus detected
        focusMetrics.currentStreak++;
        focusMetrics.maxStreak = Math.max(focusMetrics.maxStreak, focusMetrics.currentStreak);
        
        // Calculate score increase based on streak and consistency
        let scoreIncrease = confidence * 0.1;
        if (focusMetrics.currentStreak > 10) {
            scoreIncrease *= 1.5; // Bonus for long streaks
        }
        if (focusMetrics.currentStreak > 30) {
            scoreIncrease *= 2; // Even bigger bonus for very long streaks
        }
        
        focusScore = Math.min(100, focusScore + scoreIncrease);
        
        // Add to score history for consistency tracking
        focusMetrics.scoreHistory.push({ score: focusScore, time: now });
        if (focusMetrics.scoreHistory.length > 60) { // Keep last minute
            focusMetrics.scoreHistory.shift();
        }
        
        // Calculate consistency bonus
        updateConsistencyBonus();
        
        // Play achievement sounds for milestones
        if (focusMetrics.currentStreak === 10) {
            playFeedbackSound('achievement');
        } else if (focusMetrics.currentStreak === 30) {
            playFeedbackSound('achievement');
        } else if (focusMetrics.currentStreak === 60) {
            playFeedbackSound('achievement');
        }
        
    } else if (!faceDetected && timeSinceLastFace > 5000) {
        // Distraction detected
        focusMetrics.currentStreak = 0;
        focusMetrics.distractionCount++;
        
        // Gradual decrease based on distraction severity
        const distractionPenalty = Math.min(2, timeSinceLastFace / 10000); // Max 2 point penalty
        focusScore = Math.max(0, focusScore - distractionPenalty);
        
        // Play distraction sound
        playFeedbackSound('distraction');
    }
}

function updateConsistencyBonus() {
    if (focusMetrics.scoreHistory.length < 10) return;
    
    // Calculate score variance
    const scores = focusMetrics.scoreHistory.map(h => h.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    
    // Lower variance = higher consistency bonus
    focusMetrics.consistencyBonus = Math.max(0, 10 - variance / 10);
}

function updateFocusMetrics() {
    if (!sessionStartTime) return;
    
    // Update total focus time (in seconds)
    focusMetrics.totalFocusTime = Math.floor((Date.now() - sessionStartTime) / 1000);
}

// Audio feedback functions
function initAudioContext() {
    try {
        audioContextForFeedback = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
        console.warn('Web Audio API not supported:', error);
    }
}

function playFeedbackSound(type) {
    // Create audio element for WAV file playback
    const audio = new Audio();
    
    // Set volume based on current volume setting and sound type
    let volumeMultiplier = 1;
    
    switch(type) {
        case 'distraction':
        case 'focus-alert':
            // Use down-twinkle.wav for focus loss
            audio.src = 'down-twinkle.wav';
            volumeMultiplier = 0.6; // Clear but not jarring
            break;
            
        case 'achievement':
        case 'milestone':
            // Use up-skip.wav for positive feedback
            audio.src = 'up-skip.wav';
            volumeMultiplier = 0.7; // Celebratory
            break;
            
        case 'session-complete':
            // Play both sounds in sequence for completion
            playCompletionSequence();
            return;
            
        case 'level-up':
            // Use up-skip.wav with higher volume
            audio.src = 'up-skip.wav';
            volumeMultiplier = 0.8; // More prominent
            break;
            
        default:
            // Fallback to oscillator for unknown types
            playOscillatorSound(type);
            return;
    }
    
    // Set final volume
    audio.volume = currentVolume * volumeMultiplier;
    
    // Play the sound
    audio.play().catch(error => {
        console.warn(`Could not play ${type} sound:`, error);
        // Fallback to oscillator if WAV fails
        playOscillatorSound(type);
    });
}

// New function for completion sequence
function playCompletionSequence() {
    // Play up-skip first
    const audio1 = new Audio('up-skip.wav');
    audio1.volume = currentVolume * 0.8;
    
    audio1.play().then(() => {
        // After first sound, play second with delay
        setTimeout(() => {
            const audio2 = new Audio('up-skip.wav');
            audio2.volume = currentVolume * 0.6;
            audio2.playbackRate = 1.2; // Slightly higher pitch
            audio2.play();
        }, 300);
    }).catch(error => {
        console.warn('Could not play completion sequence:', error);
        playLargeCompletionChime(); // Fallback to oscillator
    });
}

// Fallback oscillator sounds (kept for compatibility)
function playOscillatorSound(type) {
    if (!audioContextForFeedback) return;
    
    const oscillator = audioContextForFeedback.createOscillator();
    const gainNode = audioContextForFeedback.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextForFeedback.destination);
    
    // Simple beep as fallback
    oscillator.frequency.setValueAtTime(440, audioContextForFeedback.currentTime);
    gainNode.gain.setValueAtTime(0.3 * currentVolume, audioContextForFeedback.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextForFeedback.currentTime + 0.2);
    oscillator.start(audioContextForFeedback.currentTime);
    oscillator.stop(audioContextForFeedback.currentTime + 0.2);
}

// Play large completion chime for session end
function playLargeCompletionChime() {
    if (!audioContextForFeedback) return;
    
    // Create a more prominent, longer chime sequence
    const chimeSequence = [
        { freq: 523.25, duration: 0.8, delay: 0 },      // C5 - Strong opening
        { freq: 659.25, duration: 0.6, delay: 0.2 },     // E5 - Harmonious second
        { freq: 783.99, duration: 0.8, delay: 0.4 },     // G5 - Rich third
        { freq: 1046.50, duration: 1.2, delay: 0.6 },    // C6 - Triumphant high note
        { freq: 1318.51, duration: 0.4, delay: 1.0 },    // E6 - Bright finish
    ];
    
    chimeSequence.forEach((note, index) => {
        setTimeout(() => {
            const oscillator = audioContextForFeedback.createOscillator();
            const gainNode = audioContextForFeedback.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContextForFeedback.destination);
            
            // Set frequency
            oscillator.frequency.setValueAtTime(note.freq, audioContextForFeedback.currentTime);
            
            // Create a bell-like envelope with strong attack and gentle decay
            gainNode.gain.setValueAtTime(0, audioContextForFeedback.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.15 * currentVolume, audioContextForFeedback.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextForFeedback.currentTime + note.duration);
            
            oscillator.start(audioContextForFeedback.currentTime);
            oscillator.stop(audioContextForFeedback.currentTime + note.duration);
        }, note.delay * 1000);
    });
    
    console.log('🔔 Large completion chime played!');
}

// Calibration functions
function showCalibration() {
    const overlay = document.getElementById('calibrationOverlay');
    const statusEl = document.getElementById('calibrationStatus');
    
    if (overlay) {
        overlay.classList.add('active');
        
        // Update status based on face detection
        let calibrationCheckInterval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastFace = now - lastFaceDetectedTime;
            
            if (timeSinceLastFace < 500) {
                statusEl.textContent = '✓ Face detected - Hold steady';
                statusEl.style.color = 'var(--accent-success)';
            } else {
                statusEl.textContent = '⚠ Move face into view';
                statusEl.style.color = 'var(--accent-warning)';
            }
        }, 100);
        
        // Hide after 5 seconds
        setTimeout(() => {
            overlay.classList.remove('active');
            clearInterval(calibrationCheckInterval);
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Remove the old visibility change handler - replaced with handleVisibilityChange()

// Handle beforeunload
window.addEventListener('beforeunload', () => {
    saveSessionStats();
});

console.log('Brutalist Focus Tracker script loaded');
