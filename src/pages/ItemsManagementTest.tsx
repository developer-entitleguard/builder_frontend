import React from 'react';
import Header from '@/components/Header';

const ItemsManagementTest = () => {
  console.log('ItemsManagementTest - Component loaded');
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-foreground">Items Management Test</h1>
        <p>This is a test component to verify routing works.</p>
      </main>
    </div>
  );
};

export default ItemsManagementTest;