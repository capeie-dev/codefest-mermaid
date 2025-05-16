  const express = require('express');
  const bodyParser = require('body-parser');
  const path = require('path');
  const cors = require('cors');
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  const { HNSWLib } = require('@langchain/community/vectorstores/hnswlib');
  const { OpenAIEmbeddings, ChatOpenAI } = require('@langchain/openai');
  const fs = require('fs');
  const { execSync } = require('child_process');

  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  function cosineSimilarity(a, b) {
    const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return dot / (normA * normB);
  }

  const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
  const llm = new ChatOpenAI({ openAIApiKey: process.env.OPENAI_API_KEY, modelName: 'gpt-4' });

  let vectorStore;

  async function ensureVectorStore() {
    if (!vectorStore) {
      vectorStore = await HNSWLib.load(path.join(__dirname, '../hnswlib_index'), embeddings);
    }
    return vectorStore;
  }

  const { v4: uuidv4 } = require('uuid');

  // Skip rendering to image and just return the mermaid diagram as text
function renderMermaidToBase64(mermaidScript) {
  try {
    // Instead of generating an image, we'll return a placeholder
    // The frontend will render the diagram using Mermaid.js
    console.log('Skipping image generation, returning mermaid diagram as text');
    
    // Create a simple SVG with text indicating this is a mermaid diagram
    // This is just a placeholder - the actual rendering will happen in the frontend
    const svgPlaceholder = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="50">
      <rect width="100" height="50" style="fill:rgb(0,0,255);stroke-width:3;stroke:rgb(0,0,0)" />
      <text x="10" y="30" fill="white">Mermaid</text>
    </svg>
    `;
    
    // Convert the SVG to base64
    const base64 = Buffer.from(svgPlaceholder).toString('base64');
    
    return { base64, error: null };
  } catch (error) {
    console.error('Error creating placeholder:', error);
    return { base64: null, error: error.message };
  }
}

  app.post('/generate-architecture', async (req, res) => {
    try {
      const userPrompt = req.body.prompt;
      const store = await ensureVectorStore();
      const retrieved = await store.similaritySearch(userPrompt, 4);

      // Confidence scoring: context
      const queryEmbedding = await embeddings.embedQuery(userPrompt);
      const contextEmbeddings = await Promise.all(retrieved.map(doc => embeddings.embedQuery(doc.pageContent)));
      const contextSimilarities = contextEmbeddings.map(ctxEmb => cosineSimilarity(queryEmbedding, ctxEmb));
      const contextConfidence = contextSimilarities.length ? Math.max(...contextSimilarities) : 0.0;

      // Guardrail: fallback if context confidence too low
      const CONFIDENCE_THRESHOLD = 0.3;
      if (contextConfidence < CONFIDENCE_THRESHOLD) {
        return res.json({
          summary: "Sorry, I could not find relevant information for your request.",
          mermaid: null,
          image_base64: null,
          image_file_path: null,
          context_confidence: contextConfidence,
          answer_confidence: 0.0
        });
      }

      const context = retrieved.map(doc => doc.pageContent).join('\n---\n');
      const prompt = `
  You are an expert architect. Given the following documentation and components:

  ${context}

  A user wants to build the following project: "${userPrompt}"

  Please:
  1. Output a valid Mermaid diagram (in a code block) describing the architecture using the available components. The diagram must be valid Mermaid JS syntax and parsable by the Mermaid CLI.
  2. Write a concise summary of how this architecture can be built.

  Format:
  Mermaid:
  \`\`\`mermaid
  [diagram]
  \`\`\`
  Summary:
  [summary]
  Output only the code block and summary. Do not include any extra text or commentary.
  `;

      const response = await llm.call([{ role: "user", content: prompt }]);
      const text = response.content || response.text || "";
      const mermaidMatch = text.match(/```mermaid\s*([\s\S]+?)```/i);
      const summaryMatch = text.match(/Summary:\s*([\s\S]+)/i);

      if (!mermaidMatch) {
        return res.status(400).json({ error: "No mermaid diagram found in LLM response.", raw: text });
      }

      const mermaid = mermaidMatch[1].trim();
      const summary = summaryMatch ? summaryMatch[1].trim() : "No summary found.";

      // Confidence scoring: answer
      const answerEmbedding = await embeddings.embedQuery(summary);
      const answerConfidence = cosineSimilarity(queryEmbedding, answerEmbedding);

      const { base64: image_base64, error: render_error } = renderMermaidToBase64(mermaid);

      if (render_error) {
        return res.status(400).json({
          error: 'Failed to render mermaid diagram. Likely invalid Mermaid syntax.',
          mermaid,
          render_error
        });
      }

      res.json({
        summary,
        mermaid,
        image_base64,
        context_confidence: contextConfidence,
        answer_confidence: answerConfidence
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || err.toString() });
    }
  });

  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
