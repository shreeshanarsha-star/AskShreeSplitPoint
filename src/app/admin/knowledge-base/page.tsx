"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import AppShell from "@/components/AppShell";
import AdminNav from "@/components/admin/AdminNav";
import Icon from "@/components/Icon";
import { KnowledgeDocument, KnowledgeCategory } from "@/lib/avatarKnowledge";

const CATEGORIES: KnowledgeCategory[] = [
  "Culture & Team",
  "Hiring & Rubrics",
  "Benefits & Perks",
  "Company Policies",
  "General FAQ",
];

const CATEGORY_COLORS: Record<KnowledgeCategory, string> = {
  "Culture & Team": "bg-purple-500/10 text-purple-700 border-purple-500/20",
  "Hiring & Rubrics": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "Benefits & Perks": "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  "Company Policies": "bg-amber-500/10 text-amber-700 border-amber-500/20",
  "General FAQ": "bg-slate-500/10 text-slate-700 border-slate-500/20",
};

export default function AvatarKnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<KnowledgeCategory>("Culture & Team");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);

  // Interactive Test Query State
  const [testQuery, setTestQuery] = useState("What are the interview stages for engineering roles?");
  const [testTesting, setTestTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<{
    reply: string;
    sourcesUsed: Array<{ title: string; category: string; excerpt: string; score: number }>;
  } | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/knowledge-base");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load documents.");
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("category", category);

      const res = await fetch("/api/admin/knowledge-base", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process document.");

      setSuccessMsg(`"${selectedFile.name}" was successfully indexed into Shree's knowledge base.`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleToggleActive(doc: KnowledgeDocument) {
    try {
      const nextState = !doc.active;
      const res = await fetch("/api/admin/knowledge-base", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id, active: nextState }),
      });
      if (!res.ok) throw new Error("Failed to update status.");
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, active: nextState } : d))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not toggle status.");
    }
  }

  async function handleDelete(docId: string, filename: string) {
    if (!confirm(`Are you sure you want to remove "${filename}" from Shree's knowledge base?`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/knowledge-base", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: docId }),
      });
      if (!res.ok) throw new Error("Failed to delete document.");
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSuccessMsg(`Document "${filename}" deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete document.");
    }
  }

  async function handleRunTestQuery() {
    if (!testQuery.trim() || testTesting) return;
    setTestTesting(true);
    setTestResponse(null);

    try {
      const res = await fetch("/api/public/ask-shree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: testQuery }),
      });
      const data = await res.json();
      setTestResponse({
        reply: data.reply || "No reply generated.",
        sourcesUsed: data.sourcesUsed || [],
      });
    } catch (err) {
      setError("Test query failed.");
    } finally {
      setTestTesting(false);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <AppShell title="Avatar Knowledge Base">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <AdminNav />

        {/* Header */}
        <div className="border-b border-border pb-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-display text-ink">
                  Avatar Knowledge Base Studio
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-wash text-brand border border-brand/20">
                  Grounding Engine
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-ink-muted mt-1 max-w-3xl">
                Upload company handbooks, interview rubrics, benefits guides, and policies. Shree
                dynamically retrieves relevant excerpts from active documents, site data, and live
                web intelligence to answer candidate queries with high precision and zero bias.
              </p>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold ml-3 hover:underline">
              Dismiss
            </button>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="font-bold ml-3 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Main Grid: Upload Studio (Left) + Test Retrieval Sandbox (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upload Card */}
          <div className="lg:col-span-7 bg-surface border border-border rounded-2xl p-5 shadow-soft-sm flex flex-col space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-brand-wash text-brand flex items-center justify-center font-bold text-sm">
                📁
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">Upload Knowledge Document</h2>
                <p className="text-[11.5px] text-ink-muted">
                  Supports PDF, DOCX, TXT, Markdown, XLSX, and CSV
                </p>
              </div>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  selectedFile
                    ? "border-brand bg-brand-wash/30"
                    : "border-border hover:border-brand/40 bg-page/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md,.markdown,.xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-lg text-brand shadow-soft-sm">
                    {selectedFile ? "📄" : "☁️"}
                  </div>
                  {selectedFile ? (
                    <div>
                      <div className="text-xs font-bold text-ink">{selectedFile.name}</div>
                      <div className="text-[11px] text-ink-muted mt-0.5">
                        {formatBytes(selectedFile.size)} • Click to choose a different file
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-semibold text-ink">
                        Click or drag & drop document here
                      </div>
                      <div className="text-[11px] text-ink-muted mt-0.5">
                        Max 20MB • Automatically extracted & text-indexed
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-[11.5px] font-semibold text-ink-muted mb-1.5">
                  Knowledge Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`text-xs py-2 px-3 rounded-xl border text-left font-medium transition-all ${
                        category === cat
                          ? "bg-brand text-white border-brand shadow-button"
                          : "bg-page border-border text-ink-muted hover:text-ink hover:border-border-strong"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className="w-full py-2.5 px-4 rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-40 text-white text-xs font-bold shadow-button transition-all flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Extracting & Indexing...</span>
                  </>
                ) : (
                  <>
                    <Icon name="arrowUp" size={13} />
                    <span>Add to Shree Knowledge Base</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Test Retrieval Sandbox (Right) */}
          <div className="lg:col-span-5 bg-surface border border-border rounded-2xl p-5 shadow-soft-sm flex flex-col space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
                ⚡
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">Test Grounded Retrieval</h2>
                <p className="text-[11.5px] text-ink-muted">
                  Simulate how Shree answers using active documents
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Ask sample candidate question..."
                className="w-full text-xs bg-page border border-border rounded-xl px-3.5 py-2.5 text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand"
              />
              <button
                type="button"
                onClick={handleRunTestQuery}
                disabled={!testQuery.trim() || testTesting}
                className="w-full py-2 px-3 rounded-xl bg-page hover:bg-brand-wash hover:text-brand border border-border text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                {testTesting ? (
                  <span>Simulating Shree...</span>
                ) : (
                  <>
                    <Icon name="search" size={12} />
                    <span>Test Retrieval & Grounding</span>
                  </>
                )}
              </button>
            </div>

            {testResponse && (
              <div className="mt-2 p-3.5 rounded-xl bg-page border border-border text-xs space-y-2.5 overflow-hidden">
                <div>
                  <span className="font-bold text-[11px] text-ink-muted uppercase tracking-wider">
                    Shree Avatar Response:
                  </span>
                  <p className="text-ink mt-1 leading-relaxed">{testResponse.reply}</p>
                </div>

                {testResponse.sourcesUsed && testResponse.sourcesUsed.length > 0 && (
                  <div className="pt-2 border-t border-border space-y-1.5">
                    <span className="font-bold text-[10.5px] text-ink-muted uppercase tracking-wider">
                      Grounding Documents Referenced:
                    </span>
                    {testResponse.sourcesUsed.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-surface border border-border/80 text-[11px]"
                      >
                        <div className="flex items-center justify-between font-semibold text-brand">
                          <span>{s.title}</span>
                          <span className="text-[10px] text-ink-muted font-normal">
                            Score {s.score}
                          </span>
                        </div>
                        <p className="text-ink-muted mt-0.5 line-clamp-2 italic text-[10.5px]">
                          &quot;{s.excerpt}&quot;
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Document Catalog Section */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-ink">Active Knowledge Documents</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-page border border-border text-ink-muted">
                {documents.length}
              </span>
            </div>
            <button
              onClick={loadDocuments}
              className="text-xs text-brand hover:underline font-semibold flex items-center gap-1"
            >
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-ink-muted">
              Loading knowledge documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="py-12 text-center text-xs text-ink-muted">
              No knowledge documents indexed yet. Upload a company file above to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-ink-muted text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Document</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Words / Size</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-page/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-ink flex items-center gap-2">
                          <span className="text-base">
                            {doc.sourceKind === "pdf"
                              ? "📕"
                              : doc.sourceKind === "docx"
                              ? "📘"
                              : doc.sourceKind === "xlsx" || doc.sourceKind === "csv"
                              ? "📗"
                              : "📄"}
                          </span>
                          <span className="truncate max-w-xs">{doc.filename}</span>
                        </div>
                        {doc.summary && (
                          <div className="text-[11px] text-ink-muted mt-0.5 line-clamp-1 max-w-md">
                            {doc.summary}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${
                            CATEGORY_COLORS[doc.category] || "bg-page text-ink-muted border-border"
                          }`}
                        >
                          {doc.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-ink-muted text-[11.5px]">
                        <div>{doc.wordCount.toLocaleString()} words</div>
                        <div className="text-[10.5px] text-ink-muted/80">
                          {formatBytes(doc.fileSize)}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(doc)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                            doc.active
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                              : "bg-page text-ink-muted border-border"
                          }`}
                        >
                          {doc.active ? "● Active in Shree" : "○ Paused"}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="px-2.5 py-1 rounded-lg bg-page hover:bg-brand-wash hover:text-brand border border-border text-[11px] font-semibold transition-colors"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id, doc.filename)}
                          className="px-2.5 py-1 rounded-lg bg-page hover:bg-red-500/10 hover:text-red-600 border border-border text-[11px] font-semibold transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Document Preview Modal */}
        {previewDoc && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-modal animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink">{previewDoc.filename}</h3>
                  <p className="text-[11px] text-ink-muted">
                    {previewDoc.category} • {previewDoc.wordCount.toLocaleString()} words • Extracted
                    Plain Text
                  </p>
                </div>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="w-7 h-7 rounded-lg bg-page hover:bg-brand-wash flex items-center justify-center text-ink-muted hover:text-ink text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 font-mono text-xs leading-relaxed text-ink-2 bg-page whitespace-pre-wrap selection:bg-brand-wash selection:text-brand">
                {previewDoc.extractedText}
              </div>
              <div className="px-5 py-3 border-t border-border flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold shadow-button"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
