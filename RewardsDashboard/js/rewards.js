// Rewards Management JavaScript
// This file handles all reward-related functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeRewards();
    initializeFilters();
    initializeLeaderboard();
    initializeRequestForm();
});

// Sample reward data - in a real app, this would come from an API
const SAMPLE_REWARDS = [
    // Level 1 Rewards
    {
        id: 1,
        title: "Coffee Shop Voucher",
        description: "Get a free coffee from the campus café",
        level: 1,
        campus: "pune",
        status: "available",
        image: null,
        likes: 24,
        claimed: 12
    },
    {
        id: 2,
        title: "Library Study Room",
        description: "Free 2-hour study room booking",
        level: 1,
        campus: "pune",
        status: "claimed",
        image: null,
        likes: 18,
        claimed: 8
    },
    {
        id: 3,
        title: "Campus Store Discount",
        description: "10% off your next campus store purchase",
        level: 1,
        campus: "dharamshala",
        status: "available",
        image: null,
        likes: 31,
        claimed: 15
    },
    {
        id: 4,
        title: "Gym Day Pass",
        description: "One day access to campus fitness center",
        level: 1,
        campus: "raigarh",
        status: "available",
        image: null,
        likes: 42,
        claimed: 20
    },
    
    // Level 2 Rewards
    {
        id: 5,
        title: "Meal Plan Credit",
        description: "$25 credit for campus dining",
        level: 2,
        campus: "pune",
        status: "available",
        image: null,
        likes: 67,
        claimed: 30
    },
    {
        id: 6,
        title: "Parking Pass",
        description: "One week free parking permit",
        level: 2,
        campus: "dharamshala",
        status: "available",
        image: null,
        likes: 89,
        claimed: 25
    },
    {
        id: 7,
        title: "Tech Store Voucher",
        description: "$50 voucher for campus tech store",
        level: 2,
        campus: "dantewada",
        status: "claimed",
        image: null,
        likes: 53,
        claimed: 18
    },
    
    // Level 3 Rewards
    {
        id: 8,
        title: "Event Tickets",
        description: "Free tickets to campus cultural events",
        level: 3,
        campus: "pune",
        status: "available",
        image: null,
        likes: 76,
        claimed: 22
    },
    {
        id: 9,
        title: "Textbook Voucher",
        description: "$100 credit for textbook purchases",
        level: 3,
        campus: "raigarh",
        status: "available",
        image: null,
        likes: 112,
        claimed: 35
    },
    
    // Level 4 Rewards
    {
        id: 10,
        title: "Semester Parking",
        description: "Full semester premium parking pass",
        level: 4,
        campus: "dharamshala",
        status: "available",
        image: null,
        likes: 156,
        claimed: 8
    },
    {
        id: 11,
        title: "Academic Excellence Award",
        description: "$500 scholarship for outstanding performance",
        level: 4,
        campus: "pune",
        status: "available",
        image: null,
        likes: 203,
        claimed: 5
    },
    
    // Additional rewards for other campuses
    {
        id: 12,
        title: "Campus Tour Guide",
        description: "Become a campus tour guide for visiting students",
        level: 2,
        campus: "jashpur",
        status: "available",
        image: null,
        likes: 45,
        claimed: 8
    },
    {
        id: 13,
        title: "Tech Workshop Access",
        description: "Free access to advanced technology workshops",
        level: 3,
        campus: "sarjaapura",
        status: "available",
        image: null,
        likes: 78,
        claimed: 12
    },
    {
        id: 14,
        title: "Mountain Trek Experience",
        description: "Guided mountain trekking experience",
        level: 2,
        campus: "himachal-bca",
        status: "available",
        image: null,
        likes: 92,
        claimed: 15
    },
    {
        id: 15,
        title: "Cultural Event Tickets",
        description: "Free tickets to campus cultural events",
        level: 1,
        campus: "kishanganj",
        status: "available",
        image: null,
        likes: 34,
        claimed: 20
    }
];

