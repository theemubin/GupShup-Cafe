import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import toast from 'react-hot-toast';
import styles from './ClaimsAdmin.module.css';

interface ClaimRecord {
  id: string;
  rewardId: string;
  rewardTitle: string;
  campus: string;
  house: string;
  userId: string;
  monthKey: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
  decidedAt?: any;
  decidedBy?: string;
  note?: string;
}

const statusOrder: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };

const ClaimsAdmin: React.FC = () => {
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all'|ClaimRecord['status']>('pending');
  const [houseFilter, setHouseFilter] = useState('all');
  const [campusFilter, setCampusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [decidingIds, setDecidingIds] = useState<string[]>([]);

  useEffect(()=>{
    const qClaims = query(collection(db,'claims'), orderBy('createdAt','desc'));
    const unsub = onSnapshot(qClaims, snap => {
      setClaims(snap.docs.map(d=>({id:d.id, ...(d.data() as any)})));
    });
    return () => unsub();
  },[]);

  const filtered = useMemo(()=>{
    return claims
      .filter(c => (filterStatus==='all'|| c.status===filterStatus))
      .filter(c => (houseFilter==='all'|| c.house===houseFilter))
      .filter(c => (campusFilter==='all'|| c.campus===campusFilter))
      .filter(c => !search || c.rewardTitle.toLowerCase().includes(search.toLowerCase()))
      .sort((a,b)=> statusOrder[a.status]-statusOrder[b.status] || (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  },[claims,filterStatus,houseFilter,campusFilter,search]);

  const decide = async (claim: ClaimRecord, status: 'approved'|'rejected') => {
    if(claim.status!=='pending'){ toast('Already decided'); return; }
    setDecidingIds(ids=>[...ids,claim.id]);
    try {
      const ref = doc(db,'claims',claim.id);
      await updateDoc(ref, { status, decidedAt: Timestamp.now() });
      toast.success(status==='approved' ? 'Approved' : 'Rejected');
    } catch(e){
      console.error('Decision failed', e);
      toast.error('Failed');
    } finally {
      setDecidingIds(ids=> ids.filter(id=> id!==claim.id));
    }
  };

  return <div className={styles.wrap}>
    <div className={styles.headBar}>
      <h1>Reward Claims</h1>
      <div className={styles.filters}>
        <input placeholder="Search reward title" value={search} onChange={e=>setSearch(e.target.value)} />
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value as any)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
        <select value={campusFilter} onChange={e=>setCampusFilter(e.target.value)}>
          <option value="all">All Campuses</option>
          {[...new Set(claims.map(c=>c.campus))].map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={houseFilter} onChange={e=>setHouseFilter(e.target.value)}>
          <option value="all">All Houses</option>
          {[...new Set(claims.map(c=>c.house))].map(h=> <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
    </div>
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Reward</th>
            <th>Campus</th>
            <th>House</th>
            <th>Status</th>
            <th>Month</th>
            <th>Requested</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(c=>{
            const deciding = decidingIds.includes(c.id);
            return <tr key={c.id} className={c.status!=='pending'? styles.rowDim:''}>
              <td>{c.rewardTitle}</td>
              <td>{c.campus}</td>
              <td>{c.house}</td>
              <td><span className={`${styles.status} ${styles[c.status]}`}>{c.status}</span></td>
              <td>{c.monthKey}</td>
              <td>{c.createdAt?.seconds ? new Date(c.createdAt.seconds*1000).toLocaleDateString(): ''}</td>
              <td className={styles.actionsCell}>
                <button disabled={deciding || c.status!=='pending'} onClick={()=>decide(c,'approved')} className={styles.approveBtn}>Approve</button>
                <button disabled={deciding || c.status!=='pending'} onClick={()=>decide(c,'rejected')} className={styles.rejectBtn}>Reject</button>
              </td>
            </tr>;
          })}
        </tbody>
      </table>
      {filtered.length===0 && <div className={styles.empty}>No claims found.</div>}
    </div>
  </div>;
};

export default ClaimsAdmin;
