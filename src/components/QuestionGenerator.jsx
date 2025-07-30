import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { Zap, Settings } from 'lucide-react'

// Mock data for topics and subtopics
const TOPICS = {
    'Quantitative Aptitude': [
        'Number Systems',
        'Percentages',
        'Profit and Loss',
        'Simple Interest',
        'Compound Interest',
        'Time and Work',
        'Time and Distance',
        'Ratio and Proportion',
        'Mixtures and Alligations'
    ],
    'Logical Reasoning': [
        'Blood Relations',
        'Direction Sense',
        'Coding-Decoding',
        'Puzzles',
        'Seating Arrangement',
        'Syllogisms',
        'Data Sufficiency'
    ],
    'Advanced Aptitude': [
        'Probability',
        'Permutations and Combinations',
        'Geometry',
        'Algebra',
        'Trigonometry'
    ]
}

export default function QuestionGenerator({ onQuestionsGenerated }) {
    const [formData, setFormData] = useState({
        topic: '',
        subtopic: '',
        questionCount: 5,
        easyCount: 2,
        moderateCount: 2,
        hardCount: 1,
        generateVariants: false,
        variantCount: 6
    })
    const [loading, setLoading] = useState(false)

    const handleInputChange = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value }
            
            // If total questions changed, adjust difficulty distribution
            if (field === 'questionCount') {
                const total = parseInt(value) || 0
                const currentSum = newData.easyCount + newData.moderateCount + newData.hardCount
                
                if (currentSum > total) {
                    // Proportionally reduce each difficulty to fit within total
                    const ratio = total / currentSum
                    newData.easyCount = Math.floor(newData.easyCount * ratio)
                    newData.moderateCount = Math.floor(newData.moderateCount * ratio)
                    newData.hardCount = Math.floor(newData.hardCount * ratio)
                    
                    // Distribute any remaining questions to maintain the total
                    const newSum = newData.easyCount + newData.moderateCount + newData.hardCount
                    const remaining = total - newSum
                    
                    if (remaining > 0) {
                        // Add remaining questions to easy first, then moderate, then hard
                        if (remaining >= 1 && newData.easyCount < total) newData.easyCount += Math.min(remaining, total - newData.easyCount)
                        const afterEasy = newData.easyCount + newData.moderateCount + newData.hardCount
                        if (total - afterEasy > 0 && newData.moderateCount < total) newData.moderateCount += Math.min(total - afterEasy, total - newData.moderateCount)
                        const afterModerate = newData.easyCount + newData.moderateCount + newData.hardCount
                        if (total - afterModerate > 0 && newData.hardCount < total) newData.hardCount += total - afterModerate
                    }
                }
            }
            
            // If difficulty count changed, ensure it doesn't exceed total and adjust others if needed
            if (['easyCount', 'moderateCount', 'hardCount'].includes(field)) {
                const total = newData.questionCount
                const newValue = Math.min(parseInt(value) || 0, total)
                newData[field] = newValue
                
                // Check if total exceeds limit and adjust other fields
                const currentSum = newData.easyCount + newData.moderateCount + newData.hardCount
                if (currentSum > total) {
                    const excess = currentSum - total
                    
                    // Reduce other difficulty levels proportionally
                    if (field !== 'easyCount' && newData.easyCount > 0) {
                        const reduceEasy = Math.min(excess, newData.easyCount)
                        newData.easyCount -= reduceEasy
                        const remaining = excess - reduceEasy
                        
                        if (remaining > 0 && field !== 'moderateCount' && newData.moderateCount > 0) {
                            const reduceModerate = Math.min(remaining, newData.moderateCount)
                            newData.moderateCount -= reduceModerate
                            const stillRemaining = remaining - reduceModerate
                            
                            if (stillRemaining > 0 && field !== 'hardCount') {
                                newData.hardCount -= Math.min(stillRemaining, newData.hardCount)
                            }
                        }
                    } else if (field !== 'moderateCount' && newData.moderateCount > 0) {
                        const reduceModerate = Math.min(excess, newData.moderateCount)
                        newData.moderateCount -= reduceModerate
                        const remaining = excess - reduceModerate
                        
                        if (remaining > 0 && field !== 'hardCount') {
                            newData.hardCount -= Math.min(remaining, newData.hardCount)
                        }
                    } else if (field !== 'hardCount') {
                        newData.hardCount -= Math.min(excess, newData.hardCount)
                    }
                }
            }
            
            return newData
        })
    }

    const generateQuestions = async () => {
        if (!formData.topic || !formData.subtopic) {
            toast.error('Please select topic and subtopic')
            return
        }

        setLoading(true)

        try {
            // Real OpenAI question generation
            const aiQuestions = await generateQuestionsWithAI(formData)
            onQuestionsGenerated(aiQuestions)
            toast.success(`Generated ${aiQuestions.length} questions successfully!`)
        } catch (error) {
            toast.error('Failed to generate questions')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    // Real OpenAI integration
    const generateQuestionsWithAI = async (config) => {
        const { OPENAI_API_KEY } = await import('../lib/supabase')
        
        if (!OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.')
        }

        const difficulties = [
            ...Array(config.easyCount).fill('easy'),
            ...Array(config.moderateCount).fill('moderate'),
            ...Array(config.hardCount).fill('hard')
        ]

        const prompt = `Generate ${config.questionCount} multiple choice questions for ${config.topic} - ${config.subtopic}.

Requirements:
- ${config.easyCount} easy questions
- ${config.moderateCount} moderate questions  
- ${config.hardCount} hard questions
- Each question should have exactly 4 options (A, B, C, D)
- Include detailed step-by-step explanations
- Questions should be suitable for aptitude tests and placement exams
- Focus on practical problem-solving scenarios

${config.generateVariants ? `Also generate ${config.variantCount} variants for each base question with different numbers/contexts but same concept.` : ''}

Return the response as a JSON array with this exact structure:
[
  {
    "difficulty": "easy|moderate|hard",
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed step-by-step explanation",
    "variants": [
      {
        "question": "Variant question text",
        "options": ["Variant A", "Variant B", "Variant C", "Variant D"],
        "correctAnswer": 0,
        "explanation": "Variant explanation"
      }
    ]
  }
]`

        try {
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
                            content: 'You are an expert aptitude question creator. Generate high-quality, accurate questions with proper explanations. Always return valid JSON.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 4000
                })
            })

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            const aiResponse = data.choices[0].message.content

            // Parse the JSON response
            let parsedQuestions
            try {
                // Clean the response in case it has markdown formatting
                const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim()
                parsedQuestions = JSON.parse(cleanedResponse)
            } catch (parseError) {
                console.error('Failed to parse AI response:', aiResponse)
                throw new Error('Invalid JSON response from AI')
            }

            // Transform AI response to our question format
            const allQuestions = []
            
            parsedQuestions.forEach((q, index) => {
                // Add base question
                const baseQuestion = {
                    id: `q_${Date.now()}_${index}`,
                    topic: config.topic,
                    subtopic: config.subtopic,
                    difficulty: q.difficulty,
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                    status: 'pending',
                    isStatusLocked: false,
                    isVariant: false,
                    baseQuestionId: null,
                    variantNumber: null
                }
                allQuestions.push(baseQuestion)
                
                // Add variants as separate reviewable questions
                if (q.variants && config.generateVariants) {
                    q.variants.forEach((v, vIndex) => {
                        const variantQuestion = {
                            id: `v_${Date.now()}_${index}_${vIndex}`,
                            topic: config.topic,
                            subtopic: config.subtopic,
                            difficulty: q.difficulty,
                            question: v.question,
                            options: v.options,
                            correctAnswer: v.correctAnswer,
                            explanation: v.explanation,
                            status: 'pending',
                            isStatusLocked: false,
                            isVariant: true,
                            baseQuestionId: baseQuestion.id,
                            variantNumber: vIndex + 1
                        }
                        allQuestions.push(variantQuestion)
                    })
                }
            })

            return allQuestions

        } catch (error) {
            console.error('OpenAI API Error:', error)
            throw new Error(`Failed to generate questions: ${error.message}`)
        }
    }

    return (
        <div className="card">
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} />
                Generate Questions
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div>
                    <div className="form-group">
                        <label className="form-label">Topic</label>
                        <select
                            className="form-select"
                            value={formData.topic}
                            onChange={(e) => handleInputChange('topic', e.target.value)}
                        >
                            <option value="">Select Topic</option>
                            {Object.keys(TOPICS).map(topic => (
                                <option key={topic} value={topic}>{topic}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Subtopic</label>
                        <select
                            className="form-select"
                            value={formData.subtopic}
                            onChange={(e) => handleInputChange('subtopic', e.target.value)}
                            disabled={!formData.topic}
                        >
                            <option value="">Select Subtopic</option>
                            {formData.topic && TOPICS[formData.topic].map(subtopic => (
                                <option key={subtopic} value={subtopic}>{subtopic}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Total Questions</label>
                        <input
                            className="form-input"
                            type="number"
                            min="1"
                            max="50"
                            value={formData.questionCount}
                            onChange={(e) => handleInputChange('questionCount', parseInt(e.target.value))}
                        />
                    </div>
                </div>

                <div>
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={16} />
                        Difficulty Distribution
                    </h3>

                    <div className="form-group">
                        <label className="form-label">Easy Questions</label>
                        <input
                            className="form-input"
                            type="number"
                            min="0"
                            value={formData.easyCount}
                            onChange={(e) => handleInputChange('easyCount', parseInt(e.target.value))}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Moderate Questions</label>
                        <input
                            className="form-input"
                            type="number"
                            min="0"
                            value={formData.moderateCount}
                            onChange={(e) => handleInputChange('moderateCount', parseInt(e.target.value))}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Hard Questions</label>
                        <input
                            className="form-input"
                            type="number"
                            min="0"
                            value={formData.hardCount}
                            onChange={(e) => handleInputChange('hardCount', parseInt(e.target.value))}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="checkbox"
                                checked={formData.generateVariants}
                                onChange={(e) => handleInputChange('generateVariants', e.target.checked)}
                            />
                            Generate Variants
                        </label>
                        {formData.generateVariants && (
                            <input
                                className="form-input"
                                type="number"
                                min="2"
                                max="25"
                                value={formData.variantCount}
                                onChange={(e) => handleInputChange('variantCount', parseInt(e.target.value))}
                                placeholder="Number of variants"
                                style={{ marginTop: '8px' }}
                            />
                        )}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center' }}>
                <button
                    onClick={generateQuestions}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ padding: '16px 32px', fontSize: '16px' }}
                >
                    {loading ? (
                        <>
                            <div className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></div>
                            Generating Questions...
                        </>
                    ) : (
                        <>
                            <Zap size={16} />
                            Generate Questions
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}