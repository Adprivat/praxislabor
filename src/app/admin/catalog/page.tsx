import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  createActivityBlock,
  createCategory,
  createTag,
  toggleActivityBlock,
  toggleCategory,
  toggleTag,
} from "@/server/actions/catalog";
import { getCatalogAdminData } from "@/server/queries/catalog";

export default async function CatalogAdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const { categories, blocks, tags } = await getCatalogAdminData();

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 text-slate-200">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Baustein-Katalog verwalten</h1>
        <p className="text-sm text-slate-400">
          Kategorien, Tags und Bausteine fuer die Zeiterfassung pflegen.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Kategorien</h2>
            <span className="text-xs uppercase tracking-wide text-slate-400">
              {categories.length} Eintraege
            </span>
          </div>
          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/60 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{category.name}</p>
                  <p className="text-xs text-slate-400">
                    {category.description || "Keine Beschreibung"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-2 py-1"
                    style={{ color: category.color ?? "#e2e8f0" }}
                  >
                    ? {category.color || "#"}
                  </span>
                  <form action={toggleCategory} method="post" className="flex items-center gap-2">
                    <input type="hidden" name="categoryId" value={category.id} />
                    <input type="hidden" name="active" value={(!category.active).toString()} />
                    <button
                      type="submit"
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        category.active
                          ? "border border-emerald-400/60 text-emerald-300 hover:bg-emerald-400/10"
                          : "border border-slate-500/60 text-slate-300 hover:bg-slate-500/10"
                      }`}
                    >
                      {category.active ? "Deaktivieren" : "Aktivieren"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
          <form action={createCategory} method="post" className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-sm">
            <h3 className="text-base font-semibold text-white">Neue Kategorie anlegen</h3>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Name</span>
              <input
                required
                name="name"
                type="text"
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Farbe (Hex)</span>
              <input
                name="color"
                type="text"
                placeholder="#2563eb"
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Beschreibung</span>
              <textarea
                name="description"
                rows={2}
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400"
            >
              Speichern
            </button>
          </form>
        </div>

        <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Tags</h2>
            <span className="text-xs uppercase tracking-wide text-slate-400">
              {tags.length} Eintraege
            </span>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {tags.map((tag) => {
              const category = categories.find((item) => item.id === tag.categoryId);
              return (
                <div
                  key={tag.id}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/60 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-white">{tag.name}</p>
                    <p className="text-xs text-slate-400">
                      {category ? category.name : "Ohne Kategorie"}
                    </p>
                  </div>
                  <form action={toggleTag} method="post" className="flex items-center gap-2">
                    <input type="hidden" name="tagId" value={tag.id} />
                    <input type="hidden" name="active" value={(!tag.active).toString()} />
                    <button
                      type="submit"
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        tag.active
                          ? "border border-emerald-400/60 text-emerald-300 hover:bg-emerald-400/10"
                          : "border border-slate-500/60 text-slate-300 hover:bg-slate-500/10"
                      }`}
                    >
                      {tag.active ? "Deaktivieren" : "Aktivieren"}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
          <form action={createTag} method="post" className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-sm">
            <h3 className="text-base font-semibold text-white">Neuen Tag erstellen</h3>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Name</span>
              <input
                required
                name="name"
                type="text"
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Kategorie</span>
              <select
                required
                name="categoryId"
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Beschreibung</span>
              <textarea
                name="description"
                rows={2}
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400"
            >
              Speichern
            </button>
          </form>
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Bausteine</h2>
          <span className="text-xs uppercase tracking-wide text-slate-400">
            {blocks.length} Eintraege
          </span>
        </div>
        <div className="space-y-3">
          {blocks.map((block) => {
            const category = categories.find((item) => item.id === block.categoryId);
            const tag = block.tagId ? tags.find((item) => item.id === block.tagId) : undefined;
            return (
              <div
                key={block.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium text-white">{block.label}</p>
                  <p className="text-xs text-slate-400">
                    {category ? category.name : "Ohne Kategorie"}
                    {tag ? ` - ${tag.name}` : ""}
                  </p>
                  {block.description ? (
                    <p className="text-xs text-slate-500">{block.description}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span
                    className={`rounded-full px-2 py-1 ${
                      block.isBillable
                        ? "border border-emerald-400/60 text-emerald-300"
                        : "border border-slate-500/60 text-slate-300"
                    }`}
                  >
                    {block.isBillable ? "verrechenbar" : "intern"}
                  </span>
                  <form action={toggleActivityBlock} method="post" className="flex items-center gap-2">
                    <input type="hidden" name="blockId" value={block.id} />
                    <input type="hidden" name="active" value={(!block.active).toString()} />
                    <button
                      type="submit"
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        block.active
                          ? "border border-emerald-400/60 text-emerald-300 hover:bg-emerald-400/10"
                          : "border border-slate-500/60 text-slate-300 hover:bg-slate-500/10"
                      }`}
                    >
                      {block.active ? "Deaktivieren" : "Aktivieren"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
        <form action={createActivityBlock} method="post" className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-sm">
          <h3 className="text-base font-semibold text-white">Neuen Baustein anlegen</h3>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Label</span>
            <input
              required
              name="label"
              type="text"
              className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Kategorie</span>
              <select
                required
                name="categoryId"
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Tag (optional)</span>
              <select
                name="tagId"
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              >
                <option value="">Kein Tag</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Beschreibung</span>
            <textarea
              name="description"
              rows={2}
              className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              name="isBillable"
              className="h-4 w-4 rounded border border-white/20 bg-slate-900/80 text-emerald-400 focus:ring-emerald-400/40"
            />
            Verrechenbar
          </label>
          <button
            type="submit"
            className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            Speichern
          </button>
        </form>
      </section>
      </main>
    </div>
  );
}
