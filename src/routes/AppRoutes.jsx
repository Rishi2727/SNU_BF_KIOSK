import { Routes, Route } from "react-router-dom";
import { routes } from "./routesConfig";
import { listen } from '@tauri-apps/api/event';
import { useNavigateContext } from '../context/NavigateContext';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';


const AppRoutes = () => {
   const navigate = useNavigateContext();
     const dispatch = useDispatch();

     useEffect(() => {
    let configUnsubscribe = null;
    let aboutUnsubscribe = null;
    let isMounted = true;

    const setupListeners = async () => {
      try {
        configUnsubscribe = await listen('navigate-to-config', () => {
          if (isMounted) {
            navigate('/configuration');
          }
        });

        aboutUnsubscribe = await listen('navigate-to-about', () => {
          if (isMounted) {
            navigate('/about');
          }
        });
      } catch (error) {
        console.warn('Error setting up listeners:', error);
      }
    };

    const handleKeyDown = (e) => {
      if (!isMounted) return;
      
      if (e.ctrlKey && e.shiftKey) {
        const key = e.key.toLowerCase();
        if (key === 'c') {
          e.preventDefault();
          navigate('/configuration');
        } else if (key === 'd') {
          e.preventDefault();
          navigate('/');
          dispatch(logoutUser());
        }
      }
    };

    setupListeners();
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      
      // Clean up event listeners safely
      if (configUnsubscribe && typeof configUnsubscribe === 'function') {
        try {
          configUnsubscribe();
        } catch (err) {
          console.warn('Error unregistering config listener:', err);
        }
      }
      
      if (aboutUnsubscribe && typeof aboutUnsubscribe === 'function') {
        try {
          aboutUnsubscribe();
        } catch (err) {
          console.warn('Error unregistering about listener:', err);
        }
      }
      
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, dispatch]);


  return (
    <Routes>
      {routes.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}
    </Routes>
  );
};

export default AppRoutes;
