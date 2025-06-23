'use client';

import React, { createContext, useContext, ReactNode, useState } from 'react';

// Define the shape of your authentication context data
interface AuthContextType {
  user: { id: string; username: string } | null; // Example user structure
  // Add other authentication-related data or functions here (e.g., login, logout)
  testLogin: () => void;
  testLogout: () => void;
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to consume the AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  // Throw an error if the hook is used outside of an AuthProvider
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Provider component to wrap your application or parts of it
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use state to hold the user data
  const [user, setUser] = useState<{ id: string; username: string } | null>({
    id: 'test-user-123', // Provide a test user ID
    username: 'TestUser', // Provide a test username
  });

  // Function to simulate login with a test user
  const testLogin = () => {
    setUser({
      id: 'test-user-123',
      username: 'TestUser',
    });
  };

  // Function to simulate logout
  const testLogout = () => {
    setUser(null);
  };

  // Example context value - replace with your actual auth data and functions
  const value = {
    user,
    testLogin,
    testLogout,
    // Add your actual login, logout, etc. functions here later
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};