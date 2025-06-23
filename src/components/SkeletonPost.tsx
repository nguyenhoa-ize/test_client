import React from 'react';

const SkeletonPost = () => (
  <div className="bg-gray-200 animate-pulse rounded-2xl p-6 w-full max-w-3xl mx-auto mb-6 min-h-[160px]">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 rounded-full bg-gray-300" />
      <div className="flex-1 h-4 bg-gray-300 rounded" />
    </div>
    <div className="h-4 bg-gray-300 rounded mb-2 w-3/4" />
    <div className="h-4 bg-gray-300 rounded mb-2 w-1/2" />
    <div className="h-4 bg-gray-300 rounded w-1/3" />
  </div>
);

export default SkeletonPost; 