import React from "react";
import "../styles/SideLinks.css";

const SideLinks = () => {
  const copyToClipboard = () => {
    const email = "mohamed.abdelrahman00155@gmail.com";
    navigator.clipboard.writeText(email).then(() => {
      alert("Email copied to clipboard");
    });
  };

  return (
    <div className="sticky-sidebar">
      <div className="footer-links">
        <a
          href="https://www.linkedin.com/in/abdelrahman-mohamed-080488197/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fab fa-linkedin"></i>
        </a>
        <a
          href="https://github.com/VVarrior1"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fab fa-github"></i>
        </a>
        <button onClick={copyToClipboard} className="email-button">
          <i className="fas fa-envelope"></i>
        </button>
      </div>
    </div>
  );
};

export default SideLinks;
