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

    // Get the Gemini model
    // Updated model name: gemini-pro is deprecated, use gemini-1.5-flash or gemini-1.5-pro
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build conversation context
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

    try {
      // Generate response using Gemini
      const result = await model.generateContent(conversationContext);
      const response = await result.response;
      const aiMessage = response.text();

      console.log(`✅ [Chatbot] Response generated: "${aiMessage.substring(0, 50)}${aiMessage.length > 50 ? '...' : ''}"`);

      return NextResponse.json({
        success: true,
        message: aiMessage,
        timestamp: new Date().toISOString()
      });
    } catch (geminiError) {
      console.error('❌ [Chatbot] Gemini API error:', geminiError);
      console.error('❌ [Chatbot] Gemini error details:', JSON.stringify(geminiError, null, 2));
      
      const errorMessage = geminiError instanceof Error ? geminiError.message : 'Unknown error';
      const errorString = String(geminiError);
      
      // Check for specific Gemini API errors
      let userMessage = "I'm having trouble processing your request right now. Please try again in a moment, or feel free to ask me about travel planning, destinations in the Philippines, or how to use the app features!";
      
      if (errorString.includes('API key') || errorMessage.includes('API key') || errorMessage.includes('auth')) {
        userMessage = "The chatbot service is currently unavailable due to a configuration issue. Please try again later or contact support.";
        console.error('❌ [Chatbot] API key or authentication error detected');
      } else if (errorString.includes('quota') || errorMessage.includes('quota') || errorMessage.includes('limit')) {
        userMessage = "The chatbot service has reached its usage limit. Please try again later.";
        console.error('❌ [Chatbot] Quota limit reached');
      } else if (errorString.includes('model') || errorMessage.includes('model')) {
        userMessage = "The chatbot service is experiencing technical difficulties. Please try again in a few moments.";
        console.error('❌ [Chatbot] Model error detected');
      }
      
      // Provide fallback response if Gemini fails
      return NextResponse.json({
        success: false,
        message: userMessage,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
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

