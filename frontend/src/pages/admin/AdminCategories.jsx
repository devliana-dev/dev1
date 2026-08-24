import { useEffect, useState, useCallback } from "react";
import { Loader2, Tag, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { ADMIN_MENU } from "./menu";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchCategories = useCallback(() => {
    setLoading(true);
    api.get("/admin/categories")
      .then((r) => setCategories(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      await api.post("/admin/categories", { name });
      setName("");
      toast.success("Kategori ditambahkan");
      fetchCategories();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setAdding(false);
    }
  };

  const remove = async (cat) => {
    if (!window.confirm(`Hapus kategori "${cat.name}"?`)) return;
    try {
      await api.delete(`/admin/categories/${cat.id}`);
      toast.success("Kategori dihapus");
      fetchCategories();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Kategori">
      <div className="max-w-2xl" data-testid="admin-categories-page">
        <form onSubmit={add} className="flex gap-2 mb-6" data-testid="category-add-form">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama kategori baru"
            className="flex-1 h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            data-testid="category-name-input"
          />
          <button type="submit" disabled={adding} className="inline-flex items-center gap-1.5 h-11 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60" data-testid="category-add-btn">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tambah
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100" data-testid="categories-list">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-5 py-3.5" data-testid={`category-row-${cat.id}`}>
                <span className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                  <Tag className="h-4 w-4 text-slate-400" /> {cat.name}
                </span>
                <button onClick={() => remove(cat)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50" data-testid={`delete-category-${cat.id}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
