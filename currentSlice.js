import { createSlice } from '@reduxjs/toolkit';

const currentSlice = createSlice({
  name: 'current',
  initialState: null,
  reducers: {
    setCurrent: (state, action) => action.payload,
    updateCurrent: (state, action) => ({ ...state, ...action.payload }),
    clearCurrent: () => null,
  },
});

export const { setCurrent, updateCurrent, clearCurrent } = currentSlice.actions;
export default currentSlice.reducer;