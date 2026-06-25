# Local AI Integration Guide

This Educational Platform is designed to work with **fully local AI models** for complete privacy and offline capability.

## Current Setup

The platform currently uses a simple rule-based AI response system in the backend. To integrate a real local AI model:

## Option 1: Ollama (Recommended - Easiest)

1. **Install Ollama** on your local machine:
   ```bash
   # macOS/Linux
   curl https://ollama.ai/install.sh | sh
   
   # Windows
   # Download from https://ollama.ai
   ```

2. **Pull a model**:
   ```bash
   ollama pull llama2
   # or
   ollama pull mistral
   ```

3. **Update the backend** (`supabase/functions/server/index.tsx`):
   ```typescript
   async function getLocalAIResponse(query: string): Promise<string> {
     try {
       const response = await fetch('http://localhost:11434/api/generate', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           model: 'llama2',
           prompt: `You are an educational AI assistant. Answer this student question: ${query}`,
           stream: false
         })
       });
       
       const data = await response.json();
       return data.response;
     } catch (error) {
       // Fallback to rule-based responses
       return getRulBasedResponse(query);
     }
   }
   ```

## Option 2: LM Studio

1. **Download LM Studio**: https://lmstudio.ai
2. **Load a model** (Mistral, Llama 2, etc.)
3. **Start local server** on port 1234
4. **Update backend to use OpenAI-compatible endpoint**:
   ```typescript
   const response = await fetch('http://localhost:1234/v1/chat/completions', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       messages: [
         { role: 'system', content: 'You are an educational AI assistant.' },
         { role: 'user', content: query }
       ]
     })
   });
   ```

## Option 3: LocalAI

1. **Run LocalAI with Docker**:
   ```bash
   docker run -p 8080:8080 localai/localai:latest
   ```

2. **Update backend endpoint** to `http://localhost:8080`

## MongoDB Integration (Optional)

If you need MongoDB for more complex data structures:

1. **Install MongoDB locally** or use MongoDB Atlas
2. **Add to backend** (`supabase/functions/server/index.tsx`):
   ```typescript
   import { MongoClient } from "npm:mongodb@6";
   
   const mongoClient = new MongoClient(Deno.env.get('MONGODB_URI') || 'mongodb://localhost:27017');
   await mongoClient.connect();
   const db = mongoClient.db('eduai');
   ```

3. **Store environment variable** in Make settings (see below)

## Environment Variables

For API keys or connection strings:
1. Go to Make settings page
2. Add environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `LOCAL_AI_ENDPOINT`: Your local AI endpoint URL
   - Any other API keys needed

## Benefits of Local AI

✅ **Complete Privacy**: All student data stays on your machine
✅ **Offline Capability**: Works without internet connection
✅ **No API Costs**: No per-request charges
✅ **Data Ownership**: Full control over all educational data
✅ **Customizable**: Fine-tune models for your specific curriculum

## Current Features Using Local AI

- 📚 **AI Chat Assistant**: Answers academic questions
- 🧠 **Study Recommendations**: Personalized study plans
- 📊 **Performance Insights**: AI-analyzed test results
- 🎤 **Voice Assistant**: Hands-free learning support

## Next Steps

1. Choose your preferred local AI solution
2. Install and test it locally
3. Update the backend code with the endpoint
4. Redeploy the Supabase function from Make settings
5. Test the AI responses in the platform

---

**Note**: This platform is designed for educational use and personal learning. It's not intended for storing highly sensitive PII or secure medical/financial data.
