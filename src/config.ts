import { ConfigResponse, IConfig } from "./types";

/**
 * Config Server response wrapper class
 * aprovides methods to access configuration properties
 */
export class Config implements IConfig {
  private readonly _raw: ConfigResponse;
  private readonly _properties: Record<string, unknown>;
  private readonly _flatProperties: Record<string, unknown>;

  constructor(response: ConfigResponse) {
    this._raw = response;
    this._flatProperties = this.mergePropertySources();
    this._properties = this.unflatten(this._flatProperties);
  }

  get raw(): ConfigResponse {
    return this._raw;
  }

  get properties(): Record<string, unknown> {
    return this._properties;
  }

  get name(): string {
    return this._raw.name;
  }

  get profiles(): string[] {
    return this._raw.profiles;
  }

  get label(): string | null {
    return this._raw.label;
  }

  get version(): string | null {
    return this._raw.version;
  }

  /**
   * PropertySource merge
   */
  private mergePropertySources(): Record<string, unknown> {
    const merged: Record<string, unknown> = {};

    // propertySources are ordered by priority, so merge in reverse order
    const sources = [...this._raw.propertySources].reverse();

    for (const propertySource of sources) {
      Object.assign(merged, propertySource.source);
    }

    return merged;
  }

  /**
   * flat object to nested object converter
   * ex) { 'database.host': 'localhost' } -> { database: { host: 'localhost' } }
   */
  private unflatten(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const keys = key.split(".");
      let current: Record<string, unknown> = result;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!(k in current) || typeof current[k] !== "object" || current[k] === null) {
          current[k] = {};
        }
        current = current[k] as Record<string, unknown>;
      }

      current[keys[keys.length - 1]] = value;
    }

    return result;
  }

  /**
   * comma-separated key notation property getter
   */
  get<T = unknown>(key: string, defaultValue?: T): T | undefined {
    // search in flattened properties first
    if (key in this._flatProperties) {
      return this._flatProperties[key] as T;
    }

    // search nested properties
    const keys = key.split(".");
    let current: unknown = this._properties;

    for (const k of keys) {
      if (current === null || current === undefined || typeof current !== "object") {
        return defaultValue;
      }
      current = (current as Record<string, unknown>)[k];
    }

    return current !== undefined ? (current as T) : defaultValue;
  }

  /**
   * config key existence checker
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * flat object return
   */
  toFlatObject(): Record<string, unknown> {
    return { ...this._flatProperties };
  }

  /**
   * nested object return
   */
  toObject(): Record<string, unknown> {
    return JSON.parse(JSON.stringify(this._properties));
  }

  /**
   * all properties iterator
   */
  forEach(callback: (value: unknown, key: string) => void): void {
    for (const [key, value] of Object.entries(this._flatProperties)) {
      callback(value, key);
    }
  }

  /**
   * Strong to JSON conversion
   */
  toJSON(): string {
    return JSON.stringify(this._properties, null, 2);
  }

  /**
   * String representation
   */
  toString(): string {
    return `Config(name=${this.name}, profiles=[${this.profiles.join(", ")}], label=${this.label}, version=${
      this.version
    })`;
  }
}
