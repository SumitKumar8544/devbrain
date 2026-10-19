/**
 * DevBrain Universal AI Engine: Multi-Model Study & Understanding Assistant
 * Supports Google Gemini 2.5 Flash & OpenAI GPT-4o / GPT-4o-mini
 * with automatic payload switching and graceful fallback.
 */

export async function askAI({
  message,
  note,
  history = [],
  apiKey = '',
  action = 'chat',
  provider = 'gemini', // 'gemini' | 'openai'
  model = '',
}) {
  const geminiKey = apiKey || process.env.GEMINI_API_KEY || '';
  const openAiKey = process.env.OPENAI_API_KEY || '';

  // Build Universal Study Companion System Prompt
  const systemInstruction = `You are "DevBrain AI", a world-class Universal Study Companion & Knowledge Mentor.
Your mission is to help anyone (school students, college students, self-learners, researchers, and professionals) deeply understand, organize, and master their notes, concepts, textbook photos, PDFs, and reference links.

Your capabilities:
- Explain complex concepts simply (using everyday analogies, intuitive examples, and visual breakdowns).
- Analyze attached photos, diagram descriptions, and PDF documents to summarize key takeaways.
- Generate high-quality revision flashcards, cheat sheets, and practice quiz questions.
- If programming or math is involved, provide clean, optimal solutions with explanations.
- Adapt your tone and depth to the user's level (elementary, high school, university, or professional).`;

  let noteContextText = '';
  if (note) {
    let snippets = [];
    try {
      snippets = typeof note.code_snippets === 'string' ? JSON.parse(note.code_snippets) : (note.code_snippets || []);
    } catch {}

    let links = [];
    try {
      links = typeof note.resource_links === 'string' ? JSON.parse(note.resource_links) : (note.resource_links || []);
    } catch {}

    let attachments = [];
    try {
      attachments = typeof note.attachments === 'string' ? JSON.parse(note.attachments) : (note.attachments || []);
    } catch {}

    noteContextText = `
---
[CURRENT NOTE & DOCUMENT CONTEXT]
Title: ${note.title}
Category/Subject: ${note.subject_name || 'General Notes'}
Difficulty: ${note.difficulty || 'Intermediate'}
Status: ${note.status || 'Active'}
Summary: ${note.summary || 'None'}
Tags: ${note.tags}
Content / Notes:
${note.content}

Attached Photos & Documents:
${attachments?.map(a => `- [${a.type?.toUpperCase()}] ${a.name} (${a.url})`).join('\n') || 'None'}

Saved Web Links & Resources:
${links?.map(l => `- [${l.type}] ${l.title} (${l.url}): ${l.description || ''}`).join('\n') || 'None'}

Code / Formula Snippets:
${snippets?.map(s => `// [${s.language}] ${s.title}\n${s.code}`).join('\n\n') || 'None'}
---
`;
  }

  // Handle specific 1-click action modifiers
  let augmentedUserPrompt = message;
  if (action === 'explain') {
    augmentedUserPrompt = `Explain the following note or concept in a very simple, crystal-clear way with real-life analogies and step-by-step intuition:\n\n${message || note?.title || ''}`;
  } else if (action === 'summarize') {
    augmentedUserPrompt = `Create an executive Summary & Cheat Sheet for this note, highlighting the Core Ideas, Key Rules/Formulas, and Quick Revision Points:\n\n${note?.content || message || ''}`;
  } else if (action === 'quiz') {
    augmentedUserPrompt = `Generate 3 interactive practice quiz questions (with detailed answers and explanations) to test my understanding of this note:\n\n${message || note?.title || ''}`;
  } else if (action === 'code') {
    augmentedUserPrompt = `Provide a clean, step-by-step implementation or formula breakdown with clear explanations for:\n\n${message || note?.title || ''}`;
  } else if (action === 'extract-points') {
    augmentedUserPrompt = `Extract the top 5 most important points or takeaways from this note and its attached materials:\n\n${note?.content || message || ''}`;
  }

  const selectedProvider = provider?.toLowerCase() === 'openai' ? 'openai' : 'gemini';

  // ==========================================
  // PROVIDER 1: OPENAI (GPT-4o / GPT-4o-mini)
  // ==========================================
  if (selectedProvider === 'openai') {
    if (openAiKey && openAiKey.trim() !== '') {
      try {
        const targetModel = model || 'gpt-4o';
        const messages = [
          { role: 'system', content: systemInstruction },
        ];

        if (noteContextText) {
          messages.push({
            role: 'system',
            content: `Use the following study materials as context for your answers:\n${noteContextText}`
          });
        }

        if (history && history.length > 0) {
          for (const h of history) {
            messages.push({
              role: h.role === 'assistant' ? 'assistant' : 'user',
              content: h.message || ''
            });
          }
        }

        messages.push({
          role: 'user',
          content: augmentedUserPrompt
        });

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiKey.trim()}`
          },
          body: JSON.stringify({
            model: targetModel,
            messages,
            temperature: 0.7,
            max_tokens: 2048,
          })
        });

        if (res.ok) {
          const data = await res.json();
          const answer = data.choices?.[0]?.message?.content;
          if (answer) {
            return {
              reply: answer,
              provider: `OpenAI ${targetModel.toUpperCase()}`,
              success: true
            };
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `OpenAI returned HTTP ${res.status}`;
          console.warn(`[OpenAI Notice] ${errMsg}. Gracefully falling back to Gemini 2.5 Flash.`);

          // Fallback seamlessly to Gemini 2.5 Flash
          const geminiFallback = await callGeminiEngine({
            systemInstruction,
            noteContextText,
            augmentedUserPrompt,
            history,
            geminiKey
          });

          return {
            reply: geminiFallback.reply,
            provider: 'Gemini 2.5 Flash (Auto-Fallback)',
            noteNotice: `⚡ Switched to Gemini 2.5 Flash: OpenAI reported "${errMsg}".`,
            success: true
          };
        }
      } catch (err) {
        console.warn(`[OpenAI Call Error] ${err.message}. Falling back to Gemini 2.5 Flash.`);
        const geminiFallback = await callGeminiEngine({
          systemInstruction,
          noteContextText,
          augmentedUserPrompt,
          history,
          geminiKey
        });
        return {
          reply: geminiFallback.reply,
          provider: 'Gemini 2.5 Flash (Auto-Fallback)',
          success: true
        };
      }
    }
  }

  // ==========================================
  // PROVIDER 2: GOOGLE GEMINI 2.5 FLASH (DEFAULT)
  // ==========================================
  return await callGeminiEngine({
    systemInstruction,
    noteContextText,
    augmentedUserPrompt,
    history,
    geminiKey,
    action,
    note
  });
}

