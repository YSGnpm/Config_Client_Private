import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient, Config, ConfigClientError } from "../src";
import type { ConfigResponse } from "../src";

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("ConfigClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("createClient", () => {
    it("should create a client with required options", () => {
      const client = createClient({
        endpoint: "http://localhost:8000",
        application: "my-app",
      });

      expect(client).toBeDefined();
      expect(client.toString()).toContain("my-app");
    });

    it("should create a client with all options", () => {
      const client = createClient({
        endpoint: "http://localhost:8000",
        application: "my-app",
        profiles: ["dev", "local"],
        label: "develop",
        timeout: 10000,
        auth: { apiKey: "test-key" },
        headers: { "X-Custom": "value" },
        retry: { maxRetries: 5 },
      });

      expect(client.toString()).toContain("my-app");
      expect(client.toString()).toContain("dev");
      expect(client.toString()).toContain("develop");
    });
  });

  describe("load", () => {
    const mockResponse: ConfigResponse = {
      name: "my-app",
      profiles: ["dev"],
      label: "main",
      version: "abc123",
      state: null,
      propertySources: [
        {
          name: "file:my-app-dev.yml",
          source: {
            "database.host": "localhost",
            "database.port": 5432,
          },
        },
      ],
    };

    it("should load config successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient({
        endpoint: "http://localhost:8000",
        application: "my-app",
        profiles: ["dev"],
      });

      const config = await client.load();

      expect(config).toBeInstanceOf(Config);
      expect(config.name).toBe("my-app");
      expect(config.profiles).toEqual(["dev"]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/my-app/dev/main",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("should throw ConfigClientError on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const client = createClient({
        endpoint: "http://localhost:8000",
        application: "my-app",
        retry: { maxRetries: 0 },
      });

      await expect(client.load()).rejects.toThrow(ConfigClientError);
    });

    it("should include API key header when auth is provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = createClient({
        endpoint: "http://localhost:8000",
        application: "my-app",
        auth: { apiKey: "my-api-key" },
      });

      await client.load();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-API-Key": "my-api-key",
          }),
        })
      );
    });
  });
});

describe("Config", () => {
  const mockResponse: ConfigResponse = {
    name: "my-app",
    profiles: ["dev"],
    label: "main",
    version: "abc123",
    state: null,
    propertySources: [
      {
        name: "file:my-app-dev.yml",
        source: {
          "database.host": "dev-host",
          "database.port": 5432,
          "feature.enabled": true,
        },
      },
      {
        name: "file:my-app.yml",
        source: {
          "database.host": "default-host",
          "app.name": "My Application",
        },
      },
    ],
  };

  it("should merge property sources correctly", () => {
    const config = new Config(mockResponse);

    // 첫 번째 propertySource가 우선순위 높음
    expect(config.get("database.host")).toBe("dev-host");
    expect(config.get("database.port")).toBe(5432);
    expect(config.get("app.name")).toBe("My Application");
  });

  it("should return default value when key not found", () => {
    const config = new Config(mockResponse);

    expect(config.get("unknown.key", "default")).toBe("default");
    expect(config.get("unknown.key")).toBeUndefined();
  });

  it("should check key existence", () => {
    const config = new Config(mockResponse);

    expect(config.has("database.host")).toBe(true);
    expect(config.has("unknown.key")).toBe(false);
  });

  it("should convert to flat object", () => {
    const config = new Config(mockResponse);
    const flat = config.toFlatObject();

    expect(flat["database.host"]).toBe("dev-host");
    expect(flat["database.port"]).toBe(5432);
  });

  it("should convert to nested object", () => {
    const config = new Config(mockResponse);
    const obj = config.toObject();

    expect(obj.database).toEqual({
      host: "dev-host",
      port: 5432,
    });
  });

  it("should iterate over properties", () => {
    const config = new Config(mockResponse);
    const entries: [string, unknown][] = [];

    config.forEach((value, key) => {
      entries.push([key, value]);
    });

    expect(entries).toContainEqual(["database.host", "dev-host"]);
    expect(entries).toContainEqual(["database.port", 5432]);
  });

  it("should expose raw response", () => {
    const config = new Config(mockResponse);

    expect(config.raw).toEqual(mockResponse);
    expect(config.name).toBe("my-app");
    expect(config.profiles).toEqual(["dev"]);
    expect(config.label).toBe("main");
    expect(config.version).toBe("abc123");
  });
});
