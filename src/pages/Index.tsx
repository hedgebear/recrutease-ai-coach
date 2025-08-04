import React, { useState } from 'react';
import { RecruitmentChat } from '@/components/RecruitmentChat';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Briefcase, Target, TrendingUp, Users } from 'lucide-react';
import heroImage from '@/assets/recruitment-ai-hero.jpg';

const Index = () => {
  const [apiKey, setApiKey] = useState<string>('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <img 
            src={heroImage} 
            alt="AI Recruitment Assistant" 
            className="w-full max-w-2xl mx-auto rounded-lg shadow-soft mb-6"
          />
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-4">
            AI Recruitment Assistant
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Get personalized strategies to land your dream job. Share a job description and receive expert recruitment advice powered by AI.
          </p>
          
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
            <Card className="p-6 text-center hover:shadow-soft transition-all duration-300">
              <Target className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Job Analysis</h3>
              <p className="text-sm text-muted-foreground">Deep analysis of job requirements and company needs</p>
            </Card>
            <Card className="p-6 text-center hover:shadow-soft transition-all duration-300">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Strategic Advice</h3>
              <p className="text-sm text-muted-foreground">Personalized strategies to stand out from other candidates</p>
            </Card>
            <Card className="p-6 text-center hover:shadow-soft transition-all duration-300">
              <Users className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Interview Prep</h3>
              <p className="text-sm text-muted-foreground">Expert tips for networking and interview success</p>
            </Card>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="max-w-6xl mx-auto">
          <RecruitmentChat 
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-muted-foreground">
          <p className="text-sm">
            Powered by AI • Secure • Your data stays private
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
