// Campus Rewards Dashboard - Main JavaScript File
// Connects to Firebase Firestore for real-time data

// Initialize global state object that other scripts expect
window.DashboardState = {
    rewards: [],
    students: [],
    competitions: [],
    houses: [],
    selectedCampus: 'all',
    selectedLevel: 'all',
    selectedStatus: 'all',
    currentUser: null
};

// Mock data for fallback (in case Firebase is not available)
const mockData = {
    campuses: ['Pune', 'Dharamshala', 'Raigarh', 'Dantewada', 'Kishanganj', 'Jashpur', 'Sarjaapura', 'Himachal BCA'],
    rewards: [
        {
            id: 'reward1',
            title: 'Academic Excellence',
            description: 'Outstanding performance in academics',
            points: 100,
            level: 'Campus Champion',
            campus: 'all'
        }
    ],
    students: [
        {
            id: 'student1',
            name: 'Sample Student',
            campus: 'Pune',
            house: 'Bageshree',
            points: 150
        }
    ]
};

// Global variables
let currentCampus = 'all';
let firebaseService = null;

// Wait for Firebase Service to be available
async function waitForFirebaseService() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (!window.FirebaseService && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (window.FirebaseService) {
        firebaseService = window.FirebaseService;
        console.log('Firebase Service connected successfully');
        updateFirebaseStatus('connected', 'Firebase connected');
        return true;
    } else {
        console.error('Firebase Service not available after waiting');
        updateFirebaseStatus('error', 'Firebase connection failed');
        return false;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing dashboard...');
    
    // Initialize campus selector
    initializeCampusSelector();
    
    // Wait for Firebase Service
    const firebaseConnected = await waitForFirebaseService();
    
    if (firebaseConnected) {
        // Load real data from Firebase and populate global state
        await loadDashboardStats();
        await loadRecentRewards();
        await loadLeaderboards();
        await loadActiveCompetitions();
        
        // Setup real-time listeners
        setupRealtimeListeners();
    } else {
        // Fall back to mock data
        console.log('Using mock data as fallback');
        loadMockData();
    }
    
    // Setup event listeners
    setupEventListeners();
});

// Initialize campus selector dropdown
function initializeCampusSelector() {
    const campusSelect = document.getElementById('campusSelect');
    if (!campusSelect) return;
    
    // Add "All Campuses" option
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Campuses';
    campusSelect.appendChild(allOption);
    
    // Add individual campus options
    mockData.campuses.forEach(campus => {
        const option = document.createElement('option');
        option.value = campus;
        option.textContent = campus;
        campusSelect.appendChild(option);
    });
}

