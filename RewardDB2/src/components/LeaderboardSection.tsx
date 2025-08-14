import React from 'react';
import './LeaderboardSection.css';

export const LeaderboardSection = ({ id }: { id?: string }) => (
  <section className="leaderboard-section" id={id}>
    <div className="section-header">
      <h2>🏆 Campus Leaderboard</h2>
      <p>See how campuses and houses are performing this month</p>
    </div>
    <div className="leaderboard-tabs">
      <button className="tab-button active">Campus Rankings</button>
      <button className="tab-button">House Rankings</button>
    </div>
    <div className="leaderboard-table">
      <div className="table-header">
        <div className="rank">Rank</div>
        <div className="name">Campus</div>
        <div className="points">Points</div>
        <div className="rewards">Rewards Won</div>
        <div className="trend">Trend</div>
      </div>
      <div className="table-body">
        <div className="table-row">
          <div className="rank">1</div>
          <div className="name">Pune</div>
          <div className="points">1340</div>
          <div className="rewards">8</div>
          <div className="trend up">↑</div>
        </div>
        <div className="table-row">
          <div className="rank">2</div>
          <div className="name">Dharamshala</div>
          <div className="points">1220</div>
          <div className="rewards">6</div>
          <div className="trend">→</div>
        </div>
        <div className="table-row">
          <div className="rank">3</div>
          <div className="name">Raigarh</div>
          <div className="points">1140</div>
          <div className="rewards">5</div>
          <div className="trend down">↓</div>
        </div>
      </div>
    </div>
  </section>
);
