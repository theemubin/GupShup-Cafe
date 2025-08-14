
import { useState, useRef, useEffect } from 'react';
import './Navbar.css';

export const Navbar = () => {

  const [loggedIn, setLoggedIn] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const userName = 'User Name';
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <div className="navbar__logo">
          <i className="fas fa-trophy"></i>
        </div>
        <div className="navbar__center-group">
          <ul className="navbar__links">
            <li><a href="#dashboard" className="hover-underline">Dashboard</a></li>
            <li><a href="#rewards" className="hover-underline">Rewards</a></li>
            <li><a href="#leaderboard" className="hover-underline">Leaderboard</a></li>
            <li><a href="#request" className="hover-underline">Request Rewards</a></li>
          </ul>
          <div className="navbar__user-info-modern" ref={dropdownRef}>
            {!loggedIn ? (
              <button className="navbar__login-btn-modern" onClick={() => setLoggedIn(true)}>Log in</button>
            ) : (
              <div
                className="navbar__user-dropdown"
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
                tabIndex={0}
                style={{ position: 'relative', display: 'inline-block' }}
              >
                <span
                  className="navbar__user-name-modern navbar__user-name-dropdown"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                >
                  {userName}
                  <svg className="navbar__dropdown-arrow" width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                {dropdownOpen && (
                  <div className="navbar__dropdown-menu" style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 10 }}>
                    <button className="navbar__logout-btn-modern" onClick={() => { setLoggedIn(false); setDropdownOpen(false); }}>Log out</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <button className="navbar__toggle" aria-label="Open menu">
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
      </div>
    </nav>
  );
}