// Load dashboard statistics from Firebase
async function loadDashboardStats() {
    if (!firebaseService) return;
    
    try {
        const [rewards, students, houses, competitions] = await Promise.all([
            firebaseService.getAllRewards(),
            firebaseService.getAllStudents(),
            firebaseService.getAllHouses(),
            firebaseService.getAllCompetitions()
        ]);
        
        // Update global state
        window.DashboardState.rewards = rewards;
        window.DashboardState.students = students;
        window.DashboardState.houses = houses;
        window.DashboardState.competitions = competitions;
        
        // Filter by campus if needed
        const filteredRewards = currentCampus === 'all' ? rewards : rewards.filter(r => r.campus === 'all' || r.campus === currentCampus);
        const filteredStudents = currentCampus === 'all' ? students : students.filter(s => s.campus === currentCampus);
        const filteredCompetitions = currentCampus === 'all' ? competitions : competitions.filter(c => c.campus === 'all' || c.campus === currentCampus);
        
        // Calculate total points awarded
        const totalPoints = filteredStudents.reduce((sum, student) => sum + (student.points || 0), 0);
        
        // Update dashboard stats
        updateDashboardStats({
            totalRewards: filteredRewards.length,
            activeStudents: filteredStudents.length,
            totalPoints: totalPoints,
            activeCompetitions: filteredCompetitions.filter(c => new Date(c.endDate) > new Date()).length
        });
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Update dashboard statistics display
function updateDashboardStats(stats) {
    const elements = {
        totalRewards: document.querySelector('.stat-card:nth-child(1) .stat-number'),
        activeStudents: document.querySelector('.stat-card:nth-child(2) .stat-number'),
        totalPoints: document.querySelector('.stat-card:nth-child(3) .stat-number'),
        activeCompetitions: document.querySelector('.stat-card:nth-child(4) .stat-number')
    };
    
    if (elements.totalRewards) elements.totalRewards.textContent = stats.totalRewards;
    if (elements.activeStudents) elements.activeStudents.textContent = stats.activeStudents;
    if (elements.totalPoints) elements.totalPoints.textContent = stats.totalPoints.toLocaleString();
    if (elements.activeCompetitions) elements.activeCompetitions.textContent = stats.activeCompetitions;
    
    // Also update legacy IDs that might be used by other scripts
    const legacyElements = {
        totalRewards: document.getElementById('total-rewards'),
        claimedRewards: document.getElementById('claimed-rewards'),
        totalPoints: document.getElementById('total-points'),
        activeCompetitions: document.getElementById('active-competitions')
    };
    
    if (legacyElements.totalRewards) legacyElements.totalRewards.textContent = stats.totalRewards;
    if (legacyElements.claimedRewards) legacyElements.claimedRewards.textContent = Math.floor(stats.totalRewards * 0.3); // Estimate claimed
    if (legacyElements.totalPoints) legacyElements.totalPoints.textContent = stats.totalPoints.toLocaleString();
    if (legacyElements.activeCompetitions) legacyElements.activeCompetitions.textContent = stats.activeCompetitions;
}

// Load recent rewards from Firebase
async function loadRecentRewards() {
    if (!firebaseService) return;
    
    try {
        const rewards = await firebaseService.getAllRewards();
        const filteredRewards = currentCampus === 'all' ? rewards : rewards.filter(r => r.campus === 'all' || r.campus === currentCampus);
        
        // Sort by date and take recent ones
        const recentRewards = filteredRewards
            .sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()))
            .slice(0, 6);
        
        updateRewardsDisplay(recentRewards);
        
    } catch (error) {
        console.error('Error loading recent rewards:', error);
    }
}

