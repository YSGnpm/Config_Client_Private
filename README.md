# Config Client

Spring Cloud Config 호환 서버를 위한 경량 TypeScript 클라이언트 라이브러리입니다.

## 주요 기능

- **Spring Cloud Config 호환** - Spring Cloud Config Server와 완벽 호환
- **TypeScript 지원** - 완전한 타입 정의 제공
- **다양한 응답 형식** - JSON, YAML, Properties 형식 지원
- **자동 재시도** - 네트워크 오류 시 지수 백오프 재시도
- **인증 지원** - API Key 인증 지원
- **경량화** - 외부 의존성 없음 (Node.js 18+ native fetch 사용)

---

## 설치

```bash
npm install @tjdrbs205/config-client
```

---

## 빠른 시작

### 기본 사용법

```typescript
import { createClient } from "@tjdrbs205/config-client";

const client = createClient({
  endpoint: "http://localhost:8000",
  application: "my-app",
  profiles: ["dev"],
});

const config = await client.load();

// 설정 값 조회
const dbHost = config.get<string>("database.host", "localhost");
const dbPort = config.get<number>("database.port", 5432);

// 전체 설정 객체
console.log(config.toObject());
```

### 인증 사용

```typescript
// API Key 인증 (Production 모드)
const client = createClient({
  endpoint: "http://localhost:8000",
  application: "my-app",
  profiles: ["prod"],
  auth: {
    apiKey: "your-api-key",
  },
});
```

---

## API

````

---

## API

### `createClient(options)`

ConfigClient 인스턴스를 생성합니다.

#### 옵션

| 옵션          | 타입                     | 필수 | 기본값        | 설명               |
| ------------- | ------------------------ | ---- | ------------- | ------------------ |
| `endpoint`    | `string`                 | ✅   | -             | Config Server URL  |
| `application` | `string`                 | ✅   | -             | 애플리케이션 이름  |
| `profiles`    | `string[]`               | ❌   | `['default']` | 프로파일 목록      |
| `label`       | `string`                 | ❌   | `'main'`      | Git 브랜치/레이블  |
| `auth`        | `AuthOptions`            | ❌   | -             | 인증 옵션          |
| `timeout`     | `number`                 | ❌   | `5000`        | 요청 타임아웃 (ms) |
| `headers`     | `Record<string, string>` | ❌   | `{}`          | 추가 HTTP 헤더     |
| `retry`       | `RetryOptions`           | ❌   | -             | 재시도 옵션        |

#### AuthOptions

| 옵션 | 타입 | 설명 |
|------|------|------|
| `apiKey` | `string` | API Key 인증 |

#### RetryOptions

| 옵션                 | 타입      | 기본값 | 설명             |
| -------------------- | --------- | ------ | ---------------- |
| `maxRetries`         | `number`  | `3`    | 최대 재시도 횟수 |
| `retryDelay`         | `number`  | `1000` | 재시도 간격 (ms) |
| `exponentialBackoff` | `boolean` | `true` | 지수 백오프 사용 |

---

### ConfigClient 메서드

#### `load(): Promise<Config>`

설정을 로드하고 Config 래퍼 객체를 반환합니다.

```typescript
const config = await client.load();
````

#### `loadAsYaml(): Promise<string>`

YAML 형식으로 설정을 로드합니다.

```typescript
const yaml = await client.loadAsYaml();
```

#### `loadAsProperties(): Promise<string>`

Properties 형식으로 설정을 로드합니다.

```typescript
const props = await client.loadAsProperties();
```

#### `loadAsJson(): Promise<string>`

중첩 JSON 형식으로 설정을 로드합니다.

```typescript
const json = await client.loadAsJson();
```

#### `healthCheck(): Promise<boolean>`

서버 상태를 확인합니다.

```typescript
const isHealthy = await client.healthCheck();
```

---

### Config 메서드

#### `get<T>(key: string, defaultValue?: T): T | undefined`

점(.) 표기법으로 설정 값을 조회합니다.

```typescript
const host = config.get<string>("database.host");
const port = config.get<number>("database.port", 5432);
```

#### `has(key: string): boolean`

설정 키 존재 여부를 확인합니다.

```typescript
if (config.has("database.password")) {
  // ...
}
```

#### `toObject(): Record<string, unknown>`

중첩 객체 형태로 반환합니다.

```typescript
const obj = config.toObject();
// { database: { host: 'localhost', port: 5432 } }
```

#### `toFlatObject(): Record<string, unknown>`

평면화된 객체로 반환합니다.

```typescript
const flat = config.toFlatObject();
// { 'database.host': 'localhost', 'database.port': 5432 }
```

#### `forEach(callback: (value, key) => void): void`

모든 설정에 대해 콜백을 실행합니다.

```typescript
config.forEach((value, key) => {
  console.log(`${key}: ${value}`);
});
```

#### 속성

| 속성         | 타입                      | 설명                    |
| ------------ | ------------------------- | ----------------------- |
| `raw`        | `ConfigResponse`          | 원본 응답 데이터        |
| `properties` | `Record<string, unknown>` | 병합된 설정 (중첩 객체) |
| `name`       | `string`                  | 애플리케이션 이름       |
| `profiles`   | `string[]`                | 활성 프로파일           |
| `label`      | `string \| null`          | Git 레이블              |
| `version`    | `string \| null`          | Git 커밋 버전           |

---

## 에러 처리

```typescript
import { createClient, ConfigClientError } from "@tjdrbs205/config-client";

try {
  const config = await client.load();
} catch (error) {
  if (error instanceof ConfigClientError) {
    console.error(`Config 로드 실패: ${error.message}`);
    console.error(`상태 코드: ${error.statusCode}`);
    console.error(`엔드포인트: ${error.endpoint}`);
  }
}
```

---

## 환경별 사용 예시

### Node.js (CommonJS)

```javascript
const { createClient } = require("@tjdrbs205/config-client");

async function loadConfig() {
  const client = createClient({
    endpoint: process.env.CONFIG_SERVER_URL,
    application: "my-app",
    profiles: [process.env.NODE_ENV || "dev"],
  });

  return client.load();
}
```

### ESM

```typescript
import { createClient } from "@tjdrbs205/config-client";

const config = await createClient({
  endpoint: "http://config-server:8000",
  application: "my-app",
  profiles: ["prod"],
  auth: { apiKey: process.env.CONFIG_API_KEY },
}).load();
```

### NestJS

```typescript
import { ConfigModule } from "@nestjs/config";
import { createClient } from "@tjdrbs205/config-client";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        async () => {
          const client = createClient({
            endpoint: process.env.CONFIG_SERVER_URL,
            application: "nestjs-app",
            profiles: [process.env.NODE_ENV],
          });
          const config = await client.load();
          return config.toObject();
        },
      ],
    }),
  ],
})
export class AppModule {}
```

---

## 요구사항

- Node.js 18.0.0 이상 (native fetch 사용)

---

## 라이선스

MIT
