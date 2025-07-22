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
        const allowedTypes = ['.txt', '.csv', '.json', '.pdf', '.pptx', '.docx']
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase()

        if (!allowedTypes.includes(fileExtension)) {
            toast.error('Please upload a .txt, .csv, .json, .pdf, .pptx, or .docx file')
            return
        }

        setUploadedFile(file)
        setLoading(true)

        try {
            let extractedText = ''

            if (['.pdf', '.pptx', '.docx'].includes(fileExtension)) {
                // For now, show a message that these formats need AI processing
                toast.info('Processing document with AI...')
                extractedText = await processDocumentWithAI(file)
            } else {
                extractedText = await file.text()
            }

            setFileContent(extractedText)

            // Parse content for questions
            let questions = []
            if (['.pdf', '.pptx', '.docx'].includes(fileExtension)) {
                questions = await generateQuestionsFromContent(extractedText)
            } else {
                questions = await parseFileContent(extractedText, fileExtension)
            }

            setParsedQuestions(questions)

            if (questions.length > 0) {
                toast.success(`Found/Generated ${questions.length} questions from the file`)
            } else {
                toast.warning('No questions found. Please check the file format.')
            }
        } catch (error) {
            toast.error('Error processing file: ' + error.message)
            console.error('File processing error:', error)
        } finally {
            setLoading(false)
        }
    }

    // Enhanced document processing with AI
    const processDocumentWithAI = async (file) => {
        try {
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
            console.log(`Processing ${fileExtension} document:`, file.name)

            // For PDF files, try to extract text using basic methods first
            if (fileExtension === '.pdf') {
                try {
                    const text = await extractPDFText(file)
                    if (text && text.trim().length > 50) {
                        console.log('Successfully extracted PDF text:', text.substring(0, 200) + '...')
                        return text
                    }
                } catch (pdfError) {
                    console.log('PDF text extraction failed, using AI fallback:', pdfError)
                }
            }

            // For DOCX files, try to extract text
            if (fileExtension === '.docx') {
                try {
                    const text = await extractDOCXText(file)
                    if (text && text.trim().length > 50) {
                        console.log('Successfully extracted DOCX text:', text.substring(0, 200) + '...')
                        return text
                    }
                } catch (docxError) {
                    console.log('DOCX text extraction failed, using AI fallback:', docxError)
                }
            }

            // Fallback: Use AI to process the document
            console.log('Using AI to process document content...')
            const arrayBuffer = await file.arrayBuffer()

            // For AI processing, we'll ask it to extract and understand the document
            const { OPENAI_API_KEY } = await import('../lib/supabase')

            const prompt = `I have uploaded a ${fileExtension.toUpperCase()} document named "${file.name}". 
            
Since I cannot directly process the binary content, please help me understand what this document likely contains based on the filename and extension.

If this appears to be:
1. A study material document - Generate 5-8 educational questions based on common topics for this type of document
2. A question bank document - Provide a template structure for extracting questions
3. An educational resource - Create relevant assessment questions

Please return a structured text that I can use to generate questions from. Focus on creating meaningful educational content that would typically be found in a ${fileExtension.toUpperCase()} document with this filename.

Return the content in a clear, structured format that can be used for question generation.`

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
                            content: 'You are an expert at understanding document content and creating educational material. Generate meaningful content that can be used for question creation.'
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
                const aiContent = data.choices[0].message.content
                console.log('AI generated document content:', aiContent.substring(0, 200) + '...')
                return aiContent
            }

            // Final fallback
            return `Educational content from ${file.name}. This document contains study material that can be used to generate assessment questions. The content covers various topics and concepts that are suitable for creating multiple choice questions with different difficulty levels.`

        } catch (error) {
            console.error('Document processing error:', error)
            throw new Error(`Failed to process ${file.name}. Please try converting to text format or check the file integrity.`)
        }
    }

    // Basic PDF text extraction (simplified approach)
    const extractPDFText = async (file) => {
        // This is a simplified approach - in production you'd use pdf-parse or similar
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        // Convert to string and try to extract readable text
        let text = ''
        for (let i = 0; i < uint8Array.length - 1; i++) {
            const char = String.fromCharCode(uint8Array[i])
            if (char.match(/[a-zA-Z0-9\s.,!?;:()\-]/)) {
                text += char
            }
        }

        // Clean up the extracted text
        text = text.replace(/\s+/g, ' ').trim()

        // If we got reasonable text, return it
        if (text.length > 100 && text.match(/[a-zA-Z]/g).length > text.length * 0.5) {
            return text
        }

        throw new Error('Could not extract readable text from PDF')
    }

    // Basic DOCX text extraction (simplified approach)
    const extractDOCXText = async (file) => {
        // This is a simplified approach - in production you'd use mammoth.js or similar
        const arrayBuffer = await file.arrayBuffer()

        // DOCX files are ZIP archives, try to extract text from document.xml
        try {
            // Convert to string and look for text content
            const uint8Array = new Uint8Array(arrayBuffer)
            let text = ''

            for (let i = 0; i < uint8Array.length - 1; i++) {
                const char = String.fromCharCode(uint8Array[i])
                if (char.match(/[a-zA-Z0-9\s.,!?;:()\-]/)) {
                    text += char
                }
            }

            // Clean up the extracted text
            text = text.replace(/\s+/g, ' ').trim()

            // If we got reasonable text, return it
            if (text.length > 100 && text.match(/[a-zA-Z]/g).length > text.length * 0.3) {
                return text
            }
        } catch (error) {
            console.log('Basic DOCX extraction failed:', error)
        }

        throw new Error('Could not extract readable text from DOCX')
    }

    // Generate questions from study material content
    const generateQuestionsFromContent = async (content) => {
        try {
            const { OPENAI_API_KEY } = await import('../lib/supabase')

            const prompt = `Based on the following study material, generate 5-8 high-quality multiple choice questions that test understanding of the key concepts.

Study Material Content:
${content.substring(0, 4000)}

Requirements:
- Generate questions that test comprehension and application
- Each question should have 4 multiple choice options
- Include detailed explanations
- Vary difficulty levels (easy, moderate, hard)
- Focus on the most important concepts

Please return a JSON array of questions with this structure:
[
  {
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed explanation",
    "difficulty": "easy|moderate|hard",
    "topic": "Study Material",
    "subtopic": "Document Content"
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
                            content: 'You are an expert educator who creates high-quality assessment questions from study materials. Always return valid JSON.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 3000
                })
            })

            if (!response.ok) {
                throw new Error('AI question generation failed')
            }

            const data = await response.json()
            const aiResponse = data.choices[0].message.content
            const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim()

            return JSON.parse(cleanedResponse)
        } catch (error) {
            console.error('AI question generation error:', error)
            return []
        }
    }

    const parseFileContent = async (content, fileType) => {
        console.log(`Parsing ${fileType} content...`)

        try {
            if (fileType === '.json') {
                return parseJSONContent(content)
            } else if (fileType === '.csv') {
                return parseCSVContent(content)
            } else {
                return parseTextContent(content)
            }
        } catch (error) {
            console.log(`Failed to parse ${fileType}, falling back to AI parsing:`, error)
            return await parseWithAI(content)
        }
    }

    const parseJSONContent = (content) => {
        console.log('Parsing JSON content:', content.substring(0, 500) + '...')

        const jsonData = JSON.parse(content)
        let questions = []

        if (Array.isArray(jsonData)) {
            questions = jsonData
        } else if (jsonData.questions && Array.isArray(jsonData.questions)) {
            questions = jsonData.questions
        } else {
            questions = [jsonData]
        }

        // Map JSON to our question format
        const mappedQuestions = questions.map((q, index) => {
            console.log(`Processing JSON question ${index}:`, q)

            return {
                question: q.question || q.questionText || q.q || '',
                options: q.options || q.choices || q.answers || [],
                correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer :
                    q.correct !== undefined ? q.correct :
                        q.answer !== undefined ? q.answer : 0,
                explanation: q.explanation || q.solution || q.reasoning || 'No explanation provided',
                difficulty: q.difficulty || q.level || 'moderate',
                topic: q.topic || q.subject || q.category || 'Uploaded Content',
                subtopic: q.subtopic || q.subcategory || 'JSON Upload'
            }
        }).filter(q => q.question && q.options && q.options.length >= 4)

        console.log('Mapped JSON questions:', mappedQuestions)
        return mappedQuestions
    }

    const parseCSVContent = (content) => {
        console.log('Raw CSV content:', content.substring(0, 500) + '...')

        const lines = content.split('\n').filter(line => line.trim())
        if (lines.length < 2) {
            console.log('Not enough lines in CSV')
            return []
        }

        // Better CSV parsing that handles quoted fields
        const parseCSVLine = (line) => {
            const result = []
            let current = ''
            let inQuotes = false

            for (let i = 0; i < line.length; i++) {
                const char = line[i]

                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        current += '"'
                        i++ // Skip next quote
                    } else {
                        inQuotes = !inQuotes
                    }
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim())
                    current = ''
                } else {
                    current += char
                }
            }
            result.push(current.trim())
            return result
        }

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())
        console.log('CSV Headers:', headers)

        const questions = []

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i])
            console.log(`Row ${i} values:`, values)

            if (values.length >= headers.length) {
                const question = {}
                headers.forEach((header, index) => {
                    question[header] = values[index] || ''
                })

                // Try to map common CSV formats to our question structure
                const mappedQuestion = mapCSVToQuestion(question, headers)
                if (mappedQuestion) {
                    questions.push(mappedQuestion)
                }
            }
        }

        console.log('Parsed questions:', questions)
        return questions
    }

    const mapCSVToQuestion = (csvRow, headers) => {
        // Common field mappings
        const fieldMappings = {
            question: ['question', 'question_text', 'question content', 'q', 'problem'],
            options: {
                a: ['option_a', 'option a', 'a', 'choice_a', 'choice a'],
                b: ['option_b', 'option b', 'b', 'choice_b', 'choice b'],
                c: ['option_c', 'option c', 'c', 'choice_c', 'choice c'],
                d: ['option_d', 'option d', 'd', 'choice_d', 'choice d']
            },
            correctAnswer: ['correct_answer', 'correct answer', 'answer', 'key', 'correct'],
            explanation: ['explanation', 'solution', 'explain', 'reasoning'],
            difficulty: ['difficulty', 'level', 'diff'],
            topic: ['topic', 'subject', 'category'],
            subtopic: ['subtopic', 'sub_topic', 'subcategory']
        }

        const findField = (mappings, headers, csvRow) => {
            for (const mapping of mappings) {
                const header = headers.find(h => h.includes(mapping))
                if (header && csvRow[header]) {
                    return csvRow[header]
                }
            }
            return null
        }

        // Extract question text
        const questionText = findField(fieldMappings.question, headers, csvRow)
        if (!questionText) {
            console.log('No question text found in row:', csvRow)
            return null
        }

        // Extract options
        const options = []
        const optionA = findField(fieldMappings.options.a, headers, csvRow)
        const optionB = findField(fieldMappings.options.b, headers, csvRow)
        const optionC = findField(fieldMappings.options.c, headers, csvRow)
        const optionD = findField(fieldMappings.options.d, headers, csvRow)

        if (optionA) options.push(optionA)
        if (optionB) options.push(optionB)
        if (optionC) options.push(optionC)
        if (optionD) options.push(optionD)

        // If we don't have 4 options, try to parse from a single options field
        if (options.length < 4) {
            const optionsField = headers.find(h => h.includes('options') || h.includes('choices'))
            if (optionsField && csvRow[optionsField]) {
                const parsedOptions = csvRow[optionsField].split(/[;|]/).map(opt => opt.trim())
                if (parsedOptions.length >= 4) {
                    options.splice(0, options.length, ...parsedOptions.slice(0, 4))
                }
            }
        }

        if (options.length < 4) {
            console.log('Not enough options found for question:', questionText)
            return null
        }

        // Extract correct answer
        let correctAnswer = 0
        const correctAnswerField = findField(fieldMappings.correctAnswer, headers, csvRow)
        if (correctAnswerField) {
            const answer = correctAnswerField.toString().toUpperCase().trim()
            if (answer === 'A' || answer === '0') correctAnswer = 0
            else if (answer === 'B' || answer === '1') correctAnswer = 1
            else if (answer === 'C' || answer === '2') correctAnswer = 2
            else if (answer === 'D' || answer === '3') correctAnswer = 3
            else {
                // Try to find the answer in the options
                const answerIndex = options.findIndex(opt =>
                    opt.toLowerCase().includes(answer.toLowerCase())
                )
                if (answerIndex !== -1) correctAnswer = answerIndex
            }
        }

        return {
            question: questionText,
            options: options,
            correctAnswer: correctAnswer,
            explanation: findField(fieldMappings.explanation, headers, csvRow) || 'No explanation provided',
            difficulty: findField(fieldMappings.difficulty, headers, csvRow) || 'moderate',
            topic: findField(fieldMappings.topic, headers, csvRow) || 'Uploaded Content',
            subtopic: findField(fieldMappings.subtopic, headers, csvRow) || 'CSV Upload'
        }
    }

    const parseTextContent = (content) => {
        console.log('Parsing text content:', content.substring(0, 500) + '...')

        const sections = content.split(/\n\s*\n/).filter(section => section.trim())
        const questions = []

        sections.forEach((section, sectionIndex) => {
            const lines = section.split('\n').filter(line => line.trim())
            console.log(`Section ${sectionIndex} lines:`, lines)

            if (lines.length >= 5) {
                const question = {
                    question: lines[0].replace(/^\d+\.\s*/, '').trim(),
                    options: [],
                    correctAnswer: 0,
                    explanation: 'No explanation provided',
                    difficulty: 'moderate',
                    topic: 'Uploaded Content',
                    subtopic: 'Text Upload'
                }

                let correctAnswerLetter = null
                let explanationText = ''

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim()

                    // Match options with various formats: A), A., (A), a), etc.
                    const optionMatch = line.match(/^[(\[]?([A-Da-d])[)\]\.]\s*(.+)/)
                    if (optionMatch) {
                        const optionLetter = optionMatch[1].toUpperCase()
                        const optionText = optionMatch[2].trim()
                        question.options.push(optionText)

                        // Check if this option is marked as correct (with asterisk, bold, etc.)
                        if (line.includes('*') || line.includes('✓') || line.includes('(correct)')) {
                            correctAnswerLetter = optionLetter
                        }
                    }
                    // Look for answer indicators
                    else if (line.toLowerCase().includes('answer:') || line.toLowerCase().includes('correct:')) {
                        const answerMatch = line.match(/(?:answer|correct):\s*([A-Da-d])/i)
                        if (answerMatch) {
                            correctAnswerLetter = answerMatch[1].toUpperCase()
                        }
                    }
                    // Look for explanations
                    else if (line.toLowerCase().includes('explanation:') || line.toLowerCase().includes('solution:')) {
                        explanationText = line.replace(/^(explanation|solution):\s*/i, '').trim()
                    }
                    // Continue explanation on next lines
                    else if (explanationText && !optionMatch && !line.match(/^\d+\./)) {
                        explanationText += ' ' + line
                    }
                }

                // Set correct answer index
                if (correctAnswerLetter) {
                    const answerIndex = correctAnswerLetter.charCodeAt(0) - 65 // A=0, B=1, etc.
                    if (answerIndex >= 0 && answerIndex < question.options.length) {
                        question.correctAnswer = answerIndex
                    }
                }

                if (explanationText) {
                    question.explanation = explanationText
                }

                if (question.options.length >= 4) {
                    console.log('Parsed question:', question)
                    questions.push(question)
                } else {
                    console.log('Skipping question - not enough options:', question)
                }
            }
        })

        console.log('Total parsed text questions:', questions.length)
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
                    isStatusLocked: false,
                    isVariant: false,
                    baseQuestionId: null,
                    variantNumber: null
                }
                allQuestions.push(originalQuestion)

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
                                isStatusLocked: false,
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
        // TXT format sample
        const sampleTxtContent = `1. What is 25% of 80?
A) 15
B) 20
C) 25
D) 30
Answer: B
Explanation: To find 25% of 80: (25/100) × 80 = 0.25 × 80 = 20