// Campus and leaderboard data
const CAMPUS_DATA = [
    { name: "Pune Campus", points: 1340, rank: 1, trend: "up", rewards: 18 },
    { name: "Dharamshala Campus", points: 1220, rank: 2, trend: "down", rewards: 15 },
    { name: "Raigarh Campus", points: 1140, rank: 3, trend: "up", rewards: 12 },
    { name: "Dantewada Campus", points: 950, rank: 4, trend: "down", rewards: 10 },
    { name: "Kishanganj Campus", points: 820, rank: 5, trend: "same", rewards: 8 },
    { name: "Jashpur Campus", points: 680, rank: 6, trend: "up", rewards: 6 },
    { name: "Sarjaapura Campus", points: 540, rank: 7, trend: "down", rewards: 4 },
    { name: "Himachal BCA Campus", points: 420, rank: 8, trend: "same", rewards: 3 }
];

const HOUSE_DATA = [
    { name: "Bageshree House", campus: "Pune", points: 340, rank: 1, trend: "up" },
    { name: "Bhairav House", campus: "Dharamshala", points: 325, rank: 2, trend: "same" },
    { name: "Malhar House", campus: "Raigarh", points: 310, rank: 3, trend: "up" },
    { name: "Bageshree House", campus: "Dantewada", points: 295, rank: 4, trend: "down" },
    { name: "Bhairav House", campus: "Kishanganj", points: 280, rank: 5, trend: "up" },
    { name: "Malhar House", campus: "Jashpur", points: 275, rank: 6, trend: "same" },
    { name: "Bageshree House", campus: "Sarjaapura", points: 260, rank: 7, trend: "down" },
    { name: "Bhairav House", campus: "Himachal BCA", points: 240, rank: 8, trend: "same" }
];

// Initialize rewards system
function initializeRewards() {
    window.DashboardState.rewards = SAMPLE_REWARDS;
    loadAllRewards();
    setupRewardCardListeners();
}

// Load and display rewards
function loadAllRewards() {
    for (let level = 1; level <= 4; level++) {
        loadRewardsByLevel(level);
    }
}

function loadRewardsByLevel(level) {
    const container = document.getElementById(`level-${level}-rewards`);
    if (!container) return;
    
    const levelRewards = getFilteredRewards().filter(reward => reward.level === level);
    
    if (levelRewards.length === 0) {
        container.innerHTML = '<p class="text-center">No rewards available for this level.</p>';
        return;
    }
    
    container.innerHTML = levelRewards.map(reward => createRewardCard(reward)).join('');
}

// Filter rewards based on current filters
function getFilteredRewards() {
    const { selectedCampus, selectedLevel, selectedStatus } = window.DashboardState;
    
    return window.DashboardState.rewards.filter(reward => {
        const campusMatch = selectedCampus === 'all' || reward.campus === selectedCampus;
        const levelMatch = selectedLevel === 'all' || reward.level === parseInt(selectedLevel);
        const statusMatch = selectedStatus === 'all' || reward.status === selectedStatus;
        
        return campusMatch && levelMatch && statusMatch;
    });
}

// Create HTML for reward card
// Campus display name mapping
function getCampusDisplayName(campusCode) {
    const campusMapping = {
        'pune': 'Pune Campus',
        'dharamshala': 'Dharamshala Campus',
        'raigarh': 'Raigarh Campus',
        'dantewada': 'Dantewada Campus',
        'kishanganj': 'Kishanganj Campus',
        'jashpur': 'Jashpur Campus',
        'sarjaapura': 'Sarjaapura Campus',
        'himachal-bca': 'Himachal BCA Campus'
    };
    return campusMapping[campusCode] || campusCode.charAt(0).toUpperCase() + campusCode.slice(1) + ' Campus';
}

