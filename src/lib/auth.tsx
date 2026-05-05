import { ConvexAuthProvider, useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { ConvexReactClient, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ReactNode } from "react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}

export function useAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  
  const user = useQuery(api.users.current);
  
  return {
    user: isAuthenticated && user ? user : null,
    session: isAuthenticated ? {} : null,
    loading: isLoading,
    signOut,
  };
}
