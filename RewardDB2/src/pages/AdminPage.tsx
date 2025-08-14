import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { FiHome, FiAward, FiUsers, FiImage, FiSettings, FiLogOut, FiCalendar, FiPlusCircle, FiStar, FiTrash2, FiFilter } from 'react-icons/fi';
import styles from './AdminPage.module.css';

interface EventItem {
  id: string;
  title: string;
  date: string;
  description: string;
  heroImage?: string;
  createdBy?: string;
  createdAt?: any;
  type?: string;
  tags?: string[];
  comments?: any[];
  featured?: boolean;
}

const AdminPage: React.FC = () => {
  const [user] = useAuthState(auth);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filter, setFilter] = useState<'all'|'featured'|'upcoming'|'past'>('all');
  const [newQuickEvent, setNewQuickEvent] = useState({ title: '', date: '', description: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const list: EventItem[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setEvents(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleFeatured = async (ev: EventItem) => {
    await updateDoc(doc(db, 'events', ev.id), { featured: !ev.featured });
  };
  const removeEvent = async (ev: EventItem) => {
    if (!window.confirm('Delete this event?')) return;
    await deleteDoc(doc(db, 'events', ev.id));
  };
  const addQuick = async () => {
    if (!newQuickEvent.title || !newQuickEvent.date) return;
    await addDoc(collection(db, 'events'), {
      ...newQuickEvent,
      createdAt: Timestamp.now(),
      createdBy: user?.email || 'admin',
      type: 'event',
      comments: [],
      featured: false
    });
    setNewQuickEvent({ title: '', date: '', description: '' });
  };

  const now = new Date();
  const filtered = events.filter(ev => {
    if (filter === 'featured') return !!ev.featured;
    if (filter === 'upcoming') return new Date(ev.date) >= now;
    if (filter === 'past') return new Date(ev.date) < now;
    return true;
  });

  // Simple derived metrics for overview
  const total = events.length;
  const upcomingCount = events.filter(e => new Date(e.date) >= now).length;
  const pastCount = events.filter(e => new Date(e.date) < now).length;
  const featuredCount = events.filter(e => e.featured).length;
  const commentsCount = events.reduce((acc, e) => acc + (e.comments?.length || 0), 0);

  if (!user) {
    return <div className={styles.adminContainer}>Please log in (admin only).</div>;
  }

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Admin</div>
        <nav className={styles.navSection} aria-label="Primary">
          <Link to="/" className={styles.navItem}><FiHome /> <span>Home</span></Link>
          <a href="#events" className={styles.navItem}><FiCalendar /> <span>Events</span></a>
          <a href="#create" className={styles.navItem}><FiPlusCircle /> <span>Create</span></a>
          <a href="#featured" className={styles.navItem}><FiStar /> <span>Featured</span></a>
          <a href="#media" className={styles.navItem}><FiImage /> <span>Media</span></a>
          <a href="#users" className={styles.navItem}><FiUsers /> <span>Users</span></a>
          <a href="#rewards" className={styles.navItem}><FiAward /> <span>Rewards</span></a>
          <a href="#settings" className={styles.navItem}><FiSettings /> <span>Settings</span></a>
        </nav>
        <div className={styles.sidebarFooter}>
          <button className={styles.logoutBtn} onClick={()=>auth.signOut()}><FiLogOut /> <span>Logout</span></button>
        </div>
      </aside>
      <main className={styles.mainContent}>
        <header className={styles.adminHeader}>
          <h1>Admin Dashboard</h1>
          <div className={styles.filters}>
            {['all','featured','upcoming','past'].map(f => (
              <button key={f} onClick={() => setFilter(f as any)} className={filter===f?styles.activeFilterBtn:styles.filterBtn}><FiFilter /> {f}</button>
            ))}
          </div>
        </header>
        <section id="overview" className={styles.overviewSection}>
          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Total Events</span>
              <span className={styles.metricValue}>{total}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Upcoming</span>
              <span className={styles.metricValue}>{upcomingCount}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Past</span>
              <span className={styles.metricValue}>{pastCount}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Featured</span>
              <span className={styles.metricValue}>{featuredCount}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Total Comments</span>
              <span className={styles.metricValue}>{commentsCount}</span>
            </div>
          </div>
        </section>
        <section id="create" className={styles.quickCreate}>
          <h2>Quick Create</h2>
          <div className={styles.quickFormRow}>
            <input placeholder="Title" value={newQuickEvent.title} onChange={e=>setNewQuickEvent({...newQuickEvent,title:e.target.value})} />
            <input type="date" value={newQuickEvent.date} onChange={e=>setNewQuickEvent({...newQuickEvent,date:e.target.value})} />
            <input placeholder="Short description" value={newQuickEvent.description} onChange={e=>setNewQuickEvent({...newQuickEvent,description:e.target.value})} />
            <button onClick={addQuick}><FiPlusCircle /> Add</button>
          </div>
        </section>
        <section id="events" className={styles.eventTableSection}>
          <h2>Events ({filtered.length})</h2>
          {loading && <div className={styles.loading}>Loading...</div>}
          {!loading && filtered.length===0 && <div className={styles.empty}>No events for this filter.</div>}
          {!loading && filtered.length>0 && (
            <table className={styles.eventTable}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Featured</th>
                  <th>Comments</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ev => (
                  <tr key={ev.id} id={ev.featured ? 'featured' : undefined}>
                    <td>{ev.title}</td>
                    <td>{new Date(ev.date).toLocaleDateString()}</td>
                    <td>
                      <input type="checkbox" checked={!!ev.featured} onChange={()=>toggleFeatured(ev)} />
                    </td>
                    <td>{ev.comments?.length || 0}</td>
                    <td>
                      <button className={styles.smallBtn} onClick={()=>toggleFeatured(ev)}>{ev.featured?'Unfeature':'Feature'}</button>
                      <button className={styles.smallBtnDanger} onClick={()=>removeEvent(ev)}><FiTrash2 /> Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section id="rewards" className={styles.placeholderSection}>
          <h2>Rewards (Coming Soon)</h2>
          <p className={styles.placeholderText}>Manage reward tiers, point values, redemption inventory, and distribution logs here.</p>
        </section>
        <section id="users" className={styles.placeholderSection}>
          <h2>Users (Coming Soon)</h2>
          <p className={styles.placeholderText}>User directory, roles, and participation metrics will appear in this panel.</p>
        </section>
        <section id="media" className={styles.placeholderSection}>
          <h2>Media Library (Coming Soon)</h2>
          <p className={styles.placeholderText}>Centralize uploaded hero images, event galleries, and reusable assets.</p>
        </section>
        <section id="settings" className={styles.placeholderSection}>
          <h2>Settings (Coming Soon)</h2>
          <p className={styles.placeholderText}>Configure platform branding, feature flags, and integration keys.</p>
        </section>
      </main>
    </div>
  );
};

export default AdminPage;
