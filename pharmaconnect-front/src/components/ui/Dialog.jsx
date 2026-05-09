
import React from 'react';

export function Dialog({ children }) {
  return <div className="dialog">{children}</div>;
}

export function DialogTrigger({ children, asChild }) {
  return <button>{children}</button>;
}

export function DialogContent({ children }) {
  return <div className="dialog-content">{children}</div>;
}
