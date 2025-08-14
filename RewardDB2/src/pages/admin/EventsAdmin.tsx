import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { FiPlusCircle, FiTrash2 } from 'react-icons/fi';
import styles from './EventsAdmin.module.css';

interface EventItem { id:string; title:string; date:string; description:string; featured?:boolean; comments?:any[]; }

const EventsAdmin: React.FC = () => {
  const [events,setEvents]=useState<EventItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState<'all'|'featured'|'upcoming'|'past'>('all');
  const [newEvent,setNewEvent]=useState({title:'',date:'',description:''});

  useEffect(()=>{const q=query(collection(db,'events'),orderBy('date','desc'));return onSnapshot(q,s=>{setEvents(s.docs.map(d=>({id:d.id,...d.data()} as any)));setLoading(false);});},[]);

  const now=new Date();
  const filtered=events.filter(e=>filter==='featured'?e.featured:filter==='upcoming'?new Date(e.date)>=now:filter==='past'?new Date(e.date)<now:true);

  const add=async()=>{if(!newEvent.title||!newEvent.date)return;await addDoc(collection(db,'events'),{...newEvent,createdAt:Timestamp.now(),createdBy:auth.currentUser?.email||'admin',comments:[],featured:false});setNewEvent({title:'',date:'',description:''});};
  const del=async(e:EventItem)=>{if(!window.confirm('Delete this event?'))return;await deleteDoc(doc(db,'events',e.id));};
  const toggle=async(e:EventItem)=>{await updateDoc(doc(db,'events',e.id),{featured:!e.featured});};

  return <div className={styles.wrap}>
    <header className={styles.header}>
      <h1>Events</h1>
      <div className={styles.filters}>{['all','featured','upcoming','past'].map(f=> <button key={f} className={filter===f?styles.active:styles.filter} onClick={()=>setFilter(f as any)}>{f}</button>)}</div>
    </header>
    <section className={styles.quick}> 
      <h2>Quick Create</h2>
      <div className={styles.row}>
        <input placeholder="Title" value={newEvent.title} onChange={e=>setNewEvent({...newEvent,title:e.target.value})}/>
        <input type="date" value={newEvent.date} onChange={e=>setNewEvent({...newEvent,date:e.target.value})}/>
        <input placeholder="Short description" value={newEvent.description} onChange={e=>setNewEvent({...newEvent,description:e.target.value})}/>
        <button onClick={add}><FiPlusCircle/> Add</button>
      </div>
    </section>
    <section className={styles.tableSection}>
      <h2>All Events ({filtered.length})</h2>
      {loading && <div className={styles.loading}>Loading...</div>}
      {!loading && filtered.length===0 && <div className={styles.empty}>No events.</div>}
      {!loading && filtered.length>0 && <table className={styles.table}><thead><tr><th>Title</th><th>Date</th><th>Featured</th><th>Comments</th><th>Actions</th></tr></thead><tbody>{filtered.map(e=> <tr key={e.id} className={e.featured?styles.featuredRow:undefined}><td>{e.title}</td><td>{new Date(e.date).toLocaleDateString()}</td><td><input type="checkbox" checked={!!e.featured} onChange={()=>toggle(e)}/></td><td>{e.comments?.length||0}</td><td><button className={styles.small} onClick={()=>toggle(e)}>{e.featured?'Unfeature':'Feature'}</button><button className={styles.danger} onClick={()=>del(e)}><FiTrash2/> Delete</button></td></tr>)}</tbody></table>}
    </section>
  </div>;
};

export default EventsAdmin;
