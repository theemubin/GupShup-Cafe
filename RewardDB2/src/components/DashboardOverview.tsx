import React from 'react';
import './DashboardOverview.css';

export const DashboardOverview = ({ id }: { id?: string }) => (
  <section className="dashboard-overview" id={id}>
    <div className="dashboard-header">
      <h1>Campus Rewards Dashboard</h1>
      <p className="dashboard-subtitle">Track your progress and claim amazing rewards!</p>
    </div>
    <div className="stats-glass-container">
      <div className="stat-glass-card gradient1">
        <span></span>
        <div className="stat-glass-content">
          <div className="stat-glass-icon"><i className="fas fa-trophy"></i></div>
          <h3>24</h3>
          <p>Available Rewards</p>
        </div>
      </div>
      <div className="stat-glass-card gradient2">
        <span></span>
        <div className="stat-glass-content">
          <div className="stat-glass-icon"><i className="fas fa-star"></i></div>
          <h3>8</h3>
          <p>Rewards Claimed</p>
        </div>
      </div>
      <div className="stat-glass-card gradient3">
        <span></span>
        <div className="stat-glass-content">
          <div className="stat-glass-icon"><i className="fas fa-users"></i></div>
          <h3>3rd</h3>
          <p>Campus Ranking</p>
        </div>
      </div>
      <div className="stat-glass-card gradient4">
        <span></span>
        <div className="stat-glass-content">
          <div className="stat-glass-icon"><i className="fas fa-medal"></i></div>
          <h3>Level 2</h3>
          <p>Current Merit Level</p>
        </div>
      </div>
    </div>
    <div className="monthly-competition">
      <h2>🏆 This Month's Competition</h2>
      <div className="competition-grid">
        <div className="competition-card winning">
          <div className="campus-info">
            <h3>🥇 Pune Campus</h3>
            <p>Leading with 1,340 points</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '88%' }}></div>
            </div>
          </div>
        </div>
        <div className="competition-card">
          <div className="campus-info">
            <h3>🥈 Dharamshala Campus</h3>
            <p>Second with 1,220 points</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '81%' }}></div>
            </div>
          </div>
        </div>
        <div className="competition-card">
          <div className="campus-info">
            <h3>🥉 Raigarh Campus</h3>
            <p>Third with 1,140 points</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '75%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
