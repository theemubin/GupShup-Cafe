import fetch from 'node-fetch'

/**
 * AI Topic Generator
 * Generates discussion topics using Hugging Face's free API
 */

// Predefined topics as fallback
const fallbackTopics = [
  {
    title: "The Future of Education",
    description: "How will technology reshape learning in the next decade?",
    category: "Education",
    questions: [
      "What role should AI play in personalized learning?",
      "How can we maintain human connection in digital education?",
      "What skills will be most important for future students?"
    ]
  },
  {
    title: "Sustainable Living in Urban Areas",
    description: "Exploring practical ways to live more sustainably in cities.",
    category: "Environment",
    questions: [
      "What small changes can make the biggest environmental impact?",
      "How can cities be redesigned for sustainability?",
      "What role does individual responsibility play in climate change?"
    ]
  },
  {
    title: "The Impact of Social Media on Society",
    description: "Examining both positive and negative effects of social media platforms.",
    category: "Technology",
    questions: [
      "How has social media changed human relationships?",
      "What are the benefits and drawbacks of constant connectivity?",
      "How can we use social media more mindfully?"
    ]
  },
  {
    title: "Mental Health and Well-being",
    description: "Discussing strategies for maintaining good mental health in modern life.",
    category: "Health",
    questions: [
      "What practices contribute most to mental well-being?",
      "How can we reduce stigma around mental health discussions?",
      "What role does community play in supporting mental health?"
    ]
  },
  {
    title: "The Future of Work",
    description: "How is the nature of work changing with technology and remote work trends?",
    category: "Career",
    questions: [
      "What skills will be most valuable in the future job market?",
      "How can we balance work-life integration?",
      "What impact will AI have on different professions?"
    ]
  },
  {
    title: "Cultural Diversity and Understanding",
    description: "The importance of cultural exchange and global perspectives.",
    category: "Culture",
    questions: [
      "How can we celebrate differences while finding common ground?",
      "What role does travel play in cultural understanding?",
      "How can we combat cultural stereotypes and biases?"
    ]
  },
  {
    title: "Entrepreneurship and Innovation",
    description: "What drives innovation and successful business creation?",
    category: "Business",
    questions: [
      "What qualities make a successful entrepreneur?",
      "How can failure contribute to eventual success?",
      "What role does risk-taking play in innovation?"
    ]
  },
  {
    title: "Personal Growth and Self-Development",
    description: "Strategies for continuous learning and personal improvement.",
    category: "Personal Development",
    questions: [
      "What habits contribute most to personal growth?",
      "How can we overcome limiting beliefs?",
      "What role does feedback play in self-improvement?"
    ]
  }
]

/**
 * Generate a discussion topic using AI or fallback topics
 * @returns {Promise<Object>} Topic object
 */
export async function generateDiscussionTopic() {
  try {
    // Try to generate topic using Hugging Face API
    const aiTopic = await generateTopicWithAI()
    if (aiTopic) {
      return aiTopic
    }
  } catch (error) {
    console.warn('AI topic generation failed, using fallback:', error.message)
  }
  
  // Fallback to predefined topics
  return getRandomFallbackTopic()
}

/**
 * Generate topic using Hugging Face API
 * @returns {Promise<Object|null>} AI-generated topic or null
 */
async function generateTopicWithAI() {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  
  if (!apiKey || apiKey === 'your_huggingface_api_key_here') {
    console.log('ℹ️ No Hugging Face API key provided, using fallback topics')
    return null
  }

  try {
    // Use Hugging Face's free text generation model
    const prompt = `Generate an engaging discussion topic for an educational roundtable. Include:
1. A compelling title (max 50 characters)
2. A brief description (max 200 characters)
3. A category (Education, Technology, Health, Environment, etc.)
4. 3 thought-provoking questions

Topic:`

    const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_length: 300,
          temperature: 0.8,
          num_return_sequences: 1
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data && data[0] && data[0].generated_text) {
      // Parse the AI-generated content
      return parseAIResponse(data[0].generated_text)
    }
    
    return null
  } catch (error) {
    console.error('Error generating topic with AI:', error)
    return null
  }
}

/**
 * Parse AI response and structure it as a topic
 * @param {string} aiText - Raw AI-generated text
 * @returns {Object} Structured topic object
 */
function parseAIResponse(aiText) {
  try {
    // This is a simplified parser - in production, you'd want more robust parsing
    const lines = aiText.split('\n').filter(line => line.trim())
    
    // Extract title (first meaningful line)
    const title = lines[0]?.replace(/^\d+\.\s*/, '').trim() || "AI-Generated Discussion Topic"
    
    // Create a structured topic
    return {
      title: title.length > 50 ? title.substring(0, 47) + "..." : title,
      description: `An AI-generated topic focusing on ${title.toLowerCase()}.`,
      category: "AI Generated",
      questions: [
        "What are your initial thoughts on this topic?",
        "How does this relate to your personal experience?",
        "What aspects would you like to explore further?"
      ],
      source: "AI Generated"
    }
  } catch (error) {
    console.error('Error parsing AI response:', error)
    return getRandomFallbackTopic()
  }
}

/**
 * Get a random fallback topic
 * @returns {Object} Random topic from predefined list
 */
function getRandomFallbackTopic() {
  const randomIndex = Math.floor(Math.random() * fallbackTopics.length)
  const topic = { ...fallbackTopics[randomIndex] }
  
  console.log(`📝 Selected fallback topic: ${topic.title}`)
  return topic
}

/**
 * Get all available fallback topics (for API endpoint)
 * @returns {Array} Array of all fallback topics
 */
export function getAllFallbackTopics() {
  return fallbackTopics.map(topic => ({ ...topic }))
}

/**
 * Get topic by category
 * @param {string} category - Topic category
 * @returns {Object|null} Topic matching category or null
 */
export function getTopicByCategory(category) {
  const topic = fallbackTopics.find(t => 
    t.category.toLowerCase() === category.toLowerCase()
  )
  
  return topic ? { ...topic } : null
}
