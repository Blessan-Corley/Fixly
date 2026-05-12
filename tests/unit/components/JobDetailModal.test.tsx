import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import type { BrowseJob } from '@/app/dashboard/browse-jobs/browse-jobs.types';
import JobDetailModal from '@/app/dashboard/browse-jobs/JobDetailModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<BrowseJob> = {}): BrowseJob {
  return {
    _id: 'job123',
    title: 'Fix bathroom tiles',
    description: 'Replace 20 broken bathroom tiles.',
    urgency: 'asap',
    type: 'one-time',
    createdAt: new Date(Date.now() - 60_000 * 5).toISOString(), // 5 min ago
    deadline: new Date(Date.now() + 86400_000 * 7).toISOString(), // 7 days from now
    budget: { type: 'fixed', amount: 5000, materialsIncluded: true },
    location: { lat: 12.93, lng: 77.62, city: 'Bangalore', state: 'Karnataka' },
    skillsRequired: ['tiling', 'grouting'],
    applicationCount: 4,
    commentCount: 2,
    hasApplied: false,
    hirer: {
      _id: 'hirer1',
      name: 'John Doe',
      photoURL: 'https://example.com/photo.jpg',
      rating: 4.2,
      isVerified: true,
      location: { city: 'Bangalore' },
    },
    ...overrides,
  };
}

