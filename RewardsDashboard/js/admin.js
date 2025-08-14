// Admin Panel JavaScript
// This file handles all administrative functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
});

// Initialize admin panel functionality
function initializeAdminPanel() {
    setupAdminTabs();
    setupAdminForms();
}

// Setup admin tabs functionality
function setupAdminTabs() {
    const adminTabButtons = document.querySelectorAll('.admin-tabs .tab-button');
    
    adminTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Update active tab button
            adminTabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding tab content
            document.querySelectorAll('.admin-modal .tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Load tab-specific data
            loadAdminTabData(tabName);
        });
    });
}

// Setup admin forms
function setupAdminForms() {
    const adminRewardForm = document.getElementById('admin-reward-form');
    
    if (adminRewardForm) {
        adminRewardForm.addEventListener('submit', handleAdminRewardSubmission);
    }
}

// Load admin data when panel opens
function loadAdminData() {
    loadPendingRequests();
    loadAnalytics();
    updateAdminStats();
}

// Load data for specific admin tab
function loadAdminTabData(tabName) {
    switch (tabName) {
        case 'pending-requests':
            loadPendingRequests();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'rewards-management':
            // Rewards management data is always loaded
            break;
    }
}

// Handle admin reward form submission
function handleAdminRewardSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const rewardData = {
        id: Date.now(), // Simple ID generation
        title: formData.get('title') || document.getElementById('admin-reward-title').value,
        level: parseInt(formData.get('level') || document.getElementById('admin-reward-level').value),
        description: formData.get('description') || document.getElementById('admin-reward-description').value,
        image: formData.get('image') || document.getElementById('admin-reward-image').value,
        campus: 'north', // Default campus, could be made configurable
        status: 'available',
        likes: 0,
        claimed: 0
    };
    
    // Validate required fields
    if (!rewardData.title || !rewardData.level || !rewardData.description) {
        window.DashboardUtils.showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Add to rewards list
    window.DashboardState.rewards.push(rewardData);
    
    // Update local storage (in real app, this would be an API call)
    saveRewardsToStorage();
    
    // Reset form
    e.target.reset();
    
    // Update rewards display
    if (window.RewardsManager) {
        window.RewardsManager.applyFilters();
    }
    
    // Show success message
    window.DashboardUtils.showNotification('Reward added successfully!', 'success');
    
    // Update analytics
    updateAdminStats();
}

