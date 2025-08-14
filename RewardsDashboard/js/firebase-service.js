// Firebase Data Service
// Handles all Firebase operations for the rewards dashboard

class FirebaseDataService {
    constructor() {
        // Wait for Firebase to be initialized
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase not loaded. Please include Firebase SDK.');
        }
        
        this.db = firebase.firestore();
        console.log('🔥 Firebase Data Service initialized');
    }

    // ===== UTILITY METHODS =====
    
    async compressImage(file, maxWidth = 300, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                // Calculate new dimensions
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                // Set canvas size
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    // ===== STUDENT OPERATIONS =====
    
    async addStudent(studentData) {
        try {
            const docRef = this.db.collection('students').doc(studentData.studentId);
            await docRef.set({
                ...studentData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Student added:', studentData.studentId);
            return studentData.studentId;
        } catch (error) {
            console.error('Error adding student:', error);
            throw error;
        }
    }

    async updateStudent(studentId, updateData) {
        try {
            await this.db.collection('students').doc(studentId).update({
                ...updateData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Student updated:', studentId);
        } catch (error) {
            console.error('Error updating student:', error);
            throw error;
        }
    }

    async deleteStudent(studentId) {
        try {
            await this.db.collection('students').doc(studentId).delete();
            console.log('Student deleted:', studentId);
        } catch (error) {
            console.error('Error deleting student:', error);
            throw error;
        }
    }

    async getStudent(studentId) {
        try {
            const doc = await this.db.collection('students').doc(studentId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            } else {
                throw new Error('Student not found');
            }
        } catch (error) {
            console.error('Error getting student:', error);
            throw error;
        }
    }

    async getAllStudents() {
        try {
            const snapshot = await this.db.collection('students').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting all students:', error);
            throw error;
        }
    }

    async updateStudentPoints(studentId, pointType, pointAmount, reason) {
        try {
            const studentRef = this.db.collection('students').doc(studentId);
            const studentDoc = await studentRef.get();
            
            if (!studentDoc.exists) {
                throw new Error('Student not found');
            }

            const studentData = studentDoc.data();
            const currentPoints = studentData.points || {};
            
            // Update specific point type
            const updatedPoints = {
                ...currentPoints,
                [pointType]: (currentPoints[pointType] || 0) + pointAmount
            };

            // Calculate new total
            const totalPoints = Object.values(updatedPoints).reduce((sum, points) => sum + points, 0);

            // Update student document
            await studentRef.update({
                points: updatedPoints,
                totalPoints: totalPoints,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Log the transaction
            await this.db.collection('transactions').add({
                studentId,
                studentName: studentData.name,
                pointType,
                pointAmount,
                reason,
                previousTotal: studentData.totalPoints || 0,
                newTotal: totalPoints,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Updated points for ${studentId}: ${pointType} ${pointAmount > 0 ? '+' : ''}${pointAmount}`);
        } catch (error) {
            console.error('Error updating student points:', error);
            throw error;
        }
    }

    // ===== REWARD OPERATIONS =====
    
    async addReward(rewardData) {
        try {
            const docRef = await this.db.collection('rewards').add({
                ...rewardData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Reward added with ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Error adding reward:', error);
            throw error;
        }
    }

    async updateReward(rewardId, updateData) {
        try {
            await this.db.collection('rewards').doc(rewardId).update({
                ...updateData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Reward updated:', rewardId);
        } catch (error) {
            console.error('Error updating reward:', error);
            throw error;
        }
    }

    async deleteReward(rewardId) {
        try {
            await this.db.collection('rewards').doc(rewardId).delete();
            console.log('Reward deleted:', rewardId);
        } catch (error) {
            console.error('Error deleting reward:', error);
            throw error;
        }
    }

    async getAllRewards() {
        try {
            const snapshot = await this.db.collection('rewards').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting all rewards:', error);
            throw error;
        }
    }

    async getRewardsByLevel(level) {
        try {
            const snapshot = await this.db.collection('rewards')
                .where('level', '==', level)
                .get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting rewards by level:', error);
            throw error;
        }
    }

    async getRewardsByCampus(campus) {
        try {
            const snapshot = await this.db.collection('rewards')
                .where('campus', 'in', [campus, 'all'])
                .get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting rewards by campus:', error);
            throw error;
        }
    }

    // ===== HOUSE OPERATIONS =====
    
    async getAllHouses() {
        try {
            const snapshot = await this.db.collection('houses').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting all houses:', error);
            throw error;
        }
    }

    async updateHousePoints(houseId, points, reason) {
        try {
            const houseRef = this.db.collection('houses').doc(houseId);
            const houseDoc = await houseRef.get();
            
            if (!houseDoc.exists) {
                throw new Error('House not found');
            }

            const currentPoints = houseDoc.data().totalPoints || 0;
            const newTotal = currentPoints + points;

            await houseRef.update({
                totalPoints: newTotal,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Log the transaction
            await this.db.collection('house_transactions').add({
                houseId,
                points,
                reason,
                previousTotal: currentPoints,
                newTotal,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Updated house points for ${houseId}: +${points}`);
        } catch (error) {
            console.error('Error updating house points:', error);
            throw error;
        }
    }

    // ===== COMPETITION OPERATIONS =====
    
    async addCompetition(competitionData) {
        try {
            const docRef = await this.db.collection('competitions').add({
                ...competitionData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Competition added with ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Error adding competition:', error);
            throw error;
        }
    }

    async addHouseCompetition(competitionData) {
        const { campus, house, name, points, date } = competitionData;
        const houseId = `${campus}_${house}`;
        
        try {
            // Add competition record
            await this.addCompetition({
                name,
                campus,
                house,
                points,
                date,
                status: 'completed'
            });

            // Update house points
            await this.updateHousePoints(houseId, points, `Competition: ${name}`);
            
            console.log(`House competition added: ${name} - ${points} points to ${house}`);
        } catch (error) {
            console.error('Error adding house competition:', error);
            throw error;
        }
    }

    async deleteCompetition(competitionId) {
        try {
            await this.db.collection('competitions').doc(competitionId).delete();
            console.log('Competition deleted:', competitionId);
        } catch (error) {
            console.error('Error deleting competition:', error);
            throw error;
        }
    }

    async getAllCompetitions() {
        try {
            const snapshot = await this.db.collection('competitions').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting all competitions:', error);
            throw error;
        }
    }

    // ===== CAMPUS OPERATIONS =====
    
    async getAllCampuses() {
        try {
            const snapshot = await this.db.collection('campuses').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting all campuses:', error);
            throw error;
        }
    }

    // ===== LEADERBOARD OPERATIONS =====
    
    async getTopStudents(limit = 10, campus = null) {
        try {
            let query = this.db.collection('students').orderBy('totalPoints', 'desc');
            
            if (campus && campus !== 'all') {
                query = query.where('campus', '==', campus);
            }
            
            const snapshot = await query.limit(limit).get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting top students:', error);
            throw error;
        }
    }

    async getTopHouses(limit = 10, campus = null) {
        try {
            let query = this.db.collection('houses').orderBy('totalPoints', 'desc');
            
            if (campus && campus !== 'all') {
                query = query.where('campus', '==', campus);
            }
            
            const snapshot = await query.limit(limit).get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting top houses:', error);
            throw error;
        }
    }

    async getTopCampuses(limit = 8) {
        try {
            const snapshot = await this.db.collection('campuses')
                .orderBy('points', 'desc')
                .limit(limit)
                .get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting top campuses:', error);
            throw error;
        }
    }

    // ===== BULK OPERATIONS =====
    
    async bulkAddStudents(studentsData) {
        try {
            const batch = this.db.batch();
            const results = [];

            studentsData.forEach(studentData => {
                const docRef = this.db.collection('students').doc(studentData.studentId);
                batch.set(docRef, {
                    ...studentData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                results.push(studentData.studentId);
            });

            await batch.commit();
            console.log(`Bulk added ${results.length} students`);
            return results;
        } catch (error) {
            console.error('Error bulk adding students:', error);
            throw error;
        }
    }

    async bulkAddRewards(rewardsData) {
        try {
            const batch = this.db.batch();
            const results = [];

            rewardsData.forEach(rewardData => {
                const docRef = this.db.collection('rewards').doc();
                batch.set(docRef, {
                    ...rewardData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                results.push(docRef.id);
            });

            await batch.commit();
            console.log(`Bulk added ${results.length} rewards`);
            return results;
        } catch (error) {
            console.error('Error bulk adding rewards:', error);
            throw error;
        }
    }

    // ===== REAL-TIME LISTENERS =====
    
    onStudentsChange(callback, campus = null) {
        let query = this.db.collection('students');
        
        if (campus && campus !== 'all') {
            query = query.where('campus', '==', campus);
        }
        
        return query.onSnapshot(snapshot => {
            const students = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(students);
        });
    }

    onHousesChange(callback, campus = null) {
        let query = this.db.collection('houses');
        
        if (campus && campus !== 'all') {
            query = query.where('campus', '==', campus);
        }
        
        return query.onSnapshot(snapshot => {
            const houses = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(houses);
        });
    }

    onRewardsChange(callback, campus = null) {
        let query = this.db.collection('rewards');
        
        // Note: For campus filtering with rewards that can be 'all' or specific campus,
        // we'll filter on the client side since Firestore doesn't support OR queries easily
        
        return query.onSnapshot(snapshot => {
            let rewards = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Client-side filtering for campus
            if (campus && campus !== 'all') {
                rewards = rewards.filter(reward => 
                    reward.campus === 'all' || reward.campus === campus
                );
            }
            
            callback(rewards);
        });
    }

    onCompetitionsChange(callback, campus = null) {
        let query = this.db.collection('competitions');
        
        // Note: For campus filtering with competitions that can be 'all' or specific campus,
        // we'll filter on the client side since Firestore doesn't support OR queries easily
        
        return query.onSnapshot(snapshot => {
            let competitions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Client-side filtering for campus
            if (campus && campus !== 'all') {
                competitions = competitions.filter(competition => 
                    competition.campus === 'all' || competition.campus === campus
                );
            }
            
            callback(competitions);
        });
    }
}

// Initialize and export the service
let FirebaseService;

// Wait for DOM to be ready before initializing
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 DOM loaded, initializing Firebase Service...');
    try {
        FirebaseService = new FirebaseDataService();
        window.FirebaseService = FirebaseService;
        console.log('✅ Firebase Service ready for use');
    } catch (error) {
        console.error('❌ Failed to initialize Firebase Service:', error);
    }
});

// Export for immediate use if DOM is already ready
if (document.readyState === 'loading') {
    console.log('⏳ DOM still loading, waiting...');
    // DOM hasn't loaded yet
} else {
    console.log('🔄 DOM already loaded, initializing Firebase Service immediately...');
    // DOM is already loaded
    try {
        FirebaseService = new FirebaseDataService();
        window.FirebaseService = FirebaseService;
        console.log('✅ Firebase Service ready for use');
    } catch (error) {
        console.error('❌ Failed to initialize Firebase Service:', error);
    }
}
