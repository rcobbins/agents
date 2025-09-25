export interface PageContext {
  pageName: string;
  pageType: string;
  currentPath: string;
  hasProject: boolean;
  projectId: string | null;
  pageData: Record<string, any>;
  errors?: string[];
  warnings?: string[];
  metrics?: Record<string, number>;
}

/**
 * Analyzes the current page to extract context for the AI assistant
 */
export function analyzePageContent(path: string, rootElement?: HTMLElement): PageContext {
  const pathParts = path.split('/').filter(Boolean);
  const pageType = getPageType(pathParts);
  const projectId = extractProjectId(pathParts, pageType);
  const pageName = getPageName(pageType);
  
  // Extract page-specific data from DOM
  const pageData = rootElement ? extractPageData(rootElement, pageType) : {};
  const errors = rootElement ? extractErrors(rootElement) : [];
  const warnings = rootElement ? extractWarnings(rootElement) : [];
  const metrics = rootElement ? extractMetrics(rootElement, pageType) : {};

  return {
    pageName,
    pageType,
    currentPath: path,
    hasProject: !!projectId,
    projectId,
    pageData,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
  };
}

/**
 * Determines the page type from URL path parts
 */
function getPageType(pathParts: string[]): string {
  if (pathParts.length === 0) return 'dashboard';
  
  const firstPart = pathParts[0];
  const pageTypeMap: Record<string, string> = {
    'project': pathParts[1] === 'new' || pathParts[1] === 'init' ? 'projectInit' : 'projectDetail',
    'agents': 'agentMonitor',
    'thoughts': 'agentThoughts',
    'queue': 'workQueue',
    'flows': 'messageFlow',
    'changes': 'codeChanges',
    'tests': 'testResults',
    'analytics': 'analytics',
    'settings': 'settings',
  };

  return pageTypeMap[firstPart] || 'unknown';
}

/**
 * Gets human-readable page name
 */
function getPageName(pageType: string): string {
  const nameMap: Record<string, string> = {
    dashboard: 'Dashboard',
    projectInit: 'New Project',
    projectDetail: 'Project Details',
    agentMonitor: 'Agent Monitor',
    agentThoughts: 'Agent Thoughts',
    workQueue: 'Work Queue',
    messageFlow: 'Message Flow',
    codeChanges: 'Code Changes',
    testResults: 'Test Results',
    analytics: 'Analytics',
    settings: 'Settings',
    unknown: 'Unknown Page',
  };

  return nameMap[pageType] || 'Unknown';
}

/**
 * Extracts project ID from URL if present
 */
function extractProjectId(pathParts: string[], pageType: string): string | null {
  // For project detail pages
  if (pageType === 'projectDetail' && pathParts.length >= 2) {
    return pathParts[1];
  }
  
  // For pages with projectId parameter
  const projectPages = ['agentMonitor', 'agentThoughts', 'workQueue', 'messageFlow', 
                        'codeChanges', 'testResults', 'analytics'];
  if (projectPages.includes(pageType) && pathParts.length >= 2) {
    return pathParts[1];
  }

  return null;
}

/**
 * Extracts page-specific data from DOM
 */