// Load pending requests for admin review
function loadPendingRequests() {
    const container = document.getElementById('admin-pending-list');
    if (!container) return;
    
    // Get all user requests from localStorage
    const allRequests = getAllUserRequests();
    const pendingRequests = allRequests.filter(req => req.status === 'pending');
    
    if (pendingRequests.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: #6b7280;">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>No pending requests at this time.</p>
            </div>
        `;
        return;
    }
    
    const html = pendingRequests.map(request => createPendingRequestCard(request)).join('');
    container.innerHTML = html;
}

// Create HTML for pending request card
function createPendingRequestCard(request) {
    return `
        <div class="request-item" style="border-left: 4px solid #f59e0b;">
            <div class="request-header">
                <h4 class="request-title">${request.title}</h4>
                <div class="request-actions">
                    <button class="btn btn-success btn-sm" onclick="approveRequest('${request.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="rejectRequest('${request.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
            <div class="request-details">
                <p><strong>Requested by:</strong> ${request.submittedBy}</p>
                <p><strong>Campus:</strong> ${request.campus.charAt(0).toUpperCase() + request.campus.slice(1)}</p>
                <p><strong>Suggested Level:</strong> ${request.level}</p>
                <p><strong>Description:</strong> ${request.description}</p>
                <p><strong>Justification:</strong> ${request.justification}</p>
                <p><strong>Submitted:</strong> ${new Date(request.submittedAt).toLocaleDateString()}</p>
                ${request.image ? `<p><strong>Image URL:</strong> <a href="${request.image}" target="_blank">${request.image}</a></p>` : ''}
            </div>
        </div>
    `;
}

// Get all user requests from localStorage
function getAllUserRequests() {
    const saved = localStorage.getItem('userRequests');
    return saved ? JSON.parse(saved) : [];
}

// Save requests back to localStorage
function saveAllUserRequests(requests) {
    localStorage.setItem('userRequests', JSON.stringify(requests));
}

// Approve a reward request
function approveRequest(requestId) {
    const allRequests = getAllUserRequests();
    const request = allRequests.find(req => req.id == requestId);
    
    if (!request) return;
    
    const confirmApproval = confirm(`Approve reward request: "${request.title}"?`);
    if (!confirmApproval) return;
    
    // Update request status
    request.status = 'approved';
    request.approvedAt = new Date().toISOString();
    
    // Create new reward from request
    const newReward = {
        id: Date.now(),
        title: request.title,
        description: request.description,
        level: parseInt(request.level),
        campus: request.campus,
        status: 'available',
        image: request.image || null,
        likes: 0,
        claimed: 0
    };
    
    // Add to rewards
    window.DashboardState.rewards.push(newReward);
    saveRewardsToStorage();
    
    // Save updated requests
    saveAllUserRequests(allRequests);
    
    // Refresh displays
    loadPendingRequests();
    if (window.RewardsManager) {
        window.RewardsManager.applyFilters();
    }
    updateAdminStats();
    
    window.DashboardUtils.showNotification(`Request "${request.title}" approved and added to rewards!`, 'success');
}

// Reject a reward request
function rejectRequest(requestId) {
    const allRequests = getAllUserRequests();
    const request = allRequests.find(req => req.id == requestId);
    
    if (!request) return;
    
    const reason = prompt(`Reject reward request: "${request.title}"?\n\nOptional rejection reason:`);
    if (reason === null) return; // User cancelled
    
    // Update request status
    request.status = 'rejected';
    request.rejectedAt = new Date().toISOString();
    request.rejectionReason = reason || 'No reason provided';
    
    // Save updated requests
    saveAllUserRequests(allRequests);
    
    // Refresh display
    loadPendingRequests();
    updateAdminStats();
    
    window.DashboardUtils.showNotification(`Request "${request.title}" has been rejected.`, 'info');
}

// Load analytics data
function loadAnalytics() {
    updateAdminStats();
    // Additional analytics could be loaded here
}

// Update admin statistics
function updateAdminStats() {
    const totalRewards = window.DashboardState.rewards.length;
    const activeUsers = 156; // This would come from a real API
    const pendingRequests = getAllUserRequests().filter(req => req.status === 'pending').length;
    
    // Update analytics numbers
    const analyticsNumbers = document.querySelectorAll('.analytics-number');
    if (analyticsNumbers.length >= 3) {
        analyticsNumbers[0].textContent = totalRewards;
        analyticsNumbers[1].textContent = activeUsers;
        analyticsNumbers[2].textContent = pendingRequests;
    }
}

// Save rewards to localStorage (in real app, this would be an API call)
function saveRewardsToStorage() {
    localStorage.setItem('adminRewards', JSON.stringify(window.DashboardState.rewards));
}

// Load rewards from localStorage
function loadRewardsFromStorage() {
    const saved = localStorage.getItem('adminRewards');
    if (saved) {
        try {
            const savedRewards = JSON.parse(saved);
            // Merge with existing rewards, avoiding duplicates
            savedRewards.forEach(savedReward => {
                if (!window.DashboardState.rewards.find(r => r.id === savedReward.id)) {
                    window.DashboardState.rewards.push(savedReward);
                }
            });
        } catch (error) {
            console.error('Error loading saved rewards:', error);
        }
    }
}

// Initialize admin data when the script loads
document.addEventListener('DOMContentLoaded', function() {
    // Load any previously saved admin rewards
    setTimeout(() => {
        loadRewardsFromStorage();
        if (window.RewardsManager) {
            window.RewardsManager.applyFilters();
        }
    }, 1000);
});

// Export admin functions for global access
window.AdminManager = {
    loadAdminData,
    approveRequest,
    rejectRequest,
    loadPendingRequests,
    updateAdminStats
};

// Add styles for admin-specific elements
const adminStyles = document.createElement('style');
adminStyles.textContent = `
    .request-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }
    
    .btn-sm {
        padding: 0.4rem 0.8rem;
        font-size: 0.875rem;
    }
    
    .request-details {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
    }
    
    .request-details p {
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
    }
    
    .request-details strong {
        color: #374151;
    }
    
    @media (max-width: 768px) {
        .request-actions {
            flex-direction: column;
        }
        
        .request-actions .btn {
            width: 100%;
        }
        
        .request-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }
    }
`;
document.head.appendChild(adminStyles);


// ===== FIREBASE INTEGRATION ===== 

function initializeBulkOperations() {
    // Initialize CSV upload component
    if (typeof window.CsvUploadManager !== 'undefined') {
        window.CsvUploadManager.createUploadInterface('csv-upload-container');
        console.log(' CSV upload interface initialized');
    }
    
    setupBulkOperationListeners();
}

function setupBulkOperationListeners() {
    // Student point management
    const addPointsBtn = document.getElementById('add-points-btn');
    const studentSearch = document.getElementById('student-search');
    const addHousePointsBtn = document.getElementById('add-house-points-btn');
    
    if (addPointsBtn) {
        addPointsBtn.addEventListener('click', handleAddPoints);
    }
    
    if (studentSearch) {
        studentSearch.addEventListener('input', handleStudentSearch);
    }
    
    if (addHousePointsBtn) {
        addHousePointsBtn.addEventListener('click', handleAddHousePoints);
    }
}

async function handleStudentSearch(event) {
    const query = event.target.value.trim();
    const resultsContainer = document.getElementById('student-search-results');
    
    if (query.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    try {
        // Search students in Firebase or local data
        const students = await searchStudents(query);
        displaySearchResults(students, resultsContainer);
    } catch (error) {
        console.error('Error searching students:', error);
    }
}


// ===== FIREBASE TESTING FUNCTIONS ===== 

async function testFirebaseConnection() {
    try {
        console.log(' Testing Firebase connection...');
        
        // Test Firestore connection
        const testDoc = await window.FirebaseDB.db.collection('test').add({
            message: 'Firebase connection test',
            timestamp: window.FirebaseDB.timestamp,
            testId: Date.now()
        });
        
        console.log(' Firestore connected successfully:', testDoc.id);
        
        // Test reading back the document
        const doc = await testDoc.get();
        if (doc.exists) {
            console.log(' Firestore read test passed:', doc.data());
        }
        
        // Clean up test document
        await testDoc.delete();
        console.log(' Test document cleaned up');
        
        return true;
    } catch (error) {
        console.error(' Firebase connection failed:', error);
        window.DashboardUtils.showNotification('Firebase connection failed. Check console for details.', 'error');
        return false;
    }
}

async function initializeFirebaseCollections() {
    try {
        // Initialize campus data if it doesn't exist
        const campusSnapshot = await window.FirebaseDB.campuses.limit(1).get();
        if (campusSnapshot.empty) {
            console.log(' Initializing campus data...');
            const batch = window.FirebaseDB.batch();
            
            const campusData = [
                { name: 'Pune Campus', points: 1340, rank: 1, trend: 'up', rewards: 18, id: 'pune' },
                { name: 'Dharamshala Campus', points: 1220, rank: 2, trend: 'down', rewards: 15, id: 'dharamshala' },
                { name: 'Raigarh Campus', points: 1140, rank: 3, trend: 'up', rewards: 12, id: 'raigarh' },
                { name: 'Dantewada Campus', points: 950, rank: 4, trend: 'down', rewards: 10, id: 'dantewada' },
                { name: 'Kishanganj Campus', points: 820, rank: 5, trend: 'same', rewards: 8, id: 'kishanganj' },
                { name: 'Jashpur Campus', points: 680, rank: 6, trend: 'up', rewards: 6, id: 'jashpur' },
                { name: 'Sarjaapura Campus', points: 540, rank: 7, trend: 'down', rewards: 4, id: 'sarjaapura' },
                { name: 'Himachal BCA Campus', points: 420, rank: 8, trend: 'same', rewards: 3, id: 'himachal-bca' }
            ];
            
            campusData.forEach(campus => {
                const docRef = window.FirebaseDB.campuses.doc(campus.id);
                batch.set(docRef, campus);
            });
            
            await batch.commit();
            console.log(' Campus data initialized');
        }
        
        return true;
    } catch (error) {
        console.error(' Error initializing Firebase collections:', error);
        return false;
    }
}
