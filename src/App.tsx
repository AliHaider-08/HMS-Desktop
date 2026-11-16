import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useAuthStore } from './store/authStore';

export function App() {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  // Ask the main process whether a session already exists (for example after a reload).
  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return <RouterProvider router={router} />;
}
