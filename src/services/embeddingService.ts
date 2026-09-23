import { createHash } from "node:crypto";
import { logger } from "../utils/logger.js";

export interface EmbeddingService {
  readonly modelName: string;
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Deterministic, dependency-free local embedding.
 *
 * This is a hashing-trick bag-of-words embedding: each token is hashed into
 * one of N buckets and accumulated, then the vector is L2-normalized. It is
 * NOT a neural embedding, but it is a genuine, reproducible vector
 * representation that supports real cosine-similarity semantic search over
 * this project's short, structured market-data sentences without requiring
 * any external API key or network access — which keeps the whole RAG
 * pipeline runnable completely offline.
 *
 * To use a real neural embedding model instead (e.g. an OpenAI-compatible
 * embeddings endpoint, a local Ollama model, or a Hugging Face inference
 * endpoint), set EMBEDDING_PROVIDER=external and configure
 * EMBEDDING_API_URL / EMBEDDING_API_KEY — ExternalEmbeddingService below
 * implements the same interface so no calling code changes.
 */
export class LocalHashEmbeddingService implements EmbeddingService {
  readonly modelName: string;
  readonly dimensions: number;

  constructor(dimensions = Number(process.env.EMBEDDING_DIMENSIONS || 384)) {
    this.dimensions = dimensions;
    this.modelName = process.env.EMBEDDING_MODEL || `local-hash-embedding-${dimensions}`;
  }

  async embed(text: string): Promise<number[]> {
    return this.embedSync(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.embedSync(t));
  }

  private embedSync(text: string): number[] {
    const vector = new Array(this.dimensions).fill(0);
    const tokens = this.tokenize(text);

    for (const token of tokens) {
      const hash = createHash("sha256").update(token).digest();
      const bucket = hash.readUInt32BE(0) % this.dimensions;
      const sign = hash[4] % 2 === 0 ? 1 : -1;
      vector[bucket] += sign;
    }

    return l2Normalize(vector);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9.\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }
}

/**
 * External embedding provider adapter. Never hard-codes a URL or key —
 * both come from environment variables and the class simply no-ops with a
 * clear error if they are missing, so misconfiguration fails loudly.
 */
export class ExternalEmbeddingService implements EmbeddingService {
  readonly modelName: string;
  readonly dimensions: number;
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.modelName = process.env.EMBEDDING_MODEL || "external-embedding-model";
    this.dimensions = Number(process.env.EMBEDDING_DIMENSIONS || 384);
    this.apiUrl = process.env.EMBEDDING_API_URL || "";
    this.apiKey = process.env.EMBEDDING_API_KEY || "";
    if (!this.apiUrl) {
      throw new Error(
        "EMBEDDING_PROVIDER=external requires EMBEDDING_API_URL to be set in .env"
      );
    }
  }

  async embed(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([text]);
    return vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: this.modelName, input: texts }),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(`External embedding API request failed (${response.status}): ${bodyText}`);
    }

    const payload = (await response.json()) as { data?: Array<{ embedding: number[] }> };
    if (!payload.data || payload.data.length !== texts.length) {
      throw new Error("External embedding API returned an unexpected response shape");
    }
    return payload.data.map((d) => d.embedding);
  }
}

function l2Normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vector;
  return vector.map((v) => v / magnitude);
}

let cachedService: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (cachedService) return cachedService;

  const provider = (process.env.EMBEDDING_PROVIDER || "local").toLowerCase();
  if (provider === "external") {
    logger.info("Using external embedding provider");
    cachedService = new ExternalEmbeddingService();
  } else {
    logger.info("Using local hashing-based embedding provider");
    cachedService = new LocalHashEmbeddingService();
  }
  return cachedService;
}
