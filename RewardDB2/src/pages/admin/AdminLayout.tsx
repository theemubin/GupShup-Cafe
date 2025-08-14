import React from 'react';
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FiAward, FiUsers, FiImage, FiSettings, FiLogOut, FiCalendar, FiClipboard, FiUpload } from 'react-icons/fi';
import { auth } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import styles from './AdminLayout.module.css';

const AdminLayout: React.FC = () => {
  const [user, loading] = useAuthState(auth);
  const location = useLocation();
  const navigate = useNavigate();

  // remember last section
  React.useEffect(()=>{
    if(location.pathname.startsWith('/admin/') && location.pathname !== '/admin'){
      localStorage.setItem('admin:last', location.pathname);
    }
  },[location.pathname]);

  // if user hits /admin exactly, redirect to last remembered section
  React.useEffect(() => {
    if (!loading && user && location.pathname === '/admin') {
      const last = localStorage.getItem('admin:last');
      // Only redirect if last is set and not /admin
      if (last && last !== '/admin') {
        navigate(last, { replace: true });
      } else if (!last) {
        navigate('/admin/events', { replace: true });
      }
    }
  }, [loading, user, location.pathname, navigate]);
  if (loading) {
    return <div className={styles.loadingShell}>Checking session...</div>;
  }
  if(!user){
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Admin</div>
        <nav className={styles.nav}>
          <NavLink to="events" className={({isActive})=> isActive?`${styles.link} ${styles.active}`:styles.link}><FiCalendar/> <span>Events</span></NavLink>
          <NavLink to="rewards" className={({isActive})=> isActive?`${styles.link} ${styles.active}`:styles.link}><FiAward/> <span>Rewards</span></NavLink>
          <NavLink to="claims" className={({isActive})=> isActive?`${styles.link} ${styles.active}`:styles.link}><FiClipboard/> <span>Claims</span></NavLink>
          <NavLink to="users" className={({isActive})=> isActive?`${styles.link} ${styles.active}`:styles.link}><FiUsers/> <span>Users</span></NavLink>
          <NavLink to="media" className={({isActive})=> isActive?`${styles.link} ${styles.active}`:styles.link}><FiImage/> <span>Media</span></NavLink>
          <NavLink to="points-upload" className={({isActive})=> isActive?`${styles.link} ${styles.active}`:styles.link}><FiUpload/> <span>Points Upload</span></NavLink>
          <NavLink to="settings" className={({isActive})=> isActive?`${styles.link} ${styles.active}`:styles.link}><FiSettings/> <span>Settings</span></NavLink>
        </nav>
        <button className={styles.logout} onClick={()=>auth.signOut()}><FiLogOut/> <span>Logout</span></button>
      </aside>
      <main className={styles.main}>
        <Outlet/>
      </main>
    </div>
  );
};

export default AdminLayout;
