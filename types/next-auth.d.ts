import 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    provider?: string;
    error?: string;
    emailVerified?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    provider?: string;
    accessTokenExpires?: number;
    error?: string;
    emailVerified?: boolean;
  }
}
