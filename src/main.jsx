import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { registrarServiceWorker } from './InstalarApp.jsx';
import './index.css';
import './site.css';
import './agendar.css';

registrarServiceWorker();

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
