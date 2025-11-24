// AuthState Model - Represents authentication state
export class AuthState {
  public isAuthenticated: boolean;
  public user: User | null;
  public isLoading: boolean;
  public error: string | null;

  constructor(
    isAuthenticated: boolean = false,
    user: User | null = null,
    isLoading: boolean = false,
    error: string | null = null
  ) {
    this.isAuthenticated = isAuthenticated;
    this.user = user;
    this.isLoading = isLoading;
    this.error = error;
  }

  // State management methods
  public setLoading(loading: boolean): AuthState {
    return new AuthState(this.isAuthenticated, this.user, loading, this.error);
  }

  public setUser(user: User | null): AuthState {
    return new AuthState(!!user, user, this.isLoading, this.error);
  }

  public setError(error: string | null): AuthState {
    return new AuthState(this.isAuthenticated, this.user, this.isLoading, error);
  }

  public clearError(): AuthState {
    return new AuthState(this.isAuthenticated, this.user, this.isLoading, null);
  }

  public logout(): AuthState {
    return new AuthState(false, null, false, null);
  }

  public toJSON(): object {
    return {
      isAuthenticated: this.isAuthenticated,
      user: this.user?.toJSON() || null,
      isLoading: this.isLoading,
      error: this.error
    };
  }
}
















