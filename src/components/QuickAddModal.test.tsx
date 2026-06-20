import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickAddModal from './QuickAddModal';

describe('QuickAddModal Component', () => {
  it('does not render if isOpen is false or category is null', () => {
    const { container } = render(
      <QuickAddModal 
        isOpen={false} 
        onClose={vi.fn()} 
        category={null} 
        gridEmissions={0.71} 
        onAddEntry={vi.fn()} 
      />
    );
    expect(container.firstChild).toBeNull();
  });

  type PresetCategory = 'Transport' | 'Electricity';

  it('renders and allows submission for Transport category', () => {
    const onAddEntryMock = vi.fn();
    const onCloseMock = vi.fn();
    render(
      <QuickAddModal 
        isOpen={true} 
        onClose={onCloseMock} 
        category={'Transport' as PresetCategory} 
        gridEmissions={0.71} 
        onAddEntry={onAddEntryMock} 
      />
    );

    // Verify Title and Subtype select
    expect(screen.getByText('Log Transport')).toBeInTheDocument();
    expect(screen.getByLabelText('Emission Class / Subtype')).toBeInTheDocument();

    // Verify submit button
    const submitBtn = screen.getByRole('button', { name: 'Add to Footprint Tally' });
    expect(submitBtn).toBeInTheDocument();

    // Fire form submission
    fireEvent.click(submitBtn);

    // Should call callback and close modal
    expect(onAddEntryMock).toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalled();
  });
});
