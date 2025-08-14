import React, { useState } from 'react';
import Papa, { ParseResult } from 'papaparse';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const houseList = ['Malhar', 'Bageshree', 'Bhairav'];


interface Row {
  student: string;
  house: string;
  campus: string;
  email: string; // Added for student data saving
  individualTotal: number; // Added for student data saving
  councilTotal: number;
  housePoints: number;
  // New detailed point columns for display
  individualAcademic: number;
  individualCulture: number;
  houseContributionAcademic: number;
  houseContributionCulture: number;
}

interface SummaryData {
  overallWinner?: { name: string; points: number };
  academicWinner?: { name:string; points: number };
  culturalWinner?: { name: string; points: number };
  winningHouse: {
    house: string;
    points: number;
    topContributors: { name: string; points: number }[];
  };
}

const Accordion: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ border: '1px solid #222', borderRadius: 8, marginBottom: 16, background: '#182a36' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          background: '#101b24',
          color: '#fff',
          padding: '12px 16px',
          border: 'none',
          textAlign: 'left',
          fontSize: 16,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {title}
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
      </button>
      {isOpen && <div style={{ padding: 16 }}>{children}</div>}
    </div>
  );
};


const PointsUploadAdmin: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  // Your stable Google Sheet CSV link
  const STABLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTLPnbrE9t5rA3DRI0twxe1bm2rE2hfMG4GoRoYfSfG4ld5c1f9kGqo5_58iX4OwLZqHO9_dU__HHtS/pub?gid=0&single=true&output=csv';
  const [fetching, setFetching] = useState(false);
  const [houseCol, setHouseCol] = useState<string>('');
  const [campusCol, setCampusCol] = useState<string>('');
  const [studentCol, setStudentCol] = useState<string>('');
  const [emailCol, setEmailCol] = useState<string>(''); // State for email column key
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  }); // YYYY-MM format

  // Helper to find column keys by exact header names (case-insensitive)
  function detectColumns(headers: string[]) {
    const norm = (s: string) => s.trim().toLowerCase();
    const studentHeader = 'students name';
    const houseHeader = 'house';
    const campusHeader = 'campus name';
    const emailHeader = 'email id'; // Exact header for email
    const studentKey = headers.find(h => norm(h) === studentHeader) || '';
    const houseKey = headers.find(h => norm(h) === houseHeader) || '';
    const campusKey = headers.find(h => norm(h) === campusHeader) || '';
    const emailKey = headers.find(h => norm(h) === emailHeader) || '';
    return { houseKey, campusKey, studentKey, emailKey };
  }


    // Calculation logic as per your rules, with campus filter and student name check
    const [selectedCampus, setSelectedCampus] = useState<string>('');
    // Use fixed campus options from dashboard
    const campusOptions = [
      'Pune',
      'Sarjaapura',
      'Himachal BCA',
      'Dharamshala',
      'Dantewada',
      'Jashpur',
      'Raigarh',
      'Udaipur',
      'Kishanganj'
    ];
    // For matching/validation exclude the 'All Campus' choice
    const campusMatchList = campusOptions.filter(c => c !== 'All Campus');
    
    // Normalize incoming values to the canonical lists for uniformity
    function normalizeValue(value: any, list: string[]) {
      const v = (value || '').toString().trim();
      if (!v) return '';
      // Exact case-insensitive match
      const exact = list.find(l => l.toLowerCase() === v.toLowerCase());
      if (exact) return exact;
      // Remove non-alphanumeric and compare
      const clean = v.replace(/[^a-z0-9]/gi, '').toLowerCase();
      const alt = list.find(l => l.replace(/[^a-z0-9]/gi, '').toLowerCase() === clean);
      if (alt) return alt;
      // Try startsWith
      const start = list.find(l => clean && l.toLowerCase().startsWith(clean));
      if (start) return start;
      // No match found - return original (caller may treat as unknown)
      return v;
    }

    const updateRowsFromSelection = (data: any[], houseKey: string, campusKey: string, studentKey: string, emailKey: string) => {
      if (!data.length) { setRows([]); return; }
      setSummary(null); // Clear previous summary

      // Column groups
      const academicIndividual = ["Additional Effort (+1)", "Supporting a Smaller Group in Learning (+3)"];
      const academicDual = ["Support by Taking a Session for a Large Group (+4)"];
      const cultureIndividual = ["Additional Efforts in Life Skills (+1)", "Supporting Peers in Life Skills (+2)", "Efforts to Learn English (+2)", "Task Winners (Individual) (+2)"];
      const cultureDual = ["Supporting the Community in Life Skills (+4)", "Competition Winners (Group) (+5)", "Getting a Job (+15)", "Dropout (-15)", "Highest Attendance (+2)"];
      const councilIndividual = ["Council Activeness (+2)", "Solving a Problem (+3)"];

      // Helper: is council member
      function isCouncil(row: any) {
        return (Number(row["Council Activeness (+2)"] ?? 0) > 0 || Number(row["Solving a Problem (+3)"] ?? 0) > 0);
      }

      // Calculate per-student
      const unknownHouseSet = new Set<string>();
      const unknownCampusSet = new Set<string>();

      // Only include rows that have a student name, house, AND campus value
      const filteredData = data
        .filter(row =>
            (row[studentKey] || '').toString().trim() !== '' &&
            (row[houseKey] || '').toString().trim() !== '' &&
            (row[campusKey] || '').toString().trim() !== ''
        );
      // console.log('Rows after filtering for non-empty name/house/campus:', filteredData.length); // 6. Row count after filtering

      const students = filteredData.map(row => {
          const individualAcademic = academicIndividual.reduce((sum, col) => sum + Number(row[col] ?? 0), 0);
          const individualCulture = cultureIndividual.reduce((sum, col) => sum + Number(row[col] ?? 0), 0);
          const houseContributionAcademic = academicDual.reduce((sum, col) => sum + Number(row[col] ?? 0), 0);
          const houseContributionCulture = cultureDual.reduce((sum, col) => sum + Number(row[col] ?? 0), 0);

          let individualTotal = individualAcademic + individualCulture + houseContributionAcademic + houseContributionCulture;

          // Special cultural total for winner calculation (excluding job/dropout)
          const culturalWinnerPoints = individualCulture + houseContributionCulture - (Number(row["Getting a Job (+15)"] ?? 0)) - (Number(row["Dropout (-15)"] ?? 0));

          // Council total
          let councilTotal = 0;
          if (isCouncil(row)) {
            councilIndividual.forEach(col => councilTotal += Number(row[col] ?? 0));
            individualTotal += councilTotal;
          }
          const rawHouse = (row[houseKey] || '').toString().trim();
          const rawCampus = (row[campusKey] || '').toString().trim();
          const normalizedHouse = normalizeValue(rawHouse, houseList);
          const normalizedCampus = normalizeValue(rawCampus, campusMatchList);
          if (!houseList.includes(normalizedHouse)) unknownHouseSet.add(rawHouse || '(empty)');
          // Unrecognized non-empty campuses are added to the warning set
          if (!campusMatchList.includes(normalizedCampus)) unknownCampusSet.add(rawCampus);
          return {
            student: (row[studentKey] || '').toString().trim(),
            email: (row[emailKey] || '').toString().trim(), // Extract email
            house: normalizedHouse,
            campus: normalizedCampus,
            individualTotal,
            councilTotal,
            rawHouse,
            rawCampus,
            // Add detailed points for display
            individualAcademic,
            individualCulture,
            houseContributionAcademic,
            houseContributionCulture,
            culturalWinnerPoints,
          } as any;
        });

    // Since data is pre-filtered for a campus, we don't need the campus filter here.
    const filteredStudents = students;

    // Calculate house totals for the single selected campus
    const houseMap: Record<string, { dualSum: number; individualAvg: number; members: number; total: number }> = {};
    filteredStudents.forEach(s => {
      const house = s.house;
      if (!houseList.includes(house)) return;

      if (!houseMap[house]) houseMap[house] = { dualSum: 0, individualAvg: 0, members: 0, total: 0 };

      // Dual effect points
      let dualSum = 0;
      academicDual.forEach(col => dualSum += Number(data.find(row => (row[studentKey] || '').trim() === s.student)?.[col] ?? 0));
      cultureDual.forEach(col => dualSum += Number(data.find(row => (row[studentKey] || '').trim() === s.student)?.[col] ?? 0));

      houseMap[house].dualSum += dualSum;
      houseMap[house].individualAvg += s.individualTotal;
      houseMap[house].members += 1;
    });

    Object.keys(houseMap).forEach(house => {
      const h = houseMap[house];
      h.individualAvg = h.members ? h.individualAvg / h.members : 0;
      h.total = h.dualSum + h.individualAvg;
    });


    // Prepare rows for preview table
    const previewRows: Row[] = filteredStudents.map(s => ({
      student: s.student,
      house: s.house,
      campus: s.campus,
      email: s.email, // Pass email to rows
      individualTotal: s.individualTotal, // Pass total to rows
      councilTotal: s.councilTotal,
      housePoints: houseMap[s.house]?.total ?? 0,
      // Add detailed points for display
      individualAcademic: s.individualAcademic,
      individualCulture: s.individualCulture,
      houseContributionAcademic: s.houseContributionAcademic,
      houseContributionCulture: s.houseContributionCulture,
    }));
    setRows(previewRows);

    // Store leaderboard for rendering, now for a single campus
    const newLeaderboard: { house: string; points: number }[] =
      Object.entries(houseMap)
        .map(([house, data]) => ({ house, points: data.total }))
        .sort((a, b) => b.points - a.points);
    setLeaderboard(newLeaderboard);

    // --- SUMMARY CALCULATION ---
    if (filteredStudents.length > 0) {
      // 1. Overall Winner
      const overallWinner = filteredStudents.reduce((max, s) => s.individualTotal > max.individualTotal ? s : max);

      // 2. Academic Winner
      const sortedByAcademic = [...filteredStudents].sort((a, b) =>
        (b.individualAcademic + b.houseContributionAcademic) - (a.individualAcademic + a.houseContributionAcademic)
      );
      let academicWinner = sortedByAcademic[0];
      if (academicWinner.student === overallWinner.student && sortedByAcademic.length > 1) {
        academicWinner = sortedByAcademic[1];
      }

      // 3. Cultural Winner
      const sortedByCultural = [...students].sort((a, b) => b.culturalWinnerPoints - a.culturalWinnerPoints);
      const culturalWinner = sortedByCultural[0];

      // 4. Winning House & Top Contributors
      const winningHouseInfo = newLeaderboard[0];
      const contributors = filteredStudents
        .filter(s => s.house === winningHouseInfo.house)
        .sort((a, b) => b.individualTotal - a.individualTotal)
        .slice(0, 10)
        .map(s => ({ name: s.student, points: s.individualTotal }));

      setSummary({
        overallWinner: { name: overallWinner.student, points: overallWinner.individualTotal },
        academicWinner: { name: academicWinner.student, points: academicWinner.individualAcademic + academicWinner.houseContributionAcademic },
        culturalWinner: { name: culturalWinner.student, points: culturalWinner.culturalWinnerPoints },
        winningHouse: {
          house: winningHouseInfo.house,
          points: winningHouseInfo.points,
          topContributors: contributors,
        },
      });
    }


    // If unknown houses/campuses were found, warn the admin and note that those rows were ignored
    if (unknownHouseSet.size || unknownCampusSet.size) {
      const unknownHouses = Array.from(unknownHouseSet).slice(0,10).join(', ');
      const unknownCampuses = Array.from(unknownCampusSet).slice(0,10).join(', ');
      let msg = 'Some rows contained unrecognized values and were ignored.';
      if (unknownHouseSet.size) msg += ` Unknown houses: ${unknownHouses}.`;
      if (unknownCampusSet.size) msg += ` Unknown campuses: ${unknownCampuses}.`;
      setError(msg + ' Rows with empty Student Name, House, or Campus were also ignored.');
    } else {
      setError('');
    }
    // no dynamic campus list; using fixed campusOptions
    };
  // House leaderboard state, now structured for a single campus
  const [leaderboard, setLeaderboard] = useState<{ house: string; points: number }[]>([]);

  const parseRows = (data: any[]) => {
    // setRawData(data); - No longer needed
    // console.log('parseRows started. Received', data.length, 'rows.'); // 1. Entry
    if (!data.length || !data[0]) { setRows([]); setError('No data found in sheet.'); return; }
    // Trim, deduplicate, and ignore empty headers
    const seen = new Set<string>();
    const allCols = Object.keys(data[0])
      .map(col => col.trim())
      .filter(col => col && !seen.has(col) && seen.add(col));
    // console.log('Parsed headers:', allCols); // 2. Parsed headers

    // allCols computed for validation but not stored in state

    // Use trimmed keys for detection
    const { houseKey, campusKey, studentKey, emailKey } = detectColumns(allCols);
    // console.log('Detected keys:', { studentKey, houseKey, campusKey }); // 3. Detected keys

    // --- NEW: Filter data by selected campus BEFORE any calculations ---
    const campusFilteredData = data.filter(row => {
      const campusValue = (row[campusKey] || '').toString().trim();
      return normalizeValue(campusValue, campusMatchList) === selectedCampus;
    });

    if (campusFilteredData.length === 0) {
      setError(`No data found for the selected campus: ${selectedCampus}. Please check the sheet or select another campus.`);
      setRows([]);
      setSummary(null);
      setLeaderboard([]);
      return;
    }

    // Define required calculation headers (must match the stable sheet)
    const requiredHeaders = [
      'Students Name',
      'Email ID',
      'House',
      'Campus Name',
      'Additional Effort (+1)',
      'Supporting a Smaller Group in Learning (+3)',
      'Support by Taking a Session for a Large Group (+4)',
      'Total Academic Points',
      'Additional Efforts in Life Skills (+1)',
      'Supporting Peers in Life Skills (+2)',
      'Supporting the Community in Life Skills (+4)',
      'Efforts to Learn English (+2)',
      'Competition Winners (Group) (+5)',
      'Council Activeness (+2)',
      'Solving a Problem (+3)',
      'Task Winners (Individual) (+2)',
      'Getting a Job (+15)',
      'Dropout (-15)',
      'Highest Attendance (+2)'
    ];

    // Validate presence of core headers (case-insensitive match)
    const lowerCols = allCols.map(c => c.toLowerCase());
    const missing: string[] = [];
    // student/house/campus required
    if (!houseKey) missing.push('House');
    if (!campusKey) missing.push('Campus Name');
    if (!studentKey) missing.push('Students Name');
    if (!emailKey) missing.push('Email ID'); // Add email to required headers
    // required calculation headers
    for (const h of requiredHeaders) {
      if (!lowerCols.includes(h.toLowerCase())) missing.push(h);
    }
    if (missing.length) {
      // console.error('Header mismatch. Missing:', missing); // 4. Missing headers
      setHouseCol(''); setCampusCol(''); setStudentCol(''); setRows([]);
      setError('Sheet header mismatch. Missing headers: ' + missing.slice(0,10).join(', '));
      return;
    }

    // All required headers present - set detected keys and proceed
    setHouseCol(houseKey || '');
    setCampusCol(campusKey || '');
    setStudentCol(studentKey || '');
    setEmailCol(emailKey || ''); // Set email column state
    updateRowsFromSelection(campusFilteredData, houseKey!, campusKey!, studentKey!, emailKey!);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<any>(file as File, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim(),
      complete: (result: ParseResult<any>) => {
        parseRows(result.data as any[]);
      }
    });
  };

  const handleFetchSheet = async (url?: string) => {
    setError(''); setFetching(true);
    try {
      const fetchUrl = url || sheetUrl;
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error('Failed to fetch sheet');
      }
      const text = await res.text();
      Papa.parse<any>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim(),
        complete: (result: ParseResult<any>) => {
          parseRows(result.data as any[]);
        }
      });
    } catch (e: any) {
      setError('Failed to fetch or parse sheet. Check console for details.');
    } finally {
      setFetching(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedDate) {
      toast.error('Please select a month and year for the upload.');
      return;
    }
    setLoading(true);
    setError('');

    const yearMonth = selectedDate; // Already in YYYY-MM format

    try {
      // 1. Upload House Leaderboard for the specific month
      const houseUploadPromises = leaderboard.map(houseData => {
        const ref = doc(db, 'campuses', selectedCampus, 'leaderboards', yearMonth, 'houses', houseData.house);
        return setDoc(ref, {
          points: houseData.points,
          updatedAt: serverTimestamp()
        });
      });

      // 2. Upload individual student points for the specific month
      const studentUploadPromises = rows
        .filter(row => row.email)
        .map(row => {
          // Path to the monthly points subcollection document
          const monthlyPointsRef = doc(db, 'students', row.email, 'monthlyPoints', yearMonth);
          const monthlyPointsData = {
            campus: row.campus,
            house: row.house,
            points: {
              individualAcademic: row.individualAcademic,
              individualCulture: row.individualCulture,
              houseContributionAcademic: row.houseContributionAcademic,
              houseContributionCulture: row.houseContributionCulture,
              councilTotal: row.councilTotal,
              overallTotal: row.individualTotal,
            },
            updatedAt: serverTimestamp(),
          };

          // Also update the main student document with their latest info
          const studentProfileRef = doc(db, 'students', row.email);
          const studentProfileData = {
            name: row.student,
            email: row.email,
            house: row.house,
            campus: row.campus,
            lastUpdated: serverTimestamp(),
          };

          // Return promises for both operations
          return [
            setDoc(monthlyPointsRef, monthlyPointsData),
            setDoc(studentProfileRef, studentProfileData, { merge: true })
          ];
        }).flat(); // Flatten the array of promise arrays

      await Promise.all([...houseUploadPromises, ...studentUploadPromises]);

      toast.success(`Points for ${yearMonth} updated successfully!`);
      setRows([]);
      setSummary(null);
      setLeaderboard([]);
      setIsConfirmModalOpen(false);
    } catch (e) {
      toast.error('Upload failed. Please try again.');
      setError('Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{maxWidth:500,margin:'2rem auto',background:'#101b24',padding:32,borderRadius:18,boxShadow:'0 4px 24px -8px #000'}}>
      <h2 style={{color:'#00e6d2',marginBottom:18}}>Upload House Points</h2>

      <div style={{marginBottom: 24}}>
        <label style={{color:'#aaa',fontSize:13,display:'block',marginBottom:4}}>Step 1: Select Campus & Month</label>
        <div style={{display: 'flex', gap: 12}}>
          <select
            value={selectedCampus}
            onChange={e => {
              setSelectedCampus(e.target.value);
              // Clear results when campus changes
              setRows([]);
              setSummary(null);
              setError('');
            }}
            style={{flex: 1, padding:'8px',borderRadius:8,border:'1px solid #222',background:'#182a36',color:'#fff'}}
          >
            <option value="" disabled>-- Select Campus --</option>
            {campusOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="month"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{flex: 1, padding:'8px',borderRadius:8,border:'1px solid #222',background:'#182a36',color:'#fff'}}
          />
        </div>
      </div>

      <h4 style={{opacity: selectedCampus ? 1 : 0.5}}>Step 2: Fetch Data</h4>
      <input type="file" accept=".csv" onChange={handleFile} disabled={!selectedCampus || loading || fetching} style={{marginBottom:12}} />
      <div style={{margin:'16px 0',color:'#aaa',fontSize:13, opacity: selectedCampus ? 1 : 0.5}}>or</div>
      <button
        onClick={() => handleFetchSheet(STABLE_SHEET_URL)}
        disabled={!selectedCampus || loading || fetching}
        style={{background:'#00e6d2',color:'#0b0d12',fontWeight:700,padding:'8px 22px',borderRadius:10,border:'none',fontSize:16,cursor:'pointer',marginBottom:8, opacity: selectedCampus ? 1 : 0.5}}
      >{fetching ? 'Fetching...' : 'Fetch from Navgurukul House Points Sheet'}</button>
      <div style={{margin:'10px 0',color:'#aaa',fontSize:13, opacity: selectedCampus ? 1 : 0.5}}>or paste another Google Sheet CSV URL below:</div>
      <input
        type="text"
        placeholder="Paste Google Sheet CSV URL here"
        value={sheetUrl}
        onChange={e=>setSheetUrl(e.target.value)}
        disabled={!selectedCampus || loading || fetching}
        style={{width:'100%',padding:'8px',borderRadius:8,border:'1px solid #222',background:'#182a36',color:'#fff',marginBottom:8, opacity: selectedCampus ? 1 : 0.5}}
      />
      <button
        onClick={() => handleFetchSheet()}
        disabled={!sheetUrl || !selectedCampus || loading || fetching}
        style={{background:'#00e6d2',color:'#0b0d12',fontWeight:700,padding:'8px 22px',borderRadius:10,border:'none',fontSize:16,cursor:'pointer',marginBottom:8, opacity: selectedCampus ? 1 : 0.5}}
      >{fetching ? 'Fetching...' : 'Fetch from Custom Sheet URL'}</button>
      {error && <div style={{color:'#ff6b6b',marginTop:12, padding: '8px 12px', background: 'rgba(255, 107, 107, 0.1)', borderRadius: 6}}>{error}</div>}

      {summary && (
        <div style={{marginTop: 24, padding: 16, background: '#182a36', borderRadius: 8}}>
          <h3 style={{color: '#00e6d2', borderBottom: '1px solid #222', paddingBottom: 8}}>Summary for {selectedCampus}</h3>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16}}>
            <div><strong>Overall Winner:</strong><br/>{summary.overallWinner?.name} ({summary.overallWinner?.points.toFixed(2)} pts)</div>
            <div><strong>Academic Winner:</strong><br/>{summary.academicWinner?.name} ({summary.academicWinner?.points.toFixed(2)} pts)</div>
            <div><strong>Cultural Winner:</strong><br/>{summary.culturalWinner?.name} ({summary.culturalWinner?.points.toFixed(2)} pts)</div>
          </div>
          <div style={{marginTop: 16}}>
              <h4 style={{color: '#00e6d2'}}>Winning House: {summary.winningHouse.house} ({summary.winningHouse.points.toFixed(2)} pts)</h4>
              <h5 style={{marginTop: 8, marginBottom: 4}}>Top 10 Contributors:</h5>
              <ol style={{paddingLeft: 20, margin: 0}}>
                {summary.winningHouse.topContributors.map((c, i) => (
                  <li key={i} style={{fontSize: 14}}>{c.name} ({c.points.toFixed(2)} pts)</li>
                ))}
              </ol>
            </div>
        </div>
      )}

      {rows.length > 0 && (
        <div style={{marginTop:18}}>
          <Accordion title="File Status">
            <div style={{color:'#aaa'}}>
              Detected columns:
              <div style={{marginTop:6}}><strong style={{color:'#fff'}}>✓ Student:</strong> {studentCol || '—'}</div>
              <div style={{marginTop:6}}><strong style={{color:'#fff'}}>✓ House:</strong> {houseCol || '—'}</div>
              <div style={{marginTop:6}}><strong style={{color:'#fff'}}>✓ Campus:</strong> {campusCol || '—'}</div>
              <div style={{marginTop:6}}><strong style={{color:'#fff'}}>✓ Email:</strong> {emailCol || '—'}</div>
            </div>
            <div style={{marginTop:12,color:'#bbb',fontSize:13}}>Template enforced — uploads will fail if headers differ.</div>
          </Accordion>

          <Accordion title="Data Preview">
            <h4 style={{marginTop: 0}}>Preview for {selectedCampus}</h4>
            <div style={{overflowX: 'auto'}}>
              <table style={{width:'100%',background:'#182a36',borderRadius:8,overflow:'hidden',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'2px solid #222'}}>
                    <th style={{borderBottom:'1px solid #333',padding:'8px'}}>Student Name</th>
                    <th style={{borderBottom:'1px solid #333',padding:'8px'}}>House</th>
                    <th style={{borderBottom:'1px solid #333',padding:'8px'}}>Campus</th>
                    <th style={{borderBottom:'1px solid #333',padding:'8px'}}>Indiv. Academic</th>
                    <th style={{borderBottom:'1px solid #333',padding:'8px'}}>Indiv. Culture</th>
                    <th style={{borderBottom:'1px solid #333',padding:'8px'}}>House Academic</th>
                    <th style={{borderBottom:'1px solid #333',padding:'8px'}}>House Culture</th>
                    <th style={{borderBottom:'1px solid #333',padding:'8px'}}>Council Total</th>
                    <th style={{borderBottom:'1px solid #333',padding:'8px'}}>House Points</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{background:i%2===0?'#182a36':'#101b24',borderBottom:'1px solid #222'}}>
                      <td style={{padding:'8px',borderBottom:'1px solid #222'}}>{r.student}</td>
                      <td style={{padding:'8px',borderBottom:'1px solid #222'}}>{r.house}</td>
                      <td style={{padding:'8px',borderBottom:'1px solid #222'}}>{r.campus}</td>
                      <td style={{padding:'8px',borderBottom:'1px solid #222'}}>{r.individualAcademic}</td>
                      <td style={{padding:'8px',borderBottom:'1px solid #222'}}>{r.individualCulture}</td>
                      <td style={{padding:'8px',borderBottom:'1px solid #222'}}>{r.houseContributionAcademic}</td>
                      <td style={{padding:'8px',borderBottom:'1px solid #222'}}>{r.houseContributionCulture}</td>
                      <td style={{padding:'8px',borderBottom:'1px solid #222'}}>{r.councilTotal ?? 0}</td>
                      <td style={{padding:'8px',borderBottom:'1px solid #222'}}>{(r.housePoints ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Accordion>

          <Accordion title="House Leaderboard">
            <h4 style={{marginTop:0}}>House Leaderboard for {selectedCampus}</h4>
            <table style={{width:'100%',background:'#182a36',borderRadius:8,overflow:'hidden',marginBottom:16}}>
              <thead>
                <tr>
                  <th>House</th>
                  <th>Total Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((h, i) => (
                  <tr key={i}>
                    <td>{h.house}</td>
                    <td>{h.points.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Accordion>

          <h4 style={{opacity: selectedCampus ? 1 : 0.5, marginTop: 24}}>Step 3: Save Points to Database</h4>
          <button
            style={{marginTop:16,background:'#1ed760',color:'#0b0d12',fontWeight:700,padding:'8px 22px',borderRadius:10,border:'none',fontSize:16,cursor:'pointer', opacity: selectedCampus ? 1 : 0.5}}
            onClick={() => setIsConfirmModalOpen(true)}
            disabled={!selectedCampus || loading || rows.length === 0}
          >
            {loading ? 'Saving...' : 'Save Points'}
          </button>
        </div>
      )}

      {isConfirmModalOpen && (
        <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#101b24',padding:24,borderRadius:12,boxShadow:'0 8px 32px -8px #000',textAlign:'center',border:'1px solid #222'}}>
            <h3 style={{marginTop:0}}>Confirm Upload</h3>
            <p>You are about to update points for <strong style={{color:'#00e6d2'}}>{rows.length} students</strong> in <strong style={{color:'#00e6d2'}}>{selectedCampus}</strong> for the month of <strong style={{color:'#00e6d2'}}>{selectedDate}</strong>.</p>
            <p style={{fontSize:14,color:'#aaa'}}>This action will overwrite existing data for this period.</p>
            <div style={{marginTop:24,display:'flex',gap:12,justifyContent:'center'}}>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={loading}
                style={{background:'#555',color:'#fff',fontWeight:700,padding:'8px 22px',borderRadius:10,border:'none',fontSize:16,cursor:'pointer'}}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={loading}
                style={{background:'#1ed760',color:'#0b0d12',fontWeight:700,padding:'8px 22px',borderRadius:10,border:'none',fontSize:16,cursor:'pointer'}}
              >
                {loading ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsUploadAdmin;
