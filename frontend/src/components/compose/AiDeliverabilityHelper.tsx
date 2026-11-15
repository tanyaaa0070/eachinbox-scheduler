import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  RefreshCw, 
  Zap, 
  Layers, 
  HelpCircle,
  Tag
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { toast } from 'sonner';

// High-risk spam trigger words commonly flagged by SpamAssassin, Google & Outlook filters
const SPAM_WORDS_DICT = [
  { word: '100% free', category: 'Urgency/Hype', risk: 'high' },
  { word: 'free', category: 'Promotional', risk: 'medium' },
  { word: 'guarantee', category: 'Overpromise', risk: 'high' },
  { word: 'guaranteed', category: 'Overpromise', risk: 'high' },
  { word: 'no cost', category: 'Financial', risk: 'medium' },
  { word: 'risk-free', category: 'Overpromise', risk: 'high' },
  { word: 'act now', category: 'Urgency', risk: 'high' },
  { word: 'urgent', category: 'Urgency', risk: 'high' },
  { word: 'exclusive deal', category: 'Promotional', risk: 'medium' },
  { word: 'double your income', category: 'Hype', risk: 'high' },
  { word: 'make money', category: 'Financial', risk: 'high' },
  { word: 'cheap', category: 'Promotional', risk: 'medium' },
  { word: 'winner', category: 'Scam/Hype', risk: 'high' },
  { word: 'congratulations', category: 'Scam/Hype', risk: 'high' },
  { word: 'buy now', category: 'Hard Sell', risk: 'high' },
  { word: 'order now', category: 'Hard Sell', risk: 'high' },
  { word: 'click here', category: 'Link Spam', risk: 'high' },
  { word: 'no catch', category: 'Suspicious', risk: 'medium' },
  { word: 'unlimited', category: 'Hype', risk: 'medium' },
  { word: 'lowest price', category: 'Promotional', risk: 'medium' },
  { word: 'special promotion', category: 'Promotional', risk: 'medium' },
  { word: '100% satisfied', category: 'Overpromise', risk: 'medium' },
  { word: 'earn extra cash', category: 'Financial', risk: 'high' },
];

interface AiDeliverabilityHelperProps {
  subject: string;
  body: string;
  onSubjectChange: (newSubject: string) => void;
  onBodyInsert: (textToInsert: string) => void;
  detectedHeaders?: string[];
}

