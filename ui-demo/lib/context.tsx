"use client";

import React, { createContext, useContext, useState } from "react";

export type Role = "user" | "admin";
export type AuthState = "landing" | "setup" | "login" | "app";

interface AppContextType {
  role: Role;
  setRole: (r: Role) => void;
  authState: AuthState;
  setAuthState: (s: AuthState) => void;
}

const AppContext = createContext<AppContextType>({
  role: "user",
  setRole: () => {},
  authState: "app",
  setAuthState: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("user");
  const [authState, setAuthState] = useState<AuthState>("app");

  return (
    <AppContext.Provider value={{ role, setRole, authState, setAuthState }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
