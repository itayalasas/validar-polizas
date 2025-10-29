import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="w-4 h-4 bg-red-600 rounded-full animate-bounce"></div>
      <div className="w-4 h-4 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-4 h-4 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    </div>
  );
};