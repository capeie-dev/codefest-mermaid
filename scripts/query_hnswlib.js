// Script to query the HNSWLib vector store created with LangChain JS
// Usage: node scripts/query_hnswlib.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { HNSWLib } = require('@langchain/community/vectorstores/hnswlib');
const { OpenAIEmbeddings } = require('@langchain/openai');

// 1. Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// 2. Load the vector store and run a query
(async () => {
  const vectorStore = await HNSWLib.load(
    path.join(__dirname, '../hnswlib_index'),
    embeddings
  );

  // 3. Run a similarity search
  const query = "What is ElastiCache?";
  const results = await vectorStore.similaritySearch(query, 3); // Top 3 matches

  results.forEach((doc, idx) => {
    console.log(`Result ${idx + 1}:`);
    console.log('Content:', doc.pageContent.slice(0, 300)); // Print first 300 chars
    console.log('Metadata:', doc.metadata);
    console.log('---');
  });
})();
