import { Link } from "react-router-dom";
import { formatDate } from "../lib/format";

export default function BlogCard({ post }) {
  return (
    <div
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200"
      data-testid={`blog-card-${post.id}`}
    >
      <Link to={`/blog/${post.slug}`} className="block">
        <img
          src={post.image}
          alt={post.title}
          className="h-44 w-full object-cover"
          loading="lazy"
        />
      </Link>
      <div className="p-5 flex flex-col flex-1">
        <p className="text-xs text-slate-400">{formatDate(post.created_at)}</p>
        <span className="mt-2 self-start px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold" data-testid={`blog-category-${post.id}`}>
          {post.category}
        </span>
        <Link to={`/blog/${post.slug}`} className="block mt-2.5">
          <h3 className="font-display font-bold text-slate-900 leading-snug line-clamp-2 hover:text-sky-700 transition-colors">
            {post.title}
          </h3>
        </Link>
        <div className="mt-4 pt-1">
          <Link
            to={`/blog/${post.slug}`}
            className="inline-flex items-center h-10 px-5 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-sky-600 hover:text-white transition-colors"
            data-testid={`blog-read-more-${post.id}`}
          >
            Selengkapnya
          </Link>
        </div>
      </div>
    </div>
  );
}
