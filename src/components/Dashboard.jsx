import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { LogOut, Plus, Download } from 'lucide-react'
import QuestionGenerator from './QuestionGenerator'
import QuestionReview from './QuestionReview'

export default function Dashboard({ session }) {
  const [activeTab, setActiveTab] = useState('generate')
  const [generatedQuestions, setGeneratedQuestions] = useState([])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Error signing out')
    }
  }

  const handleQuestionsGenerated = (questions) => {
    setGeneratedQuestions(questions)
    setActiveTab('review')
  }

  return (
    <div>
      <header className="header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Aptitude Question Generator</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ color: '#64748b' }}>Welcome, {session.user.email}</span>
              <button onClick={handleSignOut} className="btn btn-secondary">
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0' }}>
            <button
              onClick={() => setActiveTab('generate')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: activeTab === 'generate' ? '#3b82f6' : 'transparent',
                color: activeTab === 'generate' ? 'white' : '#64748b',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              <Plus size={16} style={{ marginRight: '8px' }} />
              Generate Questions
            </button>
            <button
              onClick={() => setActiveTab('review')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: activeTab === 'review' ? '#3b82f6' : 'transparent',
                color: activeTab === 'review' ? 'white' : '#64748b',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Review Questions ({generatedQuestions.length})
              {generatedQuestions.length > 0 && (
                <span style={{ 
                  marginLeft: '8px', 
                  fontSize: '11px', 
                  opacity: '0.8' 
                }}>
                  ({generatedQuestions.filter(q => !q.isVariant).length} base + {generatedQuestions.filter(q => q.isVariant).length} variants)
                </span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'generate' && (
          <QuestionGenerator onQuestionsGenerated={handleQuestionsGenerated} />
        )}
        
        {activeTab === 'review' && (
          <QuestionReview 
            questions={generatedQuestions} 
            onQuestionsUpdate={setGeneratedQuestions}
          />
        )}
      </div>
    </div>
  )
}