import { useEffect, useState } from "react";
import { Loader2, Newspaper } from "lucide-react";
import api from "../lib/api";
import BlogCard from "../components/BlogCard";

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Blog — Tips Dunia Kerja | CirebonKarir.com";
    api.get("/blog", { params: { limit: 50 } })
      .then((r) => setPosts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => { document.title = "CirebonKarir.com — Lowongan Kerja Cirebon Terbaru"; };
  }, []);

  return (
    <div className="page-fade">
      <div className="bg-slate-900 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Blog</h1>
          <p className="text-slate-300 text-sm mt-1">Tips dan informasi seputar dunia kerja</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="blog-page">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-blog-posts">
            <Newspaper className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Belum ada artikel</h3>
            <p className="text-sm text-slate-500 mt-1">Artikel tips seputar dunia kerja akan segera hadir.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" data-testid="blog-grid">
            {posts.map((p) => (
              <BlogCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
