"use client";

import React from 'react';

interface MarkdownProps {
  children: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ children }) => {
  // Simple markdown renderer - can be enhanced later
  return (
    <div className="markdown-content">
      {children}
    </div>
  );
};