// Update rewards display
function updateRewardsDisplay(rewards) {
    const rewardsGrid = document.getElementById('rewardsGrid');
    if (!rewardsGrid) return;
    
    if (rewards.length === 0) {
        rewardsGrid.innerHTML = '<p class="no-data">No rewards available for the selected campus.</p>';
        return;
    }
    
    rewardsGrid.innerHTML = rewards.map(reward => {
        return `
        <div class="reward-card" data-level="${reward.level}" data-reward-id="${reward.id}">
            <div class="reward-header">
                ${reward.image ? 
                    `<img src="${reward.image}" alt="${reward.title}" class="reward-image">` : 
                    `<div class="reward-icon"><i class="fas fa-trophy"></i></div>`
                }
            </div>
            <div class="reward-body">
                <h3 class="reward-title">${reward.title}</h3>
                <p class="reward-description">${reward.description}</p>
                <div class="reward-footer">
                    <span class="reward-points">${reward.points} points</span>
                    <span class="reward-level">${reward.level}</span>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    // Add click event listeners to reward cards
    setupRewardCardListeners();
}

// Load leaderboards from Firebase
async function loadLeaderboards() {
    if (!firebaseService) return;
    
    try {
        const [students, houses] = await Promise.all([
            firebaseService.getAllStudents(),
            firebaseService.getAllHouses()
        ]);
        
        await updateStudentLeaderboard(students);
        await updateHouseLeaderboard(houses);
        await updateCampusLeaderboard(students);
        
    } catch (error) {
        console.error('Error loading leaderboards:', error);
    }
}

// Update student leaderboard
async function updateStudentLeaderboard(students) {
    const leaderboardElement = document.getElementById('studentLeaderboard');
    if (!leaderboardElement) return;
    
    // Filter by campus and sort by points
    const filteredStudents = currentCampus === 'all' ? students : students.filter(s => s.campus === currentCampus);
    const sortedStudents = filteredStudents
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 10);
    
    if (sortedStudents.length === 0) {
        leaderboardElement.innerHTML = '<p class="no-data">No students found for the selected campus.</p>';
        return;
    }
    
    leaderboardElement.innerHTML = sortedStudents.map((student, index) => {
        return `
        <div class="leaderboard-item">
            <div class="rank">#${index + 1}</div>
            <div class="profile">
                ${student.profileImage ? 
                    `<img src="${student.profileImage}" alt="${student.name}" class="profile-image">` : 
                    `<div class="profile-avatar">${student.name.charAt(0)}</div>`
                }
                <div class="profile-info">
                    <h4>${student.name}</h4>
                    <p>${student.campus} • ${student.house}</p>
                </div>
            </div>
            <div class="points">${student.points || 0}</div>
        </div>
        `;
    }).join('');
}

// Update house leaderboard
async function updateHouseLeaderboard(houses) {
    const leaderboardElement = document.getElementById('houseLeaderboard');
    if (!leaderboardElement) return;
    
    // Get students to calculate house points
    const students = await firebaseService.getAllStudents();
    const filteredStudents = currentCampus === 'all' ? students : students.filter(s => s.campus === currentCampus);
    
    // Calculate points for each house
    const housePoints = {};
    houses.forEach(house => {
        housePoints[house.name] = {
            ...house,
            totalPoints: filteredStudents
                .filter(s => s.house === house.name)
                .reduce((sum, s) => sum + (s.points || 0), 0)
        };
    });
    
    // Sort houses by total points
    const sortedHouses = Object.values(housePoints)
        .sort((a, b) => b.totalPoints - a.totalPoints);
    
    leaderboardElement.innerHTML = sortedHouses.map((house, index) => {
        return `
        <div class="leaderboard-item">
            <div class="rank">#${index + 1}</div>
            <div class="profile">
                <div class="house-color" style="background-color: ${house.color}; width: 30px; height: 30px; border-radius: 50%;"></div>
                <div class="profile-info">
                    <h4>${house.name}</h4>
                    <p>House</p>
                </div>
            </div>
            <div class="points">${house.totalPoints}</div>
        </div>
        `;
    }).join('');
}

// Update campus leaderboard
async function updateCampusLeaderboard(students) {
    const leaderboardElement = document.getElementById('campusLeaderboard');
    if (!leaderboardElement || currentCampus !== 'all') {
        if (leaderboardElement) leaderboardElement.style.display = 'none';
        return;
    }
    
    leaderboardElement.style.display = 'block';
    
    // Calculate points for each campus
    const campusPoints = {};
    mockData.campuses.forEach(campus => {
        campusPoints[campus] = {
            name: campus,
            totalPoints: students
                .filter(s => s.campus === campus)
                .reduce((sum, s) => sum + (s.points || 0), 0),
            studentCount: students.filter(s => s.campus === campus).length
        };
    });
    
    // Sort campuses by total points
    const sortedCampuses = Object.values(campusPoints)
        .sort((a, b) => b.totalPoints - a.totalPoints);
    
    leaderboardElement.innerHTML = sortedCampuses.map((campus, index) => {
        return `
        <div class="leaderboard-item">
            <div class="rank">#${index + 1}</div>
            <div class="profile">
                <div class="campus-icon"><i class="fas fa-school"></i></div>
                <div class="profile-info">
                    <h4>${campus.name}</h4>
                    <p>${campus.studentCount} students</p>
                </div>
            </div>
            <div class="points">${campus.totalPoints}</div>
        </div>
        `;
    }).join('');
}

// Load active competitions from Firebase
async function loadActiveCompetitions() {
    if (!firebaseService) return;
    
    try {
        const competitions = await firebaseService.getAllCompetitions();
        const filteredCompetitions = currentCampus === 'all' ? competitions : competitions.filter(c => c.campus === 'all' || c.campus === currentCampus);
        
        // Filter active competitions (end date in future)
        const activeCompetitions = filteredCompetitions.filter(comp => new Date(comp.endDate) > new Date());
        
        updateCompetitionDisplay(activeCompetitions);
        
    } catch (error) {
        console.error('Error loading competitions:', error);
    }
}

// Update competition display
function updateCompetitionDisplay(competitions) {
    const competitionsGrid = document.getElementById('competitionsGrid');
    if (!competitionsGrid) return;
    
    if (competitions.length === 0) {
        competitionsGrid.innerHTML = '<p class="no-data">No active competitions for the selected campus.</p>';
        return;
    }
    
    competitionsGrid.innerHTML = competitions.map(competition => {
        return `
        <div class="competition-card">
            <div class="competition-info">
                <h4>${competition.name}</h4>
                <p class="competition-campus">${competition.campus === 'all' ? 'All Campuses' : competition.campus}</p>
                <p class="competition-date">Ends: ${new Date(competition.endDate).toLocaleDateString()}</p>
            </div>
            <div class="competition-points">
                <span class="max-points">${competition.points}</span>
                <span class="points-label">max points</span>
            </div>
        </div>
        `;
    }).join('');
}

// Setup real-time listeners for live updates
function setupRealtimeListeners() {
    if (!firebaseService) return;
    
    // Listen for rewards changes
    firebaseService.onRewardsChange((rewards) => {
        console.log('Rewards updated in real-time');
        window.DashboardState.rewards = rewards;
        const filteredRewards = currentCampus === 'all' ? rewards : rewards.filter(r => r.campus === 'all' || r.campus === currentCampus);
        const recentRewards = filteredRewards
            .sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()))
            .slice(0, 6);
        updateRewardsDisplay(recentRewards);
    });
    
    // Listen for students changes
    firebaseService.onStudentsChange(async (students) => {
        console.log('Students updated in real-time');
        window.DashboardState.students = students;
        await updateStudentLeaderboard(students);
        await updateCampusLeaderboard(students);
        
        // Update stats
        const filteredStudents = currentCampus === 'all' ? students : students.filter(s => s.campus === currentCampus);
        const totalPoints = filteredStudents.reduce((sum, student) => sum + (student.points || 0), 0);
        
        const totalPointsElement = document.querySelector('.stat-card:nth-child(3) .stat-number');
        const activeStudentsElement = document.querySelector('.stat-card:nth-child(2) .stat-number');
        
        if (totalPointsElement) totalPointsElement.textContent = totalPoints.toLocaleString();
        if (activeStudentsElement) activeStudentsElement.textContent = filteredStudents.length;
    });
    
    // Listen for competitions changes
    firebaseService.onCompetitionsChange((competitions) => {
        console.log('Competitions updated in real-time');
        window.DashboardState.competitions = competitions;
        const filteredCompetitions = currentCampus === 'all' ? competitions : competitions.filter(c => c.campus === 'all' || c.campus === currentCampus);
        const activeCompetitions = filteredCompetitions.filter(comp => new Date(comp.endDate) > new Date());
        updateCompetitionDisplay(activeCompetitions);
        
        // Update stats
        const activeCompetitionsElement = document.querySelector('.stat-card:nth-child(4) .stat-number');
        if (activeCompetitionsElement) activeCompetitionsElement.textContent = activeCompetitions.length;
    });
}

// Setup event listeners
function setupEventListeners() {
    // Campus selector change
    const campusSelect = document.getElementById('campusSelect');
    if (campusSelect) {
        campusSelect.addEventListener('change', function() {
            currentCampus = this.value;
            window.DashboardState.selectedCampus = this.value;
            console.log('Campus changed to:', currentCampus);
            
            // Reload data for the new campus
            if (firebaseService) {
                loadDashboardStats();
                loadRecentRewards();
                loadLeaderboards();
                loadActiveCompetitions();
            } else {
                loadMockData();
            }
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterContent(searchTerm);
        });
    }
    
    // Tab switching
    setupTabSwitching();
}

// Filter content based on search term
function filterContent(searchTerm) {
    // Filter rewards
    const rewardCards = document.querySelectorAll('.reward-card');
    rewardCards.forEach(card => {
        const title = card.querySelector('.reward-title')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.reward-description')?.textContent.toLowerCase() || '';
        const isVisible = title.includes(searchTerm) || description.includes(searchTerm);
        card.style.display = isVisible ? 'block' : 'none';
    });
    
    // Filter leaderboard items
    const leaderboardItems = document.querySelectorAll('.leaderboard-item');
    leaderboardItems.forEach(item => {
        const name = item.querySelector('h4')?.textContent.toLowerCase() || '';
        const isVisible = name.includes(searchTerm);
        item.style.display = isVisible ? 'flex' : 'none';
    });
}

// Setup tab switching functionality
function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// Setup reward card click listeners
function setupRewardCardListeners() {
    const rewardCards = document.querySelectorAll('.reward-card');
    rewardCards.forEach(card => {
        card.addEventListener('click', function() {
            const rewardId = this.getAttribute('data-reward-id');
            if (rewardId) {
                showRewardDetails(rewardId);
            }
        });
        
        // Add hover effect
        card.style.cursor = 'pointer';
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '';
        });
    });
}

// Load mock data as fallback
function loadMockData() {
    console.log('Loading mock data...');
    
    // Update global state with mock data
    window.DashboardState.rewards = mockData.rewards;
    window.DashboardState.students = mockData.students;
    
    updateDashboardStats({
        totalRewards: mockData.rewards.length,
        activeStudents: mockData.students.length,
        totalPoints: mockData.students.reduce((sum, s) => sum + s.points, 0),
        activeCompetitions: 3
    });
    
    updateRewardsDisplay(mockData.rewards);
    updateStudentLeaderboard(mockData.students);
    updateCompetitionDisplay([]);
}

// Update Firebase connection status
function updateFirebaseStatus(status, message) {
    // Remove existing status indicators
    const existingStatus = document.querySelector('.firebase-status');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    // Create new status indicator
    const statusDiv = document.createElement('div');
    statusDiv.className = `firebase-status status-${status}`;
    statusDiv.innerHTML = `
        <span class='realtime-indicator'></span>
        <span class='status-text'>${message}</span>
    `;
    
    document.body.appendChild(statusDiv);
    
    // Auto-hide after 5 seconds for non-error states
    if (status !== 'error') {
        setTimeout(() => {
            statusDiv.remove();
        }, 5000);
    }
    
    // Log status for debugging
    console.log(`Firebase Status: ${status} - ${message}`);
}

// Export functions that other scripts might need
window.RewardsManager = {
    applyFilters: function() {
        console.log('Applying filters...');
        if (firebaseService) {
            loadRecentRewards();
            loadLeaderboards();
            loadActiveCompetitions();
        }
    },
    refreshData: function() {
        console.log('Refreshing data...');
        if (firebaseService) {
            loadDashboardStats();
            loadRecentRewards();
            loadLeaderboards();
            loadActiveCompetitions();
        }
    }
};

// Show reward details modal
function showRewardDetails(rewardId) {
    console.log('Showing details for reward:', rewardId);
    
    // Find the reward in global state
    const reward = window.DashboardState.rewards.find(r => r.id === rewardId);
    if (!reward) {
        console.error('Reward not found:', rewardId);
        return;
    }
    
    // Create modal content
    const modalHTML = `
        <div class="reward-modal-overlay" onclick="closeRewardModal()">
            <div class="reward-modal" onclick="event.stopPropagation()">
                <div class="reward-modal-header">
                    <h2>${reward.title}</h2>
                    <button class="close-btn" onclick="closeRewardModal()">&times;</button>
                </div>
                <div class="reward-modal-body">
                    ${createImageCarousel(reward)}
                    <div class="reward-modal-content">
                        <p class="reward-modal-description">${reward.description}</p>
                        <div class="reward-modal-details">
                            <div class="detail-item">
                                <strong>Points Required:</strong> ${reward.points}
                            </div>
                            <div class="detail-item">
                                <strong>Level:</strong> ${reward.level}
                            </div>
                            <div class="detail-item">
                                <strong>Campus:</strong> ${reward.campus === 'all' ? 'All Campuses' : reward.campus}
                            </div>
                            ${reward.category ? `
                            <div class="detail-item">
                                <strong>Category:</strong> ${reward.category}
                            </div>
                            ` : ''}
                        </div>
                        <div class="reward-modal-actions">
                            <button class="btn btn-primary" onclick="claimReward('${reward.id}')">
                                <i class="fas fa-gift"></i> Claim Reward
                            </button>
                            <button class="btn btn-secondary" onclick="closeRewardModal()">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add CSS for modal if not already added
    if (!document.getElementById('reward-modal-styles')) {
        addModalStyles();
    }
    
    // Initialize carousel functionality
    initializeImageCarousel();
}

// Initialize image carousel functionality
function initializeImageCarousel() {
    // Add keyboard navigation
    document.addEventListener('keydown', handleCarouselKeyboard);
    
    // Add touch/swipe support for mobile
    addTouchSupport();
}

// Handle keyboard navigation for carousel
function handleCarouselKeyboard(e) {
    if (!document.querySelector('.reward-modal-overlay')) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            changeCarouselImage(-1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            changeCarouselImage(1);
            break;
        case 'Escape':
            e.preventDefault();
            closeRewardModal();
            break;
    }
}

// Change carousel image by direction
function changeCarouselImage(direction) {
    const carousel = document.querySelector('.image-carousel');
    if (!carousel) return;
    
    const currentIndex = parseInt(carousel.dataset.currentImage || 0);
    const slides = carousel.querySelectorAll('.carousel-slide');
    const totalSlides = slides.length;
    
    if (totalSlides <= 1) return;
    
    let newIndex = currentIndex + direction;
    
    if (newIndex >= totalSlides) {
        newIndex = 0;
    } else if (newIndex < 0) {
        newIndex = totalSlides - 1;
    }
    
    goToCarouselImage(newIndex);
}

// Go to specific carousel image
function goToCarouselImage(index) {
    const carousel = document.querySelector('.image-carousel');
    if (!carousel) return;
    
    const slides = carousel.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.carousel-indicators .indicator');
    const counter = document.querySelector('.carousel-counter .current');
    
    // Remove active class from all slides and indicators
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));
    
    // Add active class to current slide and indicator
    if (slides[index]) {
        slides[index].classList.add('active');
        carousel.dataset.currentImage = index;
    }
    
    if (indicators[index]) {
        indicators[index].classList.add('active');
    }
    
    if (counter) {
        counter.textContent = index + 1;
    }
}

