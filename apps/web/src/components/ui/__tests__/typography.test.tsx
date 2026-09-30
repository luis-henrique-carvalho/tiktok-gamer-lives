import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Typography, type TypographyProps } from '../typography';

describe('Typography component', () => {
  it('renders default paragraph variant', () => {
    render(<Typography>Default text</Typography>);
    const element = screen.getByText('Default text');
    expect(element.tagName).toBe('P');
    expect(element).toHaveAttribute('data-slot', 'typography');
    expect(element).toHaveAttribute('data-variant', 'p');
  });

  const variantTags: Array<{
    variant: NonNullable<TypographyProps['variant']>;
    expectedTag: string;
  }> = [
    { variant: 'h1', expectedTag: 'H1' },
    { variant: 'h2', expectedTag: 'H2' },
    { variant: 'h3', expectedTag: 'H3' },
    { variant: 'h4', expectedTag: 'H4' },
    { variant: 'p', expectedTag: 'P' },
    { variant: 'lead', expectedTag: 'P' },
    { variant: 'large', expectedTag: 'DIV' },
    { variant: 'small', expectedTag: 'SMALL' },
    { variant: 'muted', expectedTag: 'P' },
    { variant: 'destructive', expectedTag: 'P' },
    { variant: 'inlineCode', expectedTag: 'CODE' },
    { variant: 'blockquote', expectedTag: 'BLOCKQUOTE' },
    { variant: 'list', expectedTag: 'UL' },
  ];

  variantTags.forEach(({ variant, expectedTag }) => {
    it(`renders variant ${variant} with correct element <${expectedTag.toLowerCase()}>`, () => {
      render(
        <Typography variant={variant}>{`Content for ${variant}`}</Typography>,
      );
      const element = screen.getByText(`Content for ${variant}`);
      expect(element.tagName).toBe(expectedTag);
      expect(element).toHaveAttribute('data-variant', variant);
    });
  });

  it('allows overriding the HTML element via "as" prop', () => {
    render(
      <Typography variant="h1" as="span">
        Custom span heading
      </Typography>,
    );
    const element = screen.getByText('Custom span heading');
    expect(element.tagName).toBe('SPAN');
    expect(element).toHaveAttribute('data-variant', 'h1');
  });

  it('renders with asChild properly using Radix Slot', () => {
    render(
      <Typography asChild variant="lead">
        <span>Slot rendered content</span>
      </Typography>,
    );
    const element = screen.getByText('Slot rendered content');
    expect(element.tagName).toBe('SPAN');
    expect(element).toHaveAttribute('data-slot', 'typography');
    expect(element).toHaveAttribute('data-variant', 'lead');
  });

  it('applies custom className correctly', () => {
    render(
      <Typography className="custom-test-class" variant="h2">
        Heading with custom class
      </Typography>,
    );
    const element = screen.getByText('Heading with custom class');
    expect(element).toHaveClass('custom-test-class');
  });

  it('forwards ref correctly to the rendered element', () => {
    const ref = React.createRef<HTMLElement>();
    render(<Typography ref={ref}>Ref test</Typography>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('P');
  });
});
