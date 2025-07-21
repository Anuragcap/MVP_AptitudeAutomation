# Aptitude Question Generator MVP

An AI-powered platform for creating, reviewing, and managing aptitude questions with automated variant generation. Built with React and Supabase.

## Features

- **AI Question Generation**: Generate questions from topics and subtopics using OpenAI GPT
- **Difficulty Management**: Create questions with easy, moderate, and hard difficulty levels
- **Variant Creation**: Automatically generate multiple variants of base questions
- **Review Workflow**: Approve, reject, or regenerate questions with detailed review interface
- **Export Functionality**: Export approved questions to CSV/Google Sheets format
- **User Authentication**: Secure login and user management
- **Real-time Updates**: Live status tracking and progress monitoring

## Tech Stack

- **Frontend**: React 18, Vite
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **AI Integration**: OpenAI GPT-4 API
- **Styling**: Custom CSS with modern design
- **Icons**: Lucide React

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Supabase account
- OpenAI API key

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your project URL and anon key
3. Go to SQL Editor and run the schema from `database-schema.sql`
4. Enable email authentication in Authentication → Settings

### 3. Environment Configuration

1. Update `src/lib/supabase.js` with your Supabase credentials:
```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'
export const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY'
```

### 4. Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage Guide

### 1. Authentication
- Sign up with email/password
- Sign in to access the dashboard

### 2. Generate Questions
- Select topic and subtopic from dropdowns
- Set question count and difficulty distribution
- Optionally enable variant generation
- Click "Generate Questions" to create content

### 3. Review Questions
- Review generated questions one by one
- Approve, reject, or regenerate individual questions
- View detailed explanations and variants
- Track progress with status counters

### 4. Export Results
- Export approved questions to CSV format
- Compatible with Google Sheets import
- Includes all question data and metadata

## Project Structure

```
src/
├── components/
│   ├── Auth.jsx              # Authentication component
│   ├── Dashboard.jsx         # Main dashboard with tabs
│   ├── QuestionGenerator.jsx # Question generation form
│   └── QuestionReview.jsx    # Question review interface
├── lib/
│   └── supabase.js          # Supabase configuration
├── App.jsx                  # Main app component
├── main.jsx                 # React entry point
└── index.css               # Global styles
```

## Database Schema

The application uses the following main tables:
- `topics` - Question topics (Quantitative, Logical, Advanced)
- `subtopics` - Specific subtopics within each topic
- `questions` - Generated questions with metadata
- `question_variants` - Variants of base questions
- `question_sets` - Grouped question collections

## API Integration

### OpenAI Integration
The app integrates with OpenAI GPT-4 for:
- Base question generation from topic/subtopic
- Variant creation with numerical/contextual changes
- Explanation generation aligned with teaching methodology

### Current Implementation
- Mock question generation for development
- Replace `generateMockQuestions()` with actual OpenAI API calls
- Add proper error handling and rate limiting

## Customization

### Adding New Topics
1. Update the `TOPICS` object in `QuestionGenerator.jsx`
2. Add corresponding entries to the database via SQL

### Modifying Question Format
- Update the question object structure in generation functions
- Modify the review interface to match new fields
- Update export format accordingly

### Styling Changes
- Modify `src/index.css` for global styles
- Component-specific styles are inline for simplicity
- Consider moving to CSS modules for larger applications

## Production Considerations

### Security
- Implement proper API key management (environment variables)
- Add rate limiting for AI API calls
- Validate user inputs and sanitize data

### Performance
- Add caching for frequently accessed topics/subtopics
- Implement pagination for large question sets
- Optimize database queries with proper indexing

### Monitoring
- Add error tracking (Sentry, LogRocket)
- Implement usage analytics
- Monitor AI API costs and usage

## Future Enhancements

- **Bulk Operations**: Import questions from existing materials
- **Advanced Analytics**: Question performance metrics
- **Collaboration**: Multi-user review workflows
- **Integration**: LMS and assessment platform connectors
- **Mobile App**: React Native version for mobile access

## Support

For issues and questions:
1. Check the database schema is properly set up
2. Verify Supabase and OpenAI API credentials
3. Review browser console for error messages
4. Ensure all dependencies are installed correctly

## License

This project is built for internal use at NxtWave EdTech. All rights reserved.