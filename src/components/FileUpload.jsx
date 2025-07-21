import React, { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { Upload, FileText, X, Zap, Download } from 'lucide-react'

export default function FileUpload({ onQuestionsGenerated }) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [parsedQuestions, setParsedQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [variantCount, setVariantCount] = useState(3)
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file) => {
    // Check file type
    const allowedTypes = ['.txt', '.csv', '.json']
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    
    if (!allowedTypes.includes(fileExtension)) {
      toast.error('Please upload a .txt, .csv, or .json file')
      return
    }

    setUploadedFile(file)
    
    try {
      const text = await file.text()
      setFileContent(text)
      
      // Try to parse the content
      const questions = await parseFileContent(text, fileExtension)
      setParsedQuestions(questions)
      
      if (questions.length > 0) {
        toast.success(`Found ${questions.length} questions in the file`)
      } else {
        toast.warning('No questions found. Please check the file format.')
      }
    } catch (error) {
      toast.error('Error reading file: ' + error.message)
    }
  }

  const parseFileContent = async (content, fileType) => {
    try {
      if (fileType === '.json') {
        // Try to parse as JSON
        const jsonData = JSON.parse(content)
        return Array.isArray(jsonData) ? jsonData : [jsonData]
      } else if (fileType === '.csv') {
        // Parse CSV format
        return parseCSVContent(content)
      } else {
        // Parse plain text format
        return parseTextContent(content)
      }
    } catch (error) {
      // If parsing fails, try to use AI to understand the format
      return await parseWithAI(content)
    }
  }

  const parseCSVContent = (content) => {
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const questions = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      if (values.length >= headers.length) {
        const question = {}
        headers.forEach((header, index) => {
          question[header.toLowerCase()] = values[index]
        })
        questions.push(question)
      }
    }
    
    return questions
  }

  const parseTextContent = (content) => {
    // Try to parse simple text format
    const sections = content.split(/\n\s*\n/).filter(section => section.trim())
    const questions = []
    
    sections.forEach(section => {
      const lines = section.split('\n').filter(line => line.trim())
      if (lines.length >= 5) { // Question + 4 options minimum
        const question = {
          question: lines[0].replace(/^\d+\.\s*/, '').trim(),
          options: [],
          correctAnswer: 0
        }
        
        // Extract options
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (line.match(/^[A-D]\)/)) {
            question.options.push(line.substring(2).trim())
          }
        }
        
        if (question.options.length >= 4) {
          questions.push(question)
        }
      }
    })
    
    return questions
  }

  const parseWithAI = async (content) => {
    try {
      const { OPENAI_API_KEY } = await import('../lib/supabase')
      
      const prompt = `Parse the following content and extract questions in JSON format. 
      
Content:
${content}

Please return a JSON array of questions with this structure:
[
  {
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Explanation if available",
    "difficulty": "easy|moderate|hard",
    "topic": "Topic if mentioned",
    "subtopic": "Subtopic if mentioned"
  }
]

If you cannot parse the content, return an empty array []`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at parsing educational content. Extract questions accurately and return valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 3000
        })
      })

      if (!response.ok) {
        throw new Error('AI parsing failed')
      }

      const data = await response.json()
      const aiResponse = data.choices[0].message.content
      const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim()
      
      return JSON.parse(cleanedResponse)
    } catch (error) {
      console.error('AI parsing error:', error)
      return []
    }
  }

  const generateVariants = async () => {
    if (parsedQuestions.length === 0) {
      toast.error('No questions found to generate variants for')
      return
    }

    setLoading(true)
    
    try {
      const { OPENAI_API_KEY } = await import('../lib/supabase')
      const allQuestions = []

      for (const [index, baseQ] of parsedQuestions.entries()) {
        // Add the original question
        const originalQuestion = {
          id: `orig_${Date.now()}_${index}`,
          topic: baseQ.topic || 'Uploaded Content',
          subtopic: baseQ.subtopic || 'Manual Upload',
          difficulty: baseQ.difficulty || 'moderate',
          question: baseQ.question,
          options: baseQ.options || [],
          correctAnswer: baseQ.correctAnswer || 0,
          explanation: baseQ.explanation || 'No explanation provided',
          status: 'pending',
          isVariant: false,
          baseQuestionId: null,
          variantNumber: null
        }
        allQuestions.push(originalQuestion)

        // Generate variants using AI
        const prompt = `Generate ${variantCount} variants of this question while maintaining the same concept and difficulty:

Original Question: ${baseQ.question}
Options: ${baseQ.options ? baseQ.options.join(', ') : 'N/A'}
Correct Answer: ${baseQ.options ? baseQ.options[baseQ.correctAnswer] : 'N/A'}

Requirements:
- Keep the same difficulty level and concept
- Change numbers, names, or contexts but preserve the underlying problem
- Each variant should have 4 multiple choice options
- Include detailed explanations
- Make sure each variant tests the same skill/concept

Return as JSON array:
[
  {
    "question": "Variant question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Step-by-step explanation"
  }
]`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an expert question creator. Generate high-quality variants that test the same concept with different contexts. Always return valid JSON.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2000
          })
        })

        if (response.ok) {
          const data = await response.json()
          const aiResponse = data.choices[0].message.content
          const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim()
          
          try {
            const variants = JSON.parse(cleanedResponse)
            
            variants.forEach((variant, vIndex) => {
              const variantQuestion = {
                id: `var_${Date.now()}_${index}_${vIndex}`,
                topic: baseQ.topic || 'Uploaded Content',
                subtopic: baseQ.subtopic || 'Manual Upload',
                difficulty: baseQ.difficulty || 'moderate',
                question: variant.question,
                options: variant.options,
                correctAnswer: variant.correctAnswer,
                explanation: variant.explanation,
                status: 'pending',
                isVariant: true,
                baseQuestionId: originalQuestion.id,
                variantNumber: vIndex + 1
              }
              allQuestions.push(variantQuestion)
            })
          } catch (parseError) {
            console.error('Failed to parse variants for question', index, parseError)
          }
        }
      }

      onQuestionsGenerated(allQuestions)
      toast.success(`Generated ${allQuestions.length} questions (${parsedQuestions.length} original + variants)`)
      
    } catch (error) {
      toast.error('Failed to generate variants: ' + error.message)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const clearFile = () => {
    setUploadedFile(null)
    setFileContent('')
    setParsedQuestions([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadSampleFormat = () => {
    const sampleContent = `1. What is 25% of 80?
A) 15
B) 20
C) 25
D) 30

2. If a shirt costs $40 and is discounted by 15%, what is the final price?
A) $32
B) $34
C) $36
D) $38

3. A train travels 120 km in 2 hours. What is its speed?
A) 50 km/h
B) 60 km/h
C) 70 km/h
D) 80 km/h`

    const blob = new Blob([sampleContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_questions_format.txt'
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Sample format downloaded!')
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Upload size={20} />
        Upload Questions for Variant Generation
      </h2>

      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: '#64748b', marginBottom: '16px' }}>
          Upload a file containing sample questions to generate variants. Supported formats: .txt, .csv, .json
        </p>
        
        <button
          onClick={downloadSampleFormat}
          className="btn btn-secondary"
          style={{ marginBottom: '16px' }}
        >
          <Download size={16} />
          Download Sample Format
        </button>
      </div>

      {/* File Upload Area */}
      <div
        className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? '#3b82f6' : '#d1d5db'}`,
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragActive ? '#f0f9ff' : '#f8fafc',
          transition: 'all 0.2s',
          marginBottom: '24px'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.json"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        
        {uploadedFile ? (
          <div>
            <FileText size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
            <h3 style={{ color: '#374151', marginBottom: '8px' }}>{uploadedFile.name}</h3>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>
              {parsedQuestions.length} questions found
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                clearFile()
              }}
              className="btn btn-danger"
              style={{ padding: '8px 16px' }}
            >
              <X size={16} />
              Remove File
            </button>
          </div>
        ) : (
          <div>
            <Upload size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
            <h3 style={{ color: '#374151', marginBottom: '8px' }}>
              Drop your file here or click to browse
            </h3>
            <p style={{ color: '#64748b' }}>
              Supports .txt, .csv, and .json files
            </p>
          </div>
        )}
      </div>

      {/* Configuration */}
      {parsedQuestions.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div className="form-group">
            <label className="form-label">Number of Variants per Question</label>
            <input
              className="form-input"
              type="number"
              min="1"
              max="10"
              value={variantCount}
              onChange={(e) => setVariantCount(parseInt(e.target.value))}
              style={{ maxWidth: '200px' }}
            />
          </div>
        </div>
      )}

      {/* Preview */}
      {parsedQuestions.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Preview ({parsedQuestions.length} questions)</h3>
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto', 
            border: '1px solid #e2e8f0', 
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#f8fafc'
          }}>
            {parsedQuestions.slice(0, 3).map((q, index) => (
              <div key={index} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <p style={{ fontWeight: '500', marginBottom: '8px' }}>
                  {index + 1}. {q.question}
                </p>
                {q.options && q.options.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px', color: '#64748b' }}>
                    {q.options.map((option, optIndex) => (
                      <li key={optIndex}>
                        {String.fromCharCode(65 + optIndex)}. {option}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {parsedQuestions.length > 3 && (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>
                ... and {parsedQuestions.length - 3} more questions
              </p>
            )}
          </div>
        </div>
      )}

      {/* Generate Button */}
      {parsedQuestions.length > 0 && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={generateVariants}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '16px 32px', fontSize: '16px' }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></div>
                Generating Variants...
              </>
            ) : (
              <>
                <Zap size={16} />
                Generate {variantCount} Variants per Question
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}