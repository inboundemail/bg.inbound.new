import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About - bg by inbound',
  description: 'Learn about bg by inbound and our mission to transform software development with AI-powered automation.',
  openGraph: {
    title: 'About - bg by inbound',
    description: 'Learn about bg by inbound and our mission to transform software development with AI-powered automation.',
  },
};

const team = [
  {
    name: 'Alex Rivera',
    role: 'CEO & Co-founder',
    image: '/team/alex.jpg',
    bio: 'Former engineering lead at major tech companies, passionate about AI and developer productivity.',
  },
  {
    name: 'Dr. Sarah Kim',
    role: 'CTO & Co-founder',
    image: '/team/sarah.jpg',
    bio: 'PhD in Machine Learning, led AI research teams, and developed innovative code generation models.',
  },
  {
    name: 'Michael Chen',
    role: 'Head of Engineering',
    image: '/team/michael.jpg',
    bio: 'Experienced in scaling developer tools and building robust cloud infrastructure.',
  },
  {
    name: 'Lisa Patel',
    role: 'Head of Product',
    image: '/team/lisa.jpg',
    bio: 'Product leader with a track record of building developer-focused tools and platforms.',
  },
];

const values = [
  {
    title: 'Developer First',
    description: 'We build tools that enhance developer productivity without compromising on quality or control.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'AI Innovation',
    description: 'We push the boundaries of AI to create intelligent tools that understand and adapt to your needs.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Quality & Security',
    description: 'We maintain the highest standards of code quality and security in everything we deliver.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Community Driven',
    description: 'We actively engage with our developer community to build features that matter most.',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

const trustIndicators = [
  {
    title: 'Security Certifications',
    items: ['SOC 2 Type II', 'ISO 27001', 'GDPR Compliant'],
  },
  {
    title: 'Industry Recognition',
    items: ['Top Dev Tool 2024', 'AI Excellence Award', 'Best Developer Productivity Tool'],
  },
  {
    title: 'Key Metrics',
    items: ['99.9% Uptime', '10M+ PRs Generated', '50K+ Active Users'],
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen py-12 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
            Our <span className="text-primary">Mission</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-muted-foreground sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            We're transforming software development by making AI-powered automation accessible to every developer and team.
          </p>
        </div>

        {/* Values Section */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center text-foreground">
            Our Values
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <div
                key={index}
                className="p-6 bg-card rounded-lg border border-border"
              >
                <div className="text-primary">{value.icon}</div>
                <h3 className="mt-4 text-xl font-semibold text-foreground">
                  {value.title}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className="mt-32">
          <h2 className="text-3xl font-bold text-center text-foreground">
            Meet Our Team
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member, index) => (
              <div
                key={index}
                className="text-center"
              >
                <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden bg-muted">
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-foreground">
                  {member.name}
                </h3>
                <p className="text-primary">{member.role}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-32">
          <h2 className="text-3xl font-bold text-center text-foreground">
            Trust & Recognition
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {trustIndicators.map((indicator, index) => (
              <div
                key={index}
                className="p-6 bg-card rounded-lg border border-border"
              >
                <h3 className="text-xl font-semibold text-foreground">
                  {indicator.title}
                </h3>
                <ul className="mt-4 space-y-2">
                  {indicator.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-center">
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
                      <span className="ml-2 text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Get in Touch
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Have questions or want to learn more? We'd love to hear from you.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/contact"
              className="px-8 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Contact Us
            </Link>
            <a
              href="mailto:hello@bg.inbound.dev"
              className="px-8 py-3 rounded-md bg-secondary text-secondary-foreground font-medium hover:bg-secondary/90 transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </div>

      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'bg by inbound',
            description: 'AI-powered code generation from email instructions',
            url: 'https://bg.inbound.dev',
            employee: team.map((member) => ({
              '@type': 'Person',
              name: member.name,
              jobTitle: member.role,
              description: member.bio,
            })),
          }),
        }}
      />
    </div>
  );
}