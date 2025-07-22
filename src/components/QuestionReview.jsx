import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { Check, X, RefreshCw, Download, Eye, EyeOff, Edit2, Save, XCircle } from 'lucide-react'

export default function QuestionReview({ questions, onQuestionsUpdate }) {
  const [expandedQuestions, setExpandedQuestions] = useState(new Set())
  const [editingQuestions, setEditingQuestions] = useState(new Set())
  const [editData, setEditData] = useState({})

  const toggleExpanded = (questionId) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId)
    } else {
      newExpanded.add(questionId)
    }
    setExpandedQuestions(newExpanded)
  }

  const startEditing = (questionId) => {
    const question = questions.find(q => q.id === questionId)
    if (question) {
      setEditData({
        ...editData,
        [questionId]: {
          question: question.question,
          options: [...question.options],
          correctAnswer: question.correctAnswer,
          explanation: question.explanation
        }
      })
      setEditingQuestions(new Set([...editingQuestions, questionId]))
    }
  }

  const cancelEditing = (questionId) => {
    const newEditing = new Set(editingQuestions)
    newEditing.delete(questionId)
    setEditingQuestions(newEditing)

    const newEditData = { ...editData }
    delete newEditData[questionId]
    setEditData(newEditData)
  }

  const saveEditing = (questionId) => {
    const editedData = editData[questionId]
    if (!editedData) return

    const updatedQuestions = questions.map(q =>
      q.id === questionId
        ? {
          ...q,
          question: editedData.question,
          options: editedData.options,
          correctAnswer: editedData.correctAnswer,
          explanation: editedData.explanation,
          status: 'pending',
          isStatusLocked: false
        }
        : q
    )

    onQuestionsUpdate(updatedQuestions)
    cancelEditing(questionId)
    toast.success('Question updated successfully!')
  }

  const updateEditData = (questionId, field, value) => {
    setEditData({
      ...editData,
      [questionId]: {
        ...editData[questionId],
        [field]: value
      }
    })
  }

  const updateOptionEditData = (questionId, optionIndex, value) => {
    const currentOptions = [...editData[questionId].options]
    currentOptions[optionIndex] = value
    updateEditData(questionId, 'options', currentOptions)
  }

  const updateQuestionStatus = (questionId, status) => {
    const updatedQuestions = questions.map(q =>
      q.id === questionId ? { ...q, status, isStatusLocked: true } : q
    )
    onQuestionsUpdate(updatedQuestions)

    const statusMessages = {
      approved: 'Question approved!',
      rejected: 'Question rejected',
      pending: 'Question status reset'
    }
    toast.success(statusMessages[status])
  }

  const regenerateQuestion = async (questionId) => {
    toast.loading('Regenerating question...', { id: questionId })

    try {
      const { OPENAI_API_KEY } = await import('../lib/supabase')
      const questionToRegenerate = questions.find(q => q.id === questionId)

      if (!questionToRegenerate) {
        throw new Error('Question not found')
      }

      const prompt = `Regenerate a different ${questionToRegenerate.difficulty} level multiple choice question for ${questionToRegenerate.topic} - ${questionToRegenerate.subtopic}.

Requirements:
- Same difficulty level: ${questionToRegenerate.difficulty}
- Different from the original question: "${questionToRegenerate.question}"
- 4 multiple choice options
- Detailed step-by-step explanation
- Suitable for aptitude tests

Return as JSON with this structure:
{
  "question": "New question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Detailed explanation"
}`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert aptitude question creator. Generate a new, different question while maintaining the same difficulty level and topic. Always return valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const aiResponse = data.choices[0].message.content

      let newQuestionData
      try {
        const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim()
        newQuestionData = JSON.parse(cleanedResponse)
      } catch (parseError) {
        console.error('Failed to parse AI response:', aiResponse)
        throw new Error('Invalid JSON response from AI')
      }

      const updatedQuestions = questions.map(q =>
        q.id === questionId
          ? {
            ...q,
            question: newQuestionData.question,
            options: newQuestionData.options,
            correctAnswer: newQuestionData.correctAnswer,
            explanation: newQuestionData.explanation,
            status: 'pending',
            isStatusLocked: false
          }
          : q
      )

      onQuestionsUpdate(updatedQuestions)
      toast.success('Question regenerated with AI!', { id: questionId })

    } catch (error) {
      console.error('Regeneration error:', error)
      toast.error(`Failed to regenerate: ${error.message}`, { id: questionId })
    }
  }

  // Helper function to convert text to LaTeX format
  const convertToLatex = (text) => {
    if (!text) return text

    return text
      .replace(/\b(\d+)\/(\d+)\b/g, '$\\frac{$1}{$2}$') // Fractions like 3/4 -> $\frac{3}{4}$
      .replace(/\b(\d+)\^(\d+)\b/g, '$\\$1^{$2}$') // Powers like 2^3 -> $2^{3}$
      .replace(/√(\d+)/g, '$\\sqrt{$1}$') // Square roots
      .replace(/≤/g, '$\\leq$') // Less than or equal
      .replace(/≥/g, '$\\geq$') // Greater than or equal
      .replace(/×/g, '$\\times$') // Multiplication
      .replace(/÷/g, '$\\div$') // Division
      .replace(/π/g, '$\\pi$') // Pi
      .replace(/∞/g, '$\\infty$') // Infinity
      .replace(/±/g, '$\\pm$') // Plus minus
      .replace(/∑/g, '$\\sum$') // Summation
      .replace(/∫/g, '$\\int$') // Integral
      .replace(/α/g, '$\\alpha$') // Alpha
      .replace(/β/g, '$\\beta$') // Beta
      .replace(/γ/g, '$\\gamma$') // Gamma
      .replace(/θ/g, '$\\theta$') // Theta
      .replace(/λ/g, '$\\lambda$') // Lambda
      .replace(/μ/g, '$\\mu$') // Mu
      .replace(/σ/g, '$\\sigma$') // Sigma
      .replace(/Δ/g, '$\\Delta$') // Delta
      .replace(/Ω/g, '$\\Omega$') // Omega
  }

  const exportToGoogleSheets = () => {
    const approvedQuestions = questions.filter(q => q.status === 'approved')

    if (approvedQuestions.length === 0) {
      toast.error('No approved questions to export')
      return
    }

    // Create CSV content with new format and LaTeX conversion
    const csvContent = [
      ['S. No', 'Question Content', 'Option A', 'Option B', 'Option C', 'Option D', 'Explanation', 'Key', 'SUB TOPIC', 'Difficulty'],
      ...approvedQuestions.map((q, index) => [
        index + 1, // S. No
        convertToLatex(q.question), // Question Content with LaTeX
        convertToLatex(q.options[0]), // Option A with LaTeX
        convertToLatex(q.options[1]), // Option B with LaTeX
        convertToLatex(q.options[2]), // Option C with LaTeX
        convertToLatex(q.options[3]), // Option D with LaTeX
        convertToLatex(q.explanation), // Explanation with LaTeX
        String.fromCharCode(65 + q.correctAnswer), // Key (A, B, C, D)
        q.subtopic, // SUB TOPIC
        q.difficulty.toUpperCase() // Difficulty
      ])
    ].map(row => row.map(cell => {
      // Properly escape CSV cells to handle special characters and LaTeX
      const cellStr = String(cell || '')
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('$')) {
        return `"${cellStr.replace(/"/g, '""')}"`
      }
      return cellStr
    }).join(',')).join('\n')

    // Download CSV with UTF-8 BOM to handle special characters properly
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aptitude_questions_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast.success(`Exported ${approvedQuestions.length} questions to CSV with LaTeX formatting`)
  }

  const getStatusCounts = () => {
    const counts = { approved: 0, rejected: 0, pending: 0 }
    questions.forEach(q => counts[q.status]++)
    return counts
  }

  const statusCounts = getStatusCounts()

  if (questions.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
        <h3 style={{ color: '#64748b', marginBottom: '16px' }}>No Questions Generated</h3>
        <p style={{ color: '#94a3b8' }}>Generate some questions first to review them here.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Summary Stats */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ marginBottom: '8px' }}>Question Review</h2>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <span>Total: <strong>{questions.length}</strong></span>
              <span style={{ color: '#10b981' }}>Approved: <strong>{statusCounts.approved}</strong></span>
              <span style={{ color: '#ef4444' }}>Rejected: <strong>{statusCounts.rejected}</strong></span>
              <span style={{ color: '#f59e0b' }}>Pending: <strong>{statusCounts.pending}</strong></span>
            </div>
          </div>

          <button
            onClick={exportToGoogleSheets}
            className="btn btn-success"
            disabled={statusCounts.approved === 0}
          >
            <Download size={16} />
            Export Approved ({statusCounts.approved})
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {questions.map((question, index) => (
          <div key={question.id} className="question-card">
            <div className="question-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>
                  {question.isVariant ? `Variant ${question.variantNumber}` : `Question ${index + 1}`}
                </span>
                <span className={`difficulty-badge difficulty-${question.difficulty}`}>
                  {question.difficulty}
                </span>
                <span style={{ fontSize: '14px', color: '#64748b' }}>
                  {question.topic} → {question.subtopic}
                </span>
                {question.isVariant && (
                  <span className="variant-badge">
                    VARIANT
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {question.status === 'approved' && (
                  <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '500' }}>✓ Approved</span>
                )}
                {question.status === 'rejected' && (
                  <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: '500' }}>✗ Rejected</span>
                )}
                <button
                  onClick={() => toggleExpanded(question.id)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  {expandedQuestions.has(question.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              {editingQuestions.has(question.id) ? (
                // Editing Mode
                <div>
                  <div className="form-group">
                    <label className="form-label">Question:</label>
                    <textarea
                      className="form-input"
                      value={editData[question.id]?.question || ''}
                      onChange={(e) => updateEditData(question.id, 'question', e.target.value)}
                      rows={3}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Options:</label>
                    {editData[question.id]?.options?.map((option, optIndex) => (
                      <div key={optIndex} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ minWidth: '20px', fontWeight: '500' }}>
                          {String.fromCharCode(65 + optIndex)}.
                        </span>
                        <input
                          className="form-input"
                          value={option}
                          onChange={(e) => updateOptionEditData(question.id, optIndex, e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={editData[question.id]?.correctAnswer === optIndex}
                          onChange={() => updateEditData(question.id, 'correctAnswer', optIndex)}
                          title="Mark as correct answer"
                        />
                      </div>
                    ))}
                  </div>

                  {expandedQuestions.has(question.id) && (
                    <div className="form-group">
                      <label className="form-label">Explanation:</label>
                      <textarea
                        className="form-input"
                        value={editData[question.id]?.explanation || ''}
                        onChange={(e) => updateEditData(question.id, 'explanation', e.target.value)}
                        rows={4}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                // Display Mode
                <div>
                  <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '12px' }}>
                    {question.question}
                  </p>

                  <ul className="options-list">
                    {question.options.map((option, optIndex) => (
                      <li key={optIndex} style={{
                        fontWeight: optIndex === question.correctAnswer ? '600' : 'normal',
                        color: optIndex === question.correctAnswer ? '#10b981' : '#374151'
                      }}>
                        {String.fromCharCode(65 + optIndex)}. {option}
                        {optIndex === question.correctAnswer && ' ✓'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {expandedQuestions.has(question.id) && !editingQuestions.has(question.id) && (
              <div className="explanation">
                <h4 style={{ marginBottom: '8px', color: '#374151' }}>Explanation:</h4>
                <p>{question.explanation}</p>
              </div>
            )}

            <div className="question-actions">
              {editingQuestions.has(question.id) ? (
                // Edit mode buttons
                <>
                  <button
                    onClick={() => saveEditing(question.id)}
                    className="btn btn-success"
                  >
                    <Save size={16} />
                    Save Changes
                  </button>

                  <button
                    onClick={() => cancelEditing(question.id)}
                    className="btn btn-danger"
                  >
                    <XCircle size={16} />
                    Cancel
                  </button>
                </>
              ) : (
                // Normal mode buttons
                <>
                  <button
                    onClick={() => updateQuestionStatus(question.id, 'approved')}
                    className="btn btn-success"
                    disabled={question.isStatusLocked && question.status === 'approved'}
                    style={{
                      opacity: (question.isStatusLocked && question.status === 'approved') ? 0.5 : 1,
                      cursor: (question.isStatusLocked && question.status === 'approved') ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Check size={16} />
                    Approve
                  </button>

                  <button
                    onClick={() => updateQuestionStatus(question.id, 'rejected')}
                    className="btn btn-danger"
                    disabled={question.isStatusLocked && question.status === 'rejected'}
                    style={{
                      opacity: (question.isStatusLocked && question.status === 'rejected') ? 0.5 : 1,
                      cursor: (question.isStatusLocked && question.status === 'rejected') ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <X size={16} />
                    Reject
                  </button>

                  <button
                    onClick={() => startEditing(question.id)}
                    className="btn btn-secondary"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>

                  <button
                    onClick={() => regenerateQuestion(question.id)}
                    className="btn btn-secondary"
                  >
                    <RefreshCw size={16} />
                    Regenerate
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}