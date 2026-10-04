import React, { useState } from "react";

const PasswordInput = ({ id, name, value, onChange, autoComplete, required }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrapper">
      <input
        type={visible ? "text" : "password"}
        id={id}
        name={name}
        className="form-control password-input"
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
};

export default PasswordInput;
