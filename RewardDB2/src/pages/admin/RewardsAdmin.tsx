import Skeleton from '../../components/Skeleton';
import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';


import { collection, addDoc, onSnapshot, orderBy, query, Timestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import axios from 'axios';
import { FiPlus, FiSave, FiTrash2, FiEdit2, FiX, FiSearch, FiFilter } from 'react-icons/fi';
import styles from './RewardsAdmin.module.css';
import { SegmentedGroup } from '../../components/SegmentedGroup';

interface RewardRecord {
  id: string;
  title: string;
  description: string;
  level: number; // 1-4
  category: string; // Academic | Cultural | Overall
  campus: string; // campus identifier
  pointsCost: number;
  stock?: number; // optional inventory
  imageUrl?: string;
  externalLink?: string;
  active: boolean;
  createdAt?: any;
}

const levelOptions = [1,2,3,4];
const categoryOptions = ['Academic','Cultural','Overall'];
const campusOptions = [
  'All Campus',
  'Pune',
  'Sarjaapura',
  'Himachal BCA',
  'Dharamshala',
  'Dantewada',
  'Jashpur',
  'Raigarh',
  'Udaipur',
  'Kishanganj'
]; // TODO: move to Firestore collection campuses

const emptyForm: Omit<RewardRecord,'id'|'active'|'createdAt'|'imageUrl'> & {active?:boolean, imageFile?:File|null, imageUrl?:string} = {
  title:'', description:'', level:1, category:'Academic', campus:'All Campus', pointsCost:0, stock:0, externalLink:'', imageFile:null, imageUrl:''
};

const CLOUDINARY_UPLOAD_PRESET = 'rewards_unsigned';
const CLOUDINARY_CLOUD_NAME = 'dyey1kwiz';

const uploadToCloudinary = async (file: File) => {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await axios.post(url, formData);
  return res.data.secure_url as string;
};


const RewardsAdmin = () => {
  const [rewards,setRewards]=useState<RewardRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState<typeof emptyForm>(emptyForm);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [filters,setFilters]=useState({ campus:'all', level:'all', category:'all', active:'all', q:'' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RewardRecord|null>(null);

  // subscribe
  useEffect(()=>{
    const qRewards = query(collection(db,'rewards'), orderBy('level','asc'));
    const unsub = onSnapshot(qRewards, snap => {
      const list: RewardRecord[] = snap.docs.map(d=>({id:d.id, ...(d.data() as any)}));
      setRewards(list);
      setLoading(false);
    });
    return () => unsub();
  },[]);

  const filtered = useMemo(()=>{
    return rewards.filter(r => (
      (filters.campus==='all'|| r.campus===filters.campus) &&
      (filters.level==='all'|| r.level===Number(filters.level)) &&
      (filters.category==='all'|| r.category===filters.category) &&
      (filters.active==='all'|| (filters.active==='active'?r.active:!r.active)) &&
      (!filters.q || r.title.toLowerCase().includes(filters.q.toLowerCase()) || r.description.toLowerCase().includes(filters.q.toLowerCase()))
    ));
  },[rewards,filters]);

  // Bulk select state and handlers (must be after filtered/rewards)
  const [selected,setSelected]=useState<string[]>([]);
  const allSelected = filtered.length > 0 && selected.length === filtered.length;
  const selectAllRef = useRef<HTMLInputElement>(null);
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(e.target.checked ? filtered.map((r:any)=>r.id) : []);
  };
  const handleSelect = (id: string, checked: boolean) => {
    setSelected(sel => checked ? [...sel, id] : sel.filter(sid => sid !== id));
  };
  const handleBulkAction = async (action: 'activate'|'deactivate'|'delete') => {
    if(selected.length === 0) return;
    if(action === 'delete') {
      setConfirmBulk(true);
      return;
    }
    let successCount = 0;
    for(const id of selected){
      const rec = rewards.find((r:any)=>r.id===id);
      if(!rec) continue;
      try {
        await updateDoc(doc(db,'rewards',id), { active: action==='activate' });
        successCount++;
      } catch(e:any) {
        toast.error(`Failed to ${action} reward: ${rec?.title}`);
      }
    }
    if(successCount > 0) {
      toast.success(`${successCount} reward${successCount>1?'s':''} ${action==='activate'?'activated':'deactivated'}`);
    }
    setSelected([]);
  };
  const handleConfirmBulkDelete = async () => {
    let successCount = 0;
    for(const id of selected){
      try {
        await deleteDoc(doc(db,'rewards',id));
        successCount++;
      } catch(e:any) {
        toast.error('Failed to delete a reward');
      }
    }
    if(successCount > 0) toast.success(`${successCount} reward${successCount>1?'s':''} deleted`);
    setSelected([]);
    setConfirmBulk(false);
  };

  const startEdit = (rec:RewardRecord) => {
    setEditingId(rec.id);
    setForm({
      title:rec.title,
      description:rec.description,
      level:rec.level,
      category:rec.category,
      campus:rec.campus,
      pointsCost:rec.pointsCost,
      stock:rec.stock||0,
      externalLink:rec.externalLink||'',
      imageFile:null,
      imageUrl:rec.imageUrl||''
    });
    setError('');
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setError(''); };

  const validate = () => {
    if(!form.title.trim()) return 'Title required';
    if(form.title.length>80) return 'Title too long';
    if(form.description.length>300) return 'Description max 300 chars';
    if(typeof form.pointsCost !== 'number' || isNaN(form.pointsCost) || form.pointsCost < 0) return 'Points must be >=0';
    if(form.stock !== undefined && (typeof form.stock !== 'number' || isNaN(form.stock) || form.stock < 0)) return 'Stock must be >=0';
    if(form.externalLink && !/^https?:\/\//i.test(form.externalLink)) return 'External link must start with http:// or https://';
    return '';
  };

  const submit = async () => {
    const v = validate();
    if(v){ setError(v); toast.error(v); return; }
    setSaving(true);
    try {
      let imageUrl: string | undefined = form.imageUrl?.trim() ? form.imageUrl.trim() : undefined;
      if(form.imageFile){
        imageUrl = await uploadToCloudinary(form.imageFile);
      }
      // Exclude imageFile from Firestore document
      const { imageFile, ...formData } = form;
      if(editingId){
        await updateDoc(doc(db,'rewards',editingId), { ...formData, imageUrl });
        toast.success('Reward updated');
      } else {
        await addDoc(collection(db,'rewards'), { ...formData, imageUrl, createdAt:Timestamp.now() });
        toast.success('Reward created');
      }
      cancelEdit();
    } catch(e:any){
      setError(e.message||'Save failed');
      toast.error(e.message||'Save failed');
    } finally { setSaving(false); }
  };

  const toggleActive = async (rec:RewardRecord) => {
    await updateDoc(doc(db,'rewards',rec.id), { active: !rec.active });
  };

  const remove = (rec:RewardRecord) => {
    setPendingDelete(rec);
    setConfirmOpen(true);
  };
  const handleConfirmDelete = async () => {
    if (pendingDelete) {
      await deleteDoc(doc(db,'rewards',pendingDelete.id));
      toast.success('Reward deleted');
      setPendingDelete(null);
    }
    setConfirmOpen(false);
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1>Rewards Admin</h1>
      </header>

      <section className={styles.editorSection}>
        <h2>{editingId? 'Edit Reward':'Create Reward'}</h2>
        {loading ? (
          <div className={styles.formGrid}>
            {[...Array(7)].map((_,i) => <Skeleton key={i} height={36} style={{marginBottom:18}} />)}
          </div>
        ) : (
          <>
          <div className={styles.formGrid}>
            <div className={styles.fieldFull}><div className={styles.formSectionTitle}>Title</div>
              <input
                value={form.title}
                onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                maxLength={80}
                autoFocus
                aria-label="Reward Title"
              />
            </div>
            <div className={styles.fieldFull}><div className={styles.formSectionTitle}>Category</div>
              <SegmentedGroup
                name="category"
                value={form.category}
                options={categoryOptions.map(c => ({ value: c, label: c }))}
                onChange={val => setForm(f => ({ ...f, category: val as string }))}
                aria-label="Reward Category"
              />
            </div>
            <div className={styles.fieldFull}><div className={styles.formSectionTitle}>Level</div>
              <SegmentedGroup
                name="level"
                value={form.level}
                options={levelOptions.map(l => ({ value: l, label: `Level ${l}` }))}
                onChange={val => setForm(f => ({ ...f, level: Number(val) }))}
                aria-label="Reward Level"
              />
            </div>
            <div className={styles.fieldFull}><div className={styles.formSectionTitle}>Campus</div>
              <SegmentedGroup
                name="campus"
                value={form.campus}
                options={campusOptions.map(c => ({ value: c, label: c }))}
                onChange={val => setForm(f => ({ ...f, campus: val as string }))}
                aria-label="Reward Campus"
              />
            </div>
            <div className={`${styles.fieldFull} ${styles.twoColRow}`}>
              <div>
                <div className={styles.formSectionTitle}>Points Cost</div>
                <input
                  type="number"
                  min={0}
                  value={form.pointsCost}
                  onChange={e=>setForm(f=>({...f,pointsCost:e.target.value === '' ? 0 : Number(e.target.value)}))}
                  aria-label="Points Cost"
                />
              </div>
              <div>
                <div className={styles.formSectionTitle}>Stock</div>
                <input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={e=>setForm(f=>({...f,stock:e.target.value === '' ? 0 : Number(e.target.value)}))}
                  aria-label="Stock"
                />
              </div>
            </div>
            <div className={styles.fieldFull}>
              <div className={styles.formSectionTitle}>External Link</div>
              <input
                placeholder="https://..."
                value={form.externalLink}
                onChange={e=>setForm(f=>({...f,externalLink:e.target.value}))}
                aria-label="External Link"
              />
              <div style={{fontSize:'.72em',color:'#7fd6c7',marginTop:'2px',fontWeight:400,letterSpacing:'0.2px'}}>(In case of online reward)</div>
            </div>
            <div className={styles.fieldFull}><div className={styles.formSectionTitle}>Image Upload</div>
              <input
                type="file"
                accept="image/*"
                onChange={e=>setForm(f=>({...f,imageFile:e.target.files?.[0]||null}))}
                aria-label="Image Upload"
              />
            </div>
            <div className={styles.fieldFull}><div className={styles.formSectionTitle}>Description</div>
              <textarea
                value={form.description}
                onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                maxLength={300}
                rows={3}
                aria-label="Reward Description"
              />
            </div>
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.actions}>
            {editingId && <button className={styles.secondaryBtn} onClick={cancelEdit} aria-label="Cancel Edit"><FiX/> Cancel</button>}
            <button className={styles.primaryBtn} disabled={saving} onClick={submit} aria-label={editingId ? 'Update Reward' : 'Create Reward'}>
              {saving? 'Saving...': editingId? <><FiSave/> Update</>: <><FiPlus/> Create</>}
            </button>
          </div>
          </>
        )}
      </section>

      <section className={styles.tableSection}>
  <div className={styles.filterBar + ' ' + styles.stickyFilterBar}>
          <div className={styles.filterGroup}>
            <FiFilter className={styles.filterIcon} />
            <select value={filters.campus} onChange={e=>setFilters(f=>({...f,campus:e.target.value}))}>
              <option value="all">All Campuses</option>
              {campusOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filters.level} onChange={e=>setFilters(f=>({...f,level:e.target.value}))}>
              <option value="all">All Levels</option>
              {levelOptions.map(l=> <option key={l} value={l}>Level {l}</option>)}
            </select>
            <select value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}>
              <option value="all">All Categories</option>
              {categoryOptions.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filters.active} onChange={e=>setFilters(f=>({...f,active:e.target.value}))}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className={styles.searchBox}>
            <FiSearch />
            <input placeholder="Search rewards" value={filters.q} onChange={e=>setFilters(f=>({...f,q:e.target.value}))} />
          </div>
        </div>
        <h2>Rewards ({filtered.length})</h2>
        {loading && (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {[...Array(10)].map((_,i) => <th key={i}><Skeleton height={24} /></th>)}
                </tr>
              </thead>
              <tbody>
                {[...Array(6)].map((_,i) => (
                  <tr key={i} className={styles.tableRow}>
                    {[...Array(10)].map((_,j) => <td key={j}><Skeleton height={28} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length===0 && <div className={styles.empty}>No rewards match filters.</div>}
        {!loading && filtered.length>0 && (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><input type="checkbox" ref={selectAllRef} checked={allSelected} onChange={handleSelectAll} aria-label="Select all rewards" /></th>
                  <th>Image</th>
                  <th>Title</th>
                  <th>Level</th>
                  <th>Category</th>
                  <th>Campus</th>
                  <th>Points</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th style={{width:170}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className={`${styles.tableRow} ${!r.active ? styles.inactiveRow : ''}`}>
                    <td><input type="checkbox" checked={selected.includes(r.id)} onChange={e=>handleSelect(r.id, e.target.checked)} aria-label={`Select reward ${r.title}`} /></td>
                    <td>{r.imageUrl ? <img src={r.imageUrl} alt={r.title} style={{width:36,height:36,objectFit:'cover',borderRadius:6,boxShadow:'0 1px 4px #0002'}} /> : <span style={{color:'#888'}}>—</span>}</td>
                    <td>{r.title}</td>
                    <td>{r.level}</td>
                    <td>{r.category}</td>
                    <td>{r.campus}{r.campus==='All Campus' && <span className={styles.allCampusBadge}>All Campus</span>}</td>
                    <td>{r.pointsCost}</td>
                    <td>{r.stock ?? '-'}</td>
                    <td><button className={r.active?styles.statusActive:styles.statusInactive} onClick={()=>toggleActive(r)}>{r.active? 'Active':'Inactive'}</button></td>
                    <td>
                      <button className={styles.smallBtn} onClick={()=>startEdit(r)} aria-label={`Edit ${r.title}`}><FiEdit2/> Edit</button>
                      <button className={styles.smallBtnDanger} onClick={()=>remove(r)} aria-label={`Delete ${r.title}`}><FiTrash2/> Delete</button>
                    </td>
                  </tr>
                ))}
        {selected.length > 0 && (
          <div style={{display:'flex',gap:'1.2rem',alignItems:'center',background:'#182a36',padding:'0.7rem 1.2rem',borderRadius:10,margin:'1rem 0',boxShadow:'0 2px 8px -6px #0003'}}>
            <span style={{fontWeight:600,letterSpacing:'.5px',color:'#41d6b5'}}>{selected.length} selected</span>
            <button onClick={()=>handleBulkAction('activate')} className={styles.primaryBtn} style={{padding:'0.4rem 1rem',fontSize:'.8em'}}>Activate</button>
            <button onClick={()=>handleBulkAction('deactivate')} className={styles.secondaryBtn} style={{padding:'0.4rem 1rem',fontSize:'.8em'}}>Deactivate</button>
            <button onClick={()=>handleBulkAction('delete')} className={styles.smallBtnDanger} style={{padding:'0.4rem 1rem',fontSize:'.8em'}}>Delete</button>
          </div>
        )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className={styles.note}>Next: link these rewards to public rewards section and implement redemption workflow.</p>
      <ConfirmModal
        open={confirmOpen}
        title="Delete Reward"
        message={pendingDelete ? `Are you sure you want to delete "${pendingDelete.title}"? This cannot be undone.` : ''}
        onConfirm={handleConfirmDelete}
        onCancel={()=>{setConfirmOpen(false);setPendingDelete(null);}}
      />
      <ConfirmModal
        open={confirmBulk}
        title="Delete Selected Rewards"
        message={`Are you sure you want to delete ${selected.length} selected reward${selected.length>1?'s':''}? This cannot be undone.`}
        onConfirm={handleConfirmBulkDelete}
        onCancel={()=>setConfirmBulk(false)}
      />
    </div>
  );
};

export default RewardsAdmin;
