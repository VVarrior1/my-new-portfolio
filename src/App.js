import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./App.css";
import Header from "./components/main/Header";
import MainSection from "./components/main/MainSection";
import Footer from "./components/main/Footer";
import SideLinks from "./components/main/SideLinks";
import Resume from "./components/main/Resume";
import BlogPage from "./components/main/BlogPage";
import blogData from "./data/blogData.json";
import BlogPostPage from "./components/main/BlogPostPage";

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<MainSection />} />
          <Route path="/blog" element={<BlogPage blogData={blogData} />} />
          {/* Placeholder for future resume route */}
          <Route path="/resume" element={<Resume />} />
          <Route
            path="/blog/:id"
            element={<BlogPostPage blogData={blogData} />}
          />
        </Routes>
        <Footer />
        <SideLinks />
      </div>
    </Router>
  );
}

export default App;
