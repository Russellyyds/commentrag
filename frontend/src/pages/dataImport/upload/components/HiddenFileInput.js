import React from 'react';

const HiddenFileInput = ({ onChange }) => {
  return (
    <input 
      type="file" 
      id="fileInput" 
      multiple 
      accept=".json,.csv,.tsv,.xls,.xlsx"
      style={{ display: 'none' }}
      onChange={onChange}
    />
  );
};

export default HiddenFileInput;