import { Prompt, FilterCategory } from './cms-client.js';
import { t } from './i18n.js';

interface SortedPrompts {
  all: Prompt[];
  featured: Prompt[];
  regular: Prompt[];
  stats: {
    total: number;
    featured: number;
  };
  categories?: FilterCategory[];
}

export interface LanguageConfig {
  code: string;
  name: string; // Display name
  readmeFileName: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'en', name: 'English', readmeFileName: 'README.md' },
  { code: 'zh', name: '简体中文', readmeFileName: 'README_zh.md' },
  { code: 'zh-TW', name: '繁體中文', readmeFileName: 'README_zh-TW.md' },
  { code: 'ja-JP', name: '日本語', readmeFileName: 'README_ja-JP.md' },
  { code: 'ko-KR', name: '한국어', readmeFileName: 'README_ko-KR.md' },
  { code: 'th-TH', name: 'ไทย', readmeFileName: 'README_th-TH.md' },
  { code: 'vi-VN', name: 'Tiếng Việt', readmeFileName: 'README_vi-VN.md' },
  { code: 'hi-IN', name: 'हिन्दी', readmeFileName: 'README_hi-IN.md' },
  { code: 'es-ES', name: 'Español', readmeFileName: 'README_es-ES.md' },
  { code: 'es-419', name: 'Español (Latinoamérica)', readmeFileName: 'README_es-419.md' },
  { code: 'de-DE', name: 'Deutsch', readmeFileName: 'README_de-DE.md' },
  { code: 'fr-FR', name: 'Français', readmeFileName: 'README_fr-FR.md' },
  { code: 'it-IT', name: 'Italiano', readmeFileName: 'README_it-IT.md' },
  { code: 'pt-BR', name: 'Português (Brasil)', readmeFileName: 'README_pt-BR.md' },
  { code: 'pt-PT', name: 'Português', readmeFileName: 'README_pt-PT.md' },
  { code: 'tr-TR', name: 'Türkçe', readmeFileName: 'README_tr-TR.md' },
];

const MAX_REGULAR_PROMPTS_TO_DISPLAY = 120;

/**
 * Convert locale to URL language prefix
 * en -> en-US, zh -> zh-CN, others remain unchanged
 */
function getLocalePrefix(locale: string): string {
  if (locale === 'en') {
    return 'en-US';
  }
  if (locale === 'zh') {
    return 'zh-CN';
  }
  // Other language codes (e.g., zh-TW, ja-JP) remain unchanged
  return locale;
}

/**
 * 清理提示词内容中的代码块标记
 * 移除 ``` 或 ```json 等格式的代码块标记
 * 
 * 处理的情况：
 * - ``` 提示词 ```
 * - ```json 提示词 ```
 * - ```python 提示词 ``` 等任意语言标识符
 * - 多行内容中的代码块标记
 */
