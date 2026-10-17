import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
// Bindings come from Wrangler; widen configurable string vars for isolated installations/tests.
export type AppEnv = {
  [K in keyof Env]: Env[K] extends string ? string : Env[K];
} & {
  OAUTH_PROVIDER: OAuthHelpers;
  ACCESS_CLIENT_SECRET: string;
  OWNER_EMAIL: string;
  ENCRYPTION_KEY: string;
  AUTH_EPOCH: string;
};
