import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Features - bg by inbound',
  description: 'Discover how bg by inbound transforms your emails into code with AI-powered background agents.',
  openGraph: {
    title: 'Features - bg by inbound',
    description: 'Discover how bg by inbound transforms your emails into code with AI-powered background agents.',
  },
};

const features = [
  {
    title: 'Email-to-Code Transformation',
    description: 'Send coding tasks via email and let our AI agents convert them into production-ready code. No more context switching between communication and development.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'AI Background Agents',
    description: 'Our intelligent agents work 24/7 to analyze your requirements, generate code, and ensure it meets your project's standards and best practices.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Slack Integration',
    description: 'Seamlessly integrate with your Slack workspace for real-time updates, code reviews, and team collaboration. Stay in sync with your development workflow.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
  },
  {
    title: 'Automated PR Creation',
    description: 'Get pull requests automatically created and formatted according to your repository's conventions. Save time on manual PR creation and documentation.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
    ),
  },
];

const benefits = [
  {
    title: 'For Developers',
    items: [
      'Focus on high-impact tasks while AI handles routine coding',
      'Maintain coding standards automatically',
      'Reduce context switching between tools',
      'Get instant code suggestions and improvements',
    ],
  },
  {
    title: 'For Teams',
    items: [
      'Streamline code review process',
      'Ensure consistent code quality across projects',
      'Improve team collaboration and communication',
      'Reduce development bottlenecks',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen py-12 bg-background">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
            Features that <span className="text-primary">empower</span> your development
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-muted-foreground sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Transform your development workflow with AI-powered code generation and automation.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-24">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-2">
            {features.map((feature, index) => (
              <div
                key={index}
                className="relative p-8 bg-card rounded-lg border border-border hover:border-primary transition-colors"
              >
                <div className="absolute top-0 -translate-y-1/2 p-3 bg-primary rounded-lg text-primary-foreground">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-32">
          <h2 className="text-3xl font-bold text-center text-foreground">
            Benefits for Everyone
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-2">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="p-8 bg-card rounded-lg border border-border"
              >
                <h3 className="text-2xl font-semibold text-foreground">{benefit.title}</h3>
                <ul className="mt-6 space-y-4">
                  {benefit.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start">
                      <svg
                        className="h-6 w-6 text-primary flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="ml-3 text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Ready to transform your development workflow?
          </h2>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/signin"
              className="px-8 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/how-it-works"
              className="px-8 py-3 rounded-md bg-secondary text-secondary-foreground font-medium hover:bg-secondary/90 transition-colors"
            >
              Learn More
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
            '@type': 'Product',
            name: 'bg by inbound',
            description: 'Transform emails into code with AI-powered background agents',
            offers: {
              '@type': 'Offer',
              availability: 'https://schema.org/InStock',
            },
            category: 'Software Development Tools',
          }),
        }}
      />
    </div>
  );
}