function renderModal(
  job: BrowseJob | null,
  opts: {
    userSkills?: string[];
    isApplying?: boolean;
    onClose?: () => void;
    onApply?: (id: string) => Promise<void>;
  } = {}
) {
  const onClose = opts.onClose ?? vi.fn();
  const onApply = opts.onApply ?? vi.fn().mockResolvedValue(undefined);

  render(
    <JobDetailModal
      job={job}
      userSkills={opts.userSkills ?? []}
      isApplying={opts.isApplying ?? false}
      onClose={onClose}
      onApply={onApply}
    />
  );

  return { onClose, onApply };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('JobDetailModal', () => {
  beforeEach(() => {
    // Reset body overflow
    document.body.style.overflow = '';
  });

  // ── Visibility ──────────────────────────────────────────────────────────────

  describe('visibility', () => {
    it('renders nothing when job is null', () => {
      renderModal(null);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders modal when job is provided', () => {
      renderModal(makeJob());
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('displays the job title', () => {
      renderModal(makeJob({ title: 'Plumbing repair needed' }));
      expect(screen.getByText('Plumbing repair needed')).toBeTruthy();
    });

    it('shows "Untitled Job" when title is missing', () => {
      renderModal(makeJob({ title: undefined }));
      expect(screen.getByText('Untitled Job')).toBeTruthy();
    });
  });

  // ── Close behaviour ─────────────────────────────────────────────────────────

  describe('closing', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal(makeJob());

      const closeBtn = screen.getByLabelText('Close');
      await user.click(closeBtn);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal(makeJob());

      // Backdrop has aria-hidden="true"; find it by its unique class
      const backdrop = document.querySelector('.fixed.inset-0.z-40');
      expect(backdrop).toBeTruthy();
      await user.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      const { onClose } = renderModal(makeJob());
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Urgency & badges ────────────────────────────────────────────────────────

  describe('urgency badges', () => {
    it('shows ASAP badge for urgency=asap', () => {
      renderModal(makeJob({ urgency: 'asap' }));
      expect(screen.getByText('ASAP')).toBeTruthy();
    });

    it('shows Scheduled badge for urgency=scheduled', () => {
      renderModal(makeJob({ urgency: 'scheduled' }));
      expect(screen.getByText('Scheduled')).toBeTruthy();
    });

    it('shows Flexible badge for other urgency values', () => {
      renderModal(makeJob({ urgency: 'flexible' }));
      expect(screen.getByText('Flexible')).toBeTruthy();
    });

    it('shows Materials Included badge when materialsIncluded=true', () => {
      renderModal(makeJob({ budget: { type: 'fixed', amount: 5000, materialsIncluded: true } }));
      expect(screen.getByText('Materials Included')).toBeTruthy();
    });

    it('does not show Materials Included when false', () => {
      renderModal(makeJob({ budget: { type: 'fixed', amount: 5000, materialsIncluded: false } }));
      expect(screen.queryByText('Materials Included')).toBeNull();
    });

    it('shows job type badge for non-one-time types', () => {
      renderModal(makeJob({ type: 'recurring' }));
      expect(screen.getByText('recurring')).toBeTruthy();
    });

    it('does not show type badge for one-time jobs', () => {
      renderModal(makeJob({ type: 'one-time' }));
      // "one-time" is explicitly filtered out
      expect(screen.queryByText('one-time')).toBeNull();
    });
  });

  // ── Budget display ──────────────────────────────────────────────────────────

  describe('budget display', () => {
    it('shows fixed budget amount', () => {
      renderModal(makeJob({ budget: { type: 'fixed', amount: 5000 } }));
      expect(screen.getByText('Rs 5,000')).toBeTruthy();
    });

    it('shows hourly rate', () => {
      renderModal(makeJob({ budget: { type: 'hourly', amount: 250 } }));
      expect(screen.getByText('Rs 250/hr')).toBeTruthy();
    });

    it('shows Negotiable for negotiable budget', () => {
      renderModal(makeJob({ budget: { type: 'negotiable' } }));
      expect(screen.getByText('Negotiable')).toBeTruthy();
    });

    it('shows Not specified when budget is missing', () => {
      renderModal(makeJob({ budget: undefined }));
      expect(screen.getByText('Not specified')).toBeTruthy();
    });
  });

  // ── Description ─────────────────────────────────────────────────────────────

  describe('description', () => {
    it('displays the job description', () => {
      renderModal(makeJob({ description: 'Need an expert plumber for fixing pipes.' }));
      expect(screen.getByText('Need an expert plumber for fixing pipes.')).toBeTruthy();
    });

    it('shows fallback when description is missing', () => {
      renderModal(makeJob({ description: undefined }));
      expect(screen.getByText('No description provided.')).toBeTruthy();
    });
  });

  // ── Skills ──────────────────────────────────────────────────────────────────

  describe('skills', () => {
    it('renders skill tags', () => {
      renderModal(makeJob({ skillsRequired: ['tiling', 'grouting'] }));
      expect(screen.getByText('tiling')).toBeTruthy();
      expect(screen.getByText('grouting')).toBeTruthy();
    });

    it('does not render skills section when skillsRequired is empty', () => {
      renderModal(makeJob({ skillsRequired: [] }));
      expect(screen.queryByText('Skills Required')).toBeNull();
    });

    it('highlights skills matching user skills', () => {
      renderModal(makeJob({ skillsRequired: ['tiling', 'grouting'] }), {
        userSkills: ['tiling'],
      });
      const tilingTag = screen.getByText('tiling');
      // Matched skills get accent background
      expect(tilingTag.className).toContain('bg-fixly-accent');

      const groutingTag = screen.getByText('grouting');
      expect(groutingTag.className).not.toContain('bg-fixly-accent');
    });

    it('shows match hint when userSkills is non-empty', () => {
      renderModal(makeJob(), { userSkills: ['tiling'] });
      expect(screen.getByText('(highlighted = your match)')).toBeTruthy();
    });

    it('does not show match hint when userSkills is empty', () => {
      renderModal(makeJob(), { userSkills: [] });
      expect(screen.queryByText('(highlighted = your match)')).toBeNull();
    });
  });

  // ── Hirer card ──────────────────────────────────────────────────────────────

  describe('hirer card', () => {
    it('shows hirer name', () => {
      renderModal(makeJob());
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    it('shows verified shield icon when hirer is verified', () => {
      renderModal(makeJob());
      // The aria-label wraps the shield
      expect(screen.getByLabelText('Verified')).toBeTruthy();
    });

    it('does not show verified icon when hirer is not verified', () => {
      renderModal(
        makeJob({ hirer: { _id: 'h1', name: 'Jane', isVerified: false } })
      );
      expect(screen.queryByLabelText('Verified')).toBeNull();
    });

    it('shows hirer rating when provided', () => {
      renderModal(makeJob());
      expect(screen.getByText('4.2')).toBeTruthy();
    });

    it('renders hirer photo when photoURL is provided', () => {
      renderModal(makeJob());
      const img = screen.getByAltText('John Doe');
      expect(img).toBeTruthy();
      expect(img.getAttribute('src')).toBe('https://example.com/photo.jpg');
    });

    it('renders initials when photoURL is missing', () => {
      renderModal(
        makeJob({ hirer: { _id: 'h1', name: 'Jane Smith', isVerified: false } })
      );
      expect(screen.getByText('J')).toBeTruthy();
    });

    it('does not render hirer card when hirer is null', () => {
      renderModal(makeJob({ hirer: null }));
      expect(screen.queryByText('Posted by')).toBeNull();
    });
  });

  // ── Apply button ─────────────────────────────────────────────────────────────

  describe('apply button', () => {
    it('calls onApply with job id when Apply Now is clicked', async () => {
      const user = userEvent.setup();
      const onApply = vi.fn().mockResolvedValue(undefined);
      renderModal(makeJob(), { onApply });

      const applyBtn = screen.getByText('Apply Now');
      await user.click(applyBtn);

      expect(onApply).toHaveBeenCalledWith('job123');
    });

    it('shows Applied state when hasApplied=true', () => {
      renderModal(makeJob({ hasApplied: true }));
      expect(screen.getByText('Applied')).toBeTruthy();
      expect(screen.queryByText('Apply Now')).toBeNull();
    });

    it('disables the button when hasApplied=true', () => {
      renderModal(makeJob({ hasApplied: true }));
      // Find the apply area button
      const buttons = screen.getAllByRole('button');
      const applyBtn = buttons.find((b) => b.textContent?.includes('Applied'));
      expect(applyBtn).toBeTruthy();
      expect(applyBtn!).toBeDisabled();
    });

    it('shows Applying... state when isApplying=true', () => {
      renderModal(makeJob(), { isApplying: true });
      expect(screen.getByText('Applying...')).toBeTruthy();
    });

    it('disables the button when isApplying=true', () => {
      renderModal(makeJob(), { isApplying: true });
      const buttons = screen.getAllByRole('button');
      const applyBtn = buttons.find((b) => b.textContent?.includes('Applying'));
      expect(applyBtn).toBeTruthy();
      expect(applyBtn!).toBeDisabled();
    });
  });

  // ── Applicant count ─────────────────────────────────────────────────────────

  describe('stats row', () => {
    it('shows application count', () => {
      renderModal(makeJob({ applicationCount: 7 }));
      expect(screen.getByText('7')).toBeTruthy();
    });

    it('shows 0 when applicationCount is missing', () => {
      renderModal(makeJob({ applicationCount: undefined }));
      // Should display 0 in the Applicants cell
      expect(screen.getByText('0')).toBeTruthy();
    });
  });

  // ── Location ─────────────────────────────────────────────────────────────────

  describe('location', () => {
    it('shows city in the header row', () => {
      renderModal(makeJob());
      // Multiple "Bangalore" text nodes may appear (header + location detail)
      const locations = screen.getAllByText(/Bangalore/);
      expect(locations.length).toBeGreaterThan(0);
    });

    it('shows location detail card when city or state is set', () => {
      renderModal(makeJob());
      expect(screen.getByText('Location')).toBeTruthy();
      // Multiple elements may contain "Bangalore, Karnataka" (header + detail card)
      const matches = screen.getAllByText('Bangalore, Karnataka');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('hides location detail card when neither city nor state', () => {
      renderModal(makeJob({ location: { lat: 0, lng: 0 } }));
      expect(screen.queryByText('Location')).toBeNull();
    });
  });
});
