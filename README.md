#  RAG with MongoDB Atlas Vector Search

A demonstration of building a **Retrieval-Augmented Generation (RAG)** system using free and open-source tools. This project combines MongoDB Atlas Vector Search, Voyage AI embeddings, and local LLM inference with Ollama to create a fully functional semantic movie search and Q&A system.

## Features

- **Vector Search**: Uses MongoDB Atlas Vector Search to find semantically similar movie plots
- **Free Embeddings**: Leverages Voyage AI's free tier for generating high-quality text embeddings
- **Local LLM**: Runs inference locally using Ollama (no API costs for generation)
- **RAG Pipeline**: Retrieves relevant context from MongoDB and generates answers using your chosen LLM
- **Natural Language Queries**: Search movies using natural language descriptions instead of keywords
- **Filterable Results**: Optional filtering by genre, year, and IMDB rating

## Architecture

```
User Query
    ↓
Voyage AI (Embedding Generation)
    ↓
MongoDB Atlas Vector Search
    ↓
Retrieved Context + Query
    ↓
Local LLM
    ↓
Generated Response
```

## Prerequisites

1. **MongoDB Atlas Account** - Free tier with Vector Search enabled
2. **Voyage AI API Key** - Free tier available at [voyageai.com](https://www.voyageai.com)
3. **Ollama** - Download from [ollama.ai](https://ollama.ai)
4. **Node.js** - v16+ recommended

## Setup

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/LMamon/vectorDB.git
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# MongoDB Connection
MONGODB_URI=<mongoDBURI>
DATABASE_NAME=<database_name>
COLLECTION_NAME=<collection_name>
VECTOR_INDEX_NAME=<vector_index_name>

# Voyage AI
VOYAGEAI_API_KEY=your_voyage_ai_key_here

# Ollama
OLLAMA_MODEL=< >
```

### 3. Pull an Ollama Model

```bash
ollama pull llama2
```

### 4. Start Ollama

```bash
ollama serve
```

### 5. Set Up MongoDB Vector Search Index

In MongoDB Atlas, create a vector search index on your `embedded_movies` collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "plot_embedding_voyage_3_large",
      "similarity": "cosine",
      "dimensions": 1024
    }
  ]
}
```

## Usage

### Interactive Search

```bash
npm run search
```

Then enter natural language queries:
- "space adventure films"
- "romantic comedies from the 1990s"
- "scary horror movies"

Add optional filters:
- `genre:Action|Drama`
- `minYear:2000, maxYear:2023`
- `minRating:7.5`

## Project Structure

```
vectorDB/
├── semantic-search/
│   ├── index.js          # Vector search and embedding generation
│   ├── search.js         # Interactive search interface
│   └── embed_movies.js   # Script to embed movie plots
├── rag-application/
│   └── generation.js     # RAG response generation
├── .env                  # Environment variables 
└── README.md
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `DATABASE_NAME` | Database name | `sample_mflix` |
| `COLLECTION_NAME` | Collection with embeddings | `embedded_movies` |
| `VECTOR_INDEX_NAME` | Vector search index name | `plot_embedding_index` |
| `VOYAGEAI_API_KEY` | Voyage AI API key | Get from [voyageai.com](https://www.voyageai.com) |
| `OLLAMA_MODEL` | Local LLM model | `llama2`, `mistral`, etc. 

## Troubleshooting

**No results returned:**
- Verify vector index exists in MongoDB Atlas
- Check that embeddings are generated for your documents
- Ensure `VECTOR_INDEX_NAME` matches MongoDB index name

**LLM not generating responses:**
- Confirm Ollama is running: `ollama serve`
- Verify model is installed: `ollama list`
- Check `OLLAMA_MODEL` matches installed model name

**Embedding generation fails:**
- Verify `VOYAGEAI_API_KEY` is valid
- Check Voyage AI API limits (free tier: 50K tokens/month)

## License
Apache 2.0
