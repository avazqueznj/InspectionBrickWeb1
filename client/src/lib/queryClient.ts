import { QueryClient, QueryFunction } from "@tanstack/react-query";

// JWT Token Management
const TOKEN_KEY = "inspection_brick_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle token expiration
    if (res.status === 401) {
      clearAuthToken();
    }
    
    const text = (await res.text()) || res.statusText;
    
    // Try to parse as JSON to extract structured error data
    let errorData: Record<string, unknown> = {};
    try {
      errorData = JSON.parse(text);
    } catch {
      // Not JSON, use raw text
    }
    
    const error = new Error(errorData.error as string || `${res.status}: ${text}`) as Error & Record<string, unknown>;
    
    // Attach additional properties from error response
    if (errorData.validationErrors) {
      error.validationErrors = errorData.validationErrors;
    }
    if (errorData.details) {
      error.details = errorData.details;
    }
    
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Keep for backward compatibility with legacy sessions
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      headers: getAuthHeaders(),
      credentials: "include", // Keep for backward compatibility
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      clearAuthToken();
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Always refetch when window gains focus
      refetchOnMount: true, // Always refetch when component mounts
      staleTime: 0, // Data is immediately stale - no caching
      gcTime: 0, // Garbage collect immediately - no cached data retention
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
