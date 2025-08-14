import React, { useState, useEffect } from 'react';
import styles from './EventPage.module.css';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, doc, updateDoc, arrayUnion, Timestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { FaCalendarAlt, FaUserCircle, FaImages } from 'react-icons/fa';
import { FiCalendar, FiTag, FiChevronRight } from 'react-icons/fi';

export const EventPage = () => {
  const [user] = useAuthState(auth);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [comment, setComment] = useState('');
  const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '', heroImage: '' });
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, type: 'event', ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredEvents = selectedFilter === 'all'
    ? events
    : events.filter(ev => (ev.tags || []).includes(selectedFilter));

  const handleSelect = (event: any) => {
    setSelectedEvent(event);
    setShowModal(true);
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
  };
  const handleShare = (ev: any) => {
    const url = window.location.origin + '/event?ref=' + ev.id;
    navigator.clipboard.writeText(url).then(() => {
      // simple feedback – could be replaced by toast later
      alert('Event link copied to clipboard');
    }).catch(() => alert('Could not copy link'));
  };

  const handleComment = async () => {
    if (!comment.trim() || !selectedEvent || !user) return;
    const commentObj = {
      user: user.displayName || user.email || 'Anonymous',
      time: Timestamp.now().toDate().toLocaleString(),
      text: comment
    };
    await updateDoc(doc(db, 'events', selectedEvent.id), {
      comments: arrayUnion(commentObj)
    });
    setComment('');
  };

  const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setHeroImageFile(e.target.files[0]);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.description || !user) return;
    let heroImageUrl = '';
    if (heroImageFile) {
      // TODO: Upload to Firebase Storage and get URL
      heroImageUrl = URL.createObjectURL(heroImageFile); // TEMP: preview only
    }
    await addDoc(collection(db, 'events'), {
      ...newEvent,
      heroImage: heroImageUrl,
      createdBy: user.displayName || user.email || 'Anonymous',
      createdAt: Timestamp.now(),
      comments: []
    });
    setNewEvent({ title: '', date: '', description: '', heroImage: '' });
    setHeroImageFile(null);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseModal();
    };
    if (showModal) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal]);

  return (
    <div className={styles.eventPageContainer}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarUser}>
          <FaUserCircle size={56} />
          <div className={styles.sidebarUserName}>{user ? (user.displayName || user.email) : 'Guest'}</div>
        </div>
        <div className={styles.sidebarSection}>
          <h4><FaCalendarAlt /> Recent Events</h4>
          <ul className={styles.sidebarEventList}>
            {events.slice(0, 5).map(ev => (
              <li key={ev.id} className={selectedEvent && selectedEvent.id === ev.id ? styles.active : ''} onClick={() => handleSelect(ev)}>
                {ev.title}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.sidebarSection}>
          <h4><FaImages /> Gallery</h4>
          <div className={styles.sidebarGalleryPreview}>
            {events.filter(ev => ev.galleryEmbed).slice(0,3).map(ev => (
              <div key={ev.id} className={styles.galleryThumb}>
                <iframe src={ev.galleryEmbed} title={ev.title} width="100%" height="60" style={{border:0}} />
              </div>
            ))}
          </div>
        </div>
      </aside>
      <div className={styles.heroSection}>
        <h1 className={styles.pageTitle}>News & Events</h1>
        <p className={styles.pageSubtitle}>Stay updated with our latest news and upcoming events</p>
        <div className={styles.filterBar}>
          <button onClick={() => setSelectedFilter('all')} className={selectedFilter === 'all' ? styles.activeFilter : styles.filterBtn}>All</button>
          <button onClick={() => setSelectedFilter('news')} className={selectedFilter === 'news' ? styles.activeFilter : styles.filterBtn}>News</button>
          <button onClick={() => setSelectedFilter('event')} className={selectedFilter === 'event' ? styles.activeFilter : styles.filterBtn}>Events</button>
        </div>
      </div>
      <main className={styles.mainContent}>
        {user && (
          <div className={styles.addEventForm}>
            <h3 className={styles.addEventTitle}>Create New Event</h3>
            <input type="text" placeholder="Event Title" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} className={styles.eventInput} />
            <input type="date" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} className={styles.eventInput} />
            <textarea placeholder="Event Description" value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} className={styles.eventTextarea} />
            <div className={styles.heroImageUploadSection}>
              <label className={styles.heroImageLabel}>Hero Image (cover):</label>
              <input type="file" accept="image/*" onChange={handleHeroImageChange} className={styles.heroImageInput} />
              {heroImageFile && (
                <img src={URL.createObjectURL(heroImageFile)} alt="Preview" className={styles.heroImagePreview} />
              )}
            </div>
            <button className={styles.eventBtn} onClick={handleAddEvent}>Post Event</button>
          </div>
        )}
        {filteredEvents.length === 0 && !loading && (
          <div className={styles.noEventsMsg}>
            No posts found for the selected filter.
            {user && <div className={styles.noEventsCta}>Create the first one above.</div>}
          </div>
        )}
        {loading && (
          <div className={styles.eventGrid} aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className={styles.skeletonCard} key={i}>
                <div className={styles.skeletonImage} />
                <div className={styles.skeletonBody}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonTagRow}>
                    <span className={styles.skeletonTag} />
                    <span className={styles.skeletonTag} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && filteredEvents.length > 0 && (
          <div className={styles.eventGrid}>
            {filteredEvents.map(ev => (
              <div className={styles.eventCard} key={ev.id}>
                <div className={styles.eventCardImageWrap}>
                  <img loading="lazy" src={ev.heroImage || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=800'} alt={ev.title + ' cover image'} className={styles.eventCardImage} />
                  <div className={styles.imageOverlay} />
                  <div className={styles.cardTopMeta}>
                    <span className={styles.typeBadge}>{(ev.type || 'event').toUpperCase()}</span>
                  </div>
                </div>
                <div className={styles.eventCardContent}>
                  <div className={styles.eventCardMeta}>
                    <span className={styles.eventDate}><FiCalendar /> {new Date(ev.date).toLocaleDateString()}</span>
                  </div>
                  <h2 className={styles.eventTitle}>{ev.title}</h2>
                  <p className={styles.eventDescClamp}>{ev.description}</p>
                  <div className={styles.eventTags}>
                    {(ev.tags || []).slice(0,3).map((tag: string, i: number) => (
                      <button type="button" onClick={() => setSelectedFilter(tag)} key={i} className={styles.eventTagBtn}><FiTag /> {tag}</button>
                    ))}
                  </div>
                  <div className={styles.eventCardActions}>
                    <button onClick={() => handleSelect(ev)} className={styles.readMoreBtn}>Read More <FiChevronRight /></button>
                    <button onClick={() => handleShare(ev)} className={styles.shareBtn} aria-label="Copy share link">Share</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {showModal && selectedEvent && (
          <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
            <div className={styles.modalContent} role="dialog" aria-modal="true" aria-label={selectedEvent.title}>
              <img loading="lazy" src={selectedEvent.heroImage || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=800'} alt={selectedEvent.title + ' hero'} className={styles.modalHeroImage} />
              <h2 className={styles.modalTitle}>{selectedEvent.title}</h2>
              <p className={styles.modalDate}><FiCalendar /> {new Date(selectedEvent.date).toLocaleDateString()}</p>
              <p className={styles.modalDesc}>{selectedEvent.description}</p>
              <div className={styles.modalTags}>
                {(selectedEvent.tags || []).map((tag: string, i: number) => (
                  <button key={i} onClick={() => { setSelectedFilter(tag); handleCloseModal(); }} className={styles.eventTagBtn}><FiTag /> {tag}</button>
                ))}
              </div>
              <div className={styles.modalActions}>
                <button onClick={() => handleShare(selectedEvent)} className={styles.shareBtn}>Share</button>
                <button onClick={handleCloseModal} className={styles.closeModalBtn}>Close</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
