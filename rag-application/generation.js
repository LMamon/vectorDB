import 'dotenv/config';
import ollama from 'ollama';

//build prompt for generation from original prompt and retrieved results
function buildGenerationPrompt(originalPrompt, retrievedResults) {
    const context = retrievedResults.map((res, idx) => 
        `Result ${idx + 1}:\nTitle: ${res.title}\nPlot: ${res.plot}\nYear: ${res.year}\nGenres: ${res.genres.join(', ')}\n`
    ).join('\n');
    
    return `
    Using only the following movie information:\n\n${context}\n
    With no extra explanations, answer the following prompt:\n${originalPrompt}\n 
    if the answer is not contained within the results, say so
    `;
}

//generate response using Ollama
async function generateResponse(query, retrievedResults) {
    //prompt construction
    const prompt = buildGenerationPrompt(query, retrievedResults);

    //generation step
    const answer = await ollama.chat({
        model: process.env.OLLAMA_MODEL,
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ]
    });

    return answer.message.content;
}

export { generateResponse };