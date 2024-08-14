class EyeTrackingManager {
    constructor() {
        this.isCalibrated = false;
        this.isTracking = false;
        this.distractionThreshold = 0.15;
        this.lastDistractionTime = null;
        this.focusedTime = 0;
        this.points = 0;
        this.calibrationPoints = [
            { x: "10%", y: "10%" }, { x: "50%", y: "10%" }, { x: "90%", y: "10%" },
            { x: "10%", y: "50%" }, { x: "50%", y: "50%" }, { x: "90%", y: "50%" },
            { x: "10%", y: "90%" }, { x: "50%", y: "90%" }, { x: "90%", y: "90%" }
        ];
        this.consecutiveFocusedFrames = 0;
        this.consecutiveDistractionFrames = 0;
        this.lastPointTime = 0;

    }

    init() {
        webgazer.setGazeListener(() => {}).begin();
        webgazer.showVideoPreview(true).showPredictionPoints(true).applyKalmanFilter(true);
    }

    startCalibration(callback) {
        const calibrationArea = document.getElementById("calibrationArea");
        const calibrationDot = document.getElementById("calibrationDot");
        
        if (!calibrationArea || !calibrationDot) {
            console.warn("Calibration elements not found. Skipping calibration.");
            this.isCalibrated = true;
            if (callback) callback();
            return;
        }

        calibrationArea.style.display = "flex";
        let currentPoint = 0;

        const showNextPoint = () => {
            if (currentPoint < this.calibrationPoints.length) {
                calibrationDot.style.left = this.calibrationPoints[currentPoint].x;
                calibrationDot.style.top = this.calibrationPoints[currentPoint].y;
                currentPoint++;
                setTimeout(showNextPoint, 1500);
            } else {
                this.endCalibration(callback);
            }
        };

        showNextPoint();
    }

    endCalibration(callback) {
        document.getElementById("calibrationArea").style.display = "none";
        this.isCalibrated = true;
        webgazer.setGazeListener(this.gazeListener.bind(this));
        if (callback) callback();
    }

    startTracking() {
        if (!this.isTracking) {
            this.isTracking = true;
            webgazer.setGazeListener(this.gazeListener.bind(this));
        }
    }

    stopTracking() {
        this.isTracking = false;
        webgazer.clearGazeListener();
    }

    gazeListener(data, elapsedTime) {
        if (data == null || !this.isTracking) return;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        const isDistracted = 
            data.x < screenWidth * this.distractionThreshold ||
            data.x > screenWidth * (1 - this.distractionThreshold) ||
            data.y < screenHeight * this.distractionThreshold ||
            data.y > screenHeight * (1 - this.distractionThreshold);

        if (isDistracted) {
            this.consecutiveDistractionFrames++;
            this.consecutiveFocusedFrames = 0;
        } else {
            this.consecutiveFocusedFrames++;
            this.consecutiveDistractionFrames = 0;
        }

        if (this.consecutiveFocusedFrames >= 30) { // About 1 second of continuous focus
            this.updateFocusStatus(false);
            this.updatePoints(false, elapsedTime);
        } else if (this.consecutiveDistractionFrames >= 15) { // About 0.5 seconds of continuous distraction
            this.updateFocusStatus(true);
            this.updatePoints(true, elapsedTime);
        }
    }

    updateFocusStatus(isDistracted) {
        const focusIndicator = document.getElementById("focusIndicator");
        if (focusIndicator) {
            if (isDistracted) {
                focusIndicator.textContent = "Refocus";
                focusIndicator.className = "distracted";
                this.lastDistractionTime = new Date();
            } else {
                focusIndicator.textContent = "Focused";
                focusIndicator.className = "focused";
            }
        }
    }

    updatePoints(isDistracted, elapsedTime) {
        if (!isDistracted) {
          const currentTime = Date.now();
          if (currentTime - this.lastPointTime >= 1000) { // 1 second cooldown
            this.points += 1;
            this.lastPointTime = currentTime;
            this.updatePointsDisplay();
          }
        }
      }
    
      updatePointsDisplay() {
        const pointsDisplay = document.getElementById("points-display");
        if (pointsDisplay) {
          pointsDisplay.textContent = `Points: ${this.points}`;
        }
      }

    getPoints() {
        return this.points;
    }

    setDistractionThreshold(threshold) {
        this.distractionThreshold = threshold;
    }

    toggleVideo(isVisible) {
        const elements = ['webgazerVideoContainer', 'webgazerVideoFeed', 'webgazerFaceOverlay', 'webgazerFaceFeedbackBox'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = isVisible ? "block" : "none";
            }
        });
    }
}

window.EyeTrackingManager = EyeTrackingManager;