import { configureStore } from '@reduxjs/toolkit';
import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore } from 'redux-persist';
import { combineReducers } from 'redux';
import candidatesReducer from './slices/candidatesSlice';
import currentReducer from './slices/currentSlice';

const persistConfig = {
  key: 'root',
  storage,
  // Added whitelist to persist only necessary data
  whitelist: ['candidates', 'current'],
};

const rootReducer = combineReducers({
  candidates: candidatesReducer,
  current: currentReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Ignore non-serializable for dates/timers if any
    }),
});

export const persistor = persistStore(store);