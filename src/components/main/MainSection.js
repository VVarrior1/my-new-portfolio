import React, { useEffect } from "react";
import "../styles/MainSection.css";
import landscape from "../../assets/landscape.jpg";
import profilePicture from "../../assets/pfp.png"; // Add your profile picture here
import Header from "./Header";

const MainSection = () => {
  useEffect(() => {
    const textElements = document.querySelectorAll(
      ".main-text p, .main-text h3"
    );
    textElements.forEach((element, index) => {
      setTimeout(() => {
        element.classList.add("fade-in");
      }, index * 1300);
    });
  }, []);

  return (
    <main className="main-section">
      <Header />
      <div className="image-overlay">
        <img src={landscape} alt="Landscape" className="main-image" />
        <div className="profile-picture-container">
          <img src={profilePicture} alt="Profile" className="profile-picture" />
        </div>
        <div className="main-text-section">
          <div className="main-text">
            <h3>Hello,</h3>
            <p>I'm Abdelrahman, a Computer Science student in my third year</p>
            <p>
              I'm passionate about data analysis, machine learning, and web
              development.
            </p>
            <p>
              I'm currently training AI to become better coders and data
              analysts.
            </p>
            <p>
              In my free time, I enjoy staying fit, playing chess, and exploring
              new technologies.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default MainSection;
