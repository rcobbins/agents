import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { ProjectAssistant, AssistantMessage, AssistantContext as AIContext } from '../utils/aiAssistant';
import { analyzePageContent, PageContext } from '../utils/pageContextAnalyzer';

interface AIAssistantContextType {
  assistant: ProjectAssistant;
  messages: Map<string, AssistantMessage[]>;
  currentPageMessages: AssistantMessage[];
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  unreadCount: number;
  pageContext: PageContext;
  sendMessage: (message: string) => Promise<void>;
  clearPageHistory: () => void;
  getQuickPrompts: () => string[];
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export const useAIAssistant = () => {
  const context = useContext(AIAssistantContext);
  if (!context) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
};

interface AIAssistantProviderProps {
  children: ReactNode;
}

export const AIAssistantProvider: React.FC<AIAssistantProviderProps> = ({ children }) => {
  const location = useLocation();
  const [assistant] = useState(() => new ProjectAssistant());
  const [messages, setMessages] = useState<Map<string, AssistantMessage[]>>(new Map());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pageContext, setPageContext] = useState<PageContext>({
    pageName: 'Dashboard',
    pageType: 'dashboard',
    currentPath: '/',
    hasProject: false,
    projectId: null,
    pageData: {},
  });

  // Get current page messages
  const currentPageMessages = messages.get(location.pathname) || [];

  // Update page context when location changes
  useEffect(() => {
    const context = analyzePageContent(location.pathname, document.body);
    setPageContext(context);

    // Update assistant context with page information
    assistant.updateContext({
      currentPage: context.pageName,
      pageType: context.pageType,
      projectId: context.projectId,
      ...context.pageData,
    } as any);

    // Initialize page messages if not exists
    if (!messages.has(location.pathname)) {
      const greeting = getPageGreeting(context);
      const initialMessage: AssistantMessage = {
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      };
      setMessages(prev => {
        const newMap = new Map(prev);
        newMap.set(location.pathname, [initialMessage]);
        return newMap;
      });
    }

    // Reset unread count when page changes
    setUnreadCount(0);
  }, [location.pathname, assistant]);

  // Track unread messages
  useEffect(() => {
    if (!expanded && currentPageMessages.length > 0) {
      const lastMessage = currentPageMessages[currentPageMessages.length - 1];
      if (lastMessage.role === 'assistant') {
        setUnreadCount(prev => prev + 1);
      }
    }
    if (expanded) {
      setUnreadCount(0);
    }
  }, [currentPageMessages, expanded]);

  // Get page-specific greeting
  const getPageGreeting = (context: PageContext): string => {
    const greetings: Record<string, string> = {
      dashboard: "👋 Welcome! I can help you manage projects, understand agent status, and navigate the platform. What would you like to know?",
      projectInit: "🚀 Let's create something amazing! I'll help you set up your project with the right technologies and best practices.",
      projectDetail: "📊 I'm here to help you understand your project status, manage agents, and track progress. What can I assist with?",
      agentMonitor: "🤖 I can help you monitor agents, debug issues, and optimize performance. What's happening with your agents?",
      agentThoughts: "🧠 Let's explore what your agents are thinking! I can help you understand their decisions and debug issues.",
      workQueue: "📋 I'll help you manage tasks, prioritize work, and identify blockers. What needs attention?",
      messageFlow: "📨 I can analyze message patterns, identify bottlenecks, and optimize agent communication. What would you like to explore?",
      codeChanges: "💻 I'm here to help review code changes, understand modifications, and ensure quality. What should we look at?",
      testResults: "✅ Let's analyze test results, improve coverage, and fix failures. What testing concerns do you have?",
      analytics: "📈 I'll help you understand metrics, identify trends, and gain insights. What data interests you?",
      settings: "⚙️ I can help you configure the platform, optimize settings, and customize your experience. What would you like to adjust?",
    };

    return greetings[context.pageType] || "👋 Hi! I'm your AI assistant. I'm here to help you with this page. What can I do for you?";
  };

