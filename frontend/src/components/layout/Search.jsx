import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Search = () => {
  const [keyword, setKeyword] = useState("");
  const navigate = useNavigate();

  const searchHandler = (e) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate(`/eats/stores/search/${encodeURIComponent(keyword.trim())}`);
    } else {
      navigate("/restaurants");
    }
  };

  return (
    <form onSubmit={searchHandler} className="w-full">
      <div className="group relative flex items-center overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/90 shadow-inner transition duration-200 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10">
        <div className="pointer-events-none flex items-center pl-4 text-slate-400 group-focus-within:text-emerald-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          placeholder="Search restaurants, cuisines or dishes..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        {keyword && (
          <button
            type="button"
            onClick={() => { setKeyword(""); navigate("/restaurants"); }}
            className="px-2 text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          aria-label="Search"
          className="m-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 active:scale-95"
        >
          Search
        </button>
      </div>
    </form>
  );
};

export default Search;
