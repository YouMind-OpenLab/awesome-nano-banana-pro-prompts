import fetch from "node-fetch";
import { stringify } from "qs-esm";

const CMS_HOST = process.env.CMS_HOST;
const CMS_API_KEY = process.env.CMS_API_KEY;

export interface Media {
  id: number;
  alt?: string | null;
  caption?: {
    root: {
      type: string;
      children: {
        type: any;
        version: number;
        [k: string]: unknown;
      }[];
      direction: ("ltr" | "rtl") | null;
      format: "left" | "start" | "center" | "right" | "end" | "justify" | "";
      indent: number;
      version: number;
    };
    [k: string]: unknown;
  } | null;
  updatedAt: string;
  createdAt: string;
  url?: string | null;
  thumbnailURL?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  filesize?: number | null;
  width?: number | null;
  height?: number | null;
  focalX?: number | null;
  focalY?: number | null;
  sizes?: {
    tiny?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    thumbnail?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    square?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    small?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    medium?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    large?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    xlarge?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    og?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
  };
}

export interface Prompt {
  id: number;
  title: string;
  description: string;
  content: string;
  translatedContent?: string; // Translated content for current locale
  sourceLink?: string; // Optional source link
  sourcePublishedAt: string;
  sourceMedia: string[];
  video?: {
    url: string;
    thumbnail?: string;
  };
  media?: Media[];
  author: {
    name: string;
    link?: string;
  };
  language: string;
  featured?: boolean;
  sort?: number;
  sourceMeta?: Record<string, any>;
}

interface CMSResponse {
  docs: Prompt[];
  totalDocs: number;
}

/**
 * 获取所有 prompts（英文版本）
 * @param locale 语言版本，默认 en-US
 */
export async function fetchAllPrompts(
  locale: string = "en-US"
): Promise<Prompt[]> {
  const query = {
    limit: 9999,
    sort: "-sourcePublishedAt",
    depth: 2,
    locale,
    where: {
      model: {
        equals: "nano-banana-pro",
      },
    },
  };

  const stringifiedQuery = stringify(query, { addQueryPrefix: true });
  const url = `${CMS_HOST}/api/prompts${stringifiedQuery}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `users API-Key ${CMS_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`CMS API error: ${response.statusText}`);
  }

  const data = (await response.json()) as CMSResponse;

  // 过滤：只要有图片的（不需要检查 _status，因为默认都是发布状态）
  return data.docs
    .map((item) => {
      let images: string[] = [];
      if (item.media) {
        images = item.media.map((m) => m.url || "").filter(Boolean) as string[];
      } else {
        if (item.sourceMedia) {
          images = item.sourceMedia;
        }
        if (item.video?.thumbnail) {
          images.push(item.video.thumbnail);
        }
      }

      return { ...item, sourceMedia: images };
    })
    .filter((p) => p.sourceMedia?.length > 0);
}

/**
 * 排序 prompts
 */
export function sortPrompts(prompts: Prompt[]) {
  // 排序逻辑：featured 优先 → sort 升序 → 发布时间倒序
  const sorted = [...prompts].sort((a, b) => {
    const aFeatured = a.featured ? 1 : 0;
    const bFeatured = b.featured ? 1 : 0;

    if (aFeatured !== bFeatured) return bFeatured - aFeatured;

    if (a.sort !== undefined && b.sort !== undefined) {
      if (a.sort !== b.sort) return a.sort - b.sort;
    } else if (a.sort !== undefined) return -1;
    else if (b.sort !== undefined) return 1;

    return (
      new Date(b.sourcePublishedAt).getTime() -
      new Date(a.sourcePublishedAt).getTime()
    );
  });

  const featured = sorted.filter((p) => p.featured);
  const regular = sorted.filter((p) => !p.featured);

  return {
    all: sorted,
    featured,
    regular,
    stats: {
      total: prompts.length,
      featured: featured.length,
    },
  };
}

/**
 * 根据 GitHub issue 编号查找已存在的 prompt
 */
export async function findPromptByGitHubIssue(
  issueNumber: string
): Promise<Prompt | null> {
  const query = {
    limit: 1,
    depth: 2,
    where: {
      "sourceMeta.github_issue": {
        equals: issueNumber,
      },
      model: {
        equals: "nano-banana-pro",
      },
    },
  };

  const stringifiedQuery = stringify(query, { addQueryPrefix: true });
  const url = `${CMS_HOST}/api/prompts${stringifiedQuery}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `users API-Key ${CMS_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`CMS API error: ${response.statusText}`);
  }

  const data = (await response.json()) as CMSResponse;
  return data.docs.length > 0 ? data.docs[0] : null;
}

/**
 * 创建新 prompt（直接发布，无草稿）
 */
export async function createPrompt(
  data: Partial<Prompt>
): Promise<Prompt | null> {
  const url = `${CMS_HOST}/api/prompts`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `users API-Key ${CMS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create prompt: ${response.statusText} - ${errorText}`
    );
  }

  return response.json() as Promise<Prompt | null>;
}

/**
 * 更新已存在的 prompt
 */
export async function updatePrompt(
  id: number,
  data: Partial<Prompt>
): Promise<Prompt | null> {
  const url = `${CMS_HOST}/api/prompts/${id}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `users API-Key ${CMS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to update prompt: ${response.statusText} - ${errorText}`
    );
  }

  return response.json() as Promise<Prompt | null>;
}
