import React from "react";

const Message = ({ variant, children }) => {
  const styles = variant === "danger" ? "border-red-100 bg-red-50 text-red-700" : "border-emerald-100 bg-emerald-50 text-emerald-800";
  return <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${styles}`}>{children}</div>;
};

export default Message;
