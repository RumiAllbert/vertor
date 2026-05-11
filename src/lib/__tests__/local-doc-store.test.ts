import { beforeEach, describe, expect, it } from "vitest";
import { LocalDocStore, newLocalDoc } from "../doc-store";

describe("LocalDocStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty list when storage is empty", async () => {
    const store = new LocalDocStore();
    expect(await store.list()).toEqual([]);
  });

  it("saves and lists a doc", async () => {
    const store = new LocalDocStore();
    const doc = newLocalDoc({ title: "Hello" });
    await store.save(doc);
    const all = await store.list();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(doc.id);
  });

  it("orders docs by updatedAt descending", async () => {
    const store = new LocalDocStore();
    const a = newLocalDoc({ title: "A" });
    a.updatedAt = 1000;
    const b = newLocalDoc({ title: "B" });
    b.updatedAt = 2000;
    await store.save(a);
    await store.save(b);
    const all = await store.list();
    expect(all.map((d) => d.title)).toEqual(["B", "A"]);
  });

  it("updates an existing doc by id", async () => {
    const store = new LocalDocStore();
    const doc = newLocalDoc({ title: "First" });
    await store.save(doc);
    await store.save({ ...doc, title: "Updated" });
    const all = await store.list();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("Updated");
  });

  it("removes a doc by id", async () => {
    const store = new LocalDocStore();
    const a = newLocalDoc({ title: "A" });
    const b = newLocalDoc({ title: "B" });
    await store.save(a);
    await store.save(b);
    await store.remove(a.id);
    const all = await store.list();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(b.id);
  });
});
