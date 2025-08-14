import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 20, style, className }) => (
  <div
    className={styles.skeleton + (className ? ' ' + className : '')}
    style={{ width, height, ...style }}
    aria-busy="true"
    aria-label="Loading..."
  />
);

export default Skeleton;
