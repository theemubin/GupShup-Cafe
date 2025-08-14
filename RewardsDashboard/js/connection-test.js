// Quick Firebase Connection Test Script
// Run this in browser console to test connections

async function quickConnectionTest() {
    console.log('🔥 Starting Firebase Connection Test...');
    
    // Test Primary Database (efforts-celebrations)
    console.log('\n📊 TESTING PRIMARY DATABASE (efforts-celebrations):');
    try {
        const primaryDb = window.FirebaseConnections.primary.db;
        
        // Test rewards collection
        const rewardsSnapshot = await primaryDb.collection('rewards').limit(3).get();
        console.log(`✅ Rewards collection: ${rewardsSnapshot.size} documents found`);
        rewardsSnapshot.forEach(doc => {
            console.log('  🏆 Reward:', doc.id, doc.data());
        });
        
        // Test competitions collection
        const competitionsSnapshot = await primaryDb.collection('competitions').limit(3).get();
        console.log(`✅ Competitions collection: ${competitionsSnapshot.size} documents found`);
        competitionsSnapshot.forEach(doc => {
            console.log('  🏁 Competition:', doc.id, doc.data());
        });
        
        console.log('✅ Primary database connection successful!');
        
    } catch (error) {
        console.error('❌ Primary database error:', error);
    }
    
    // Test Secondary Database (english-voult-project)
    
    console.log('\n🎉 Connection test completed!');
}

// Auto-run the test
if (typeof window !== 'undefined' && window.FirebaseConnections) {
    quickConnectionTest();
} else {
    console.log('⏳ Waiting for Firebase to initialize...');
    setTimeout(() => {
        if (window.FirebaseConnections) {
            quickConnectionTest();
        } else {
            console.error('❌ Firebase connections not available');
        }
    }, 2000);
}
