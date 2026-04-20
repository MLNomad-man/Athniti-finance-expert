import React from 'react';
import { usePredX } from '../context/PredXContext';

interface BalanceDisplayProps {
  value: number;
  decimals?: number;
  currency?: string;
  showIcon?: boolean;
  className?: string;
}

const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  value,
  decimals = 2,
  currency = 'ALGO',
  showIcon = false,
  className = ''
}) => {
  const { isBalanceHidden, toggleBalanceVisibility } = usePredX();

  const displayValue = isBalanceHidden ? '****' : value.toFixed(decimals);

  return (
    <div className={`inline-flex items-center ${className}`}>
      <span>{displayValue} {currency}</span>
      {showIcon && (
        <button
          onClick={toggleBalanceVisibility}
          className="ml-2 text-on-surface-variant hover:text-primary-container transition-colors"
        >
          <span className="material-symbols-outlined text-base">
            {isBalanceHidden ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      )}
    </div>
  );
};

export default BalanceDisplay;