function createRewardCard(reward) {
    const isAvailable = reward.status === 'available';
    const isClaimed = reward.status === 'claimed';
    const statusClass = isAvailable ? 'available' : 'claimed';
    const statusText = isAvailable ? 'Available' : 'Claimed';
    const campusName = getCampusDisplayName(reward.campus);
    
    return `
        <div class="reward-card ${statusClass}" data-reward-id="${reward.id}" onclick="showRewardDetail('${reward.id}')">
            <div class="reward-image">
                ${reward.image ? 
                    `<img src="${reward.image}" alt="${reward.title}">` : 
                    `<i class="fas fa-gift"></i>`
                }
                <div class="reward-status">${statusText}</div>
            </div>
            <div class="reward-content">
                <div class="reward-meta">
                    <span class="reward-level">Level ${reward.level}</span>
                    <span class="reward-campus">${campusName}</span>
                </div>
                <h4 class="reward-title">${reward.title}</h4>
                <p class="reward-description">${reward.description}</p>
                <div class="reward-actions">
                    <div class="reward-likes">
                        <button class="like-btn ${isUserLiked(reward.id) ? 'liked' : ''}" onclick="toggleLike(event, '${reward.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                        <span>${reward.likes}</span>
                    </div>
                    ${isAvailable ? 
                        `<button class="claim-btn" onclick="claimReward(event, '${reward.id}')" ${!window.DashboardState.isLoggedIn ? 'disabled' : ''}>
                            <i class="fas fa-gift"></i> ${window.DashboardState.isLoggedIn ? 'Claim' : 'Login to Claim'}
                        </button>` :
                        `<span class="text-muted">Already Claimed</span>`
                    }
                </div>
            </div>
        </div>
    `;
}

// Initialize filter functionality
function initializeFilters() {
    const campusFilter = document.getElementById('campus-filter');
    const levelFilter = document.getElementById('level-filter');
    const statusFilter = document.getElementById('status-filter');
    
    if (campusFilter) {
        campusFilter.addEventListener('change', function() {
            window.DashboardState.selectedCampus = this.value;
            applyFilters();
        });
    }
    
    if (levelFilter) {
        levelFilter.addEventListener('change', function() {
            window.DashboardState.selectedLevel = this.value;
            applyFilters();
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            window.DashboardState.selectedStatus = this.value;
            applyFilters();
        });
    }
}

// Apply current filters
function applyFilters() {
    loadAllRewards();
    setupRewardCardListeners();
}

// Setup event listeners for reward cards
function setupRewardCardListeners() {
    const rewardCards = document.querySelectorAll('.reward-card');
    rewardCards.forEach(card => {
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const rewardId = parseInt(this.dataset.rewardId);
                showRewardDetail(rewardId);
            }
        });
        card.setAttribute('tabindex', '0');
    });
}

// Show reward detail modal - redirect to main script function
function showRewardDetail(rewardId) {
    // Use the function from script.js which has the complete modal system
    if (window.showRewardDetails) {
        window.showRewardDetails(rewardId);
        return;
    }
    
    // Fallback to original implementation if script.js function not available
    const reward = window.DashboardState.rewards.find(r => r.id === rewardId);
    if (!reward) return;
    
    // Populate modal with reward data
    document.getElementById('reward-modal-title').textContent = reward.title;
    document.getElementById('reward-modal-level').textContent = `Level ${reward.level}`;
    document.getElementById('reward-modal-campus').textContent = getCampusDisplayName(reward.campus);
    document.getElementById('reward-modal-description').textContent = reward.description;
    document.getElementById('reward-modal-likes').textContent = reward.likes;
    document.getElementById('reward-modal-claimed').textContent = reward.claimed;
    
    const modalImage = document.getElementById('reward-modal-image');
    if (reward.image) {
        modalImage.src = reward.image;
        modalImage.style.display = 'block';
    } else {
        modalImage.style.display = 'none';
    }
    
    // Setup action buttons
    const claimBtn = document.getElementById('claim-reward-btn');
    const likeBtn = document.getElementById('like-reward-btn');
    
    if (reward.status === 'available' && window.DashboardState.isLoggedIn) {
        claimBtn.style.display = 'inline-block';
        claimBtn.onclick = () => claimReward(null, rewardId);
    } else {
        claimBtn.style.display = 'none';
    }
    
    likeBtn.onclick = () => toggleLike(null, rewardId);
    likeBtn.classList.toggle('liked', isUserLiked(rewardId));
    
    window.DashboardUtils.showModal('reward-modal');
}

