import React from "react";
import { Link } from "react-router-dom";
import "../styles/BlogPage.css";

const BlogPage = ({ blogData }) => {
  return (
    <div className="blog-page">
      <div className="blog-page-content">
        <h1 className="title">Blog </h1>
        <h1>Blog Entries</h1>
        <ul>
          {blogData.map((blogPost, index) => (
            <li key={index} className="blog-entry">
              <Link to={`/blog/${index}`}>{blogPost.title}</Link>
              <p>{blogPost.date}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default BlogPage;
