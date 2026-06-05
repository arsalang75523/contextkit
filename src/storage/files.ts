const memoryFiles = new Map<string, string>();

export class AppFiles {
  constructor(private readonly bucket?: R2Bucket) {}

  async writeJson(path: string, value: unknown) {
    const body = JSON.stringify(value, null, 2);
    if (this.bucket) {
      await this.bucket.put(path, body, {
        httpMetadata: { contentType: "application/json" }
      });
      return;
    }

    memoryFiles.set(path, body);
  }

  async readJson<T>(path: string): Promise<T | null> {
    if (this.bucket) {
      const object = await this.bucket.get(path);
      if (!object) return null;
      return object.json<T>();
    }

    const body = memoryFiles.get(path);
    return body ? (JSON.parse(body) as T) : null;
  }
}