// Handle reward claiming
function claimReward(event, rewardId) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!window.DashboardState.isLoggedIn) {
        window.DashboardUtils.showNotification('Please log in to claim rewards', 'warning');
        return;
    }
    
    const reward = window.DashboardState.rewards.find(r => r.id === rewardId);
    if (!reward || reward.status !== 'available') return;
    
    // Simulate claiming process
    const confirmClaim = confirm(`Are you sure you want to claim "${reward.title}"?`);
    if (confirmClaim) {
        // Update reward status
        reward.status = 'claimed';
        reward.claimed += 1;
        
        // Update UI
        loadAllRewards();
        setupRewardCardListeners();
        
        window.DashboardUtils.showNotification(`Successfully claimed: ${reward.title}!`, 'success');
        window.DashboardUtils.closeModal('reward-modal');
        
        // Update dashboard stats
        updateClaimedRewardsCount();
    }
}

// Handle like/unlike functionality
function toggleLike(event, rewardId) {
    if (event) {
        event.stopPropagation();
    }
    
    const reward = window.DashboardState.rewards.find(r => r.id === rewardId);
    if (!reward) return;
    
    const userLikes = getUserLikes();
    const isLiked = userLikes.includes(rewardId);
    
    if (isLiked) {
        // Unlike
        reward.likes -= 1;
        const index = userLikes.indexOf(rewardId);
        userLikes.splice(index, 1);
    } else {
        // Like
        reward.likes += 1;
        userLikes.push(rewardId);
    }
    
    // Save likes to localStorage
    localStorage.setItem('userLikes', JSON.stringify(userLikes));
    
    // Update UI
    loadAllRewards();
    setupRewardCardListeners();
}

// Get user's liked rewards from localStorage
function getUserLikes() {
    const saved = localStorage.getItem('userLikes');
    return saved ? JSON.parse(saved) : [];
}

// Check if user has liked a specific reward
function isUserLiked(rewardId) {
    return getUserLikes().includes(rewardId);
}

// Update claimed rewards counter
function updateClaimedRewardsCount() {
    const claimedCount = window.DashboardState.rewards.filter(r => r.status === 'claimed').length;
    const claimedElement = document.getElementById('claimed-rewards');
    if (claimedElement) {
        claimedElement.textContent = claimedCount;
    }
}

// Initialize leaderboard
function initializeLeaderboard() {
    loadLeaderboardData();
    setupLeaderboardTabs();
}

// Load leaderboard data
function loadLeaderboardData() {
    window.DashboardState.leaderboardData = {
        campus: CAMPUS_DATA,
        house: HOUSE_DATA
    };
    
    displayCampusLeaderboard();
    displayHouseLeaderboard();
}

