import React from 'react';
import { Toaster } from 'react-hot-toast';
import ThemeProvider from './components/ThemeProvider';
import { CampusProvider } from './contexts/CampusContext';
import { Navbar } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { RewardsSection } from './components/RewardsSection';
import { LeaderboardSection } from './components/LeaderboardSection';
import { HeroSection } from './components/HeroSection';
import LoginPage from './pages/LoginPage';
import { EventPage } from './pages/EventPage';
import AdminLayout from './pages/admin/AdminLayout';
import EventsAdmin from './pages/admin/EventsAdmin';
import RewardsAdmin from './pages/admin/RewardsAdmin';
import PointsUploadAdmin from './pages/admin/PointsUploadAdmin';
import UsersAdmin from './pages/admin/UsersAdmin';
import MediaAdmin from './pages/admin/MediaAdmin';
import SettingsAdmin from './pages/admin/SettingsAdmin';
import ClaimsAdmin from './pages/admin/ClaimsAdmin';
import './index.css';
import { campusList } from './components/campusList';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import UserOnboardingModal from './components/UserOnboardingModal';
import { auth, db } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const houseList = ['Malhar', 'Bageshree', 'Bhairav'];

interface UserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  campus?: string;
  house?: string;
  createdAt?: any;
  updatedAt?: any;
}

function App() {
  const [user] = useAuthState(auth);
  const [showOnboarding, setShowOnboarding] = React.useState<boolean>(false);

  // Load or create user profile
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) {
        setShowOnboarding(false);
        return;
      }
      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
            await setDoc(ref, newProfile, { merge: true });
          if (!cancelled) {
            setShowOnboarding(true); // needs campus & house
          }
        } else {
          const data = snap.data() as UserProfile;
          if (!cancelled) {
            setShowOnboarding(!data.campus || !data.house);
          }
        }
      } catch (e) {
        console.error('Failed loading user profile', e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleOnboarding = async (campus: string, house: string) => {
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid);
      await updateDoc(ref, { campus, house, updatedAt: serverTimestamp() });
      setShowOnboarding(false);
    } catch (e) {
      console.error('Failed to update onboarding info', e);
    }
  };

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ style: { background: '#182a36', color: '#fff', fontWeight: 500, borderRadius: 10 } }} />
      <ThemeProvider>
        <CampusProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/event" element={<EventPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<EventsAdmin />} />
              <Route path="events" element={<EventsAdmin />} />
              <Route path="rewards" element={<RewardsAdmin />} />
              <Route path="users" element={<UsersAdmin />} />
              <Route path="claims" element={<ClaimsAdmin />} />
              <Route path="media" element={<MediaAdmin />} />
              <Route path="points-upload" element={<PointsUploadAdmin />} />
              <Route path="settings" element={<SettingsAdmin />} />
              <Route path="*" element={<Navigate to="events" replace />} />
            </Route>
            <Route path="/" element={
              <>
                <Toaster position="top-right" toastOptions={{ style: { background: '#182a36', color: '#fff', fontWeight: 500, borderRadius: 10 } }} />
                <HeroSection />
                <Navbar />
                <DashboardOverview id="dashboard" />
                <RewardsSection id="rewards" />
                <LeaderboardSection id="leaderboard" />
              </>
            } />
          </Routes>
          <footer className="site-footer">
            <div className="footer-columns footer-three-cols">
              <div className="footer-sitemap">
                <h4>Sitemap</h4>
                <ul>
                  <li><a href="#dashboard">Dashboard</a></li>
                  <li><a href="#rewards">Rewards</a></li>
                  <li><a href="#leaderboard">Leaderboard</a></li>
                  <li><a href="#request">Request Rewards</a></li>
                  <li><a href="/event" style={{ color: '#00e6d2', fontWeight: 600 }}>Events</a></li>
                  <li><Link to="/login" style={{ color: '#1ed760', fontWeight: 600 }}>Login</Link></li>
                  <li><Link to="/admin" style={{ color: '#fff', fontWeight: 600 }}>Admin</Link></li>
                </ul>
              </div>
              <div className="footer-calendar-col">
                <h4>Upcoming Events</h4>
                <ul className="footer-calendar-list">
                  <li><strong>Sep 5:</strong> Teachers' Day</li>
                  <li><strong>Sep 20:</strong> Sports Fest</li>
                  <li><em>More events coming soon...</em></li>
                </ul>
              </div>
              <div className="footer-calendar-col footer-calendar-past">
                <h4>Past Events</h4>
                <ul className="footer-calendar-list">
                  <li><strong>Aug 15:</strong> Independence Day Celebration</li>
                  <li><strong>Aug 22:</strong> Coding Contest</li>
                </ul>
              </div>
            </div>
            <div className="footer-bottom-message">
              Made with <span style={{ color: '#ff0058', fontWeight: 700 }}>&#10084;</span> for Navgurukul Partners.
            </div>
          </footer>
          <UserOnboardingModal
            open={!!user && showOnboarding}
            campusList={campusList || []}
            houseList={houseList || []}
            onSubmit={handleOnboarding}
          />
        </CampusProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
