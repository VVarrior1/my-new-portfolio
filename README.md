# Abdelrahman Mohamed — AI Engineer Portfolio

A modern, production-ready personal portfolio showcasing AI engineering expertise and full-stack development capabilities. Built with Next.js 15, TypeScript, and Google Cloud Storage, featuring a comprehensive content management system, dynamic blog engine, and interactive gallery.

## 🏗️ Architecture Overview

This portfolio uses a **hybrid content strategy** combining local content management with cloud-based persistence:

- **Static Content**: Hero, experience, projects, and skills sourced from `lib/content.ts`
- **Dynamic Content**: Blogs and gallery items stored in Google Cloud Storage buckets
- **Admin Interface**: Secure content management UI for publishing blogs and managing gallery
- **API Layer**: RESTful endpoints for content operations with Google Cloud integration

### Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Admin Panel   │ => │   API Routes     │ => │  Google Cloud       │
│   /admin        │    │   /api/*         │    │  Storage Buckets    │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                              │
                              ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Public Pages  │ <= │  Server          │ <= │  Local Content      │
│   /, /blogs,    │    │  Components      │    │  lib/content.ts     │
│   /gallery      │    │                  │    │                     │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

## 🛠️ Tech Stack

### Core Framework
- **Next.js 15**: App Router, Server Components, API Routes
- **TypeScript**: Strict type checking throughout
- **React 19**: Latest features with concurrent rendering

### Styling & UI
- **Tailwind CSS v4**: Utility-first styling with custom matrix rain effects
- **CSS Modules**: Component-scoped styles
- **Responsive Design**: Mobile-first approach with breakpoint optimization

### Cloud Infrastructure
- **Google Cloud Storage**: Blob storage for blogs and gallery assets
- **Signed URLs**: Secure, time-limited access for uploads/deletions
- **CDN**: Global content delivery via GCS public access

### Development & Deployment
- **Netlify**: Hosting with `@netlify/plugin-nextjs`
- **Turbopack**: Fast development builds
- **ESLint**: Code quality and consistency

## 📁 Project Structure

```
my-new-portfolio/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Homepage with hero, skills, projects
│   ├── layout.tsx                # Root layout with metadata
│   ├── blogs/                    # Blog section
│   │   ├── page.tsx              # Blog listing page
│   │   └── [slug]/page.tsx       # Individual blog posts
│   ├── gallery/                  # Gallery section
│   │   └── page.tsx              # Gallery grid with larger images
│   ├── admin/                    # Content management
│   │   └── page.tsx              # Admin dashboard for blogs/gallery
│   └── api/                      # Backend API routes
│       ├── blogs/route.ts        # Blog CRUD operations
│       └── gallery/              # Gallery management
│           ├── route.ts          # Gallery CRUD operations
│           ├── upload-url/route.ts # Signed URL generation
│           └── [id]/route.ts     # Individual gallery operations
├── components/                   # Reusable UI components
│   ├── hero.tsx                  # Animated hero section
│   ├── navbar.tsx                # Sticky navigation with scroll tracking
│   ├── gallery-grid.tsx          # Masonry-style gallery layout
│   ├── blog-*.tsx                # Blog-related components
│   ├── experience-timeline.tsx   # Professional experience
│   ├── project-grid.tsx          # Featured projects showcase
│   └── ...                       # Additional UI components
├── lib/                          # Utilities and data management
│   ├── content.ts                # Static content configuration
│   ├── blogs.ts                  # Blog data operations (GCS)
│   ├── gallery.ts                # Gallery data operations (GCS)
│   ├── gcs.ts                    # Google Cloud Storage utilities
│   └── date-utils.ts             # Consistent date formatting
├── public/                       # Static assets
│   ├── Abdelrahman_Mohamed_Resume.pdf
│   └── favicon.ico
├── data/                         # Legacy data files
└── netlify.toml                  # Deployment configuration
```

## 🌟 Key Features

### 1. **Dynamic Hero Section**
- Matrix rain background animation
- Typewriter effect with rotating messages
- Real-time stats and availability status
- Responsive action buttons

### 2. **Content Management System**
- **Secure Admin Panel**: Token-based authentication
- **Blog Editor**: Markdown support with live preview
- **Gallery Manager**: Drag-and-drop uploads with metadata
- **Instant Updates**: Cache revalidation for immediate visibility

### 3. **Blog System** (Google Cloud Storage)
```
portfolio-gallery1/blogs/index.json
```
- **Markdown Processing**: `## Headings`, paragraphs, `![images](url)`
- **SEO Optimization**: Auto-generated excerpts and slugs
- **Dynamic Routing**: `/blogs/[slug]` with static generation
- **Cloud Persistence**: Survives deployments and rebuilds

### 4. **Gallery System** (Google Cloud Storage)
```
portfolio-gallery1/gallery/
├── images/[uuid].jpg              # Uploaded images
└── metadata/index.json            # Gallery metadata
```
- **Signed Upload URLs**: Secure, time-limited image uploads
- **Metadata Management**: Titles, descriptions, tags, featured status
- **Responsive Images**: Optimized loading with Next.js Image
- **Admin Controls**: Upload, delete, and organize gallery items

### 5. **API Architecture**

#### Blog Endpoints
- `GET /api/blogs` - List all blogs
- `POST /api/blogs` - Create new blog (requires admin token)

#### Gallery Endpoints
- `GET /api/gallery` - List all gallery items
- `POST /api/gallery` - Create gallery item metadata
- `POST /api/gallery/upload-url` - Generate signed upload URL
- `DELETE /api/gallery/[id]` - Delete gallery item and image

All API routes include:
- **Authentication**: Admin token validation
- **Error Handling**: Comprehensive error responses
- **Cache Revalidation**: Immediate content updates
- **TypeScript**: Full type safety

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- Google Cloud Storage bucket
- Service account with Storage Object Admin permissions

### Installation
```bash
git clone <repository-url>
cd my-new-portfolio
npm install
```

### Environment Configuration
Create `.env.local`:
```env
# Admin authentication
ADMIN_TOKEN=your-secure-admin-token

# Google Cloud Storage configuration
GCS_BUCKET_NAME=your-bucket-name
GCS_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Next.js image optimization
NEXT_PUBLIC_GALLERY_HOST=storage.googleapis.com
NEXT_PUBLIC_GALLERY_PATH=your-bucket-name
```

### Google Cloud Setup
1. **Create GCS Bucket**: Public read access for images
2. **Service Account**: Create with Storage Object Admin role
3. **Private Key**: Download JSON credentials
4. **Bucket Structure**:
   ```
   your-bucket/
   ├── gallery/images/     # Image uploads
   ├── gallery/metadata/   # Gallery index
   └── blogs/              # Blog data
   ```

### Development Commands
```bash
npm run dev        # Start development server (Turbopack)
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint code quality check
```

## 📝 Content Management

### Static Content Updates
Edit `lib/content.ts` to update:
- **Hero Section**: Name, title, summary, typewriter messages
- **Experience**: Professional timeline with roles and achievements
- **Projects**: Technical projects with highlights and tech stacks
- **Skills**: Categorized technical expertise
- **Contact**: Contact information and social links

### Blog Management
1. Navigate to `/admin`
2. Enter admin token
3. Use Markdown editor:
   ```markdown
   ## Section Heading

   Paragraph content with **bold** and *italic* text.

   ![Image Description](https://example.com/image.jpg)
   ```
4. Publish to Google Cloud Storage
5. Content appears immediately on `/blogs`

### Gallery Management
1. Access admin panel at `/admin`
2. Switch to Gallery tab
3. Upload images with metadata:
   - Title and description
   - Comma-separated tags
   - Featured status
4. Images stored in GCS with immediate visibility

## 🚀 Deployment

### Netlify Deployment
The project includes production-ready Netlify configuration:

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

#### Environment Variables (Netlify)
Set in Netlify dashboard:
- `ADMIN_TOKEN`
- `GCS_BUCKET_NAME`
- `GCS_SERVICE_ACCOUNT_EMAIL`
- `GCS_PRIVATE_KEY`
- `NEXT_PUBLIC_GALLERY_HOST`
- `NEXT_PUBLIC_GALLERY_PATH`

#### Deployment Process
1. **Push to GitHub**: Triggers automatic Netlify build
2. **Build Process**: Next.js compilation with static optimization
3. **Plugin Integration**: Netlify Next.js plugin handles serverless functions
4. **Content Delivery**: GCS provides global CDN for assets

## 🎨 Design System

### Visual Identity
- **Typography**: System font stack (Inter, SF Pro)
- **Color Palette**: Emerald green accents with dark theme
- **Animations**: Matrix rain, typewriter effects, smooth transitions
- **Responsive**: Mobile-first with progressive enhancement

### Component Architecture
- **Atomic Design**: Button, card, and layout primitives
- **Composition**: Complex components built from simples
- **Server Components**: Optimized for performance and SEO
- **Client Components**: Interactive elements with state

## 🔒 Security Features

### Authentication
- **Admin Token**: Environment-based authentication
- **Header/Body Token**: Flexible token passing
- **Session Management**: Client-side token storage

### Google Cloud Security
- **Signed URLs**: Time-limited access (15 minutes)
- **Service Account**: Minimal required permissions
- **Public Access**: Read-only for image serving
- **CORS**: Configured for web access

### Content Security
- **Input Validation**: Type-safe API contracts
- **Error Handling**: No sensitive data exposure
- **Rate Limiting**: Natural protection via serverless

## 📊 Performance Optimizations

### Next.js Features
- **App Router**: Optimal bundling and caching
- **Server Components**: Reduced JavaScript bundle
- **Image Optimization**: Automatic WebP conversion and sizing
- **Static Generation**: Pre-rendered blog pages

### Cloud Optimizations
- **CDN Delivery**: Global edge caching via GCS
- **Lazy Loading**: Progressive image loading
- **Cache Headers**: Optimal browser caching
- **Compression**: Automatic asset compression

## 🧪 Testing & Quality

### Development Workflow
1. **Local Development**: Turbopack for fast iteration
2. **Type Checking**: TypeScript strict mode
3. **Linting**: ESLint with Next.js configuration
4. **Build Validation**: Production build testing

### Content Validation
- **Blog Parsing**: Markdown to structured content
- **Image Validation**: Type and size checking
- **URL Validation**: Slug generation and uniqueness
- **API Contracts**: Request/response type safety

## 🗺️ Roadmap

### Immediate Enhancements
- [ ] Blog search and filtering
- [ ] Gallery lightbox and filtering
- [ ] RSS feed generation
- [ ] Sitemap automation

### Future Features
- [ ] Comment system for blogs
- [ ] Analytics dashboard
- [ ] Newsletter integration
- [ ] Multi-language support

### Technical Improvements
- [ ] Unit test coverage
- [ ] E2E testing with Playwright
- [ ] Performance monitoring
- [ ] SEO optimization audit

## 📄 License

Personal portfolio project. Feel free to reference for learning, but please don't republish wholesale.

---

**Built with ❤️ by Abdelrahman Mohamed** | [LinkedIn](https://www.linkedin.com/in/abdelrahman-mohamed-080488197/) | [GitHub](https://github.com/VVarrior1)