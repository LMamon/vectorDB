import 'dotenv/config';
import readline from 'readline';
import { connectToMongo, vectorSearch, displayResults } from './index.js';
import { generateResponse } from '../rag-application/generation.js';

//standard input setup
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

//prompt for user query
async function promptQuery(queryText) {
    return new Promise((resolve) => {
        rl.question(queryText, (answer) => {
            resolve(answer);
        });
    });
}

//parse input filters
function parseFilters(input) {
    const filters = {};
    const pairs = input.split(',');

    for (const pair of pairs) {
        const [key, value] = pair.split(/[:=]/).map(s => s.trim());
        if (!key || !value) continue;

        if (key === 'genre' || key === 'genres') {
        filters.genres = value.split('|').map(v => v.trim());
        } else if (!isNaN(value)) {
        filters[key] = Number(value);
        } else {
        filters[key] = value;
        }
    }
    return filters;
}

//search loop
async function searchLoop() {
    console.log('\nWelcome to mflix Semantic Movie Search!');
    console.log('=' .repeat(60));
    console.log('\nPowered by MongoDB Atlas Vector Search and Voyage AI\n');

    //connect to MongoDB
    const db = await connectToMongo();

    console.log('\nSearch Tips:');
    console.log('  - Use natural language to describe the movie plot');
    console.log('  - Add filters: genre:Action, minYear:2000, maxYear:2020, minRating:7.5');
    console.log('  - Multiple genres: genre:Action|Drama\n');
    console.log('  - Type "examples" to see sample searches');
    console.log('  - Type "exit" to leave\n');

    while (true) {
        try {
        const query = await promptQuery('Enter your search query: ');
        if (query.toLowerCase() === 'exit') {
            break;
        }

        const filterInput = await new Promise((resolve) => {
            rl.question('Enter filters as key=value pairs separated by commas (or press Enter for none): ', (answer) => {
                resolve(answer);
            });
        });
        
        if (query.toLowerCase() === 'examples') {
            showExamples();
            continue;
        }
        if (!query.trim()) {
            console.log('Please enter a search query.\n');
            continue;
        }

        const limitInput = await promptQuery('Enter number of results to return (default 5): ');
        const limit = parseInt(limitInput) || 5;

        //get filters
        const filters = parseFilters(filterInput);

        //search with optional filters
        const results = await vectorSearch(query, limit, filters);
        if (results.length === 0) {
            console.log("No relevant movies found for that query.");
            continue;
        }

        //generate response using retrieved results
        const answer = await generateResponse(query, results);
        console.log('Generated Response:\n', answer);

        console.log('\n');
        } catch (error) {
            console.error('\nError:', error.message);
            console.log('Please try again.\n');
        }}
        rl.close();
        console.log('Thank you for using mflix Semantic Movie Search! Goodbye!');
}

//show example searches
function showExamples() {
    console.log('\nExample Searches:');
    console.log('1. Query: "space adventure", Filters: none');
    console.log('2. Query: "romantic comedy", Filters: genre:Romance|Comedy, minYear:1990, maxYear:1999, minRating:7');
    console.log('3. Query: "historical drama", Filters: genre:Drama, minYear:2000, minRating:8');
    console.log('4. Query: "horror thriller", Filters: genre:Horror|Thriller, minYear:2010\n');
}

searchLoop().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});