import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

const APP = (import.meta.env.VITE_APP_NAME as string | undefined)?.toLowerCase().replace(/\s+/g, '_') || 'nexustrack';
const TOKEN_KEY = `${APP}_token`;
const USER_KEY  = `${APP}_user`;

const loadFromStorage = (): AuthState => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user, isAuthenticated: !!token && !!user };
  } catch {
    return { token: null, user: null, isAuthenticated: false };
  }
};

const initialState: AuthState = loadFromStorage();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; user: User }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      localStorage.setItem(TOKEN_KEY, action.payload.token);
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user));
    },
    logout(state) {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
