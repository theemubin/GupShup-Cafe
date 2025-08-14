import React from 'react';
// Child component to handle image error state per reward
const RewardImage = ({ imageUrl, title }: { imageUrl?: string, title: string }) => {
  let imgUrl = imageUrl;
  if (imgUrl && imgUrl.includes('drive.google.com/file/d/')) {
    const match = imgUrl.match(/\/d\/([\w-]+)/);
    if (match && match[1]) {
      imgUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }
  const [imgError, setImgError] = React.useState(false);
  React.useEffect(() => { setImgError(false); }, [imgUrl]);
  if (!imgUrl || imgError) {
    return <div className="reward-image" style={{display:'flex',alignItems:'center',justifyContent:'center',color:'#888',fontSize:13,background:'#222'}}>Image not available</div>;
  }
  return (
    <div className="reward-image" style={{backgroundImage:`url(${imgUrl})`,backgroundSize:'cover',backgroundPosition:'center',position:'relative'}}>
      <img src={imgUrl} alt={title} style={{position:'absolute',width:'100%',height:'100%',objectFit:'cover',opacity:0}} onError={()=>setImgError(true)} />
    </div>
  );
};

import { useEffect, useMemo, useState } from 'react';
import './RewardsSection.css';
import { useCampus } from '../contexts/CampusContext';
import { campusList } from './campusList';
import { collection, onSnapshot, orderBy, query, where, getDocs, addDoc, Timestamp, doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { useUserProfile } from '../hooks/useUserProfile';
import toast from 'react-hot-toast';

interface RewardRecord {
  id: string;
  title: string;
  description: string;
  level: number;
  category: string;
  campus: string;
  pointsCost: number;
  stock?: number;
  imageUrl?: string;
  externalLink?: string;
  active: boolean;
  likes?: number;
}


export const RewardsSection = ({ id }: { id?: string }) => {
  const { campusLevel } = useCampus();
  const [levelFilter, setLevelFilter] = useState<'all'|number>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all'|string>('all');
  const [campusFilter, setCampusFilter] = useState('all');
  const [showLocked, setShowLocked] = useState(false);
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const { user, profile } = useUserProfile();
  const [claimingIds, setClaimingIds] = useState<string[]>([]);
  const [claimedIds, setClaimedIds] = useState<string[]>([]); // claimed (pending/approved) this month by this house
  const [claimDetails, setClaimDetails] = useState<Record<string,{createdAt?: any; decidedAt?: any; status?: string}>>({});
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [likeLoading, setLikeLoading] = useState<string[]>([]);
  // Removed approvedMap state (aggregate display not needed now)

  useEffect(()=>{
    const qRewards = query(collection(db,'rewards'), orderBy('level','asc'));
    const unsub = onSnapshot(qRewards, snap => {
      setRewards(snap.docs.map(d=>({id:d.id, ...(d.data() as any)})));
      setLoading(false);
    });
    return () => unsub();
  },[]);

  // Load user's liked rewards mapping
  useEffect(()=>{
    if(!user) { setLikedSet(new Set()); return; }
    const qLikes = query(collection(db,'rewardLikes'), where('userId','==', user.uid));
    const unsub = onSnapshot(qLikes, snap => {
      const s = new Set<string>();
      snap.docs.forEach(d=> { const data = d.data() as any; if(data.rewardId) s.add(data.rewardId); });
      setLikedSet(s);
    });
    return () => unsub();
  },[user]);

  const toggleLike = async (reward: RewardRecord) => {
    if(!user){ toast.error('Login required'); return; }
    if(likeLoading.includes(reward.id)) return;
    setLikeLoading(ids=>[...ids,reward.id]);
    const likeDocId = `${user.uid}_${reward.id}`;
    const likeDocRef = doc(db,'rewardLikes', likeDocId);
    const rewardRef = doc(db,'rewards', reward.id);
    try {
      await runTransaction(db, async (trx) => {
        const likeSnap = await trx.get(likeDocRef);
        const rewardSnap = await trx.get(rewardRef);
        const currentLikes = (rewardSnap.exists() && (rewardSnap.data() as any).likes) || 0;
        if(likeSnap.exists()) {
          // unlike
            trx.delete(likeDocRef);
            trx.update(rewardRef, { likes: currentLikes > 0 ? currentLikes - 1 : 0 });
        } else {
          trx.set(likeDocRef, { userId: user.uid, rewardId: reward.id, createdAt: Timestamp.now() });
          trx.update(rewardRef, { likes: currentLikes + 1 });
        }
      });
    } catch(e){
      console.error('like toggle failed', e);
      toast.error('Failed');
    } finally {
      setLikeLoading(ids=> ids.filter(id=> id!==reward.id));
    }
  };

  const filtered = useMemo(() => {
    return rewards.filter(r =>
      (levelFilter==='all'|| r.level === levelFilter)
      && (categoryFilter==='all'|| r.category === categoryFilter)
      && (campusFilter==='all' || r.campus === campusFilter || r.campus === 'All Campus')
      && (showLocked ? true : r.level <= campusLevel)
    );
  }, [rewards, levelFilter, categoryFilter, campusFilter, showLocked, campusLevel]);

  const topRewards = useMemo(()=> {
    return [...rewards]
      .filter(r => (r.likes||0) > 0)
      .sort((a,b)=> (b.likes||0) - (a.likes||0))
      .slice(0,5);
  },[rewards]);
  const carouselRef = React.useRef<HTMLDivElement|null>(null);
  const scrollCarousel = (dir:number)=>{
    if(!carouselRef.current) return;
    const width = carouselRef.current.clientWidth;
    carouselRef.current.scrollBy({left: dir * (width * 0.8), behavior:'smooth'});
  };
  // Auto-scroll logic
  React.useEffect(()=>{
    if(!carouselRef.current) return;
    let paused = false;
    const el = carouselRef.current;
    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    const id = setInterval(()=>{
      if(paused || !carouselRef.current) return;
      const c = carouselRef.current;
      const maxScroll = c.scrollWidth - c.clientWidth - 4;
      if(c.scrollLeft >= maxScroll){
        c.scrollTo({left:0, behavior:'smooth'});
      } else {
        scrollCarousel(1);
      }
    }, 4000);
    return ()=>{
      clearInterval(id);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  },[topRewards.length]);

  // Determine start of current month for claim uniqueness window
  const monthKey = React.useMemo(()=>{
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  },[]);

  // Load claimed reward ids for current house+month
  useEffect(()=>{
    const load = async () => {
      if(!profile?.house) { setClaimedIds([]); return; }
      try {
        const claimsRef = collection(db,'claims');
        const qClaims = query(
          claimsRef,
          where('house','==', profile.house),
          where('monthKey','==', monthKey)
        );
        const snap = await getDocs(qClaims);
        const latest: Record<string, any> = {};
        snap.docs.forEach(d=>{
          const data = d.data() as any;
          const existing = latest[data.rewardId];
          if(!existing || (data.createdAt?.seconds||0) > (existing.createdAt?.seconds||0)){
            latest[data.rewardId] = data;
          }
        });
        const ids: string[] = [];
        const meta: Record<string,{createdAt?: any; decidedAt?: any; status?: string}> = {};
        Object.values(latest).forEach((data:any)=>{
          meta[data.rewardId] = { createdAt: data.createdAt, decidedAt: data.decidedAt, status: data.status };
          if(data.status !== 'rejected') ids.push(data.rewardId); // only pending/approved block re-claim
        });
        setClaimedIds(ids);
        setClaimDetails(meta);
      } catch(e){ console.error('Failed loading claims', e); }
    };
    load();
  },[profile?.house, monthKey]);

  // (Aggregate approved claims subscription removed)

  const handleClaim = async (reward: RewardRecord) => {
    if(!user){ toast.error('Login required'); return; }
    if(!profile?.campus || !profile?.house){ toast.error('Complete onboarding first'); return; }
    if(reward.level > campusLevel){ toast.error('Campus level too low'); return; }
    if(claimedIds.includes(reward.id)){
      // Already pending or approved
      toast('Already claimed this month');
      return;
    }
    setClaimingIds(ids=>[...ids,reward.id]);
    try {
      // Re-check uniqueness just before writing
      const claimsRef = collection(db,'claims');
      const qDup = query(
        claimsRef,
        where('house','==', profile.house),
        where('monthKey','==', monthKey),
        where('rewardId','==', reward.id)
      );
      const dupSnap = await getDocs(qDup);
      if(!dupSnap.empty){
        // Allow new claim only if all existing are rejected
        const blocking = dupSnap.docs.some(d => {
          const st = (d.data() as any).status; return st !== 'rejected';
        });
        if(blocking){
          toast('Already claimed');
          // update local state in case changed elsewhere
          setClaimedIds(prev=> prev.includes(reward.id)? prev : [...prev, reward.id]);
          return;
        }
      }
      await addDoc(claimsRef, {
        rewardId: reward.id,
        rewardTitle: reward.title,
        campus: profile.campus,
        house: profile.house,
        userId: user.uid,
        monthKey,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      toast.success('Claim submitted for approval');
      setClaimedIds(prev=>[...prev,reward.id]);
    } catch(e){
      console.error('Claim failed', e);
      toast.error('Failed to submit claim');
    } finally {
      setClaimingIds(ids=> ids.filter(id=> id!==reward.id));
    }
  };

  return (
    <section className="rewards-section" id={id}>
       <div className="section-header">
         <h2>Campus Rewards</h2>
         <p>Your campus level: <strong className="campus-level">{campusLevel}</strong>. Unlock higher tier rewards by progressing on Etiocracy.</p>
       </div>
      {topRewards.length > 0 && (
        <div className="popular-carousel-wrap">
          <div className="popular-head">
            <h3>Popular Rewards</h3>
            <div className="popular-actions">
              <button aria-label="Scroll left" onClick={()=>scrollCarousel(-1)}>&lt;</button>
              <button aria-label="Scroll right" onClick={()=>scrollCarousel(1)}>&gt;</button>
            </div>
          </div>
          <div className="popular-carousel" ref={carouselRef}>
            {topRewards.map(r => {
              return (
                <div key={r.id} className="popular-slide" aria-label={`Popular reward ${r.title}`}> 
                  <div className="popular-overlay-badges">
                    <span className="popular-campus-badge">{r.campus}</span>
                    <span className="popular-level-badge">Lvl {r.level}</span>
                    <span className="popular-likes-badge">{r.likes||0} ♥</span>
                  </div>
                  <RewardImage imageUrl={r.imageUrl} title={r.title} />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {showDebug && (
        <pre style={{background:'#181c24',color:'#fff',padding:12,margin:'12px 0',borderRadius:8,overflowX:'auto',fontSize:13}}>
          {JSON.stringify(rewards,null,2)}
        </pre>
      )}
      <div className="rewards-filters">
        <select className="rewards-filter" value={campusFilter} onChange={e=> setCampusFilter(e.target.value)}>
          <option value="all">All Campuses</option>
          {campusList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="rewards-filter" value={levelFilter === 'all'? 'all': String(levelFilter)} onChange={e=> setLevelFilter(e.target.value==='all' ? 'all' : Number(e.target.value))}>
          <option value="all">All Levels</option>
          {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
        </select>
        <select className="rewards-filter" value={categoryFilter} onChange={e=> setCategoryFilter(e.target.value as any)}>
          <option value="all">All Categories</option>
          <option value="Academic">Academic</option>
          <option value="Cultural">Cultural</option>
          <option value="Overall">Overall</option>
        </select>
        <label style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.85rem',color:'var(--color-text-muted)'}}>
          <input type="checkbox" checked={showLocked} onChange={e=>setShowLocked(e.target.checked)} /> Show locked
        </label>
      </div>
      {loading ? <div style={{padding:'1.2rem',color:'#8fa4ba'}}>Loading rewards...</div> : (
      <div className="rewards-grid">
        {filtered.map(r => {
          const unlocked = campusLevel >= r.level;
          const status = claimDetails[r.id]?.status; // last status for this month (house)
          const isClaiming = claimingIds.includes(r.id);
          const alreadyClaimed = claimedIds.includes(r.id); // pending or approved
          const liked = likedSet.has(r.id);
          return (
            <div className={`reward-card ${unlocked? 'unlocked':'locked'}`} key={r.id} aria-disabled={!unlocked}>
              <RewardImage imageUrl={r.imageUrl} title={r.title} />
              <div className="reward-info">
                <h4>{r.title}</h4>
                <p className="reward-desc">{r.description}</p>
                <div className="reward-meta">
                  Level {r.level} • {unlocked? <span className="status-unlocked">Unlocked</span>: <span className="status-locked">Locked</span>}
                  <span style={{marginLeft:8,background:'#00e6d2',color:'#0b0d12',fontSize:'.7em',borderRadius:6,padding:'2px 7px',fontWeight:600,verticalAlign:'middle'}}>{r.campus}</span>
                </div>
                {r.externalLink && <a href={r.externalLink} target="_blank" rel="noopener noreferrer" className="claim-btn" style={{marginBottom:6,display:'inline-block',background:'#1ed760'}}>Go to Link</a>}
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  <button className={`claim-btn ${status==='approved' ? 'claimed':''}`} disabled={!unlocked || (alreadyClaimed && status!=='rejected') || isClaiming} onClick={()=>handleClaim(r)}>
                  {!unlocked ? 'Locked'
                    : isClaiming ? 'Submitting...'
                    : status === 'approved' ? `Claimed - ${profile?.house || ''} (${profile?.campus || ''})`
                    : status === 'pending' ? 'Pending...' 
                    : status === 'rejected' ? 'Claim Again'
                    : 'Claim'}
                  </button>
                  <button aria-label={liked? 'Unlike reward':'Like reward'} onClick={()=>toggleLike(r)} disabled={likeLoading.includes(r.id)} style={{background:liked? '#ff2f72':'#2a3340',color:'#fff',border:'1px solid #394759',padding:'6px 10px',borderRadius:14,fontSize:12,fontWeight:600,display:'inline-flex',alignItems:'center',gap:6,cursor:'pointer',boxShadow: liked? '0 4px 16px -4px rgba(255,70,130,0.4)':'none'}}>
                    <span style={{fontSize:14, lineHeight:1}}>{liked? '♥':'♡'}</span> {r.likes||0}
                  </button>
                </div>
                {claimDetails[r.id] && (
                  <div style={{marginTop:4,fontSize:10,color: status==='rejected'? '#ff8f9d':'#8fa4ba'}}>
                    {status==='rejected' ? 'Last ' : ''}Claim on {(() => {
                      const ts = claimDetails[r.id].decidedAt || claimDetails[r.id].createdAt;
                      if(ts?.seconds){
                        const d = new Date(ts.seconds*1000);
                        return d.toLocaleDateString(undefined,{month:'short', day:'numeric'});
                      }
                      return new Date().toLocaleDateString(undefined,{month:'short', day:'numeric'});
                    })()} {status && status !== 'approved' ? `(${status})` : ''}
                  </div>
                )}
                {/* Aggregate claimed list removed per request */}
              </div>
              {r.likes && r.likes > 5 && (
                <div style={{position:'absolute',top:6,left:6,background:'linear-gradient(135deg,#ff7b4f,#ff3d6a)',color:'#fff',padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:600,letterSpacing:.5}}>Popular</div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
};
