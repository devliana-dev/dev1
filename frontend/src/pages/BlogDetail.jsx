import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Loader2 } from "lucide-react";
import api from "../lib/api";
import { formatDate } from "../lib/format";

export default function BlogDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/blog/${slug}`)
      .then((r) => setPost(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    document.title = `${post.title} | CirebonKarir.com`;
    return () => { document.title = "CirebonKarir.com — Lowongan Kerja Cirebon Terbaru"; };
  }, [post]);

  if (loading)
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );

  if (notFound || !post)
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center" data-testid="blog-not-found">
        <h1 className="font-display text-2xl font-bold text-slate-900">Artikel tidak ditemukan</h1>
        <Link to="/blog" className="inline-flex items-center h-11 px-6 mt-6 rounded-lg bg-slate-900 text-white text-sm font-semibold" data-testid="back-to-blog-btn">
          Kembali ke Blog
        </Link>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 page-fade" data-testid="blog-detail-page">
      <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5" data-testid="blog-back-link">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Blog
      </Link>
      <article className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <img src={post.image} alt={post.title} className="w-full h-56 sm:h-72 object-cover" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 font-semibold" data-testid="blog-detail-category">{post.category}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(post.created_at)}</span>
          </div>
          <h1 className="mt-4 font-display text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{post.title}</h1>
          <div className="mt-5 space-y-4" data-testid="blog-detail-content">
            {(post.content || "").split("\n\n").filter(Boolean).map((para, i) => (
              <p key={i} className="text-slate-600 leading-relaxed">{para}</p>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
