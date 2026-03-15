/**
 * Validation Service for training datasets.
 * Ensures data integrity before ingestion.
 */

export const validateDataset = (data, type) => {
  const errors = [];
  
  if (!Array.isArray(data) || data.length === 0) {
    return { isValid: false, errors: ['Dataset is empty or invalid format'] };
  }

    data.forEach((row, index) => {
      const line = index + 1;
      const keys = Object.keys(row);

      if (type === 'employees') {
        const empId = row.id || row.employee_id || row.employeeid || row.emp_id;
        const name = row.name || row.full_name || row.employee_name;
        
        if (!empId) errors.push(`Line ${line}: Missing ID (Available keys: ${keys.join(', ')})`);
        if (!name) errors.push(`Line ${line}: Missing name`);
      }

      if (type === 'history' || type === 'projectHistory') {
        // Broaden matching for history fields
        const pId = keys.find(k => k.includes('proj') && k.includes('id')) || keys.find(k => k === 'id');
        const deadline = keys.find(k => k.includes('dead') || k.includes('day') || k.includes('dur'));
        
        const rowPId = row[pId];
        const rowDeadline = row[deadline];

        if (!rowPId) errors.push(`Line ${line}: Missing project ID (Available keys: ${keys.join(', ')})`);
        if (deadline === undefined || rowDeadline === undefined || isNaN(rowDeadline)) {
          errors.push(`Line ${line}: Invalid deadline days (Found key: ${deadline || 'none'}, Value: ${rowDeadline})`);
        }
      }
    });

  return {
    isValid: errors.length === 0,
    errors
  };
};