// Setup leaderboard tabs
function setupLeaderboardTabs() {
    const tabButtons = document.querySelectorAll('.leaderboard-tabs .tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding tab content
            document.querySelectorAll('.leaderboard-section .tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

// Display campus leaderboard
function displayCampusLeaderboard() {
    const container = document.getElementById('campus-leaderboard');
    if (!container) return;
    
    const html = window.DashboardState.leaderboardData.campus.map(campus => {
        const trendIcon = getTrendIcon(campus.trend);
        const rankClass = campus.rank <= 3 ? ['first', 'second', 'third'][campus.rank - 1] : '';
        
        return `
            <div class="table-row">
                <div class="rank ${rankClass}">${campus.rank}</div>
                <div class="name">${campus.name}</div>
                <div class="points">${campus.points}</div>
                <div class="rewards">${campus.rewards}</div>
                <div class="trend ${campus.trend}">${trendIcon}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Display house leaderboard
function displayHouseLeaderboard() {
    const container = document.getElementById('house-leaderboard');
    if (!container) return;
    
    const html = window.DashboardState.leaderboardData.house.map(house => {
        const trendIcon = getTrendIcon(house.trend);
        const rankClass = house.rank <= 3 ? ['first', 'second', 'third'][house.rank - 1] : '';
        
        return `
            <div class="table-row">
                <div class="rank ${rankClass}">${house.rank}</div>
                <div class="name">${house.name}</div>
                <div class="campus">${house.campus}</div>
                <div class="points">${house.points}</div>
                <div class="trend ${house.trend}">${trendIcon}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Get trend icon
function getTrendIcon(trend) {
    switch (trend) {
        case 'up': return '▲';
        case 'down': return '▼';
        case 'same': return '━';
        default: return '━';
    }
}

// Initialize request form
function initializeRequestForm() {
    const requestForm = document.getElementById('request-form');
    
    if (requestForm) {
        requestForm.addEventListener('submit', handleRewardRequest);
    }
}

// Handle reward request submission
function handleRewardRequest(e) {
    e.preventDefault();
    
    if (!window.DashboardState.isLoggedIn) {
        window.DashboardUtils.showNotification('Please log in to submit requests', 'warning');
        return;
    }
    
    const formData = new FormData(e.target);
    const requestData = {
        title: formData.get('title'),
        level: formData.get('level'),
        description: formData.get('description'),
        image: formData.get('image'),
        justification: formData.get('justification'),
        campus: window.DashboardState.currentUser.campus,
        status: 'pending',
        submittedBy: window.DashboardState.currentUser.email,
        submittedAt: new Date().toISOString()
    };
    
    // Validate required fields
    if (!requestData.title || !requestData.level || !requestData.description || !requestData.justification) {
        window.DashboardUtils.showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Simulate API submission
    submitRewardRequest(requestData);
}

// Submit reward request
function submitRewardRequest(requestData) {
    // Show loading state
    const submitBtn = document.querySelector('#request-form button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        // Simulate successful submission
        const requests = getUserRequests();
        requestData.id = Date.now(); // Simple ID generation
        requests.push(requestData);
        localStorage.setItem('userRequests', JSON.stringify(requests));
        
        // Reset form
        document.getElementById('request-form').reset();
        
        // Show success message
        window.DashboardUtils.showNotification('Request submitted successfully! It will be reviewed by administrators.', 'success');
        
        // Update pending requests display
        loadUserRequests();
        
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
    }, 2000);
}

// Get user's submitted requests
function getUserRequests() {
    const saved = localStorage.getItem('userRequests');
    return saved ? JSON.parse(saved) : [];
}

// Load and display user's requests
function loadUserRequests() {
    const container = document.getElementById('requests-list');
    const pendingSection = document.getElementById('pending-requests');
    
    if (!container || !window.DashboardState.isLoggedIn) {
        if (pendingSection) pendingSection.style.display = 'none';
        return;
    }
    
    const userRequests = getUserRequests().filter(req => 
        req.submittedBy === window.DashboardState.currentUser.email
    );
    
    if (userRequests.length === 0) {
        pendingSection.style.display = 'none';
        return;
    }
    
    pendingSection.style.display = 'block';
    
    const html = userRequests.map(request => `
        <div class="request-item">
            <div class="request-header">
                <h4 class="request-title">${request.title}</h4>
                <span class="request-status ${request.status}">${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
            </div>
            <p><strong>Level:</strong> ${request.level}</p>
            <p><strong>Description:</strong> ${request.description}</p>
            <p><strong>Justification:</strong> ${request.justification}</p>
            <p><strong>Submitted:</strong> ${new Date(request.submittedAt).toLocaleDateString()}</p>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Load user requests when logged in
function loadUserRewards() {
    loadUserRequests();
}

// Export functions for global access
window.RewardsManager = {
    showRewardDetail,
    claimReward,
    toggleLike,
    loadUserRewards,
    applyFilters
};
