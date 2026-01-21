import React from 'react';
import ReactDOM from 'react-dom/client';
// Including the .tsx extension is mandatory for the browser to find the file
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