function cleanPromptContent(content: string): string {
  if (!content) return content;
  
  let cleaned = content;
  
  // 匹配代码块标记：``` 或 ```language（如 ```json, ```python 等）
  // 语言标识符可能包含字母、数字、连字符等（如 json, python, typescript）
  
  // 1. 移除开头的代码块标记
  // 匹配：``` + 可选语言标识符 + 可选空白字符 + 可选换行
  cleaned = cleaned.replace(/^```[\w-]*\s*\n?/im, '');
  
  // 2. 移除结尾的代码块标记
  // 匹配：可选换行 + ``` + 可选空白字符
  cleaned = cleaned.replace(/\n?```\s*$/im, '');
  
  // 3. 移除中间可能存在的代码块标记（处理嵌套或错误格式的情况）
  // 匹配：换行 + ``` + 可选语言标识符 + 可选空白 + 换行
  cleaned = cleaned.replace(/\n```[\w-]*\s*\n/g, '\n');
  
  // 4. 清理首尾空白字符（包括换行）
  cleaned = cleaned.trim();
  
  return cleaned;
}

export function generateMarkdown(data: SortedPrompts, total: number, locale: string = 'en'): string {
  const { featured, regular, stats, categories } = data;

  const displayedRegular = regular.slice(0, MAX_REGULAR_PROMPTS_TO_DISPLAY);
  const hiddenCount = total - displayedRegular.length;

  let md = generateHeader(locale);
  md += generateLanguageNavigation(locale);
  md += generateGalleryCTA(categories || [], locale);
  md += generateTOC(locale);
  md += generateWhatIs(locale);
  md += generateStats(stats, locale);
  md += generateFeaturedSection(featured, locale);
  md += generateAllPromptsSection(displayedRegular, hiddenCount, locale);
  md += generateContribute(locale);
  md += generateFooter(locale);

  return md;
}

function generateHeader(locale: string): string {
  const arenaUrl = `https://youmind.com/${getLocalePrefix(locale)}/model-arena/nano-banana-2-vs-nano-banana-pro`;
  const galleryUrl = `https://youmind.com/${getLocalePrefix(locale)}/nano-banana-pro-prompts`;
  return `
<a href="${galleryUrl}">
  <img src="https://marketing-assets.youmind.com/campaigns/nano-banana-pro-prompts-og-hq.png" alt="Nano Banana Pro Prompts" width="100%" />
</a>

> 💡 ${t('gptImage2Promo', locale)}
# 🚀 ${t('title', locale)}

[![Awesome](https://awesome.re/badge.svg)](https://github.com/sindresorhus/awesome)
[![GitHub stars](https://img.shields.io/github/stars/YouMind-OpenLab/awesome-nano-banana-pro-prompts?style=social)](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Update README](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/actions/workflows/update-readme.yml/badge.svg)](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/actions)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](docs/CONTRIBUTING.md)

> 🎨 ${t('subtitle', locale)}

> ⚠️ ${t('copyright', locale)}

---

`;
}

function generateLanguageNavigation(currentLocale: string): string {
  let md = '';
  
  // Sort languages so current one is first or en is first? 
  // Keeping the array order is usually best, but we want a clean list.
  
  const badges = SUPPORTED_LANGUAGES.map(lang => {
    const isCurrent = lang.code === currentLocale || (currentLocale.startsWith(lang.code) && !SUPPORTED_LANGUAGES.some(l => l.code === currentLocale && l.code !== lang.code));
    // Color logic: green for current, blue for others, or grey?
    // Using the style from the image: "Click to View"
    
    const color = isCurrent ? 'brightgreen' : 'lightgrey';
    const text = isCurrent ? 'Current' : 'Click%20to%20View';
    const link = lang.readmeFileName;
    
    // If current, maybe no link or link to self?
    // Using shields.io badge format: label-message-color
    // Label = Native Name, Message = Click to View (or Ver Traducción etc)
    
    const safeName = encodeURIComponent(lang.name);
    
    return `[![${lang.name}](https://img.shields.io/badge/${safeName}-${text}-${color})](${link})`;
  });

  md += badges.join(' ') + '\n\n---\n\n';
  return md;
}

function generateGalleryCTA(categories: FilterCategory[], locale: string): string {
  // 根据语言选择图片：zh 和 zh-TW 使用 zh，其他使用 en
  const imageLang = locale === 'zh' || locale === 'zh-TW' ? 'zh' : 'en';
  const coverImage = `public/images/nano-banana-pro-prompts-cover-${imageLang}.png`;

  let md = `## 🌐 ${t('viewInGallery', locale)}

<div align="center">

![Cover](${coverImage})

</div>

**[${t('browseGallery', locale)}](https://youmind.com/${getLocalePrefix(locale)}/nano-banana-pro-prompts)**

${t('galleryFeatures', locale)}

| Feature | ${t('githubReadme', locale)} | ${t('youmindGallery', locale)} |
|---------|--------------|---------------------|
| 🎨 ${t('visualLayout', locale)} | ${t('linearList', locale)} | ${t('masonryGrid', locale)} |
| 🔍 ${t('search', locale)} | ${t('ctrlFOnly', locale)} | ${t('fullTextSearch', locale)} |
| 🤖 ${t('aiGenerate', locale)} | - | ${t('aiOneClickGen', locale)} |
| 📱 ${t('mobile', locale)} | ${t('basic', locale)} | ${t('fullyResponsive', locale)} |
| 🏷️ ${t('categories', locale)} | - | ${t('categoryBrowsing', locale)} |

`;

  // Add categories section if available
  if (categories.length > 0) {
    md += generateCategoriesSection(categories, locale);
  }

  md += `---

`;

  return md;
}

function generateCategoriesSection(categories: FilterCategory[], locale: string): string {
  // Get parent categories (no parentId)
  const parentCategories = categories.filter(c => c.parentId === null);

  let md = `\n### 🏷️ ${t('browseByCategory', locale)}\n\n`;

  for (const parent of parentCategories) {
    // Parent category - no link
    md += `- **${parent.title}**\n`;

    // Get children of this parent
    const children = categories.filter(c => c.parentId === parent.id);
    for (const child of children) {
      // Child category - with link
      const categoryUrl = `https://youmind.com/${getLocalePrefix(locale)}/nano-banana-pro-prompts?categories=${child.slug}`;
      md += `  - [${child.title}](${categoryUrl})\n`;
    }
  }

  md += `\n`;
  return md;
}

function generatePromptSection(prompt: Prompt, index: number, locale: string): string {
  const authorLink = prompt.author.link || '#';
  const publishedDate = new Date(prompt.sourcePublishedAt).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Use translatedContent if available, otherwise fallback to content
  // Clean code block markers (``` or ```json etc.) from the content
  const rawContent = prompt.translatedContent || prompt.content;
  const promptContent = cleanPromptContent(rawContent);
  const hasArguments = promptContent.includes('{argument');

  let md = `### No. ${index + 1}: ${prompt.title}\n\n`;

  // Language badge
  md += `![Language-${prompt.language.toUpperCase()}](https://img.shields.io/badge/Language-${prompt.language.toUpperCase()}-blue)\n`;

  if (prompt.featured) {
    md += `![Featured](https://img.shields.io/badge/⭐-Featured-gold)\n`;
  }

  if (hasArguments) {
    md += `![Raycast](https://img.shields.io/badge/🚀-Raycast_Friendly-purple)\n`;
  }

  md += `\n#### 📖 ${t('description', locale)}\n\n${prompt.description}\n\n`;
  md += `#### 📝 ${t('prompt', locale)}\n\n\`\`\`\n${promptContent}\n\`\`\`\n\n`;

  if (prompt.sourceMedia && prompt.sourceMedia.length > 0) {
    md += `#### 🖼️ ${t('generatedImages', locale)}\n\n`;

    prompt.sourceMedia.forEach((imageUrl, imgIndex) => {
      md += `##### Image ${imgIndex + 1}\n\n`;
      md += `<div align="center">\n`;
      md += `<img src="${imageUrl}" width="${prompt.featured ? '700' : '600'}" alt="${prompt.title} - Image ${imgIndex + 1}">\n`;
      md += `</div>\n\n`;
    });
  }

  md += `#### 📌 ${t('details', locale)}\n\n`;
  md += `- **${t('author', locale)}:** [${prompt.author.name}](${authorLink})\n`;
  md += `- **${t('source', locale)}:** [Twitter Post](${prompt.sourceLink})\n`;
  md += `- **${t('published', locale)}:** ${publishedDate}\n`;
  md += `- **${t('languages', locale)}:** ${prompt.language}\n\n`;

  md += `**[${t('tryItNow', locale)}](https://youmind.com/${getLocalePrefix(locale)}/nano-banana-pro-prompts?id=${prompt.id})**\n\n`;

  md += `---\n\n`;

  return md;
}

function generateFeaturedSection(featured: Prompt[], locale: string): string {
  if (featured.length === 0) return '';

  let md = `## 🔥 ${t('featuredPrompts', locale)}\n\n`;
  md += `> ⭐ ${t('handPicked', locale)}\n\n`;

  featured.forEach((prompt, index) => {
    md += generatePromptSection(prompt, index, locale);
  });

  return md;
}

function generateAllPromptsSection(regular: Prompt[], hiddenCount: number, locale: string): string {
  if (regular.length === 0 && hiddenCount === 0) return '';

  let md = `## 📋 ${t('allPrompts', locale)}\n\n`;
  md += `> 📝 ${t('sortedByDate', locale)}\n\n`;

  regular.forEach((prompt, index) => {
    md += generatePromptSection(prompt, index, locale);
  });

  if (hiddenCount > 0) {
    md += `---\n\n`;
    md += `## 📚 ${t('morePrompts', locale)}\n\n`;
    md += `<div align="center">\n\n`;
    md += `### 🎯 ${hiddenCount} ${t('morePromptsDesc', locale)}\n\n`;
    md += `Due to GitHub's content length limitations, we can only display the first ${MAX_REGULAR_PROMPTS_TO_DISPLAY} regular prompts in this README.\n\n`;
    md += `**[${t('viewAll', locale)}](https://youmind.com/${getLocalePrefix(locale)}/nano-banana-pro-prompts)**\n\n`;
    md += `The gallery features:\n\n`;
    md += `${t('galleryFeature1', locale)}\n\n`;
    md += `${t('galleryFeature2', locale)}\n\n`;
    md += `${t('galleryFeature3', locale)}\n\n`;
    md += `${t('galleryFeature4', locale)}\n\n`;
    md += `</div>\n\n`;
    md += `---\n\n`;
  }

  return md;
}

function generateStats(stats: { total: number; featured: number }, locale: string): string {
  const now = new Date().toLocaleString(locale, {
    timeZone: 'UTC',
    dateStyle: 'full',
    timeStyle: 'long',
  });

  return `## 📊 ${t('stats', locale)}

<div align="center">

| ${t('metric', locale)} | ${t('count', locale)} |
|--------|-------|
| 📝 ${t('totalPrompts', locale)} | **${stats.total}** |
| ⭐ ${t('featured', locale)} | **${stats.featured}** |
| 🔄 ${t('lastUpdated', locale)} | **${now}** |

</div>

---

`;
}

function generateTOC(locale: string): string {
  // Generating anchors is tricky with i18n, but GitHub usually slugifies the headers.
  // For now we assume English anchors or standard GitHub behavior.
  // Ideally we should use the exact translation for the link text, and the slugified translation for the href.
  // But simple manual mapping for now.
  
  return `## 📖 ${t('toc', locale)}

- [🌐 ${t('viewInGallery', locale)}](#-view-in-web-gallery)
- [🤔 ${t('whatIs', locale)}](#-what-is-nano-banana-pro)
- [📊 ${t('stats', locale)}](#-statistics)
- [🔥 ${t('featuredPrompts', locale)}](#-featured-prompts)
- [📋 ${t('allPrompts', locale)}](#-all-prompts)
- [🤝 ${t('howToContribute', locale)}](#-how-to-contribute)
- [📄 ${t('license', locale)}](#-license)
- [🙏 ${t('acknowledgements', locale)}](#-acknowledgements)
- [⭐ ${t('starHistory', locale)}](#-star-history)

---

`;
}

function generateWhatIs(locale: string): string {
  return `## 🤔 ${t('whatIs', locale)}

${t('whatIsIntro', locale)}

- 🎯 ${t('multimodalUnderstanding', locale)}
- 🎨 ${t('highQualityGeneration', locale)}
- ⚡ ${t('fastIteration', locale)}
- 🌈 ${t('diverseStyles', locale)}
- 🔧 ${t('preciseControl', locale)}
- 📐 ${t('complexScenes', locale)}

📚 ${t('learnMore', locale)}

### 🚀 ${t('raycastIntegration', locale)}

${t('raycastDescription', locale)}

**${t('example', locale)}**
\`\`\`
${t('raycastExample', locale)}
\`\`\`

${t('raycastUsage', locale)}

---

`;
}

function generateContribute(locale: string): string {
  return `## 🤝 ${t('howToContribute', locale)}

${t('welcomeContributions', locale)}

### 🐛 ${t('githubIssue', locale)}

1. Click [**${t('submitNewPrompt', locale)}**](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/issues/new?template=submit-prompt.yml)
2. ${t('fillForm', locale)}
3. ${t('submitWait', locale)}
4. ${t('approvedSync', locale)}
5. ${t('appearInReadme', locale)}

**${t('note', locale)}** ${t('noteContent', locale)}

${t('seeContributing', locale)}

---

`;
}

function generateFooter(locale: string): string {
  const timestamp = new Date().toISOString();

  return `## 📄 ${t('license', locale)}

${t('licensedUnder', locale)}

---

## 🙏 ${t('acknowledgements', locale)}

- [Payload CMS](https://payloadcms.com/)
- [youmind.com](https://youmind.com)

---

## ⭐ ${t('starHistory', locale)}

[![Star History Chart](https://api.star-history.com/svg?repos=YouMind-OpenLab/awesome-nano-banana-pro-prompts&type=Date)](https://star-history.com/#YouMind-OpenLab/awesome-nano-banana-pro-prompts&Date)

---

<div align="center">

**[🌐 ${t('viewInGallery', locale)}](https://youmind.com/${getLocalePrefix(locale)}/nano-banana-pro-prompts)** •
**[📝 ${t('submitPrompt', locale)}](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/issues/new?template=submit-prompt.yml)** •
**[⭐ ${t('starRepo', locale)}](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts)**

<sub>🤖 ${t('autoGenerated', locale)} ${timestamp}</sub>

</div>
`;
}
