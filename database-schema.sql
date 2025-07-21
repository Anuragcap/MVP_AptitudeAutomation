-- Supabase Database Schema for Aptitude Question Generator

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create topics table
CREATE TABLE topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subtopics table
CREATE TABLE subtopics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id),
  subtopic_id UUID REFERENCES subtopics(id),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of options
  correct_answer INTEGER NOT NULL, -- Index of correct option
  explanation TEXT,
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'moderate', 'hard')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create question_variants table
CREATE TABLE question_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  base_question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create question_sets table for batch operations
CREATE TABLE question_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  topic_id UUID REFERENCES topics(id),
  subtopic_id UUID REFERENCES subtopics(id),
  total_questions INTEGER DEFAULT 0,
  approved_questions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for questions in sets
CREATE TABLE question_set_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample topics and subtopics
INSERT INTO topics (name, description) VALUES
('Quantitative Aptitude', 'Mathematical and numerical reasoning questions'),
('Logical Reasoning', 'Logic-based problem solving questions'),
('Advanced Aptitude', 'Complex mathematical and analytical questions');

INSERT INTO subtopics (topic_id, name) VALUES
((SELECT id FROM topics WHERE name = 'Quantitative Aptitude'), 'Percentages'),
((SELECT id FROM topics WHERE name = 'Quantitative Aptitude'), 'Profit and Loss'),
((SELECT id FROM topics WHERE name = 'Quantitative Aptitude'), 'Simple Interest'),
((SELECT id FROM topics WHERE name = 'Quantitative Aptitude'), 'Compound Interest'),
((SELECT id FROM topics WHERE name = 'Quantitative Aptitude'), 'Time and Work'),
((SELECT id FROM topics WHERE name = 'Quantitative Aptitude'), 'Time and Distance'),
((SELECT id FROM topics WHERE name = 'Quantitative Aptitude'), 'Ratio and Proportion'),
((SELECT id FROM topics WHERE name = 'Quantitative Aptitude'), 'Mixtures and Alligations'),

((SELECT id FROM topics WHERE name = 'Logical Reasoning'), 'Blood Relations'),
((SELECT id FROM topics WHERE name = 'Logical Reasoning'), 'Direction Sense'),
((SELECT id FROM topics WHERE name = 'Logical Reasoning'), 'Coding-Decoding'),
((SELECT id FROM topics WHERE name = 'Logical Reasoning'), 'Puzzles'),
((SELECT id FROM topics WHERE name = 'Logical Reasoning'), 'Seating Arrangement'),
((SELECT id FROM topics WHERE name = 'Logical Reasoning'), 'Syllogisms'),
((SELECT id FROM topics WHERE name = 'Logical Reasoning'), 'Data Sufficiency'),

((SELECT id FROM topics WHERE name = 'Advanced Aptitude'), 'Probability'),
((SELECT id FROM topics WHERE name = 'Advanced Aptitude'), 'Permutations and Combinations'),
((SELECT id FROM topics WHERE name = 'Advanced Aptitude'), 'Number System'),
((SELECT id FROM topics WHERE name = 'Advanced Aptitude'), 'Geometry'),
((SELECT id FROM topics WHERE name = 'Advanced Aptitude'), 'Algebra'),
((SELECT id FROM topics WHERE name = 'Advanced Aptitude'), 'Trigonometry');

-- Enable Row Level Security
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_set_items ENABLE ROW LEVEL SECURITY;

-- Create policies for topics and subtopics (public read)
CREATE POLICY "Topics are viewable by everyone" ON topics FOR SELECT USING (true);
CREATE POLICY "Subtopics are viewable by everyone" ON subtopics FOR SELECT USING (true);

-- Create policies for questions (user-specific)
CREATE POLICY "Users can view their own questions" ON questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own questions" ON questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own questions" ON questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own questions" ON questions FOR DELETE USING (auth.uid() = user_id);

-- Create policies for question variants
CREATE POLICY "Users can view variants of their questions" ON question_variants FOR SELECT 
USING (EXISTS (SELECT 1 FROM questions WHERE questions.id = question_variants.base_question_id AND questions.user_id = auth.uid()));

CREATE POLICY "Users can insert variants for their questions" ON question_variants FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM questions WHERE questions.id = question_variants.base_question_id AND questions.user_id = auth.uid()));

-- Create policies for question sets
CREATE POLICY "Users can view their own question sets" ON question_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own question sets" ON question_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own question sets" ON question_sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own question sets" ON question_sets FOR DELETE USING (auth.uid() = user_id);

-- Create policies for question set items
CREATE POLICY "Users can view their question set items" ON question_set_items FOR SELECT 
USING (EXISTS (SELECT 1 FROM question_sets WHERE question_sets.id = question_set_items.question_set_id AND question_sets.user_id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_questions_user_id ON questions(user_id);
CREATE INDEX idx_questions_topic_subtopic ON questions(topic_id, subtopic_id);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_question_variants_base_id ON question_variants(base_question_id);
CREATE INDEX idx_question_sets_user_id ON question_sets(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for questions table
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();