import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Use Cases - bg by inbound',
  description: 'Discover how developers and teams use bg by inbound to transform their development workflow.',
  openGraph: {
    title: 'Use Cases - bg by inbound',
    description: 'Discover how developers and teams use bg by inbound to transform their development workflow.',
  },
};

const useCases = [
  {
    title: 'Bug Fixes',
    description: 'Quickly resolve issues by sending error logs via email. Our AI analyzes the context and generates appropriate fixes.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    example: 'Email: "Fix memory leak in UserService.processData()"',
    solution: 'AI analyzes the code, identifies the leak, and creates a PR with the fix including proper cleanup.',
  },
  {
    title: 'Feature Requests',
    description: 'Convert feature requests into production-ready code. The AI understands requirements and implements them following your standards.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    example: 'Email: "Add dark mode toggle to settings page"',
    solution: 'AI implements theme switching, updates styles, and adds persistence with proper testing.',
  },
  {
    title: 'Documentation Updates',
    description: 'Keep documentation in sync with code changes. Send requests to update docs, and AI handles the rest.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    example: 'Email: "Update API docs for new authentication endpoints"',
    solution: 'AI scans the code changes, updates documentation, and ensures consistency.',
  },
  {
    title: 'Code Refactoring',
    description: 'Modernize and improve code quality at scale. Let AI handle complex refactoring tasks while maintaining functionality.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    example: 'Email: "Convert class components to functional components"',
    solution: 'AI systematically refactors components while preserving behavior and adding hooks.',
  },
];

const testimonials = [
  {
    quote: "bg by inbound has transformed how we handle routine code changes. What used to take hours now happens automatically in the background.",
    author: "Sarah Chen",
    role: "Lead Developer",
    company: "TechFlow",
  },
  {
    quote: "The AI's ability to understand context and maintain our coding standards is impressive. It's like having an extra team member who works 24/7.",
    author: "Marcus Rodriguez",
    role: "Engineering Manager",
    company: "DataSphere",
  },
  {
    quote: "We've reduced our documentation backlog by 80% since implementing bg by inbound. It's a game-changer for keeping docs up to date.",
    author: "Emily Thompson",
    role: "Technical Writer",
    company: "CloudScale",
  },
];

const industries = [
  {
    name: 'Startups',
    description: 'Move fast and maintain quality. Automate routine tasks and focus on core innovation.',
    benefits: [
      'Rapid prototyping',
      'Consistent code quality',
      'Reduced technical debt',
      'Faster time to market',
    ],
  },
  {
    name: 'Enterprise',
    description: 'Scale development operations while maintaining security and compliance.',
    benefits: [
      'Standardized processes',
      'Enhanced security',
      'Compliance adherence',
      'Team productivity',
    ],
  },
  {
    name: 'Agencies',
    description: 'Handle multiple client projects efficiently with automated code generation.',
    benefits: [
      'Client customization',
      'Project scalability',
      'Consistent delivery',
      'Resource optimization',
    ],
  },
];

export default function UseCasesPage() {
  return (
    <div className="min-h-screen py-12 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
            Real-world <span className="text-primary">solutions</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-muted-foreground sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            See how developers and teams use bg by inbound to transform their development workflow.
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="mt-24 grid grid-cols-1 gap-12 lg:grid-cols-2">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="p-8 bg-card rounded-lg border border-border hover:border-primary transition-colors"
            >
              <div className="text-primary">{useCase.icon}</div>
              <h3 className="mt-4 text-2xl font-semibold text-foreground">
                {useCase.title}
              </h3>
              <p className="mt-2 text-muted-foreground">{useCase.description}</p>
              <div className="mt-6 p-4 bg-muted/10 rounded-md">
                <p className="font-mono text-sm text-muted-foreground">
                  {useCase.example}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  ↓
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {useCase.solution}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials Section */}
        <div className="mt-32">
          <h2 className="text-3xl font-bold text-center text-foreground">
            What Our Users Say
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-6 bg-card rounded-lg border border-border"
              >
                <svg
                  className="h-8 w-8 text-primary"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="mt-4 text-muted-foreground">"{testimonial.quote}"</p>
                <div className="mt-4">
                  <p className="text-foreground font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Applications */}
        <div className="mt-32">
          <h2 className="text-3xl font-bold text-center text-foreground">
            Industry Applications
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {industries.map((industry, index) => (
              <div
                key={index}
                className="p-6 bg-card rounded-lg border border-border"
              >
                <h3 className="text-xl font-semibold text-foreground">
                  {industry.name}
                </h3>
                <p className="mt-2 text-muted-foreground">{industry.description}</p>
                <ul className="mt-4 space-y-2">
                  {industry.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-center">
                      <svg
                        className="h-5 w-5 text-primary flex-shrink-0"
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
                      <span className="ml-2 text-muted-foreground">{benefit}</span>
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
            Ready to transform your workflow?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands of developers who are already using bg by inbound.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/signin"
              className="px-8 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3 rounded-md bg-secondary text-secondary-foreground font-medium hover:bg-secondary/90 transition-colors"
            >
              Contact Sales
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
            description: 'AI-powered code generation from email instructions',
            review: testimonials.map((testimonial) => ({
              '@type': 'Review',
              reviewBody: testimonial.quote,
              author: {
                '@type': 'Person',
                name: testimonial.author,
              },
            })),
          }),
        }}
      />
    </div>
  );
}