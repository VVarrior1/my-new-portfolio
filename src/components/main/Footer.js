import React from "react";
import "../styles/Footer.css";
import { useLocation } from "react-router";

const Footer = () => {
  const location = useLocation();

  const getColor = () => {
    if (location.pathname === "/") {
      return "white";
    }
    return "#333";
  };
  return (
    <footer className="footer" style={{ color: getColor() }}>
      <p className="left_p">© Abdelrahman Mohamed 2024</p>
    </footer>
  );
};

export default Footer;
