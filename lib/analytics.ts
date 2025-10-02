import { generateSignedUrl, ensureGcsConfig, gcsBucketName } from "@/lib/gcs";

export type PageAnalytics = {
  path: string;
  views: number;
  lastUpdated: string;
};

export type BlogAnalytics = {
  slug: string;
  views: number;
  lastUpdated: string;
};

export type AnalyticsData = {
  pages: PageAnalytics[];
  blogs: BlogAnalytics[];
  totalViews: number;
  lastUpdated: string;
};

const ANALYTICS_OBJECT = "analytics/index.json";

const INITIAL_ANALYTICS: AnalyticsData = {
  pages: [],
  blogs: [],
  totalViews: 0,
  lastUpdated: new Date().toISOString(),
};

function getCacheBustingUrl(baseUrl: string): string {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}_t=${Date.now()}&_r=${Math.random().toString(36).substring(7)}`;
}

async function fetchAnalytics(bustCache = false): Promise<AnalyticsData> {
  if (!gcsBucketName) {
    return INITIAL_ANALYTICS;
  }

  const baseUrl = `https://storage.googleapis.com/${gcsBucketName}/${ANALYTICS_OBJECT}`;
  const url = bustCache ? getCacheBustingUrl(baseUrl) : baseUrl;

  try {
    const response = await fetch(url, {
      cache: bustCache ? "no-store" : "force-cache",
      next: bustCache ? undefined : { revalidate: 60 }, // Revalidate every minute
    });

    if (response.status === 404) {
      return INITIAL_ANALYTICS;
    }

    if (!response.ok) {
      console.warn("Failed to fetch analytics", response.status);
      return INITIAL_ANALYTICS;
    }

    const data = (await response.json()) as AnalyticsData;
    return data;
  } catch (error) {
    console.warn("Error fetching analytics", error);
    return INITIAL_ANALYTICS;
  }
}

async function saveAnalytics(data: AnalyticsData) {
  ensureGcsConfig();
  const { signedUrl } = generateSignedUrl({
    objectName: ANALYTICS_OBJECT,
    method: "PUT",
    contentType: "application/json",
  });

  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-goog-content-sha256": "UNSIGNED-PAYLOAD",
      "Cache-Control": "public, max-age=60",
    },
    body: JSON.stringify(data, null, 2),
  });

  if (!response.ok) {
    throw new Error(`Failed to persist analytics: ${response.status}`);
  }
}

export async function getAnalytics(): Promise<AnalyticsData> {
  return await fetchAnalytics(false);
}

export async function incrementPageView(path: string) {
  const current = await fetchAnalytics(true);
  const now = new Date().toISOString();

  const pageIndex = current.pages.findIndex((p) => p.path === path);

  if (pageIndex >= 0) {
    current.pages[pageIndex].views += 1;
    current.pages[pageIndex].lastUpdated = now;
  } else {
    current.pages.push({
      path,
      views: 1,
      lastUpdated: now,
    });
  }

  current.totalViews += 1;
  current.lastUpdated = now;

  await saveAnalytics(current);
  return current;
}

export async function incrementBlogView(slug: string) {
  const current = await fetchAnalytics(true);
  const now = new Date().toISOString();

  const blogIndex = current.blogs.findIndex((b) => b.slug === slug);

  if (blogIndex >= 0) {
    current.blogs[blogIndex].views += 1;
    current.blogs[blogIndex].lastUpdated = now;
  } else {
    current.blogs.push({
      slug,
      views: 1,
      lastUpdated: now,
    });
  }

  current.totalViews += 1;
  current.lastUpdated = now;

  await saveAnalytics(current);
  return current;
}

export async function getPageViews(path: string): Promise<number> {
  const analytics = await getAnalytics();
  const page = analytics.pages.find((p) => p.path === path);
  return page?.views ?? 0;
}

export async function getBlogViews(slug: string): Promise<number> {
  const analytics = await getAnalytics();
  const blog = analytics.blogs.find((b) => b.slug === slug);
  return blog?.views ?? 0;
}
