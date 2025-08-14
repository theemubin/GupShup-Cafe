// Multi-Database Implementation Example
// Shows how to use multiple Firebase databases in your rewards system

// Usage Examples for Multi-Database Setup

class RewardsMultiDBManager {
    constructor() {
        this.multiDB = window.MultiDBService;
        this.setupDatabases();
    }

    async setupDatabases() {
        // Add your primary database (current one)
        this.multiDB.addDatabase('primary', window.FirebaseConnections.primary.app, {
            priority: 3,
            type: 'production'
        });

        // Add secondary database (backup/staging)
        if (window.FirebaseConnections.secondary) {
            this.multiDB.addDatabase('backup', window.FirebaseConnections.secondary.app, {
                priority: 2,
                type: 'backup'
            });
        }

        // Setup real-time sync between databases
        this.setupSyncListeners();
    }

    setupSyncListeners() {
        // Sync rewards collection
        this.multiDB.setupRealTimeSync('rewards', {
            sourceDatabase: 'primary',
            targetDatabases: ['backup']
        });

        // Sync competitions collection
        this.multiDB.setupRealTimeSync('competitions', {
            sourceDatabase: 'primary',
            targetDatabases: ['backup']
        });

        console.log('🔄 Real-time sync enabled for rewards and competitions');
    }

    // Save reward to multiple databases
    async saveReward(rewardData) {
        try {
            const rewardId = rewardData.id || `reward_${Date.now()}`;
            
            // Write to multiple databases simultaneously
            const result = await this.multiDB.syncWrite('rewards', rewardId, {
                ...rewardData,
                id: rewardId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastModified: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('💾 Reward saved to multiple databases:', result.success);
            return { success: true, id: rewardId, databases: result.success };
        } catch (error) {
            console.error('❌ Failed to save reward:', error);
            throw error;
        }
    }

    // Get reward with fallback support
    async getReward(rewardId) {
        try {
            const result = await this.multiDB.readWithFallback('rewards', rewardId);
            console.log(`📖 Reward loaded from ${result.source} database`);
            return result.data;
        } catch (error) {
            console.error('❌ Failed to load reward:', error);
            return null;
        }
    }

    // Save competition to multiple databases
    async saveCompetition(competitionData) {
        try {
            const competitionId = competitionData.id || `comp_${Date.now()}`;
            
            const result = await this.multiDB.syncWrite('competitions', competitionId, {
                ...competitionData,
                id: competitionId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastModified: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('🏆 Competition saved to multiple databases:', result.success);
            return { success: true, id: competitionId, databases: result.success };
        } catch (error) {
            console.error('❌ Failed to save competition:', error);
            throw error;
        }
    }

    // Sync existing data from primary to backup
    async syncExistingData() {
        console.log('🔄 Starting data sync from primary to backup...');
        
        try {
            const primaryDb = this.multiDB.getDatabase('primary');
            
            // Sync rewards
            const rewardsSnapshot = await primaryDb.collection('rewards').get();
            for (const doc of rewardsSnapshot.docs) {
                await this.multiDB.syncWrite('rewards', doc.id, doc.data(), ['backup']);
            }
            console.log(`✅ Synced ${rewardsSnapshot.size} rewards`);

            // Sync competitions
            const competitionsSnapshot = await primaryDb.collection('competitions').get();
            for (const doc of competitionsSnapshot.docs) {
                await this.multiDB.syncWrite('competitions', doc.id, doc.data(), ['backup']);
            }
            console.log(`✅ Synced ${competitionsSnapshot.size} competitions`);

            console.log('🎉 Data sync completed successfully');
        } catch (error) {
            console.error('❌ Data sync failed:', error);
            throw error;
        }
    }

    // Database health monitoring
    async monitorDatabases() {
        const health = await this.multiDB.healthCheck();
        
        // Update UI or alert if databases are unhealthy
        const unhealthyDbs = Object.entries(health)
            .filter(([, status]) => status.status === 'unhealthy')
            .map(([name]) => name);

        if (unhealthyDbs.length > 0) {
            console.warn('⚠️ Unhealthy databases detected:', unhealthyDbs);
            // You could show a notification to users or admins
            this.showDatabaseAlert(unhealthyDbs);
        }

        return health;
    }

    showDatabaseAlert(unhealthyDbs) {
        // Show alert in UI
        const alertDiv = document.createElement('div');
        alertDiv.className = 'database-alert';
        alertDiv.innerHTML = `
            <div class="alert alert-warning">
                <strong>⚠️ Database Connection Issues</strong><br>
                Some backup databases are currently unavailable: ${unhealthyDbs.join(', ')}<br>
                Your data is still safe in the primary database.
            </div>
        `;
        document.body.appendChild(alertDiv);

        // Auto-remove after 10 seconds
        setTimeout(() => alertDiv.remove(), 10000);
    }
}

// Integration with existing Firebase service
if (window.FirebaseDataService) {
    // Extend existing service with multi-database capabilities
    const originalService = window.FirebaseDataService;
    
    class EnhancedFirebaseService extends originalService {
        constructor() {
            super();
            this.multiDBManager = new RewardsMultiDBManager();
        }

        // Override saveReward to use multi-database
        async saveReward(rewardData) {
            try {
                // Save to multiple databases
                const multiResult = await this.multiDBManager.saveReward(rewardData);
                
                // Also update local state (existing functionality)
                if (window.DashboardState && window.DashboardState.rewards) {
                    const existingIndex = window.DashboardState.rewards.findIndex(r => r.id === rewardData.id);
                    if (existingIndex >= 0) {
                        window.DashboardState.rewards[existingIndex] = rewardData;
                    } else {
                        window.DashboardState.rewards.push(rewardData);
                    }
                }

                return multiResult;
            } catch (error) {
                // Fallback to original method if multi-database fails
                console.warn('Multi-database save failed, using single database fallback');
                return super.saveReward(rewardData);
            }
        }

        // Override getRewards to use fallback support
        async getRewards() {
            try {
                // Try multi-database approach first
                const primaryDb = this.multiDBManager.multiDB.getDatabase('primary');
                const snapshot = await primaryDb.collection('rewards').get();
                
                if (snapshot.empty) {
                    // Try backup database
                    console.log('Primary database empty, trying backup...');
                    const backupDb = this.multiDBManager.multiDB.getDatabase('backup');
                    const backupSnapshot = await backupDb.collection('rewards').get();
                    
                    if (!backupSnapshot.empty) {
                        console.log('📖 Loading rewards from backup database');
                        return backupSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    }
                }

                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error('Multi-database read failed, using fallback:', error);
                return super.getRewards();
            }
        }
    }

    // Replace the global service
    window.FirebaseDataService = new EnhancedFirebaseService();
    console.log('🔄 Firebase service enhanced with multi-database support');
}

console.log('🚀 Multi-Database Rewards Manager initialized');
