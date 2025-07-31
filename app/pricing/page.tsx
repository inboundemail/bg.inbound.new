import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pricing - bg by inbound',
  description: 'Choose the perfect plan for your team. Transform emails into code with AI-powered background agents.',
  openGraph: {
    title: 'Pricing - bg by inbound',
    description: 'Choose the perfect plan for your team. Transform emails into code with AI-powered background agents.',
  },
};

const tiers = [
  {
    name: 'Free',
    price: '0',
    description: 'Perfect for trying out bg by inbound',
    features: [
      '50 email-to-code transformations/month',
      'Basic AI code generation',
      'GitHub integration',
      'Email support',
      'Public repositories only',
      'Community access',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '49',
    description: 'Best for individual developers and small teams',
    features: [
      'Unlimited email-to-code transformations',
      'Advanced AI code generation',
      'GitHub & GitLab integration',
      'Slack integration',
      'Private repositories',
      'Priority support',
      'Custom coding standards',
      'Code review automation',
      'Team collaboration features',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For organizations that need more',
    features: [
      'Everything in Pro',
      'Custom AI model training',
      'SSO & SAML integration',
      'Advanced security features',
      'Dedicated support',
      'SLA guarantees',
      'Custom integrations',
      'On-premise deployment option',
      'Audit logs & compliance',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const featureComparison = {
  categories: [
    {
      name: 'Core Features',
      features: [
        {
          name: 'Email-to-Code Transformations',
          free: '50/month',
          pro: 'Unlimited',
          enterprise: 'Unlimited',
        },
        {
          name: 'AI Code Generation',
          free: 'Basic',
          pro: 'Advanced',
          enterprise: 'Custom Model',
        },
        {
          name: 'Repository Support',
          free: 'Public Only',
          pro: 'Public & Private',
          enterprise: 'All + Custom',
        },
      ],
    },
    {
      name: 'Integrations',
      features: [
        {
          name: 'GitHub Integration',
          free: '✓',
          pro: '✓',
          enterprise: '✓',
        },
        {
          name: 'GitLab Integration',
          free: '✗',
          pro: '✓',
          enterprise: '✓',
        },
        {
          name: 'Slack Integration',
          free: '✗',
          pro: '✓',
          enterprise: '✓',
        },
      ],
    },
    {
      name: 'Support',
      features: [
        {
          name: 'Support Level',
          free: 'Community',
          pro: 'Priority',
          enterprise: 'Dedicated',
        },
        {
          name: 'SLA Guarantee',
          free: '✗',
          pro: '✗',
          enterprise: '✓',
        },
        {
          name: 'Training & Onboarding',
          free: '✗',
          pro: 'Basic',
          enterprise: 'Custom',
        },
      ],
    },
  ],
};

export default function PricingPage() {
  return (
    <div className="min-h-screen py-12 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
            Simple, transparent <span className="text-primary">pricing</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-muted-foreground sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Choose the perfect plan for your team. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Tiers */}
        <div className="mt-24 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={`relative p-8 bg-card rounded-lg border-2 ${
                tier.highlighted
                  ? 'border-primary shadow-lg scale-105'
                  : 'border-border'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                  Most Popular
                </div>
              )}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-foreground">{tier.name}</h3>
                <div className="mt-4">
                  <span className="text-5xl font-extrabold text-foreground">
                    ${tier.price}
                  </span>
                  {tier.price !== 'Custom' && (
                    <span className="text-base font-medium text-muted-foreground">
                      /month
                    </span>
                  )}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {tier.description}
                </p>
              </div>
              <ul className="mt-8 space-y-4">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
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
                    <span className="ml-3 text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href={tier.name === 'Enterprise' ? '/contact' : '/signin'}
                  className={`block w-full py-3 px-4 rounded-md text-center font-medium ${
                    tier.highlighted
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                  } transition-colors`}
                >
                  {tier.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="mt-32">
          <h2 className="text-3xl font-bold text-center text-foreground">
            Feature Comparison
          </h2>
          <div className="mt-12 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-4 px-6 text-left text-foreground">Feature</th>
                  <th className="py-4 px-6 text-center text-foreground">Free</th>
                  <th className="py-4 px-6 text-center text-foreground">Pro</th>
                  <th className="py-4 px-6 text-center text-foreground">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {featureComparison.categories.map((category, categoryIndex) => (
                  <>
                    <tr key={`category-${categoryIndex}`}>
                      <td
                        colSpan={4}
                        className="py-4 px-6 text-lg font-semibold text-foreground bg-muted/10"
                      >
                        {category.name}
                      </td>
                    </tr>
                    {category.features.map((feature, featureIndex) => (
                      <tr
                        key={`feature-${categoryIndex}-${featureIndex}`}
                        className="border-b border-border"
                      >
                        <td className="py-4 px-6 text-muted-foreground">
                          {feature.name}
                        </td>
                        <td className="py-4 px-6 text-center text-muted-foreground">
                          {feature.free}
                        </td>
                        <td className="py-4 px-6 text-center text-muted-foreground">
                          {feature.pro}
                        </td>
                        <td className="py-4 px-6 text-center text-muted-foreground">
                          {feature.enterprise}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ CTA */}
        <div className="mt-32 text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Have questions about pricing?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Contact our sales team for custom pricing options and enterprise solutions.
          </p>
          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
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
            '@type': 'PriceSpecification',
            name: 'bg by inbound Pricing',
            description: 'Pricing plans for bg by inbound',
            offers: tiers.map((tier) => ({
              '@type': 'Offer',
              name: tier.name,
              price: tier.price === 'Custom' ? undefined : tier.price,
              priceCurrency: 'USD',
              description: tier.description,
            })),
          }),
        }}
      />
    </div>
  );
}