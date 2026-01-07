import 'dotenv/config';
import { MongoClient } from 'mongodb';
import VoyageAI from 'voyageai';

const config = {
  mongoUri: process.env.MONGODB_URI,
  DbName: process.env.DATABASE_NAME,
  voyageApiKey: process.env.VOYAGEAI_API_KEY,
  collectionName: process.env.COLLECTION_NAME,
  vectorIndexName: process.env.VECTOR_INDEX_NAME,
};

// initialize clients
const mgc = new MongoClient(config.mongoUri);
const vo = new VoyageAI({ apiKey: config.voyageApiKey });

// connect to MongoDB
async function connectToMongo() {
    try {
        await mgc.connect();
        await mgc.db(config.DbName).command({ ping: 1 });
        console.log('Successfully pinged and connected to MongoDB deployment');
        return mgc.db(config.DbName);
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        return false;
    }}

connectToMongo().catch(console.error);

//generate embedding for text query
async function generateEmbedding(text) {
    try {
    const embeddingResponse = await vo.embed({
        input: text,
        model: 'voyage-3-large',
        input_type: 'query'
    });

    console.log(`Generated Embeddings: ${embeddingResponse.embedding[0].length} dimensions`);
    return embeddingResponse.embedding[0];
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
}

// perform vector search on plots
async function vectorSearch(query, topK = 5, filters = {}) {
    try {
        console.log('Generating embedding for query...');
        const queryEmbedding = await generateEmbedding(query);

        console.log('Connecting to MongoDB for vector search...');
        await mgc.connect();
        const collection = mgc.db(config.DbName).collection(config.collectionName);

        // define pipeline for vector search
        const pipeline = [
            {
                "$vectorSearch": {
                    "index": config.vectorIndexName,
                    "path": "plot_embedding",
                    "queryVector": queryEmbedding,
                    "numCandidates": 150,
                    "limit": topK
                }
            },
            {
                $project: {
                    _id: 0,
                    title: 1,
                    plot: 1,
                    year: 1,
                    genres: 1,
                    cast: { $slice: ['$cast', 3] }, // First 3 cast members
                    directors: 1,
                    'imdb.rating': 1,
                    runtime: 1,
                    poster: 1,
                    score: { $meta: 'vectorSearchScore' }
                }
            }];
            // add filters if provided
            if (Object.keys(filters).length > 0) {
            const filterStage = { $match: {} };
            
            if (filters.genres) {
                filterStage.$match.genres = { $in: filters.genres };
            }
            if (filters.minYear) {
                filterStage.$match.year = { $gte: filters.minYear };
            }
            if (filters.maxYear) {
                filterStage.$match.year = filterStage.$match.year || {};
                filterStage.$match.year.$lte = filters.maxYear;
            }
            if (filters.minRating) {
                filterStage.$match['imdb.rating'] = { $gte: filters.minRating };
            }
            
            // insert filter after vectorSearch
            pipeline.splice(1, 0, filterStage);
            }
            
            console.log('Searching movies...\n');
            const results = await collection.aggregate(pipeline).toArray();
            
            return results;
        } catch (error) {
            console.error('Search error:', error.message);
            throw error;
        }
    }

//format and display results
function displayResults(results) {
    console.log(`Found ${results.length} results:`);

    results.forEach((movie, index) => {
        console.log(`\nResult ${index + 1}:`);
        console.log(`Title: ${movie.title} (${movie.year})`);
        console.log(`Genres: ${movie.genres.join(', ')}`);
        console.log(`Directors: ${movie.directors.join(', ')}`);
        console.log(`Cast: ${movie.cast.join(', ')}`);
        console.log(`IMDB Rating: ${movie.imdb?.rating || 'N/A'}`);
        console.log(`Runtime: ${movie.runtime} minutes`);
        if (movie.plot) {
            const shortPlot = movie.plot.length > 200 ? movie.plot.substring(0, 200) + '...' : movie.plot;
            console.log(`Plot: ${shortPlot}`);
        }
    });
    
    console.log('-'.repeat(80));
};


// example usage
async function example() {
    await connectToMongo();

    try {
        console.log("Performing basic search for 'space adventure'...");
        const results = await vectorSearch('space adventure', 5);
        displayResults(results);

        console.log("Performing filtered search for 'romantic comedy' in 1990s with min rating 7...");
        const filters = {
            genres: ['Romance', 'Comedy'],
            minYear: 1990,
            maxYear: 1999,
            minRating: 7
        };
        const filteredResults = await vectorSearch('romantic comedy', 5, filters);
        displayResults(filteredResults);
    } catch (error) {
        console.error('Error during example usage:', error);
    } finally {
        await mgc.close();
    }
}

export {
    connectToMongo,
    generateEmbedding,
    vectorSearch,
    displayResults,
};

if (import.meta.url === `file://${process.argv[1]}`) {
    example();
}
