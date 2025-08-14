// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.selectedStudent = null;
        this.selectedCampus = 'all';
        this.currentStats = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabNavigation();
        this.loadInitialData();
        this.setupImageUpload();
        this.setupCSVUpload();
    }

    setupEventListeners() {
        // Form submissions
        document.getElementById('reward-form')?.addEventListener('submit', (e) => this.handleRewardSubmit(e));
        document.getElementById('student-form')?.addEventListener('submit', (e) => this.handleStudentSubmit(e));
        document.getElementById('points-form')?.addEventListener('submit', (e) => this.handlePointsSubmit(e));
        document.getElementById('house-competition-form')?.addEventListener('submit', (e) => this.handleHouseCompetitionSubmit(e));
        document.getElementById('competition-form')?.addEventListener('submit', (e) => this.handleCompetitionSubmit(e));

        // Search functionality
        document.getElementById('reward-search')?.addEventListener('input', (e) => this.searchRewards(e.target.value));
        document.getElementById('student-points-search')?.addEventListener('input', (e) => this.searchStudentsForPoints(e.target.value));
        document.getElementById('all-students-search')?.addEventListener('input', (e) => this.searchAllStudents(e.target.value));

        // Campus selection
        document.querySelectorAll('.campus-card').forEach(card => {
            card.addEventListener('click', (e) => this.selectCampus(e.target.dataset.campus));
        });
    }

    setupTabNavigation() {
        const tabLinks = document.querySelectorAll('.admin-nav-link');
        const tabContents = document.querySelectorAll('.tab-content');

        tabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.dataset.tab;

                // Remove active class from all tabs and contents
                tabLinks.forEach(l => l.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                // Add active class to clicked tab and corresponding content
                link.classList.add('active');
                document.getElementById(`${tabId}-tab`)?.classList.add('active');

                // Load data for specific tabs
                if (tabId === 'rewards') this.loadRewards();
                if (tabId === 'students') this.loadStudents();
                if (tabId === 'houses') this.loadHouseStandings();
                if (tabId === 'competitions') this.loadCompetitions();
            });
        });
    }

    setupImageUpload() {
        const uploadArea = document.getElementById('reward-image-upload');
        const fileInput = document.getElementById('reward-image');
        const preview = document.getElementById('reward-image-preview');

        uploadArea?.addEventListener('click', () => fileInput.click());
        uploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea?.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageUpload(files[0], preview);
            }
        });

        fileInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0], preview);
            }
        });
    }

    setupCSVUpload() {
        if (typeof CSVUpload !== 'undefined') {
            new CSVUpload('csv-upload-container');
        }
    }

    async loadInitialData() {
        try {
            await this.loadStats();
            await this.loadAnalytics();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showAlert('Error loading dashboard data', 'error');
        }
    }

    async loadStats() {
        try {
            const [students, rewards, competitions] = await Promise.all([
                window.FirebaseService.getAllStudents(),
                window.FirebaseService.getAllRewards(),
                window.FirebaseService.getAllCompetitions()
            ]);

            document.getElementById('total-students').textContent = students.length;
            document.getElementById('total-rewards').textContent = rewards.length;
            document.getElementById('total-competitions').textContent = competitions.length;

            this.currentStats = {
                students: students.length,
                rewards: rewards.length,
                competitions: competitions.length,
                campuses: 8
            };
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadAnalytics() {
        const analyticsContent = document.getElementById('analytics-content');
        if (!analyticsContent) return;

        try {
            const students = await window.FirebaseService.getAllStudents();
            const rewards = await window.FirebaseService.getAllRewards();
            
            let campusFilter = this.selectedCampus;
            let filteredStudents = campusFilter === 'all' ? students : students.filter(s => s.campus === campusFilter);
            let filteredRewards = campusFilter === 'all' ? rewards : rewards.filter(r => r.campus === campusFilter || r.campus === 'all');

            const totalPoints = filteredStudents.reduce((sum, student) => sum + (student.totalPoints || 0), 0);
            const avgPoints = filteredStudents.length > 0 ? Math.round(totalPoints / filteredStudents.length) : 0;

            analyticsContent.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <i class="fas fa-users"></i>
                        <h4>${filteredStudents.length}</h4>
                        <p>Students ${campusFilter !== 'all' ? `in ${campusFilter}` : 'Total'}</p>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-star"></i>
                        <h4>${totalPoints.toLocaleString()}</h4>
                        <p>Total Points Awarded</p>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-chart-line"></i>
                        <h4>${avgPoints}</h4>
                        <p>Average Points per Student</p>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-gift"></i>
                        <h4>${filteredRewards.length}</h4>
                        <p>Available Rewards</p>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading analytics:', error);
            analyticsContent.innerHTML = '<p>Error loading analytics data</p>';
        }
    }

    selectCampus(campus) {
        // Update selected campus
        this.selectedCampus = campus;
        
        // Update UI
        document.querySelectorAll('.campus-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-campus="${campus}"]`)?.classList.add('selected');

        // Reload relevant data
        this.loadAnalytics();
        if (document.getElementById('houses-tab')?.classList.contains('active')) {
            this.loadHouseStandings();
        }
    }

    async handleRewardSubmit(e) {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '<div class="loading"><div class="spinner"></div> Adding...</div>';
            submitBtn.disabled = true;

            const formData = {
                title: document.getElementById('reward-title').value,
                level: parseInt(document.getElementById('reward-level').value),
                campus: document.getElementById('reward-campus').value,
                description: document.getElementById('reward-description').value,
                image: await this.getUploadedImageData(),
                status: 'available',
                likes: 0,
                claimed: 0
            };

            await window.FirebaseService.addReward(formData);
            this.showAlert('Reward added successfully!', 'success');
            e.target.reset();
            this.clearImagePreview();
            if (document.getElementById('rewards-tab')?.classList.contains('active')) {
                this.loadRewards();
            }
        } catch (error) {
            console.error('Error adding reward:', error);
            this.showAlert('Error adding reward: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleStudentSubmit(e) {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '<div class="loading"><div class="spinner"></div> Adding...</div>';
            submitBtn.disabled = true;

            const studentId = document.getElementById('student-id').value;
            const name = document.getElementById('student-name').value;
            const nameParts = name.split(' ');

            const formData = {
                studentId,
                name,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: document.getElementById('student-email').value,
                campus: document.getElementById('student-campus').value,
                house: document.getElementById('student-house').value,
                phone: document.getElementById('student-phone').value,
                points: {
                    academic: 0,
                    lifeSkills: 0,
                    attendance: 0,
                    placement: 0,
                    dropout: 0
                },
                totalPoints: 0,
                rank: 0
            };

            await window.FirebaseService.addStudent(formData);
            this.showAlert('Student added successfully!', 'success');
            e.target.reset();
            if (document.getElementById('students-tab')?.classList.contains('active')) {
                this.loadStudents();
            }
        } catch (error) {
            console.error('Error adding student:', error);
            this.showAlert('Error adding student: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async handlePointsSubmit(e) {
        e.preventDefault();
        if (!this.selectedStudent) return;

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '<div class="loading"><div class="spinner"></div> Updating...</div>';
            submitBtn.disabled = true;

            const pointType = document.getElementById('point-type').value;
            const pointAmount = parseInt(document.getElementById('point-amount').value);
            const reason = document.getElementById('point-reason').value;

            await window.FirebaseService.updateStudentPoints(this.selectedStudent.studentId, pointType, pointAmount, reason);
            this.showAlert(`Points updated for ${this.selectedStudent.name}!`, 'success');
            e.target.reset();
            document.getElementById('points-form').style.display = 'none';
            this.selectedStudent = null;
            
            if (document.getElementById('students-tab')?.classList.contains('active')) {
                this.loadStudents();
            }
        } catch (error) {
            console.error('Error updating points:', error);
            this.showAlert('Error updating points: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleHouseCompetitionSubmit(e) {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '<div class="loading"><div class="spinner"></div> Awarding...</div>';
            submitBtn.disabled = true;

            const formData = {
                campus: document.getElementById('house-campus').value,
                house: document.getElementById('house-name').value,
                name: document.getElementById('competition-name').value,
                points: parseInt(document.getElementById('house-points').value),
                date: new Date().toISOString().split('T')[0]
            };

            await window.FirebaseService.addHouseCompetition(formData);
            this.showAlert('House points awarded successfully!', 'success');
            e.target.reset();
            if (document.getElementById('houses-tab')?.classList.contains('active')) {
                this.loadHouseStandings();
            }
        } catch (error) {
            console.error('Error awarding house points:', error);
            this.showAlert('Error awarding points: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleCompetitionSubmit(e) {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '<div class="loading"><div class="spinner"></div> Creating...</div>';
            submitBtn.disabled = true;

            const formData = {
                name: document.getElementById('comp-name').value,
                campus: document.getElementById('comp-campus').value,
                date: document.getElementById('comp-date').value,
                points: parseInt(document.getElementById('comp-points').value),
                description: document.getElementById('comp-description').value,
                status: 'upcoming'
            };

            const id = await window.FirebaseService.addCompetition(formData);
            this.showAlert('Competition created successfully!', 'success');
            e.target.reset();
            if (document.getElementById('competitions-tab')?.classList.contains('active')) {
                this.loadCompetitions();
            }
        } catch (error) {
            console.error('Error creating competition:', error);
            this.showAlert('Error creating competition: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async loadRewards() {
        const tableBody = document.getElementById('rewards-table-body');
        if (!tableBody) return;

        try {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading rewards...</td></tr>';
            
            const rewards = await window.FirebaseService.getAllRewards();
            
            if (rewards.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No rewards found</td></tr>';
                return;
            }

            tableBody.innerHTML = rewards.map(reward => `
                <tr>
                    <td>
                        ${reward.image ? 
                            `<img src="${reward.image}" alt="${reward.title}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">` : 
                            '<i class="fas fa-gift" style="font-size: 1.5rem; color: #9ca3af;"></i>'
                        }
                    </td>
                    <td><strong>${reward.title}</strong></td>
                    <td><span class="badge">Level ${reward.level}</span></td>
                    <td>${reward.campus === 'all' ? 'All Campuses' : reward.campus}</td>
                    <td><span class="status-${reward.status}">${reward.status}</span></td>
                    <td>${reward.claimed || 0}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-small btn-secondary" onclick="adminDashboard.editReward('${reward.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-small btn-danger" onclick="adminDashboard.deleteReward('${reward.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading rewards:', error);
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error loading rewards</td></tr>';
        }
    }

    async loadStudents() {
        const tableBody = document.getElementById('students-table-body');
        if (!tableBody) return;

        try {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading students...</td></tr>';
            
            const students = await window.FirebaseService.getAllStudents();
            
            if (students.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No students found</td></tr>';
                return;
            }

            // Sort by total points descending
            students.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

            tableBody.innerHTML = students.map((student, index) => `
                <tr>
                    <td><strong>${student.studentId}</strong></td>
                    <td>${student.name}</td>
                    <td>${student.campus}</td>
                    <td>${student.house}</td>
                    <td><strong>${student.totalPoints || 0}</strong></td>
                    <td>#${index + 1}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-small btn-secondary" onclick="adminDashboard.editStudent('${student.studentId}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-small btn-danger" onclick="adminDashboard.deleteStudent('${student.studentId}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading students:', error);
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error loading students</td></tr>';
        }
    }

    async loadHouseStandings() {
        const standingsDiv = document.getElementById('house-standings');
        if (!standingsDiv) return;

        try {
            standingsDiv.innerHTML = '<p>Loading house standings...</p>';
            
            const houses = await window.FirebaseService.getAllHouses();
            let filteredHouses = this.selectedCampus === 'all' ? houses : houses.filter(h => h.campus === this.selectedCampus);
            
            // Sort by total points descending
            filteredHouses.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

            if (filteredHouses.length === 0) {
                standingsDiv.innerHTML = '<p>No house data found</p>';
                return;
            }

            standingsDiv.innerHTML = `
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>House</th>
                                <th>Campus</th>
                                <th>Total Points</th>
                                <th>Trend</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredHouses.map((house, index) => `
                                <tr>
                                    <td><strong>#${index + 1}</strong></td>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                                            <div style="width: 20px; height: 20px; background: ${house.color}; border-radius: 50%;"></div>
                                            ${house.name}
                                        </div>
                                    </td>
                                    <td>${house.campus}</td>
                                    <td><strong>${house.totalPoints || 0}</strong></td>
                                    <td>
                                        <i class="fas fa-arrow-${house.trend === 'up' ? 'up' : house.trend === 'down' ? 'down' : 'right'}" 
                                           style="color: ${house.trend === 'up' ? 'green' : house.trend === 'down' ? 'red' : 'gray'};"></i>
                                    </td>
                                    <td>
                                        <button class="btn btn-small btn-secondary" onclick="adminDashboard.viewHouseDetails('${house.id}')">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error loading house standings:', error);
            standingsDiv.innerHTML = '<p style="color: red;">Error loading house standings</p>';
        }
    }

    async loadCompetitions() {
        const tableBody = document.getElementById('competitions-table-body');
        if (!tableBody) return;

        try {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading competitions...</td></tr>';
            
            const competitions = await window.FirebaseService.getAllCompetitions();
            
            if (competitions.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No competitions found</td></tr>';
                return;
            }

            tableBody.innerHTML = competitions.map(comp => `
                <tr>
                    <td><strong>${comp.name}</strong></td>
                    <td>${comp.campus === 'all' ? 'All Campuses' : comp.campus}</td>
                    <td>${comp.date}</td>
                    <td>${comp.points}</td>
                    <td><span class="status-${comp.status || 'upcoming'}">${comp.status || 'upcoming'}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-small btn-secondary" onclick="adminDashboard.editCompetition('${comp.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-small btn-danger" onclick="adminDashboard.deleteCompetition('${comp.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading competitions:', error);
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error loading competitions</td></tr>';
        }
    }

    async searchStudentsForPoints(query) {
        const resultsDiv = document.getElementById('student-search-results');
        if (!resultsDiv) return;

        if (query.length < 2) {
            resultsDiv.innerHTML = '';
            document.getElementById('points-form').style.display = 'none';
            return;
        }

        try {
            const students = await window.FirebaseService.getAllStudents();
            const filteredStudents = students.filter(student => 
                student.name.toLowerCase().includes(query.toLowerCase()) ||
                student.studentId.toLowerCase().includes(query.toLowerCase())
            );

            if (filteredStudents.length === 0) {
                resultsDiv.innerHTML = '<p>No students found</p>';
                return;
            }

            resultsDiv.innerHTML = `
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Campus</th>
                                <th>Points</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredStudents.map(student => `
                                <tr>
                                    <td><strong>${student.studentId}</strong></td>
                                    <td>${student.name}</td>
                                    <td>${student.campus}</td>
                                    <td><strong>${student.totalPoints || 0}</strong></td>
                                    <td>
                                        <button class="btn btn-small" onclick="adminDashboard.selectStudentForPoints('${student.studentId}')">
                                            Select
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error searching students:', error);
            resultsDiv.innerHTML = '<p style="color: red;">Error searching students</p>';
        }
    }

    async selectStudentForPoints(studentId) {
        try {
            const students = await window.FirebaseService.getAllStudents();
            this.selectedStudent = students.find(s => s.studentId === studentId);
            
            if (this.selectedStudent) {
                document.getElementById('points-form').style.display = 'block';
                document.getElementById('student-search-results').innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-user"></i>
                        Selected: <strong>${this.selectedStudent.name}</strong> (${this.selectedStudent.studentId}) - Current Points: <strong>${this.selectedStudent.totalPoints || 0}</strong>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error selecting student:', error);
            this.showAlert('Error selecting student', 'error');
        }
    }

    async handleImageUpload(file, previewElement) {
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            this.showAlert('Image size must be less than 2MB', 'error');
            return;
        }

        try {
            const compressedImage = await window.FirebaseService.compressImage(file, 300, 0.8);
            previewElement.src = compressedImage;
            previewElement.style.display = 'block';
        } catch (error) {
            console.error('Error processing image:', error);
            this.showAlert('Error processing image', 'error');
        }
    }

    async getUploadedImageData() {
        const preview = document.getElementById('reward-image-preview');
        return preview.style.display === 'block' ? preview.src : null;
    }

    clearImagePreview() {
        const preview = document.getElementById('reward-image-preview');
        preview.style.display = 'none';
        preview.src = '';
    }

    showAlert(message, type = 'info') {
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
        `;

        // Insert at top of admin content
        const adminContent = document.querySelector('.admin-content');
        adminContent.insertBefore(alert, adminContent.firstChild);

        // Auto remove after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);

        // Allow manual close
        alert.addEventListener('click', () => alert.remove());
    }

    // Placeholder methods for edit/delete operations
    async editReward(id) {
        // TODO: Implement reward editing
        this.showAlert('Edit reward feature coming soon', 'info');
    }

    async deleteReward(id) {
        if (confirm('Are you sure you want to delete this reward?')) {
            try {
                await window.FirebaseService.deleteReward(id);
                this.showAlert('Reward deleted successfully', 'success');
                this.loadRewards();
            } catch (error) {
                this.showAlert('Error deleting reward: ' + error.message, 'error');
            }
        }
    }

    async editStudent(id) {
        // TODO: Implement student editing
        this.showAlert('Edit student feature coming soon', 'info');
    }

    async deleteStudent(id) {
        if (confirm('Are you sure you want to delete this student?')) {
            try {
                await window.FirebaseService.deleteStudent(id);
                this.showAlert('Student deleted successfully', 'success');
                this.loadStudents();
            } catch (error) {
                this.showAlert('Error deleting student: ' + error.message, 'error');
            }
        }
    }

    async editCompetition(id) {
        // TODO: Implement competition editing
        this.showAlert('Edit competition feature coming soon', 'info');
    }

    async deleteCompetition(id) {
        if (confirm('Are you sure you want to delete this competition?')) {
            try {
                await window.FirebaseService.deleteCompetition(id);
                this.showAlert('Competition deleted successfully', 'success');
                this.loadCompetitions();
            } catch (error) {
                this.showAlert('Error deleting competition: ' + error.message, 'error');
            }
        }
    }

    viewHouseDetails(id) {
        // TODO: Implement house details view
        this.showAlert('House details view coming soon', 'info');
    }

    // Search methods
    searchRewards(query) {
        // TODO: Implement reward search filtering
    }

    searchAllStudents(query) {
        // TODO: Implement student search filtering
    }
}

// Template download functions
function downloadTemplate(type) {
    const templates = {
        students: {
            filename: 'students_template.csv',
            headers: ['studentId', 'name', 'email', 'campus', 'house', 'phone'],
            sample: [
                'PUNE_S001,Arjun Kumar,arjun.kumar@pune.edu,pune,bageshree,+91 9876543210',
                'PUNE_S002,Priya Sharma,priya.sharma@pune.edu,pune,bhairav,+91 9876543211'
            ]
        },
        rewards: {
            filename: 'rewards_template.csv',
            headers: ['title', 'level', 'campus', 'description'],
            sample: [
                'Coffee Shop Voucher,1,pune,Free coffee from campus café',
                'Library Study Room,2,dharamshala,2-hour study room booking'
            ]
        },
        competitions: {
            filename: 'competitions_template.csv',
            headers: ['name', 'campus', 'house', 'points', 'date'],
            sample: [
                'Science Fair,pune,bageshree,50,2025-07-15',
                'Cultural Fest,dharamshala,bhairav,45,2025-07-20'
            ]
        }
    };

    const template = templates[type];
    if (!template) return;

    const csvContent = [
        template.headers.join(','),
        ...template.sample
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = template.filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// System management functions
async function backupData() {
    try {
        const [students, rewards, competitions, houses] = await Promise.all([
            window.FirebaseService.getAllStudents(),
            window.FirebaseService.getAllRewards(),
            window.FirebaseService.getAllCompetitions(),
            window.FirebaseService.getAllHouses()
        ]);

        const backup = {
            timestamp: new Date().toISOString(),
            data: { students, rewards, competitions, houses }
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campus-rewards-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);

        adminDashboard.showAlert('Database backup downloaded successfully', 'success');
    } catch (error) {
        console.error('Error backing up data:', error);
        adminDashboard.showAlert('Error creating backup: ' + error.message, 'error');
    }
}

async function clearAllData() {
    if (!confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
        return;
    }

    if (!confirm('This will delete all students, rewards, competitions, and house data. Type "DELETE" to confirm.')) {
        return;
    }

    try {
        // This would need to be implemented in FirebaseService
        adminDashboard.showAlert('Clear all data feature needs to be implemented in FirebaseService', 'info');
    } catch (error) {
        console.error('Error clearing data:', error);
        adminDashboard.showAlert('Error clearing data: ' + error.message, 'error');
    }
}

function downloadSystemReport() {
    // TODO: Generate and download system report
    adminDashboard.showAlert('System report feature coming soon', 'info');
}

// Initialize admin dashboard when page loads
let adminDashboard;

// Wait for both DOM and Firebase Service to be ready
function initializeAdminDashboard() {
    if (typeof window.FirebaseService === 'undefined') {
        console.log('Waiting for Firebase Service...');
        setTimeout(initializeAdminDashboard, 100);
        return;
    }
    
    try {
        adminDashboard = new AdminDashboard();
        console.log('✅ Admin Dashboard initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Admin Dashboard:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeAdminDashboard);