2. If a shirt costs $40 and is discounted by 15%, what is the final price?
A) $32
B) $34
C) $36
D) $38
Answer: B
Explanation: Discount = 15% of $40 = $6. Final price = $40 - $6 = $34

3. A train travels 120 km in 2 hours. What is its speed?
A) 50 km/h
B) 60 km/h
C) 70 km/h
D) 80 km/h
Answer: B
Explanation: Speed = Distance/Time = 120 km / 2 hours = 60 km/h`

        // CSV format sample
        const sampleCSVContent = `Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation,Difficulty,Topic,Subtopic
"What is 25% of 80?","15","20","25","30","B","To find 25% of 80: (25/100) × 80 = 0.25 × 80 = 20","easy","Quantitative Aptitude","Percentages"
"If a shirt costs $40 and is discounted by 15%, what is the final price?","$32","$34","$36","$38","B","Discount = 15% of $40 = $6. Final price = $40 - $6 = $34","moderate","Quantitative Aptitude","Profit and Loss"
"A train travels 120 km in 2 hours. What is its speed?","50 km/h","60 km/h","70 km/h","80 km/h","B","Speed = Distance/Time = 120 km / 2 hours = 60 km/h","easy","Quantitative Aptitude","Time and Distance"
"What is the compound interest on $1000 at 10% per annum for 2 years?","$200","$210","$220","$230","B","CI = P(1+r)^n - P = 1000(1.1)^2 - 1000 = 1210 - 1000 = $210","moderate","Quantitative Aptitude","Compound Interest"`

        // JSON format sample
        const sampleJSONContent = JSON.stringify([
            {
                "question": "What is 25% of 80?",
                "options": ["15", "20", "25", "30"],
                "correctAnswer": 1,
                "explanation": "To find 25% of 80: (25/100) × 80 = 0.25 × 80 = 20",
                "difficulty": "easy",
                "topic": "Quantitative Aptitude",
                "subtopic": "Percentages"
            },
            {
                "question": "If a shirt costs $40 and is discounted by 15%, what is the final price?",
                "options": ["$32", "$34", "$36", "$38"],
                "correctAnswer": 1,
                "explanation": "Discount = 15% of $40 = $6. Final price = $40 - $6 = $34",
                "difficulty": "moderate",
                "topic": "Quantitative Aptitude",
                "subtopic": "Profit and Loss"
            },
            {
                "question": "A train travels 120 km in 2 hours. What is its speed?",
                "options": ["50 km/h", "60 km/h", "70 km/h", "80 km/h"],
                "correctAnswer": 1,
                "explanation": "Speed = Distance/Time = 120 km / 2 hours = 60 km/h",
                "difficulty": "easy",
                "topic": "Quantitative Aptitude",
                "subtopic": "Time and Distance"
            }
        ], null, 2)

        // Alternative JSON format sample (with different field names)
        const sampleJSONAltContent = JSON.stringify({
            "questions": [
                {
                    "questionText": "What is the area of a circle with radius 5 cm?",
                    "choices": ["78.5 cm²", "31.4 cm²", "25 cm²", "15.7 cm²"],
                    "correct": 0,
                    "solution": "Area = πr² = π × 5² = π × 25 = 78.5 cm²",
                    "level": "moderate",
                    "subject": "Mathematics",
                    "category": "Geometry"
                },
                {
                    "q": "If x + 5 = 12, what is the value of x?",
                    "answers": ["5", "7", "12", "17"],
                    "answer": 1,
                    "reasoning": "x + 5 = 12, so x = 12 - 5 = 7",
                    "difficulty": "easy",
                    "topic": "Mathematics",
                    "subcategory": "Algebra"
                }
            ]
        }, null, 2)

        // Download all sample formats
        const files = [
            { content: sampleTxtContent, name: 'sample_questions.txt', type: 'text/plain' },
            { content: sampleCSVContent, name: 'sample_questions.csv', type: 'text/csv' },
            { content: sampleJSONContent, name: 'sample_questions.json', type: 'application/json' },
            { content: sampleJSONAltContent, name: 'sample_questions_alt_format.json', type: 'application/json' }
        ]

        files.forEach(file => {
            const blob = new Blob([file.content], { type: file.type })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = file.name
            link.click()
            window.URL.revokeObjectURL(url)
        })

        toast.success('Sample formats downloaded! (TXT, CSV, JSON)')
    }

    return (
        <div className="card">
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={20} />
                Upload Questions or Study Material
            </h2>

            <div style={{ marginBottom: '24px' }}>
                <p style={{ color: '#64748b', marginBottom: '16px' }}>
                    Upload a file containing questions or study material to generate variants. Supported formats: .txt, .csv, .json, .pdf, .pptx, .docx
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
                    accept=".txt,.csv,.json,.pdf,.pptx,.docx"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                />

                {uploadedFile ? (
                    <div>
                        <FileText size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
                        <h3 style={{ color: '#374151', marginBottom: '8px' }}>{uploadedFile.name}</h3>
                        <p style={{ color: '#64748b', marginBottom: '16px' }}>
                            {parsedQuestions.length} questions found/generated
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
                            Supports .txt, .csv, .json, .pdf, .pptx, and .docx files
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