import { Config } from "./config";
import {
  ConfigClientOptions,
  ConfigResponse,
  ConfigClientError,
  AuthOptions,
  RetryOptions,
  ResponseFormat,
} from "./types";

/**
 * default options
 */
const DEFAULT_OPTIONS = {
  profiles: ["default"] as string[],
  label: "main",
  timeout: 5000,
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
  },
};

/**
 * Config Server client class
 */
export class ConfigClient {
  private readonly endpoint: string;
  private readonly applications: string[];
  private readonly profiles: string[];
  private readonly label: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;
  private readonly retry: Required<RetryOptions>;
  private readonly auth?: AuthOptions;

  constructor(options: ConfigClientOptions) {
    this.endpoint = options.endpoint.replace(/\/+$/, "");
    this.applications = Array.isArray(options.application) ? options.application : [options.application];
    this.profiles = options.profiles ?? DEFAULT_OPTIONS.profiles;
    this.label = options.label ?? DEFAULT_OPTIONS.label;
    this.timeout = options.timeout ?? DEFAULT_OPTIONS.timeout;
    this.auth = options.auth;
    this.headers = options.headers ?? {};
    this.retry = {
      maxRetries: options.retry?.maxRetries ?? DEFAULT_OPTIONS.retry.maxRetries,
      retryDelay: options.retry?.retryDelay ?? DEFAULT_OPTIONS.retry.retryDelay,
      exponentialBackoff: options.retry?.exponentialBackoff ?? DEFAULT_OPTIONS.retry.exponentialBackoff,
    };
  }

  /**
   * authentication heaeders builder
   */
  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (!this.auth) return headers;

    if (this.auth.apiKey) {
      headers["X-API-Key"] = this.auth.apiKey;
    }

    return headers;
  }

  /**
   * HTTP fetch (including retry logic)
   */
  private async fetchWithRetry(url: string): Promise<Response> {
    const headers = {
      ...this.headers,
      ...this.buildAuthHeaders(),
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retry.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method: "GET",
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new ConfigClientError(
            `Config server returned ${response.status}: ${response.statusText}`,
            response.status,
            url
          );
        }

        return response;
      } catch (error) {
        lastError = error as Error;

        // stop retrying on abort or non-retryable errors
        if (attempt < this.retry.maxRetries) {
          const delay = this.retry.exponentialBackoff
            ? this.retry.retryDelay * Math.pow(2, attempt)
            : this.retry.retryDelay;

          await this.sleep(delay);
        }
      }
    }

    throw new ConfigClientError(
      `Failed to fetch config after ${this.retry.maxRetries + 1} attempts: ${lastError?.message}`,
      undefined,
      url
    );
  }

  /**
   * Sleep helper function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Profile string builder
   */
  private get profileString(): string {
    return this.profiles.join(",");
  }

  /**
   * Config load helper
   * Fetches configuration for all applications and merges them.
   * Applications listed later in the array have higher priority.
   * @returns Config wrapper method
   */
  async load(): Promise<Config> {
    const requests = this.applications.map(async (app) => {
      const url = `${this.endpoint}/${app}/${this.profileString}/${this.label}`;
      const response = await this.fetchWithRetry(url);
      return response.json() as Promise<ConfigResponse>;
    });

    const responses = await Promise.all(requests);

    if (responses.length === 0) {
      throw new ConfigClientError("No applications configured");
    }

    // Merge responses
    // The last application in the list should have the highest priority.
    // In ConfigResponse, propertySources[0] has the highest priority.
    // So we reverse the responses (last app becomes first) and then flatMap their propertySources.
    const mergedPropertySources = [...responses].reverse().flatMap((res) => res.propertySources);

    // Use metadata from the last (most specific) application
    const mainResponse = responses[responses.length - 1];

    const mergedResponse: ConfigResponse = {
      name: responses.map((r) => r.name).join(","),
      profiles: mainResponse.profiles,
      label: mainResponse.label,
      version: mainResponse.version,
      state: mainResponse.state,
      propertySources: mergedPropertySources,
    };

    return new Config(mergedResponse);
  }

  /**
   * Config load (YAML)
   * Only loads the first application's configuration
   * @returns YAML string
   */
  async loadAsYaml(): Promise<string> {
    const app = this.applications[0];
    const url = `${this.endpoint}/${app}-${this.profiles[0]}.yml`;
    const response = await this.fetchWithRetry(url);
    return response.text();
  }

  /**
   * Config load (Properties)
   * Only loads the first application's configuration
   * @returns Properties string
   */
  async loadAsProperties(): Promise<string> {
    const app = this.applications[0];
    const url = `${this.endpoint}/${app}-${this.profiles[0]}.properties`;
    const response = await this.fetchWithRetry(url);
    return response.text();
  }

  /**
   * Config load (Json)
   * Only loads the first application's configuration
   * @returns JSON string
   */
  async loadAsJson(): Promise<string> {
    const app = this.applications[0];
    const url = `${this.endpoint}/${app}-${this.profiles[0]}.json`;
    const response = await this.fetchWithRetry(url);
    return response.text();
  }

  /**
   * Config load (various)
   * @param format - response type('json' | 'yaml' | 'properties')
   */
  async loadAs(format: ResponseFormat): Promise<string> {
    switch (format) {
      case "yaml":
        return this.loadAsYaml();
      case "properties":
        return this.loadAsProperties();
      case "json":
        return this.loadAsJson();
      default:
        throw new ConfigClientError(`Unsupported format: ${format}`);
    }
  }

  /**
   * health check
   * @returns response status true/false
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.endpoint}/actuator/health`;
      const response = await this.fetchWithRetry(url);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Client infomation string value
   */
  toString(): string {
    return `ConfigClient(endpoint=${this.endpoint}, applications=[${this.applications.join(
      ", "
    )}], profiles=[${this.profiles.join(", ")}], label=${this.label})`;
  }
}

/**
 * ConfigClient Factory Method
 * @param options - Client options
 * @returns ConfigClient instance
 *
 * @example
 * ```typescript
 * const client = createClient({
 *   endpoint: 'http://localhost:8000',
 *   application: 'my-app',
 *   profiles: ['dev'],
 *   auth: { apiKey: 'your-api-key' }
 * });
 *
 * const config = await client.load();
 * const dbHost = config.get<string>('database.host', 'localhost');
 * ```
 */
export function createClient(options: ConfigClientOptions): ConfigClient {
  return new ConfigClient(options);
}
