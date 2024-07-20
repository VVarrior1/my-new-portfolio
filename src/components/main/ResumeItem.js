import React from "react";

const ResumeItem = ({ title, description, image }) => {
  return (
    <div className="resume-item">
      <img src={image} alt={title} className="resume-item-image" />
      <div className="resume-item-details">
        <h3 className="resume-item-title">{title}</h3>
        <p className="resume-item-description">{description}</p>
      </div>
    </div>
  );
};

export default ResumeItem;
