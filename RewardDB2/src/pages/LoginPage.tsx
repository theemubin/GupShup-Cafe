import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import styles from './LoginPage.module.css';
import FireworksBackground from '../components/FireworksBackground';

const LoginPage: React.FC = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setLoading(false);
      navigate('/'); // Redirect to homepage after login
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Google login failed.');
    }
  };

  return (
    <div className={styles.loginPageContainer}>
      <FireworksBackground color={'white'} density={32} intervalMs={1800} />
      <form className={styles.loginForm} onSubmit={e => e.preventDefault()}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,marginBottom:'0.5rem'}}>
          <img src="/logo.png" alt="Rewards Dashboard Logo" width={90} height={90} style={{objectFit:'contain',filter:'drop-shadow(0 6px 22px rgba(0,230,210,0.35))'}} />
          <div style={{fontSize:'1.18rem',color:'#fff',fontWeight:700,textAlign:'center',marginTop:'.1em',marginBottom:'.1em',letterSpacing:'.2px',fontFamily:'inherit'}}>Welcome Back!</div>
          <div style={{fontSize:'1.05rem',color:'#b0f5e6',fontWeight:500,textAlign:'center',marginBottom:'.1em',letterSpacing:'.1px'}}>Ready to celebrate your efforts?</div>
        </div>
        {error && <div className={styles.errorMsg}>{error}</div>}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className={styles.loginBtn}
          style={{background:'linear-gradient(90deg,#4285F4 0%,#34A853 100%)',color:'#fff',marginTop:'0.5em'}}
        >
          {loading ? 'Please wait...' : 'Sign in to get started'}
        </button>
  <div className={styles.loginHint}>Use your Navgurukul account to continue.</div>
      </form>
    </div>
  );
};

export default LoginPage;
