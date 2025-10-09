import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmojiUploadForm } from '@/components/emoji/EmojiUploadForm';

// Mock apiClient
vi.mock('@/lib/api', () => ({
  apiClient: {
    emoji: {
      upload: vi.fn(),
    },
  },
}));

describe('EmojiUploadForm Component', () => {
  it('renders shortcode input and file input', () => {
    render(<EmojiUploadForm />);

    expect(screen.getByLabelText(/shortcode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/emoji image/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload emoji/i })).toBeInTheDocument();
  });

  it('shows validation error for invalid shortcode', async () => {
    const user = userEvent.setup();
    render(<EmojiUploadForm />);

    const shortcodeInput = screen.getByLabelText(/shortcode/i);
    await user.type(shortcodeInput, 'A'); // Single character (invalid)
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for shortcode with uppercase letters', async () => {
    const user = userEvent.setup();
    render(<EmojiUploadForm />);

    const shortcodeInput = screen.getByLabelText(/shortcode/i);
    await user.type(shortcodeInput, 'Wave'); // Uppercase (invalid)
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/lowercase letters/i)).toBeInTheDocument();
    });
  });

  it('displays file preview when valid image is selected', async () => {
    const user = userEvent.setup();
    render(<EmojiUploadForm />);

    // Create a mock file
    const file = new File(['dummy'], 'emoji.png', { type: 'image/png' });
    const input = screen.getByLabelText(/emoji image/i) as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => {
      const preview = screen.getByAltText(/preview/i);
      expect(preview).toBeInTheDocument();
    });
  });

  it('calls onSuccess callback when upload succeeds', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const mockUpload = vi.fn().mockResolvedValue({
      emojiURI: 'at://did:plc:user123/net.atrarium.emoji.custom/abc',
      blob: { ref: { $link: 'bafyrei123' }, mimeType: 'image/png', size: 1024 },
    });

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.upload = mockUpload;

    render(<EmojiUploadForm onSuccess={onSuccess} />);

    // Fill in form
    const shortcodeInput = screen.getByLabelText(/shortcode/i);
    await user.type(shortcodeInput, 'wave');

    const file = new File(['dummy'], 'emoji.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1024 });

    const input = screen.getByLabelText(/emoji image/i) as HTMLInputElement;
    await user.upload(input, file);

    // Mock Image object for dimension validation
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => {
          Object.defineProperty(this, 'width', { value: 128 });
          Object.defineProperty(this, 'height', { value: 128 });
          if (this.onload) this.onload();
        }, 0);
      }
    } as typeof Image;

    // Submit form
    const submitButton = screen.getByRole('button', { name: /upload emoji/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith({
        file: expect.any(File),
        shortcode: 'wave',
      });
      expect(onSuccess).toHaveBeenCalledWith('at://did:plc:user123/net.atrarium.emoji.custom/abc');
    });
  });

  it('shows error when image dimensions exceed 256x256', async () => {
    const user = userEvent.setup();
    render(<EmojiUploadForm />);

    // Fill in form
    const shortcodeInput = screen.getByLabelText(/shortcode/i);
    await user.type(shortcodeInput, 'wave');

    const file = new File(['dummy'], 'emoji.png', { type: 'image/png' });
    const input = screen.getByLabelText(/emoji image/i) as HTMLInputElement;
    await user.upload(input, file);

    // Mock Image object with large dimensions
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => {
          Object.defineProperty(this, 'width', { value: 512 }); // Too large
          Object.defineProperty(this, 'height', { value: 512 });
          if (this.onload) this.onload();
        }, 0);
      }
    } as typeof Image;

    // Submit form
    const submitButton = screen.getByRole('button', { name: /upload emoji/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/256×256px/i)).toBeInTheDocument();
    });
  });

  it('disables submit button while uploading', async () => {
    const user = userEvent.setup();
    const mockUpload = vi.fn().mockImplementation(
      () =>
        new Promise(() => {
          // Intentionally never resolves to test loading state
        })
    );

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.upload = mockUpload;

    render(<EmojiUploadForm />);

    // Fill in form
    const shortcodeInput = screen.getByLabelText(/shortcode/i);
    await user.type(shortcodeInput, 'wave');

    const file = new File(['dummy'], 'emoji.png', { type: 'image/png' });
    const input = screen.getByLabelText(/emoji image/i) as HTMLInputElement;
    await user.upload(input, file);

    // Mock Image
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => {
          Object.defineProperty(this, 'width', { value: 128 });
          Object.defineProperty(this, 'height', { value: 128 });
          if (this.onload) this.onload();
        }, 0);
      }
    } as typeof Image;

    // Submit form
    const submitButton = screen.getByRole('button', { name: /upload emoji/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled();
    });
  });
});