export const AiDeliverabilityHelper: React.FC<AiDeliverabilityHelperProps> = ({
  subject,
  body,
  onSubjectChange,
  onBodyInsert,
  detectedHeaders = ['firstName', 'company', 'role', 'email'],
}) => {
  const [activeTab, setActiveTab] = useState<'deliverability' | 'spintax' | 'ai-writer'>('deliverability');
  const [spintaxSeed, setSpintaxSeed] = useState(0);

  // Combine text for content analysis
  const fullText = useMemo(() => `${subject} ${body}`.toLowerCase(), [subject, body]);

  // ── 1. Spam Word Detection ──
  const detectedSpam = useMemo(() => {
    const found: Array<{ word: string; category: string; risk: string }> = [];
    SPAM_WORDS_DICT.forEach((item) => {
      const regex = new RegExp(`\\b${item.word}\\b`, 'i');
      if (regex.test(fullText)) {
        found.push(item);
      }
    });
    return found;
  }, [fullText]);

  // ── 2. Deliverability Score Calculation (0-100) ──
  const deliverabilityAnalysis = useMemo(() => {
    let score = 95;
    const tips: string[] = [];

    // Spam word deductions
    if (detectedSpam.length > 0) {
      score -= detectedSpam.length * 12;
      tips.push(`Remove ${detectedSpam.length} detected spam trigger word(s).`);
    }

    // Personalization check
    const hasPersonalization = /\{\{[^}]+\}\}/.test(subject) || /\{\{[^}]+\}\}/.test(body);
    if (!hasPersonalization) {
      score -= 15;
      tips.push('Add dynamic personalization tags like {{firstName}} or {{company}} to boost inbox rate.');
    } else {
      score += 5;
    }

    // Subject length check (ideal: 2 to 7 words)
    const subjectWords = subject.trim().split(/\s+/).filter(Boolean).length;
    if (subjectWords > 8) {
      score -= 10;
      tips.push(`Subject is ${subjectWords} words. Cold email subjects with 3-6 words get 42% higher opens.`);
    } else if (subjectWords === 0) {
      score -= 20;
      tips.push('Subject line is empty.');
    }

    // ALL CAPS check
    const isAllCaps = subject.length > 5 && subject === subject.toUpperCase();
    if (isAllCaps) {
      score -= 25;
      tips.push('Avoid ALL CAPS in subject line — trigger for strict ISP filters.');
    }

    // Punctuation check (multiple exclamation marks)
    if (/!!+/.test(subject) || /!!+/.test(body) || /\?\?+/.test(subject)) {
      score -= 15;
      tips.push('Excessive punctuation (!! or ??) damages domain reputation.');
    }

    const clampedScore = Math.max(10, Math.min(100, score));

    return {
      score: clampedScore,
      tips,
      grade: clampedScore >= 85 ? 'Excellent' : clampedScore >= 65 ? 'Fair' : 'High Risk',
      color: clampedScore >= 85 ? 'emerald' : clampedScore >= 65 ? 'amber' : 'red',
    };
  }, [detectedSpam, subject, body]);

  // ── 3. Spintax Variations Parser ──
  const spintaxVariations = useMemo(() => {
    // Parse spintax like {Hey|Hi|Hello} or {quick question|hope all is well}
    const parseSpintax = (text: string): string => {
      return text.replace(/\{([^{}]+)\}/g, (_, choices) => {
        const parts = choices.split('|');
        const rand = Math.floor(Math.random() * parts.length);
        return parts[rand];
      });
    };

    const hasSpintax = /\{[^{}]+\|[^{}]+\}/.test(body) || /\{[^{}]+\|[^{}]+\}/.test(subject);

    if (!hasSpintax) {
      return null;
    }

    // Generate 3 random previews
    return [
      { id: 1, text: parseSpintax(body.replace(/<[^>]+>/g, ' ')) },
      { id: 2, text: parseSpintax(body.replace(/<[^>]+>/g, ' ')) },
      { id: 3, text: parseSpintax(body.replace(/<[^>]+>/g, ' ')) },
    ];
  }, [body, subject, spintaxSeed]);

  // ── 4. AI Subject Line Generators ──
  const aiSubjectSuggestions = [
    { title: 'Curiosity-Driven', subject: 'Quick question about {{company}}\'s workflow' },
    { title: 'Value-First', subject: 'Scaling email deliverability at {{company}}' },
    { title: 'Short & Direct', subject: '{{firstName}} / ReachInbox partnership?' },
  ];

  return (
    <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-md border border-indigo-400/30 text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-tight">AI Outreach & Deliverability Intelligence</h4>
              <p className="text-[11px] text-slate-300">Outbox Labs Cold Email Optimization Engine</p>
            </div>
          </div>
          
          {/* Deliverability Badge */}
          <div className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
            deliverabilityAnalysis.score >= 85 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' 
              : deliverabilityAnalysis.score >= 65 
              ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' 
              : 'bg-red-500/20 text-red-300 border-red-400/40'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
            {deliverabilityAnalysis.score}/100 Score ({deliverabilityAnalysis.grade})
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-3 pt-2 border-t border-indigo-900/60">
          <button
            type="button"
            onClick={() => setActiveTab('deliverability')}
            className={`text-xs px-3 py-1 rounded-md font-medium transition ${
              activeTab === 'deliverability'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            🛡️ Deliverability & Spam Check
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('spintax')}
            className={`text-xs px-3 py-1 rounded-md font-medium transition flex items-center gap-1 ${
              activeTab === 'spintax'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Spintax Variations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai-writer')}
            className={`text-xs px-3 py-1 rounded-md font-medium transition flex items-center gap-1 ${
              activeTab === 'ai-writer'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            AI Subject Line Optimizer
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Dynamic Variable Chips */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              Dynamic Personalization Tags:
            </span>
            <span className="text-[11px] text-slate-400">Click to insert into email</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {detectedHeaders.map((header) => (
              <button
                key={header}
                type="button"
                onClick={() => {
                  onBodyInsert(`{{${header}}}`);
                  toast.success(`Inserted {{${header}}} into email`);
                }}
                className="px-2.5 py-1 text-xs font-mono bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md transition flex items-center gap-1 shadow-2xs"
              >
                <span>+</span> {`{{${header}}}`}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                onBodyInsert('{Hey|Hi|Hello}');
                toast.success('Inserted Spintax opener {Hey|Hi|Hello}');
              }}
              className="px-2.5 py-1 text-xs font-mono bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md transition shadow-2xs"
            >
              + {`{Hey|Hi|Hello}`}
            </button>
          </div>
        </div>

        {/* Tab 1: Deliverability & Spam */}
        {activeTab === 'deliverability' && (
          <div className="space-y-3 pt-1">
            {detectedSpam.length > 0 ? (
              <div className="p-3 bg-red-50/80 border border-red-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-red-800 text-xs font-semibold mb-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>{detectedSpam.length} Spam Words Detected (May trigger Junk Folder):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {detectedSpam.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700 border border-red-300 font-medium"
                    >
                      "{item.word}" <span className="text-[10px] opacity-75">({item.category})</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero spam trigger words detected in subject or email body. Great job!</span>
              </div>
            )}

            {/* Recommendations */}
            {deliverabilityAnalysis.tips.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Optimization Checklist:</span>
                <ul className="space-y-1">
                  {deliverabilityAnalysis.tips.map((tip, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Spintax Variations */}
        {activeTab === 'spintax' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Spintax allows rotating greetings & sentences so every email looks unique to spam filters.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSpintaxSeed((s) => s + 1)}
                className="h-7 text-xs flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Re-roll Samples
              </Button>
            </div>

            {spintaxVariations ? (
              <div className="space-y-2">
                {spintaxVariations.map((variation) => (
                  <div
                    key={variation.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 font-mono"
                  >
                    <span className="font-bold text-indigo-600 mr-2">Variation #{variation.id}:</span>
                    {variation.text.slice(0, 140)}...
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center space-y-2">
                <p className="text-xs text-slate-500">
                  No Spintax detected in your body. Try adding syntax like:
                </p>
                <code className="text-xs bg-white px-2 py-1 border rounded text-purple-700 block font-mono">
                  {`{Hey|Hi|Hello} {{firstName}}, {wanted to reach out|quick question for you}...`}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onBodyInsert('{Hey|Hi|Hello} {{name}},\n\n{Wanted to connect regarding|Quick note on} your email scheduling workflow.\n\n{Best regards|Cheers},\nReachInbox Team');
                    toast.success('Inserted full Spintax email template!');
                  }}
                  className="text-xs"
                >
                  Insert Sample Spintax Drip Template
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: AI Subject Line Assistant */}
        {activeTab === 'ai-writer' && (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-slate-600">
              AI-generated cold email subject lines designed for 60%+ open rates:
            </p>
            <div className="space-y-2">
              {aiSubjectSuggestions.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between transition"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                      {item.title}
                    </span>
                    <span className="text-xs font-medium text-slate-800">{item.subject}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onSubjectChange(item.subject);
                      toast.success(`Applied subject: "${item.subject}"`);
                    }}
                    className="h-7 text-xs bg-white hover:bg-indigo-600 hover:text-white transition"
                  >
                    Apply Subject
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
