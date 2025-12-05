/**
 * Config Client - Spring Cloud Config compatible client module
 *
 * @example
 * ```typescript
 * import { createClient } from 'config-client';
 *
 * const client = createClient({
 *   endpoint: 'http://localhost:8000',
 *   application: 'my-app',
 *   profiles: ['dev'],
 * });
 *
 * const config = await client.load();
 * const dbHost = config.get<string>('database.host', 'localhost');
 * ```
 */

// Types
export type {
  PropertySource,
  ConfigResponse,
  AuthOptions,
  RetryOptions,
  ConfigClientOptions,
  IConfig,
  ResponseFormat,
} from "./types";

export { ConfigClientError } from "./types";

// Classes
export { Config } from "./config";
export { ConfigClient, createClient } from "./client";
