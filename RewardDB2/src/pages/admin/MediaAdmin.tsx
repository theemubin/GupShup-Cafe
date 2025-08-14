import React from 'react';
import styles from './MediaAdmin.module.css';

const MediaAdmin: React.FC = () => {
  return <div className={styles.wrap}>
    <h1>Media Library</h1>
    <p className={styles.lead}>Upload and manage hero images, event galleries, and shared assets (coming soon).</p>
  </div>;
};

export default MediaAdmin;
