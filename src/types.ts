/**
 * Config Server response by property source interface
 */
export interface PropertySource {
  name: string;
  source: Record<string, unknown>;
}

/**
 * Config Server response interface (reponse type)
 */
export interface ConfigResponse {
  name: string;
  profiles: string[];
  label: string | null;
  version: string | null;
  state: string | null;
  propertySources: PropertySource[];
}

/**
 * Authentication options interface
 */
export interface AuthOptions {
  /** API Key auth (Server: Production Mode) */
  apiKey?: string;
}

/**
 * retry options interface
 */
export interface RetryOptions {
  /** Max retry (default: 3) */
  maxRetries?: number;
  /** Retry (ms, default: 1000) */
  retryDelay?: number;
  /** Whether to use exponential backoff (default: true) */
  exponentialBackoff?: boolean;
}

/**
 * ConfigClient creation options
 */
export interface ConfigClientOptions {
  /** Config Server endpoint URL */
  endpoint: string;
  /** Application name or list of application names */
  application: string | string[];
  /** Profile list (default: ['default']) */
  profiles?: string[];
  /** Git branch/label (default: 'main') */
  label?: string;
  /** Authentication options */
  auth?: AuthOptions;
  /** Request timeout (ms, default: 5000) */
  timeout?: number;
  /** Additional HTTP headers */
  headers?: Record<string, string>;
  /** Retry options */
  retry?: RetryOptions;
}

/**
 * Config wrapper interface
 */
export interface IConfig {
  /** Raw response data */
  readonly raw: ConfigResponse;
  /** Merged configuration object */
  readonly properties: Record<string, unknown>;
  /** Application name */
  readonly name: string;
  /** Active profile list */
  readonly profiles: string[];
  /** Git label/branch */
  readonly label: string | null;
  /** Git commit version */
  readonly version: string | null;

  /**
   * Get configuration value by dot notation
   * @param key - Configuration key (e.g. 'database.host')
   * @param defaultValue - Default value
   */
  get<T = unknown>(key: string, defaultValue?: T): T | undefined;

  /**
   * Check if configuration key exists
   * @param key - Configuration key
   */
  has(key: string): boolean;

  /**
   * Return all configurations as flattened object
   */
  toFlatObject(): Record<string, unknown>;

  /**
   * Return all configurations as nested object
   */
  toObject(): Record<string, unknown>;

  /**
   * Execute callback for all configuration key-value pairs
   */
  forEach(callback: (value: unknown, key: string) => void): void;
}

/**
 * HTTP request error
 */
export class ConfigClientError extends Error {
  constructor(message: string, public readonly statusCode?: number, public readonly endpoint?: string) {
    super(message);
    this.name = "ConfigClientError";
  }
}

/**
 * Response format type
 */
export type ResponseFormat = "json" | "yaml" | "properties";
