import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../layout/Loader";

const Profile = () => {
  const { user, loading } = useSelector((state) => state.user);

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <>
          <div className="mx-auto max-w-2xl py-8">
            <div className="rounded-2xl border border-slate-100/80 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-8 flex items-center gap-4">
                <figure className="text-center">
                  <img
                    className="h-20 w-20 rounded-full object-cover ring-4 ring-emerald-50"
                    src={user.avatar.url}
                    alt={user.name}
                  />
                </figure>
                <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Your profile</p><h1 className="mt-1 text-2xl font-black text-slate-900">Welcome, {user.name}!</h1></div>
              </div>
              <Link
                to="/users/me/update"
                className="mb-8 inline-flex rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-emerald-800"
              >
                Edit Profile
              </Link>
              <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Full name</p><p className="mt-1 font-semibold text-slate-900">{user.name}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Email</p><p className="mt-1 break-all font-semibold text-slate-900">{user.email}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Joined</p><p className="mt-1 font-semibold text-slate-900">{String(user.createdAt).substring(0, 10)}</p></div></div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Profile;
