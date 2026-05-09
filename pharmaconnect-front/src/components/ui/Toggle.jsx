
import React from "react";

export default function Toggle({ checked, onChange }) {
  return (
    <label className="toggle-switch">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange} 
        hidden 
      />
      <span className="slider" />
    </label>
  );
}