function extractPageData(element: HTMLElement, pageType: string): Record<string, any> {
  const data: Record<string, any> = {};

  switch (pageType) {
    case 'dashboard':
      data.projectCount = element.querySelectorAll('[data-project-card]').length;
      data.activeProjects = element.querySelectorAll('[data-status="active"]').length;
      break;

    case 'agentMonitor':
      data.agentCount = element.querySelectorAll('[class*="Card"]').length;
      data.runningAgents = element.querySelectorAll('[data-status="running"]').length;
      data.agentTypes = Array.from(element.querySelectorAll('[data-agent-type]'))
        .map(el => el.getAttribute('data-agent-type'));
      break;

    case 'workQueue':
      data.totalTasks = element.querySelectorAll('[data-task-id]').length;
      data.pendingTasks = element.querySelectorAll('[data-status="pending"]').length;
      data.inProgressTasks = element.querySelectorAll('[data-status="in_progress"]').length;
      data.blockedTasks = element.querySelectorAll('[data-status="blocked"]').length;
      break;

    case 'testResults':
      data.totalTests = extractNumberFromText(element, 'total tests') || 
                       element.querySelectorAll('[data-test-result]').length;
      data.passingTests = extractNumberFromText(element, 'passing') ||
                         element.querySelectorAll('[data-test-result="pass"]').length;
      data.failingTests = extractNumberFromText(element, 'failing') ||
                         element.querySelectorAll('[data-test-result="fail"]').length;
      data.coverage = extractNumberFromText(element, 'coverage');
      break;

    case 'analytics':
      // Extract visible metrics
      const metricElements = element.querySelectorAll('[data-metric]');
      metricElements.forEach(el => {
        const name = el.getAttribute('data-metric');
        const value = el.textContent?.match(/\d+\.?\d*/)?.[0];
        if (name && value) {
          data[name] = parseFloat(value);
        }
      });
      break;

    case 'codeChanges':
      data.totalChanges = element.querySelectorAll('[data-change-id]').length;
      data.pendingChanges = element.querySelectorAll('[data-change-status="pending"]').length;
      data.appliedChanges = element.querySelectorAll('[data-change-status="applied"]').length;
      break;

    case 'messageFlow':
      data.totalMessages = extractNumberFromText(element, 'messages');
      data.activeConnections = element.querySelectorAll('[data-connection-active="true"]').length;
      break;
  }

  // Extract any visible stats or metrics
  const statElements = element.querySelectorAll('[class*="stat"], [class*="metric"], [class*="count"]');
  statElements.forEach(el => {
    const text = el.textContent || '';
    const match = text.match(/(\w+):\s*(\d+)/);
    if (match) {
      data[match[1].toLowerCase()] = parseInt(match[2]);
    }
  });

  return data;
}

/**
 * Extracts error messages from the page
 */
function extractErrors(element: HTMLElement): string[] {
  const errors: string[] = [];
  
  // Look for error alerts
  const errorAlerts = element.querySelectorAll('[class*="error"], [role="alert"][class*="error"]');
  errorAlerts.forEach(el => {
    const text = el.textContent?.trim();
    if (text && text.length < 200) { // Avoid huge error dumps
      errors.push(text);
    }
  });

  // Look for failed status indicators
  const failedElements = element.querySelectorAll('[data-status="failed"], [data-status="error"]');
  failedElements.forEach(el => {
    const label = el.getAttribute('data-label') || el.textContent?.trim();
    if (label) {
      errors.push(`Failed: ${label}`);
    }
  });

  return [...new Set(errors)]; // Remove duplicates
}

/**
 * Extracts warning messages from the page
 */
function extractWarnings(element: HTMLElement): string[] {
  const warnings: string[] = [];
  
  // Look for warning alerts
  const warningAlerts = element.querySelectorAll('[class*="warning"], [role="alert"][class*="warning"]');
  warningAlerts.forEach(el => {
    const text = el.textContent?.trim();
    if (text && text.length < 200) {
      warnings.push(text);
    }
  });

  // Look for degraded or warning status
  const warningElements = element.querySelectorAll('[data-status="warning"], [data-status="degraded"]');
  warningElements.forEach(el => {
    const label = el.getAttribute('data-label') || el.textContent?.trim();
    if (label) {
      warnings.push(`Warning: ${label}`);
    }
  });

  return [...new Set(warnings)];
}

/**
 * Extracts numeric metrics from the page
 */
