import type { ReactNode } from 'react';


/**
 * Reusable Table Component
 * 
 * @param {Array<string>} headers - Array of column header names
 * @param {Array<Array<string|ReactNode>>} data - 2D array of table data. Each row is an array of cell values
 * @param {string} emptyMessage - Message to display when data is empty (default: "No data available")
 * @param {Object} actionButton - Optional action button config with { label: string, onClick: function }
 * @param {string} className - Additional CSS classes to apply to the wrapper
 * 
 * @example
 * <Table
 *   headers={['Name', 'Email', 'Role']}
 *   data={[
 *     ['John Doe', 'john@example.com', 'Admin'],
 *     ['Jane Smith', 'jane@example.com', 'User']
 *   ]}
 *   emptyMessage="No users found"
 *   actionButton={{
 *     label: 'View all users →',
 *     onClick: () => navigate('/users')
 *   }}
 * />
 */
export interface TableActionButton {
  label: ReactNode;
  onClick: () => void;
}

export interface TableProps {
  headers: ReactNode[];
  data: ReactNode[][];
  emptyMessage?: ReactNode;
  actionButton?: TableActionButton;
  className?: string;
}

export const Table = ({
  headers,
  data,
  emptyMessage = "No data available",
  actionButton,
  className = "",
}: TableProps) => {
  return (
    <div className={`crewlet-table ${className}`}>
      <div className="crewlet-table__container">
        <div className="crewlet-table__header" style={{ gridTemplateColumns: `repeat(${headers.length}, 1fr)` }}>
          {headers.map((header, index) => (
            <span key={index}>{header}</span>
          ))}
        </div>
        
        {data && data.length > 0 ? (
          <div className="crewlet-table__body">
            {data.map((row, rowIndex) => (
              <div 
                key={rowIndex} 
                className="crewlet-table__row" 
                style={{ gridTemplateColumns: `repeat(${headers.length}, 1fr)` }}
              >
                {row.map((cell, cellIndex) => (
                  <span key={cellIndex}>{cell}</span>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="crewlet-table__empty">
            <span>{emptyMessage}</span>
          </div>
        )}
      </div>
      
      {actionButton && (
        <button 
          className="crewlet-table__action-btn"
          onClick={actionButton.onClick}
        >
          <span className="crewlet-table__action-text">{actionButton.label}</span>
        </button>
      )}
    </div>
  );
};


