import React from 'react'
import { Brain, Lightbulb } from 'lucide-react'

/**
 * TopicDisplay Component
 * Shows the current AI-generated discussion topic
 */
function TopicDisplay({ topic }) {
  if (!topic) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Generating discussion topic...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Lightbulb className="w-6 h-6 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-900">Discussion Topic</h3>
      </div>
      
      <div className="space-y-3">
        <h4 className="text-xl font-bold text-primary-700">{topic.title}</h4>
        
        {topic.description && (
          <p className="text-gray-700 leading-relaxed">{topic.description}</p>
        )}
        
        {topic.questions && topic.questions.length > 0 && (
          <div className="mt-4">
            <h5 className="font-semibold text-gray-900 mb-2">Think about:</h5>
            <ul className="space-y-1">
              {topic.questions.map((question, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {topic.category && (
          <div className="mt-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                           bg-primary-100 text-primary-800">
              {topic.category}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default TopicDisplay
