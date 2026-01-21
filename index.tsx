import React from 'react';
import ReactDOM from 'react-dom/client';
// Use the relative path. Babel Standalone will resolve this.
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Critical Error: Root element not found");
}
