import React from 'react';
import styles from './SegmentedGroup.module.css';

export interface SegmentedGroupProps {
  name: string;
  value: string | number;
  options: { value: string | number; label: string; icon?: React.ReactNode; disabled?: boolean }[];
  onChange: (value: string | number) => void;
  className?: string;
}

export const SegmentedGroup: React.FC<SegmentedGroupProps> = ({ name, value, options, onChange, className }) => {
  return (
    <div className={`${styles.segmentedGroup} ${className || ''}`.trim()} role="group" aria-label={name}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={
            styles.segmented +
            (value === opt.value ? ' ' + styles.active : '') +
            (opt.disabled ? ' ' + styles.disabled : '')
          }
          onClick={() => !opt.disabled && onChange(opt.value)}
          disabled={opt.disabled}
          aria-pressed={value === opt.value}
        >
          {opt.icon && <span className={styles.icon}>{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
};
