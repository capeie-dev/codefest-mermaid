// Ingest HTML files from data/ using LangChain, OpenAI, and Faiss
// Requires: npm install @faiss-node/core langchain @langchain/community @langchain/openai dotenv cheerio

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { HNSWLib } = require('@langchain/community/vectorstores/hnswlib');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Document } = require('langchain/document');

// 1. Read all HTML files from data directory
const dataDir = path.join(__dirname, '../data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.html'));

const docs = files.map(filename => {
  const filePath = path.join(dataDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  // Use cheerio to strip HTML tags and get text content
  const $ = cheerio.load(content);
  const text = $('body').text() || $.text();
  return new Document({ pageContent: text, metadata: { filename } });
});

// 2. Initialize OpenAI Embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// 3. Create Faiss vector store and add documents
(async () => {
  try {
    const vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
    await vectorStore.save(path.join(__dirname, '../hnswlib_index'));
    console.log('Ingestion complete and index saved to hnswlib_index.');
  } catch (err) {
    console.error('Error during ingestion:', err);
  }
})();