// Toggle image zoom
function toggleImageZoom(img) {
    const container = img.closest('.image-container');
    const isZoomed = img.classList.contains('zoomed');
    
    if (isZoomed) {
        img.classList.remove('zoomed');
        container.classList.remove('zoomed');
        img.style.transform = '';
        img.style.cursor = 'zoom-in';
    } else {
        img.classList.add('zoomed');
        container.classList.add('zoomed');
        img.style.cursor = 'zoom-out';
    }
}

// Add touch support for mobile carousel
function addTouchSupport() {
    const carousel = document.querySelector('.image-carousel');
    if (!carousel) return;
    
    let startX = 0;
    let isDragging = false;
    
    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
    });
    
    carousel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
    });
    
    carousel.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        
        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        
        if (Math.abs(diffX) > 50) { // Minimum swipe distance
            if (diffX > 0) {
                changeCarouselImage(1); // Swipe left - next image
            } else {
                changeCarouselImage(-1); // Swipe right - previous image
            }
        }
        
        isDragging = false;
    });
}

// Create image carousel HTML
function createImageCarousel(reward) {
    // Handle multiple images - check if reward has images array or single image
    let images = [];
    
    if (reward.images && Array.isArray(reward.images) && reward.images.length > 0) {
        images = reward.images;
    } else if (reward.image) {
        images = [reward.image];
    }
    
    if (images.length === 0) {
        return `<div class="reward-modal-icon"><i class="fas fa-trophy"></i></div>`;
    }
    
    const hasMultipleImages = images.length > 1;
    
    return `
        <div class="image-carousel-container">
            <div class="image-carousel" data-current-image="0">
                ${images.map((image, index) => `
                    <div class="carousel-slide ${index === 0 ? 'active' : ''}" data-slide="${index}">
                        <div class="image-container" style="--bg-image: url('${image}')">
                            <img src="${image}" alt="${reward.title} - Image ${index + 1}" class="carousel-image" onclick="toggleImageZoom(this)">
                            <div class="image-zoom-hint">
                                <i class="fas fa-search-plus"></i>
                                <span>Click to zoom</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
                
                ${hasMultipleImages ? `
                    <button class="carousel-nav prev" onclick="changeCarouselImage(-1)">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="carousel-nav next" onclick="changeCarouselImage(1)">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                ` : ''}
            </div>
            
            ${hasMultipleImages ? `
                <div class="carousel-indicators">
                    ${images.map((_, index) => `
                        <button class="indicator ${index === 0 ? 'active' : ''}" onclick="goToCarouselImage(${index})" data-slide="${index}"></button>
                    `).join('')}
                </div>
            ` : ''}
            
            ${hasMultipleImages ? `
                <div class="carousel-counter">
                    <span class="current">1</span> / <span class="total">${images.length}</span>
                </div>
            ` : ''}
        </div>
    `;
}

// Close reward details modal
function closeRewardModal() {
    const modal = document.querySelector('.reward-modal-overlay');
    if (modal) {
        modal.remove();
    }
    
    // Remove keyboard event listener
    document.removeEventListener('keydown', handleCarouselKeyboard);
}

// Add modal styles including carousel styles
function addModalStyles() {
    const styles = `
        <style id="reward-modal-styles">
            .reward-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                animation: fadeIn 0.3s ease-out;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .reward-modal {
                background: white;
                border-radius: 12px;
                max-width: 700px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                animation: slideIn 0.3s ease-out;
            }
            
            @keyframes slideIn {
                from { 
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to { 
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            .reward-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #eee;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 12px 12px 0 0;
            }
            
            .reward-modal-header h2 {
                margin: 0;
                color: white;
            }
            
            .close-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: white;
                padding: 8px;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.3s;
            }
            
            .close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .reward-modal-body {
                padding: 0;
            }
            
            /* Image Carousel Styles */
            .image-carousel-container {
                position: relative;
                background: #f8f9fa;
            }
            
            .image-carousel {
                position: relative;
                width: 100%;
                height: 300px;
                overflow: hidden;
                background: #000;
            }
            
            .carousel-slide {
                position: absolute;
                width: 100%;
                height: 100%;
                opacity: 0;
                transition: opacity 0.5s ease-in-out;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .carousel-slide.active {
                opacity: 1;
            }
            
            .image-container {
                position: relative;
                width: 100%;
                height: 300px;
                overflow: hidden;
                cursor: zoom-in;
                background: #f5f5f5;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .image-container::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-image: var(--bg-image);
                background-size: cover;
                background-position: center;
                filter: blur(10px);
                transform: scale(1.1);
                z-index: 1;
            }
            
            .image-container.zoomed {
                cursor: zoom-out;
            }
            
            .carousel-image {
                position: relative;
                max-width: 100%;
                max-height: 100%;
                width: auto;
                height: auto;
                object-fit: contain;
                transition: transform 0.3s ease;
                cursor: zoom-in;
                z-index: 2;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            }
            
            .carousel-image.zoomed {
                transform: scale(1.8);
                cursor: zoom-out;
            }
            
            .image-zoom-hint {
                position: absolute;
                bottom: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 5px;
                opacity: 0;
                transition: opacity 0.3s;
            }
            
            .image-container:hover .image-zoom-hint {
                opacity: 1;
            }
            
            .carousel-nav {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                background: rgba(255, 255, 255, 0.9);
                border: none;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                color: #333;
                transition: all 0.3s;
                z-index: 10;
            }
            
            .carousel-nav:hover {
                background: white;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                transform: translateY(-50%) scale(1.1);
            }
            
            .carousel-nav.prev {
                left: 15px;
            }
            
            .carousel-nav.next {
                right: 15px;
            }
            
            .carousel-indicators {
                display: flex;
                justify-content: center;
                gap: 8px;
                padding: 15px;
                background: #f8f9fa;
            }
            
            .indicator {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: none;
                background: #ddd;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .indicator.active {
                background: #667eea;
                transform: scale(1.2);
            }
            
            .indicator:hover {
                background: #999;
            }
            
            .carousel-counter {
                position: absolute;
                top: 15px;
                right: 15px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 6px 12px;
                border-radius: 15px;
                font-size: 14px;
                font-weight: 500;
            }
            
            .reward-modal-icon {
                text-align: center;
                font-size: 80px;
                color: #667eea;
                padding: 60px 20px;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            }
            
            .reward-modal-content {
                padding: 20px;
            }
            
            .reward-modal-description {
                font-size: 16px;
                line-height: 1.6;
                color: #666;
                margin-bottom: 20px;
            }
            
            .reward-modal-details {
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 20px;
                border-radius: 10px;
                margin-bottom: 20px;
                border-left: 4px solid #667eea;
            }
            
            .detail-item {
                margin-bottom: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .detail-item:last-child {
                margin-bottom: 0;
            }
            
            .detail-item strong {
                color: #333;
            }
            
            .reward-modal-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            
            .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }
            
            .btn-secondary {
                background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
                color: white;
            }
            
            .btn-secondary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(108, 117, 125, 0.4);
            }
            
            @media (max-width: 768px) {
                .reward-modal {
                    width: 95%;
                    margin: 10px;
                    max-height: 95vh;
                }
                
                .image-carousel {
                    height: 250px;
                }
                
                .image-container {
                    height: 250px;
                }
                
                .carousel-image.zoomed {
                    transform: scale(1.5);
                }
                
                .carousel-nav {
                    width: 40px;
                    height: 40px;
                    font-size: 16px;
                }
                
                .carousel-nav.prev {
                    left: 10px;
                }
                
                .carousel-nav.next {
                    right: 10px;
                }
                
                .reward-modal-actions {
                    flex-direction: column;
                }
                
                .btn {
                    justify-content: center;
                }
            }
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
}

// Claim reward function
function claimReward(rewardId) {
    console.log('Claiming reward:', rewardId);
    
    // Find the reward
    const reward = window.DashboardState.rewards.find(r => r.id === rewardId);
    if (!reward) {
        alert('Reward not found!');
        return;
    }
    
    // Show success message
    alert(`🎉 Congratulations! You've claimed the "${reward.title}" reward!\n\nPoints required: ${reward.points}\n\nPlease contact your campus administrator to complete the reward process.`);
    
    // Close modal
    closeRewardModal();
    
    // Here you could add actual claiming logic, such as:
    // - Deducting points from user
    // - Recording the claim in Firebase
    // - Sending notification to admin
}

// Make functions globally available
window.showRewardDetails = showRewardDetails;
window.closeRewardModal = closeRewardModal;
window.claimReward = claimReward;
window.changeCarouselImage = changeCarouselImage;
window.goToCarouselImage = goToCarouselImage;
window.toggleImageZoom = toggleImageZoom;