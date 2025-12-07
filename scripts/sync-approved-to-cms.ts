import 'dotenv/config';
import { Octokit } from '@octokit/rest';
import { createPrompt, findPromptByGitHubIssue, updatePrompt, type Prompt } from './utils/cms-client.js';
import { uploadImageToCMS } from './utils/image-uploader.js';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

interface IssueFields {
  prompt_title?: string;
  prompt?: string;
  need_reference_images?: string; // Boolean field, value from dropdown is string "true" or "false"
  need_reference_images_?: string; // Field name converted from "Need Reference Images" label
  description?: string;
  image_urls?: string;
  generated_image_urls?: string; // Field name converted from "Generated Image URLs" label
  author_name?: string;
  original_author?: string; // Field name converted from "Original Author" label
  author_link?: string;
  author_profile_link?: string; // Field name converted from "Author Profile Link" label
  source_link?: string;
  language?: string;
  prompt_language?: string; // Field name converted from "Prompt Language" label
}

// Field name mapping: maps label-converted field names to actual field IDs
const FIELD_NAME_MAP: Record<string, keyof IssueFields> = {
  'generated_image_urls': 'image_urls',
  'original_author': 'author_name',
  'author_profile_link': 'author_link',
  'prompt_language': 'language',
  'need_reference_images_': 'need_reference_images', // Converted from "Need Reference Images" label
};

// Language name to language code mapping
const LANGUAGE_MAP: Record<string, string> = {
  'English': 'en',
  'Chinese (中文)': 'zh',
  'Traditional Chinese (繁體中文)': 'zh-TW',
  'Japanese (日本語)': 'ja-JP',
  'Korean (한국어)': 'ko-KR',
  'Thai (ไทย)': 'th-TH',
  'Vietnamese (Tiếng Việt)': 'vi-VN',
  'Hindi (हिन्दी)': 'hi-IN',
  'Spanish (Español)': 'es-ES',
  'Latin American Spanish (Español Latinoamérica)': 'es-419',
  'German (Deutsch)': 'de-DE',
  'French (Français)': 'fr-FR',
  'Italian (Italiano)': 'it-IT',
  'Brazilian Portuguese (Português do Brasil)': 'pt-BR',
  'European Portuguese (Português)': 'pt-PT',
  'Turkish (Türkçe)': 'tr-TR',
};

function parseLanguage(languageName: string): string {
  return LANGUAGE_MAP[languageName] || 'en';
}

/**
 * Clean field value: remove "_No response_" placeholder, return undefined if field is empty or invalid
 */
function cleanFieldValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === '_No response_') {
    return undefined;
  }
  return trimmed;
}

async function parseIssue(issueBody: string): Promise<IssueFields> {
  const fields: Record<string, string> = {};
  const lines = issueBody.split('\n');

  let currentField: string | null = null;
  let currentValue: string[] = [];

  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (currentField) {
        fields[currentField] = currentValue.join('\n').trim();
      }
      currentField = line.replace('### ', '').toLowerCase().replace(/\s+/g, '_');
      currentValue = [];
    } else if (currentField) {
      currentValue.push(line);
    }
  }

  if (currentField) {
    fields[currentField] = currentValue.join('\n').trim();
  }

  // Apply field name mapping: map label-converted field names to actual field IDs
  const mappedFields: IssueFields = {};
  for (const [key, value] of Object.entries(fields)) {
    const mappedKey = FIELD_NAME_MAP[key] || key;
    // Clean field value: unified handling of "_No response_" and empty values
    const cleanedValue = cleanFieldValue(value);
    
    // If mapped field already exists, merge values (prefer mapped field)
    if (mappedFields[mappedKey as keyof IssueFields] && mappedKey !== key) {
      mappedFields[mappedKey as keyof IssueFields] = cleanedValue || mappedFields[mappedKey as keyof IssueFields];
    } else {
      mappedFields[mappedKey as keyof IssueFields] = cleanedValue;
    }
    // Also keep original field name (for compatibility)
    if (key !== mappedKey) {
      mappedFields[key as keyof IssueFields] = cleanedValue;
    }
  }

  return mappedFields;
}

