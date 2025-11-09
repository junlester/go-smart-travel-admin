import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '@/constants/APIKeys';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// System prompt for the chatbot
const SYSTEM_PROMPT = `You are a friendly and helpful AI travel assistant for "Go Smart Travel", a travel planning app for the Philippines. Your role is to help users with:

1. **Travel Planning**: Help users plan trips, create itineraries, and find destinations in the Philippines
2. **Destination Information**: Provide information about popular destinations like Boracay, Palawan, Cebu, Bohol, Siargao, etc.
3. **Travel Tips**: Offer practical advice about weather, transportation, accommodation, food, safety, and local customs
4. **App Features**: Guide users on how to use the app features (booking, itinerary creation, trip management)
5. **Booking Assistance**: Help with tour bookings, cancellations, and modifications
6. **General Travel Questions**: Answer questions about Philippine culture, festivals, language, currency, etc.

**Guidelines:**
- Be friendly, conversational, and helpful
- Keep responses concise but informative (2-3 paragraphs max)
- Focus on travel-related topics in the Philippines
- If asked about app features, guide them to the appropriate section
- If you don't know something, admit it and suggest how they can find the information
- Use emojis sparingly to make responses more engaging
- Always maintain a positive and encouraging tone

**App Context:**
- Users can create personalized itineraries in the "Plan a Trip" section
- Users can book tours from the Home page
- Users can view saved trips in "My Trips"
- The app supports multiple destinations across the Philippines
- Users can filter activities by type (Outdoors, Historical, Nightlife, Shopping, Cultural, Entertainment)
- Budget options: Low (0-500 PHP), Moderate (500-800 PHP), Luxury (800+ PHP)

**Important:**
- If users ask about booking, guide them to the Home page
- If users ask about creating an itinerary, guide them to "Plan a Trip"
- If users ask about their trips, guide them to "My Trips"
- Always be helpful and provide actionable advice`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Validate API key
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
      console.error('❌ Gemini API key is not configured');
      return NextResponse.json(
        { error: 'Chatbot service is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    console.log(`🤖 [Chatbot] Processing message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    console.log(`📝 [Chatbot] Conversation history length: ${conversationHistory.length}`);

    // Build conversation context first
    let conversationContext = SYSTEM_PROMPT + '\n\n';
    
    // Add conversation history (last 10 messages to keep context manageable)
    const recentHistory = conversationHistory.slice(-10);
    if (recentHistory.length > 0) {
      conversationContext += 'Previous conversation:\n';
      recentHistory.forEach((msg) => {
        if (msg.sender === 'user') {
          conversationContext += `User: ${msg.text}\n`;
        } else if (msg.sender === 'ai') {
          conversationContext += `Assistant: ${msg.text}\n`;
        }
      });
      conversationContext += '\n';
    }

    // Add current user message
    conversationContext += `User: ${message}\nAssistant:`;

    // Try different models - error occurs during generateContent, not model initialization
    // The error says models are not found for API version v1beta
    // Try gemini-pro first (original stable model that works with v1beta)
    // Then try newer models
    const modelsToTry = [
      'gemini-pro',            // Original stable model (works with v1beta)
      'gemini-1.5-flash',      // Fast, stable (might need v1 API)
      'gemini-1.5-pro',        // More capable (might need v1 API)
      'gemini-2.0-flash-exp'   // Experimental 2.0 model
    ];
    
    let aiMessage = null;
    let lastError = null;
    let usedModel = null;
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`🔄 Trying Gemini model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // This is where the actual API call happens - error occurs here if model doesn't exist
        const result = await model.generateContent(conversationContext);
        const response = await result.response;
        aiMessage = response.text();
        usedModel = modelName;
        
        console.log(`✅ Successfully generated response using model: ${modelName}`);
        console.log(`✅ [Chatbot] Response: "${aiMessage.substring(0, 50)}${aiMessage.length > 50 ? '...' : ''}"`);
        break; // Success, exit loop
      } catch (modelError: any) {
        lastError = modelError;
        const errorMsg = modelError?.message || String(modelError);
        console.warn(`⚠️ Model ${modelName} failed:`, errorMsg);
        
        // Check if it's a "model not found" error (404)
        if (errorMsg.includes('not found') || errorMsg.includes('404') || errorMsg.includes('is not found')) {
          console.log(`⏭️ Model ${modelName} not available, trying next model...`);
          continue; // Try next model
        } else {
          // If it's a different error (quota, auth, etc.), don't try other models
          console.error(`❌ Model ${modelName} error (not a 404):`, errorMsg);
          throw modelError;
        }
      }
    }
    
    // If all models failed with 404 errors
    if (!aiMessage) {
      console.error('❌ All Gemini models failed. Last error:', lastError);
      const errorMsg = lastError?.message || 'Unknown error';
      throw new Error(`No available Gemini model found. Tried: ${modelsToTry.join(', ')}. Error: ${errorMsg}`);
    }

    // Success! Return the AI response
    return NextResponse.json({
      success: true,
      message: aiMessage,
      model: usedModel, // Include which model was used
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [Chatbot] API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: "I'm sorry, I encountered an error. Please try again later."
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    service: 'Go Smart Travel Chatbot API',
    geminiConfigured: !!(GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY'),
    timestamp: new Date().toISOString()
  });
}

