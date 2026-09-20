import { DatabaseSync, type SQLOutputValue } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * The persistence seam (MASTER_PLAN.md §2.0).
 *
 * One database per MAGoCo root. The default driver is SQLite via Node's built-in
 * `node:sqlite` — zero external services, zero native modules, works in a
 * container. A Postgres driver can implement the same interface later; the
 * three memory layers below never know which one they're talking to.
 *
 * Statements are prepared once and reused: every hot path is a single bound call.
 */
export class Store {
  private readonly db: DatabaseSync;
  private readonly stmts: Map<string, ReturnType<DatabaseSync['prepare']>> = new Map();

  constructor(rootDir: string) {
    fs.mkdirSync(path.join(rootDir, 'db'), { recursive: true });
    const file = path.join(rootDir, 'db', 'magoco.db');
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
    this.migrate();
  }

  /** Idempotent schema bootstrap. */
  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );

      -- Working memory: the current conversation, tool calls, scratch state.
      -- Bounded — old turns are summarized into episodic memory.
      CREATE TABLE IF NOT EXISTS working (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,            -- user | assistant | tool | system
        content TEXT NOT NULL,         -- JSON: {text, toolCalls, toolResults, ...}
        ts INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS working_session ON working(session_id, id);

      -- Episodic memory: past sessions, distilled into retrievable lessons.
      CREATE TABLE IF NOT EXISTS episodic (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,               -- the session this was learned in (may be null)
        summary TEXT NOT NULL,         -- what happened
        lesson TEXT NOT NULL,          -- what to do differently / remember
        embedding TEXT,                -- optional vector, stored as JSON
        ts INTEGER NOT NULL,
        weight REAL NOT NULL DEFAULT 1.0
      );
      CREATE INDEX IF NOT EXISTS episodic_ts ON episodic(ts);

      -- Semantic memory: durable facts about the world and the user.
      CREATE TABLE IF NOT EXISTS semantic (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        ts INTEGER NOT NULL
      );

      -- Agent skills: reusable, executable knowledge.
      CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        body TEXT NOT NULL,            -- markdown instructions
        created_by TEXT NOT NULL,      -- 'user' | 'agent' | 'system'
        ts INTEGER NOT NULL
      );
    `);
  }

  /** Bound, cached statement — the only way queries leave this class. */
  private stmt(sql: string) {
    let s = this.stmts.get(sql);
    if (!s) {
      s = this.db.prepare(sql);
      this.stmts.set(sql, s);
    }
    return s;
  }

  // ── working memory ──────────────────────────────────────────────────────

  appendWorking(sessionId: string, role: string, content: unknown): number {
    const r = this.stmt(
      'INSERT INTO working(session_id, role, content, ts) VALUES(?,?,?,?) RETURNING id',
    ).get(sessionId, role, JSON.stringify(content), Date.now()) as { id: number };
    return r.id;
  }

  /** The most recent `limit` turns of a session, oldest first. */
  recentWorking(sessionId: string, limit = 50): Array<{ id: number; role: string; content: unknown; ts: number }> {
    return (
      this.stmt(
        'SELECT id, role, content, ts FROM working WHERE session_id = ? ORDER BY id DESC LIMIT ?',
      ).all(sessionId, limit) as Array<{ id: number; role: string; content: string; ts: number }>
    )
      .reverse()
      .map((r) => ({ ...r, content: JSON.parse(r.content) }));
  }

  /** Everything between two ids — used when summarizing a window. */
  workingRange(sessionId: string, fromId: number, toId: number): Array<{ id: number; role: string; content: unknown }> {
    return (
      this.stmt(
        'SELECT id, role, content FROM working WHERE session_id = ? AND id > ? AND id <= ? ORDER BY id',
      ).all(sessionId, fromId, toId) as Array<{ id: number; role: string; content: string }>
    ).map((r) => ({ ...r, content: JSON.parse(r.content) }));
  }

  /** Drop summarized turns so working memory stays bounded. */
  deleteWorkingBefore(sessionId: string, beforeId: number): number {
    const r = this.stmt('DELETE FROM working WHERE session_id = ? AND id < ?').run(
      sessionId,
      beforeId,
    );
    return typeof r.changes === 'bigint' ? Number(r.changes) : r.changes;
  }

  countWorking(sessionId: string): number {
    const r = this.stmt('SELECT COUNT(*) AS n FROM working WHERE session_id = ?').get(
      sessionId,
    ) as { n: number | bigint };
    return typeof r.n === 'bigint' ? Number(r.n) : r.n;
  }

  // ── episodic memory ─────────────────────────────────────────────────────

  recordEpisode(e: {
    sessionId?: string | undefined;
    summary: string;
    lesson: string;
    embedding?: unknown;
    weight?: number;
  }): number {
    const r = this.stmt(
      `INSERT INTO episodic(session_id, summary, lesson, embedding, ts, weight)
       VALUES(?,?,?,?,?,?) RETURNING id`,
    ).get(
      e.sessionId ?? null,
      e.summary,
      e.lesson,
      e.embedding ? JSON.stringify(e.embedding) : null,
      Date.now(),
      e.weight ?? 1.0,
    ) as { id: number };
    return r.id;
  }

  /** Most recent episodes, highest weight first. */
  recentEpisodes(
    limit = 10,
  ): Array<{ id: number; sessionId: string | null; summary: string; lesson: string; weight: number; ts: number }> {
    return (this.stmt(
      'SELECT id, session_id AS sessionId, summary, lesson, weight, ts FROM episodic ORDER BY weight DESC, ts DESC LIMIT ?',
    ).all(limit) as Array<{
      id: number;
      sessionId: string | null;
      summary: string;
      lesson: string;
      weight: number;
      ts: number;
    }>).map((r) => ({
      ...r,
      weight: typeof r.weight === 'bigint' ? Number(r.weight) : r.weight,
      ts: typeof r.ts === 'bigint' ? Number(r.ts) : r.ts,
    }));
  }

  /**
   * Keyword search — the zero-dependency stand-in until embeddings land.
   *
   * The query is split into words and a row matches when *any* word appears in
   * its summary or lesson. A query is a question, not a phrase the user
   * remembered verbatim, so whole-phrase LIKE would silently return nothing.
   */
  searchEpisodes(query: string, limit = 5): Array<{ id: number; summary: string; lesson: string; weight: number }> {
    const words = query
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((w) => w.length > 1);
    if (words.length === 0) return [];
    const escape = (s: string) => s.replace(/[%_]/g, (m) => '\\' + m);
    const where = words
      .map((w) => `(summary LIKE ? ESCAPE '\\' OR lesson LIKE ? ESCAPE '\\')`)
      .join(' OR ');
    const params: string[] = [];
    for (const w of words) {
      params.push(`%${escape(w)}%`, `%${escape(w)}%`);
    }
    return (this.stmt(
      `SELECT id, summary, lesson, weight FROM episodic
       WHERE ${where}
       ORDER BY weight DESC, ts DESC LIMIT ?`,
    ).all(...params, limit) as Array<{ id: number; summary: string; lesson: string; weight: number }>).map((r) => ({
      ...r,
      weight: typeof r.weight === 'bigint' ? Number(r.weight) : r.weight,
    }));
  }

  reinforceEpisode(id: number, delta: number): void {
    this.stmt('UPDATE episodic SET weight = weight + ? WHERE id = ?').run(delta, id);
  }

  // ── semantic memory ─────────────────────────────────────────────────────

  setSemantic(key: string, value: unknown): void {
    this.stmt(
      'INSERT INTO semantic(key, value, ts) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, ts=excluded.ts',
    ).run(key, JSON.stringify(value), Date.now());
  }

  getSemantic(key: string): unknown | undefined {
    const r = this.stmt('SELECT value FROM semantic WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return r ? JSON.parse(r.value) : undefined;
  }

  deleteSemantic(key: string): boolean {
    return this.stmt('DELETE FROM semantic WHERE key = ?').run(key).changes > 0;
  }

  keysSemantic(prefix = ''): string[] {
    const rows = this.stmt('SELECT key FROM semantic WHERE key LIKE ? ORDER BY key').all(
      `${prefix}%`,
    ) as Array<Record<string, SQLOutputValue>>;
    return rows.map((r) => String(r['key']));
  }

  // ── skills ──────────────────────────────────────────────────────────────

  saveSkill(s: { name: string; description: string; body: string; createdBy: string }): void {
    this.stmt(
      `INSERT INTO skills(name, description, body, created_by, ts)
       VALUES(?,?,?,?,?)
       ON CONFLICT(name) DO UPDATE SET description=excluded.description, body=excluded.body`,
    ).run(s.name, s.description, s.body, s.createdBy, Date.now());
  }

  loadSkill(name: string): { name: string; description: string; body: string; createdBy: string } | undefined {
    return this.stmt('SELECT name, description, body, created_by FROM skills WHERE name = ?').get(
      name,
    ) as
      | { name: string; description: string; body: string; createdBy: string }
      | undefined;
  }

  listSkills(): Array<{ name: string; description: string; createdBy: string }> {
    return this.stmt('SELECT name, description, created_by FROM skills ORDER BY name').all() as Array<{
      name: string;
      description: string;
      createdBy: string;
    }>;
  }

  deleteSkill(name: string): boolean {
    return this.stmt('DELETE FROM skills WHERE name = ?').run(name).changes > 0;
  }

  close(): void {
    this.stmts.clear();
    this.db.close();
  }
}
