'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onSessionChange, refreshSession, User } from './api';

interface AuthState {
  user: User | null;
  ready: boolean;
}

const Ctx = createContext<AuthState>({ user: null, ready: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, ready: false });

  useEffect(() => {
    const off = onSessionChange((user) => setState({ user, ready: true }));
    // Pulihkan sesi dari refresh cookie saat halaman dibuka
    refreshSession().then((ok) => {
      if (!ok) setState({ user: null, ready: true });
    });
    return () => {
      off();
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

/** Lindungi halaman: arahkan ke /login bila belum login, atau ke / bila butuh admin. */
export function useRequireAuth(role?: 'ADMIN') {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (role && user.role !== role) router.replace('/');
  }, [ready, user, role, router, pathname]);
  return { user, ready: ready && !!user && (!role || user.role === role) };
}
