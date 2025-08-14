import React from 'react';
import './AuthBanner.css';

export const AuthBanner = () => (
  <div className="auth-banner">
    <div className="auth-banner-modern">
      <div className="auth-banner-modern__left">
        <div className="auth-banner-modern__avatar">U</div>
        <div className="auth-banner-modern__user-details">
          <span className="auth-banner-modern__user-name">User</span>
          <span className="auth-banner-modern__db-chip">Primary DB</span>
        </div>
        <span className="auth-banner-modern__public">🌟 Campus Rewards Dashboard <span className="auth-banner-modern__public-badge">Public Access</span></span>
      </div>
      <div className="auth-banner-modern__actions">
        <button className="auth-banner-modern__btn login">Sign In</button>
        <button className="auth-banner-modern__btn logout">Sign Out</button>
      </div>
    </div>
  </div>
);
