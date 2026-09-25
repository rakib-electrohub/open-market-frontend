import { useContext } from 'react';
import { AuthContext } from '@/lib/AuthContext';

export const useAppSettings = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AuthProvider');
  }
  return context.appPublicSettings || {};
};
