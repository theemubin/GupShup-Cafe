// Multi-Database Service Class
// Handles operations across multiple Firebase databases with sync capabilities

class MultiDatabaseService {
    constructor() {
        this.databases = {};
        this.syncEnabled = false;
        this.syncQueue = [];
    }

    // Add a database connection
    addDatabase(name, firebaseApp, options = {}) {
        this.databases[name] = {
            app: firebaseApp,
            db: firebase.firestore(firebaseApp),
            config: options,
            priority: options.priority || 1
        };
        
        console.log(`📊 Database '${name}' added to multi-database service`);
        return this.databases[name];
    }

    // Get specific database
    getDatabase(name) {
        if (!this.databases[name]) {
            throw new Error(`Database '${name}' not found`);
        }
        return this.databases[name].db;
    }

    // Write to single database
    async writeToDatabase(databaseName, collection, docId, data) {
        try {
            const db = this.getDatabase(databaseName);
            const result = await db.collection(collection).doc(docId).set(data, { merge: true });
            
            console.log(`✅ Data written to ${databaseName}:${collection}/${docId}`);
            return result;
        } catch (error) {
            console.error(`❌ Failed to write to ${databaseName}:`, error);
            throw error;
        }
    }

    // Write to multiple databases (sync)
    async syncWrite(collection, docId, data, targetDatabases = null) {
        const targets = targetDatabases || Object.keys(this.databases);
        const results = {};
        const errors = {};

        // Execute writes in parallel
        const writePromises = targets.map(async (dbName) => {
            try {
                const result = await this.writeToDatabase(dbName, collection, docId, data);
                results[dbName] = result;
                return { database: dbName, success: true, result };
            } catch (error) {
                errors[dbName] = error;
                return { database: dbName, success: false, error };
            }
        });

        const outcomes = await Promise.allSettled(writePromises);
        
        console.log(`🔄 Sync write completed for ${collection}/${docId}`);
        console.log('✅ Successful:', Object.keys(results));
        if (Object.keys(errors).length > 0) {
            console.log('❌ Failed:', Object.keys(errors));
        }

        return {
            success: Object.keys(results),
            failed: errors,
            results: outcomes
        };
    }

    // Read from primary database with fallback
    async readWithFallback(collection, docId, fallbackDatabases = null) {
        const primaryDb = this.getPrimaryDatabase();
        
        try {
            // Try primary database first
            const doc = await primaryDb.collection(collection).doc(docId).get();
            if (doc.exists) {
                console.log(`📖 Data read from primary database: ${collection}/${docId}`);
                return { data: doc.data(), source: 'primary' };
            }
        } catch (error) {
            console.warn('⚠️ Primary database read failed:', error);
        }

        // Try fallback databases
        const fallbacks = fallbackDatabases || this.getFallbackDatabases();
        
        for (const dbName of fallbacks) {
            try {
                const db = this.getDatabase(dbName);
                const doc = await db.collection(collection).doc(docId).get();
                if (doc.exists) {
                    console.log(`📖 Data read from fallback '${dbName}': ${collection}/${docId}`);
                    return { data: doc.data(), source: dbName };
                }
            } catch (error) {
                console.warn(`⚠️ Fallback '${dbName}' read failed:`, error);
            }
        }

        throw new Error(`Document ${collection}/${docId} not found in any database`);
    }

    // Real-time sync listener
    setupRealTimeSync(collection, options = {}) {
        const { 
            sourceDatabase = 'primary',
            targetDatabases = null,
            conflictResolution = 'timestamp' // 'timestamp', 'priority', 'manual'
        } = options;

        const sourceDb = this.getDatabase(sourceDatabase);
        const targets = targetDatabases || Object.keys(this.databases).filter(db => db !== sourceDatabase);

        // Listen to changes in source database
        return sourceDb.collection(collection).onSnapshot(async (snapshot) => {
            const changes = snapshot.docChanges();
            
            for (const change of changes) {
                const docId = change.doc.id;
                const data = change.doc.data();
                
                if (change.type === 'added' || change.type === 'modified') {
                    // Sync to target databases
                    try {
                        await this.syncWrite(collection, docId, data, targets);
                        console.log(`🔄 Real-time sync: ${change.type} ${collection}/${docId}`);
                    } catch (error) {
                        console.error('❌ Real-time sync failed:', error);
                    }
                }
                
                if (change.type === 'removed') {
                    // Sync deletion to target databases
                    await this.syncDelete(collection, docId, targets);
                    console.log(`🗑️ Real-time sync: deleted ${collection}/${docId}`);
                }
            }
        });
    }

    // Sync delete across databases
    async syncDelete(collection, docId, targetDatabases = null) {
        const targets = targetDatabases || Object.keys(this.databases);
        const results = {};

        for (const dbName of targets) {
            try {
                const db = this.getDatabase(dbName);
                await db.collection(collection).doc(docId).delete();
                results[dbName] = { success: true };
                console.log(`🗑️ Deleted from ${dbName}: ${collection}/${docId}`);
            } catch (error) {
                results[dbName] = { success: false, error };
                console.error(`❌ Delete failed in ${dbName}:`, error);
            }
        }

        return results;
    }

    // Get primary database (highest priority)
    getPrimaryDatabase() {
        const primary = Object.entries(this.databases)
            .sort(([,a], [,b]) => b.priority - a.priority)[0];
        
        return primary ? primary[1].db : null;
    }

    // Get fallback databases (excluding primary)
    getFallbackDatabases() {
        const sorted = Object.entries(this.databases)
            .sort(([,a], [,b]) => b.priority - a.priority);
        
        return sorted.slice(1).map(([name]) => name);
    }

    // Database health check
    async healthCheck() {
        const results = {};
        
        for (const [name, config] of Object.entries(this.databases)) {
            try {
                // Try to read a test document or collection
                await config.db.collection('_health_check').limit(1).get();
                results[name] = { status: 'healthy', timestamp: Date.now() };
                console.log(`💚 Database '${name}' is healthy`);
            } catch (error) {
                results[name] = { status: 'unhealthy', error: error.message, timestamp: Date.now() };
                console.error(`💔 Database '${name}' health check failed:`, error);
            }
        }
        
        return results;
    }

    // Get sync statistics
    getSyncStats() {
        return {
            databases: Object.keys(this.databases).length,
            queueSize: this.syncQueue.length,
            syncEnabled: this.syncEnabled,
            primaryDatabase: this.getPrimaryDatabase() ? 'connected' : 'not set'
        };
    }
}

// Initialize Multi-Database Service
window.MultiDBService = new MultiDatabaseService();

console.log('🔥 Multi-Database Service initialized');