// Internal Gemini Runner
async function callGeminiEngine({
  systemInstruction,
  noteContextText,
  augmentedUserPrompt,
  history = [],
  geminiKey,
  action = 'chat',
  note = null
}) {
  if (geminiKey && geminiKey.trim() !== '') {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`;

      const contents = [];
      const fullFirstPrompt = `${systemInstruction}\n\n${noteContextText ? noteContextText + '\n\n' : ''}User Query: ${augmentedUserPrompt}`;

      if (history && history.length > 0) {
        for (const h of history) {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.message }]
          });
        }
      }

      contents.push({
        role: 'user',
        parts: [{ text: contents.length === 0 ? fullFirstPrompt : `${noteContextText ? noteContextText + '\n\n' : ''}${augmentedUserPrompt}` }]
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (answer) {
          return {
            reply: answer,
            provider: 'Google Gemini 2.5 Flash',
            success: true
          };
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Gemini API returned status ${res.status}`);
      }
    } catch (err) {
      console.error('Gemini API Error, falling back to local assistant:', err.message);
      return {
        reply: `⚠️ *AI Study Engine notice: (${err.message}). Showing local study helper:* \n\n${generateLocalAssistantResponse(augmentedUserPrompt, note, action)}`,
        provider: 'DevBrain Local Engine',
        success: true,
        warning: err.message
      };
    }
  }

  // Local fallback response
  return {
    reply: generateLocalAssistantResponse(augmentedUserPrompt, note, action),
    provider: 'DevBrain Offline Mode',
    isOffline: true,
    success: true
  };
}

// Backward compatibility export
export const askGemini = askAI;

function generateLocalAssistantResponse(prompt, note, action) {
  const title = note?.title || 'Your Study Note';

  if (action === 'quiz' || (prompt || '').toLowerCase().includes('quiz')) {
    return `### 🧪 3 Practice Questions on ${title}

1. **Question 1 (Core Concept):**
   *What is the main purpose of this topic, and what key problem or question does it address?*
   - **Explanation:** Focus on the foundational definition and why it matters in real-world applications.

2. **Question 2 (Application & Relationships):**
   *How does this concept connect with other topics you are studying? What happens in edge cases?*
   - **Explanation:** Understanding how parts interlock builds deeper retention than rote memorization.

3. **Question 3 (Self-Reflection):**
   *Can you summarize the most important formula, rule, or takeaway in your own words without looking?*`;
  }

  if (action === 'explain' || (prompt || '').toLowerCase().includes('explain')) {
    return `### 💡 Simple Conceptual Breakdown: ${title}

1. **The Big Picture:**
   Every complex topic starts with a simple goal. Break down **${title}** into 3 primary elements: What is it, How does it work, and Why do we need it?

2. **Visual & Intuitive Analogy:**
   Think of this concept like an organized filing cabinet or a roadmap. Instead of trying to memorize everything at once, attach new ideas to things you already know.

3. **How to Remember It Long-Term:**
   - Review your attached photos, diagrams, and PDF highlights regularly.
   - Use the **Flashcards** tab to test your memory weekly.
   - Bookmark good YouTube videos or article links in the **Links** tab for quick refreshers.`;
  }

  return `### 📝 Study Assistant Insights on "${title}"

- **Category:** ${note ? note.subject_name || 'General Notes' : 'Personal Knowledge Vault'}
- **Best Practice for Retention:**
  1. Capture clear photos of handwritten notes or whiteboard sketches and attach them to this note.
  2. Save direct links to the best reference articles, YouTube videos, and PDFs.
  3. Regularly ask the AI Copilot to summarize or quiz you before tests and presentations.`;
}
