import React from "react";
import ResumeItem from "./ResumeItem";
import resumeData from "../../data/resumeData.json";
import "../styles/Resume.css";
const Resume = () => {
  return (
    <div className="resume">
      <div className="education">
        <h2 className="education-title">Education</h2>
        <ResumeItem
          title={resumeData.education.title}
          description={resumeData.education.description}
          image={resumeData.education.image}
        />
      </div>

      <h2 className="experience-title">Experience</h2>
      {resumeData.experience.map((item, index) => (
        <ResumeItem
          key={index}
          title={item.title}
          description={item.description}
          image={item.image}
        />
      ))}
    </div>
  );
};

export default Resume;
