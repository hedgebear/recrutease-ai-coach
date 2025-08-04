import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Send, Bot, User, Briefcase, Settings } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface RecruitmentChatProps {
  apiKey?: string;
  onApiKeyChange?: (key: string) => void;
}

export const RecruitmentChat: React.FC<RecruitmentChatProps> = ({ 
  apiKey, 
  onApiKeyChange 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your AI recruitment specialist. Share a job description with me, and I'll provide you with the best strategies to get hired. What position are you interested in?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKey);
  const [tempApiKey, setTempApiKey] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateRecruitmentResponse = async (userMessage: string): Promise<string> => {
    if (!apiKey) {
      return "Please configure your OpenAI API key to start getting personalized recruitment advice.";
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are an expert recruitment specialist and career advisor. Your role is to analyze job descriptions and provide actionable strategies to help candidates get hired. 

When a user shares a job description, provide:
1. Key requirements analysis
2. Skills gap identification
3. Resume optimization strategies
4. Interview preparation tips
5. Networking strategies
6. Company research recommendations
7. Application timing advice

Keep responses practical, actionable, and encouraging. Focus on concrete steps the candidate can take.`
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
    } catch (error) {
      console.error('Error generating response:', error);
      return "I'm experiencing technical difficulties. Please check your API key and try again.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const aiResponse = await generateRecruitmentResponse(userMessage.content);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiKeySubmit = () => {
    if (tempApiKey.trim()) {
      onApiKeyChange?.(tempApiKey.trim());
      setShowApiKeyInput(false);
      toast({
        title: "Success",
        description: "API key configured successfully!"
      });
    }
  };

  if (showApiKeyInput) {
    return (
      <Card className="w-full max-w-md mx-auto p-6 animate-slide-up">
        <div className="text-center mb-6">
          <Briefcase className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">AI Recruitment Assistant</h2>
          <p className="text-muted-foreground">Configure your OpenAI API key to get started</p>
        </div>
        <div className="space-y-4">
          <Input
            type="password"
            placeholder="Enter your OpenAI API key"
            value={tempApiKey}
            onChange={(e) => setTempApiKey(e.target.value)}
            className="w-full"
          />
          <Button 
            onClick={handleApiKeySubmit}
            className="w-full"
            disabled={!tempApiKey.trim()}
          >
            Start Chatting
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Your API key is stored locally and never shared
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-[600px] w-full max-w-4xl mx-auto border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6" />
            <div>
              <h2 className="font-semibold">AI Recruitment Specialist</h2>
              <p className="text-sm opacity-90">Get hired with expert strategies</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowApiKeyInput(true)}
            className="text-primary-foreground hover:bg-white/10"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/20">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 animate-slide-up ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.sender === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div
              className={`max-w-[80%] p-3 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md ${
                message.sender === 'user'
                  ? 'bg-chat-user text-chat-user-foreground'
                  : 'bg-chat-ai text-chat-ai-foreground border'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              <span className="text-xs opacity-60 mt-2 block">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {message.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start animate-slide-up">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-chat-ai text-chat-ai-foreground p-3 rounded-lg border">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-typing"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-typing" style={{ animationDelay: '0.3s' }}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-typing" style={{ animationDelay: '0.6s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a job description or ask for recruitment advice..."
            disabled={isLoading}
            className="flex-1 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="animate-pulse-glow"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};