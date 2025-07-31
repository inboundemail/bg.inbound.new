import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How It Works - bg by inbound',
  description: 'Learn how bg by inbound transforms your emails into code using AI-powered background agents.',
  openGraph: {
    title: 'How It Works - bg by inbound',
    description: 'Learn how bg by inbound transforms your emails into code using AI-powered background agents.',
  },
};

const steps = [
  {
    title: 'Connect Your Accounts',
    description: 'Link your email and Slack accounts to bg by inbound. We support Gmail, Outlook, and custom SMTP servers.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Send Instructions',
    description: 'Email your coding tasks or requirements. Our AI understands natural language and converts it into actionable items.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'AI Processing',
    description: 'Our AI agents analyze your requirements, generate code, and ensure it meets your project standards.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Review & Merge',
    description: 'Get a pull request with the generated code. Review, request changes, or merge directly into your codebase.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const faqs = [
  {
    question: 'How does the AI understand my requirements?',
    answer: 'Our AI is trained on millions of code examples and can understand natural language. It analyzes your email content, project context, and coding standards to generate appropriate solutions.',
  },
  {
    question: 'What programming languages are supported?',
    answer: 'We support all major programming languages including JavaScript, TypeScript, Python, Java, C++, Ruby, Go, and more. The AI adapts to your project\'s specific requirements.',
  },
  {
    question: 'How secure is my code and data?',
    answer: 'We take security seriously. All communications are encrypted, and we never store your source code. The AI agents work in isolated environments and follow strict security protocols.',
  },
  {
    question: 'Can I customize the code output?',
    answer: 'Yes! You can define coding standards, preferred patterns, and project-specific requirements. The AI will follow these guidelines when generating code.',
  },
  {
    question: 'What if the generated code needs changes?',
    answer: 'You can request changes directly through comments on the pull request or reply to the email. Our AI will understand your feedback and update the code accordingly.',
  },
  {
    question: 'How does the pricing work?',
    answer: 'We offer flexible pricing tiers based on your needs. Check out our pricing page for detailed information about features and limits.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen py-12 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
            How <span className="text-primary">bg by inbound</span> Works
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-muted-foreground sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Transform your development workflow in four simple steps. From email to code, we handle everything in between.
          </p>
        </div>

        {/* Steps Section */}
        <div className="mt-24">
          <div className="relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-1/2 left-12 right-12 h-0.5 bg-border -translate-y-1/2" aria-hidden="true" />
            
            <div className="relative grid grid-cols-1 gap-12 lg:grid-cols-4">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-24 h-24 rounded-full bg-card border-4 border-background relative z-10">
                      <div className="text-primary">{step.icon}</div>
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-foreground text-center">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-muted-foreground text-center">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-32">
          <h2 className="text-3xl font-bold text-center text-foreground">
            Frequently Asked Questions
          </h2>
          <div className="mt-12 max-w-3xl mx-auto">
            <dl className="space-y-8">
              {faqs.map((faq, index) => (
                <div key={index} className="p-6 bg-card rounded-lg border border-border">
                  <dt className="text-lg font-semibold text-foreground">
                    {faq.question}
                  </dt>
                  <dd className="mt-2 text-muted-foreground">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Ready to get started?
          </h2>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/signin"
              className="px-8 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Try It Now
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3 rounded-md bg-secondary text-secondary-foreground font-medium hover:bg-secondary/90 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: 'How to Use bg by inbound',
            description: 'Transform your development workflow with AI-powered code generation',
            step: steps.map((step, index) => ({
              '@type': 'HowToStep',
              position: index + 1,
              name: step.title,
              text: step.description,
            })),
          }),
        }}
      />
    </div>
  );
}