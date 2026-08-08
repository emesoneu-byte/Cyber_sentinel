import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, userApi, tokens, type User } from '../api/client';

interface AuthState { user: User|null; isLoading: boolean; isAuthenticated: boolean; login: (email:string,password:string)=>Promise<void>; register: (email:string,username:string,password:string,department?:string)=>Promise<void>; logout: ()=>Promise<void>; refreshUser: ()=>Promise<void>; }
const AuthContext = createContext<AuthState|null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User|null>(null);
  const [isLoading, setLoading] = useState(true);
  const refreshUser = useCallback(async () => {
    if (!tokens.access) { setLoading(false); return; }
    try { const { user: u } = await userApi.me(); setUser(u); } catch { tokens.clear(); setUser(null); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    refreshUser();
    const onLogout = () => { setUser(null); tokens.clear(); };
    window.addEventListener('sg:logout', onLogout);
    return () => window.removeEventListener('sg:logout', onLogout);
  }, [refreshUser]);
  const login = async (email: string, password: string) => { const res = await authApi.login(email,password); tokens.set(res.accessToken,res.refreshToken,res.user.id); setUser(res.user); };
  const register = async (email: string, username: string, password: string, department?: string) => { const res = await authApi.register(email,username,password,department); tokens.set(res.accessToken,res.refreshToken,res.user.id); setUser(res.user); };
  const logout = async () => { try { await authApi.logout(tokens.refresh); } catch { /* ignore */ } tokens.clear(); setUser(null); };
  return <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout, refreshUser }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be inside AuthProvider'); return ctx; }
