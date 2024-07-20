import React from "react";
import { useParams } from "react-router-dom";
import "../styles/BlogPage.css";

const BlogPostPage = ({ blogData }) => {
  const { id } = useParams();
  const blogPost = blogData[parseInt(id, 10)];

  if (!blogPost) {
    return <p>Blog post not found</p>;
  }

  const { title, image, content } = blogPost;

  return (
    <div className="blog-post-page">
      <div className="blog-post-page-content">
        <h1>{title}</h1>
        <div className="post-details">
          {image && <img src={image} alt={title} className="blog-image" />}
        </div>
        <div className="blog-content">
          {content.map((contentItem, index) => {
            if (contentItem.heading) {
              return (
                <React.Fragment key={index}>
                  <h2>{contentItem.heading}</h2>
                  {Array.isArray(contentItem.paragraph) ? (
                    contentItem.paragraph.map((paragraph, pIndex) => (
                      <p key={pIndex}>{paragraph}</p>
                    ))
                  ) : (
                    <p>{contentItem.paragraph}</p>
                  )}
                </React.Fragment>
              );
            } else if (contentItem.image) {
              return (
                <img
                  key={index}
                  src={contentItem.image}
                  alt={`${title}`}
                  className="blog-article-image"
                />
              );
            } else {
              return <p key={index}>{contentItem}</p>;
            }
          })}
        </div>
      </div>
    </div>
  );
};

export default BlogPostPage;