  // Get page-specific quick prompts
  const getQuickPrompts = useCallback((): string[] => {
    const prompts: Record<string, string[]> = {
      dashboard: [
        "Show project status",
        "Explain agent states",
        "What's failing?",
        "Create new project",
        "Best practices",
      ],
      projectInit: [
        "Suggest tech stack",
        "What template to use?",
        "Explain architecture",
        "Testing strategy",
        "Project goals help",
      ],
      projectDetail: [
        "Project health check",
        "Agent performance",
        "Recent changes",
        "Task progress",
        "What's blocking?",
      ],
      agentMonitor: [
        "Why is agent stuck?",
        "Restart failed agents",
        "Performance issues",
        "Check agent logs",
        "Agent best practices",
      ],
      agentThoughts: [
        "Explain this decision",
        "Why this approach?",
        "Debug agent logic",
        "Find patterns",
        "Agent behavior",
      ],
      workQueue: [
        "Prioritize tasks",
        "Find blockers",
        "Task dependencies",
        "Workload balance",
        "Clear backlog",
      ],
      messageFlow: [
        "Communication issues",
        "Message bottlenecks",
        "Agent coordination",
        "Flow optimization",
        "Debug messages",
      ],
      codeChanges: [
        "Review this change",
        "Impact analysis",
        "Refactor suggestions",
        "Code quality",
        "Revert changes?",
      ],
      testResults: [
        "Why tests failed?",
        "Improve coverage",
        "Test strategies",
        "Fix failures",
        "Performance tests",
      ],
      analytics: [
        "Explain this metric",
        "Show trends",
        "Performance insights",
        "Identify issues",
        "Success metrics",
      ],
      settings: [
        "Recommended settings",
        "Performance tuning",
        "Security config",
        "Integration help",
        "Reset defaults",
      ],
    };

    return prompts[pageContext.pageType] || [
      "Help with this page",
      "Explain features",
      "Best practices",
      "Show tips",
      "What can I do here?",
    ];
  }, [pageContext.pageType]);

  // Send message to assistant
  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: AssistantMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    // Add user message to current page
    setMessages(prev => {
      const newMap = new Map(prev);
      const pageMessages = newMap.get(location.pathname) || [];
      newMap.set(location.pathname, [...pageMessages, userMessage]);
      return newMap;
    });

    setInput('');
    setLoading(true);

    try {
      // Process message with page context
      const response = await assistant.processMessage(message, pageContext);
      
      // Add assistant response to current page
      setMessages(prev => {
        const newMap = new Map(prev);
        const pageMessages = newMap.get(location.pathname) || [];
        newMap.set(location.pathname, [...pageMessages, response]);
        return newMap;
      });
    } catch (error) {
      const errorMessage: AssistantMessage = {
        role: 'assistant',
        content: "Sorry, I couldn't process that request. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => {
        const newMap = new Map(prev);
        const pageMessages = newMap.get(location.pathname) || [];
        newMap.set(location.pathname, [...pageMessages, errorMessage]);
        return newMap;
      });
    } finally {
      setLoading(false);
    }
  };

  // Clear current page history
  const clearPageHistory = () => {
    setMessages(prev => {
      const newMap = new Map(prev);
      const greeting = getPageGreeting(pageContext);
      const initialMessage: AssistantMessage = {
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      };
      newMap.set(location.pathname, [initialMessage]);
      return newMap;
    });
  };

  const value: AIAssistantContextType = {
    assistant,
    messages,
    currentPageMessages,
    input,
    setInput,
    loading,
    expanded,
    setExpanded,
    unreadCount,
    pageContext,
    sendMessage,
    clearPageHistory,
    getQuickPrompts,
  };

  return (
    <AIAssistantContext.Provider value={value}>
      {children}
    </AIAssistantContext.Provider>
  );
};