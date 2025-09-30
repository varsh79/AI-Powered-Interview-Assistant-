import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import currentReducer from './slices/currentSlice';
import candidatesReducer from './slices/candidatesSlice';
import App from './App';

const store = configureStore({
  reducer: {
    current: currentReducer,
    candidates: candidatesReducer,
  },
});

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);