async function main() {
  try {
    const issueNumber = process.env.ISSUE_NUMBER;
    const issueBody = process.env.ISSUE_BODY || '';

    if (!issueNumber) {
      throw new Error('ISSUE_NUMBER not provided');
    }

    // Get issue information to check labels
    const issue = await octokit.issues.get({
      owner: process.env.GITHUB_REPOSITORY?.split('/')[0] || '',
      repo: process.env.GITHUB_REPOSITORY?.split('/')[1] || '',
      issue_number: parseInt(issueNumber),
    });

    // Check if issue has prompt-submission label
    const hasPromptSubmissionLabel = issue.data.labels.some(
      (label) => {
        const labelName = typeof label === 'string' ? label : label.name;
        return labelName === 'prompt-submission';
      }
    );

    if (!hasPromptSubmissionLabel) {
      console.log('⏭️ Skipping: Issue does not have "prompt-submission" label');
      process.exit(0);
    }

    console.log(`📋 Processing approved issue #${issueNumber}...`);

    const fields = await parseIssue(issueBody);

    // Debug: print parsed fields
    console.log('📝 Parsed fields:', Object.keys(fields));
    console.log('📝 Field values:', JSON.stringify(fields, null, 2));

    // Parse multiple image URLs (one per line)
    const imageUrlsText = fields.image_urls || '';
    const imageUrls = imageUrlsText
      .split('\n')
      .map((url: string) => url.trim())
      .filter((url: string) => url.length > 0 && url.startsWith('http'));

    console.log(`📸 Uploading ${imageUrls.length} image(s) to CMS...`);
    const uploadedImages = await Promise.all(
      imageUrls.map(url => uploadImageToCMS(url))
    );

    // Check if issue record already exists in CMS
    const existingPrompt = await findPromptByGitHubIssue(issueNumber);
    
    // Build author object, only include link if it has a value
    const author: { name: string; link?: string } = {
      name: fields.author_name || '',
    };
    if (fields.author_link) {
      author.link = fields.author_link;
    }

    // Build promptData, field values have been cleaned in parseIssue
    const promptData: Partial<Prompt> = {
      title: fields.prompt_title || '',
      content: fields.prompt || '',
      description: fields.description || '',
      sourceMedia: uploadedImages,
      author,
      language: parseLanguage(fields.language || fields.prompt_language || 'English'),
      sourcePublishedAt: issue.data.created_at,
      sourceMeta: {
        github_issue: issueNumber,
      },
    };

    // Only include source_link if it has a value (already cleaned in parseIssue)
    if (fields.source_link) {
      promptData.sourceLink = fields.source_link;
    }

    // Process need_reference_images field: convert string "true"/"false" to boolean
    if (fields.need_reference_images) {
      const needReferenceImages = fields.need_reference_images.toLowerCase() === 'true';
      // Store boolean value in sourceMeta, or add directly to field if CMS API supports it
      promptData.sourceMeta = {
        ...promptData.sourceMeta,
        needReferenceImages,
      };
    }

    let prompt: Prompt | null;
    if (existingPrompt) {
      console.log(`🔄 Updating existing prompt in CMS (ID: ${existingPrompt.id})...`);
      prompt = await updatePrompt(existingPrompt.id, promptData);
      console.log(`✅ Updated prompt in CMS: ${prompt?.id}`);
    } else {
      console.log('📝 Creating new prompt in CMS (no draft)...');
      prompt = await createPrompt(promptData);
      console.log(`✅ Created prompt in CMS: ${prompt?.id}`);
    }

    // Close the issue if it's still open
    if (issue.data.state === 'open') {
      await octokit.issues.update({
        owner: process.env.GITHUB_REPOSITORY?.split('/')[0] || '',
        repo: process.env.GITHUB_REPOSITORY?.split('/')[1] || '',
        issue_number: parseInt(issueNumber),
        state: 'closed',
      });
      console.log(`✅ Closed issue #${issueNumber}`);
    } else {
      console.log(`ℹ️ Issue #${issueNumber} is already closed`);
    }

  } catch (error) {
    console.error('❌ Error syncing approved issue:', error);
    process.exit(1);
  }
}

main();