function extractMetrics(element: HTMLElement, pageType: string): Record<string, number> {
  const metrics: Record<string, number> = {};

  // Look for percentage values
  const percentElements = element.querySelectorAll('[class*="percent"], [class*="coverage"]');
  percentElements.forEach(el => {
    const text = el.textContent || '';
    const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
    if (match) {
      const label = el.getAttribute('data-label') || 
                   el.closest('[data-label]')?.getAttribute('data-label') ||
                   'percentage';
      metrics[label] = parseFloat(match[1]);
    }
  });

  // Look for numeric badges
  const badges = element.querySelectorAll('[class*="Badge"], [class*="Chip"]');
  badges.forEach(el => {
    const text = el.textContent || '';
    if (/^\d+$/.test(text.trim())) {
      const label = el.getAttribute('data-label') || 
                   el.getAttribute('aria-label') ||
                   'count';
      metrics[label] = parseInt(text);
    }
  });

  // Page-specific metrics
  switch (pageType) {
    case 'agentMonitor':
      const uptimeEl = element.querySelector('[data-metric="uptime"]');
      if (uptimeEl) {
        const uptime = parseFloat(uptimeEl.textContent || '0');
        if (!isNaN(uptime)) metrics.uptime = uptime;
      }
      break;

    case 'analytics':
      // Extract chart data points if visible
      const chartValues = element.querySelectorAll('[data-chart-value]');
      chartValues.forEach(el => {
        const value = parseFloat(el.getAttribute('data-chart-value') || '0');
        const label = el.getAttribute('data-chart-label') || 'value';
        if (!isNaN(value)) metrics[label] = value;
      });
      break;
  }

  return metrics;
}

/**
 * Helper to extract numbers from text content
 */
function extractNumberFromText(element: HTMLElement, keyword: string): number | null {
  const text = element.textContent || '';
  const regex = new RegExp(`${keyword}[^\\d]*(\\d+(?:\\.\\d+)?)`, 'i');
  const match = text.match(regex);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Analyzes user interactions on the page
 */
export function analyzeUserInteraction(element: HTMLElement): {
  activeElements: string[];
  recentActions: string[];
  focusArea: string | null;
} {
  const activeElements: string[] = [];
  const recentActions: string[] = [];
  
  // Find focused element
  const focusedElement = element.querySelector(':focus');
  const focusArea = focusedElement ? 
    focusedElement.getAttribute('data-area') || 
    focusedElement.closest('[data-area]')?.getAttribute('data-area') || 
    null : null;

  // Find elements with active states
  const activeStates = element.querySelectorAll('[aria-pressed="true"], [aria-selected="true"], .active, .selected');
  activeStates.forEach(el => {
    const label = el.getAttribute('aria-label') || el.textContent?.trim();
    if (label) activeElements.push(label);
  });

  // Look for recent action indicators
  const recentElements = element.querySelectorAll('[data-recent], [class*="recent"]');
  recentElements.forEach(el => {
    const action = el.getAttribute('data-action') || el.textContent?.trim();
    if (action) recentActions.push(action);
  });

  return {
    activeElements: [...new Set(activeElements)],
    recentActions: [...new Set(recentActions)],
    focusArea,
  };
}

/**
 * Gets suggestions based on page context
 */
export function getContextualSuggestions(context: PageContext): string[] {
  const suggestions: string[] = [];

  // Error-based suggestions
  if (context.errors && context.errors.length > 0) {
    suggestions.push('Fix errors on this page');
    suggestions.push('Why are these errors occurring?');
  }

  // Warning-based suggestions
  if (context.warnings && context.warnings.length > 0) {
    suggestions.push('Address warnings');
    suggestions.push('Are these warnings critical?');
  }

  // Page-specific suggestions
  switch (context.pageType) {
    case 'agentMonitor':
      if (context.pageData.runningAgents === 0) {
        suggestions.push('Start agents');
      }
      if (context.pageData.runningAgents < context.pageData.agentCount) {
        suggestions.push('Why are some agents not running?');
      }
      break;

    case 'workQueue':
      if (context.pageData.blockedTasks > 0) {
        suggestions.push('Resolve blocked tasks');
      }
      if (context.pageData.pendingTasks > 10) {
        suggestions.push('Help prioritize backlog');
      }
      break;

    case 'testResults':
      if (context.pageData.failingTests > 0) {
        suggestions.push('Fix failing tests');
      }
      if (context.pageData.coverage < 70) {
        suggestions.push('Improve test coverage');
      }
      break;

    case 'analytics':
      if (context.metrics) {
        const lowMetrics = Object.entries(context.metrics)
          .filter(([_, value]) => value < 50)
          .map(([key]) => key);
        if (lowMetrics.length > 0) {
          suggestions.push(`Improve ${lowMetrics[0]}`);
        }
      }
      break;
  }

  return suggestions;
}